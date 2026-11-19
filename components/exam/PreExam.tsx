'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { Camera, Check, Lock, Maximize, RefreshCw } from 'lucide-react';
import { primaryBtn, secondaryBtn } from '@/components/mcq/Dialog';
import { ButtonSpinner } from '@/components/ui/Loaders';
import type { ExamBlockCode } from '@/lib/proctor';
import { apiJson, formatDuration, formatWhen, jsonInit, ServerClock } from './api';
import { enterFullscreen, frameStats, fullscreenSupported, leaveFullscreen, looksCovered, requestCamera, stopStream, streamIsLive, waitForFrame } from './camera';
import { IdentityCheck } from './IdentityCheck';
import { Notice } from './Notice';
import { clearStoredSession, loadStoredSession } from './useExamRun';
import { ApiError, type ExamStatus, type ExamVerificationState, type StartData } from './types';
import { preloadFaceDetector } from './face';

const STEP_CODES: ExamBlockCode[] = ['VERIFICATION_REQUIRED', 'VERIFICATION_PENDING', 'VERIFICATION_REJECTED', 'ACCESS_CODE_REQUIRED', 'ACCESS_CODE_INVALID', 'CONSENT_REQUIRED'];

type StepKey = 'rules' | 'identity' | 'code' | 'camera' | 'start';

function windowAt(startsAt: string | null, endsAt: string | null, nowMs: number): 'before' | 'open' | 'closed' {
  if (startsAt && nowMs < Date.parse(startsAt)) return 'before';
  if (endsAt && nowMs > Date.parse(endsAt)) return 'closed';
  return 'open';
}

type StepState = 'done' | 'current' | 'locked';

function Shell({ n, title, state, children }: { n: number; title: string; state: StepState; children?: React.ReactNode }) {
  return (
    <li className="p-5 sm:p-6" aria-current={state === 'current' ? 'step' : undefined}>
      <div className="flex items-start gap-3">
        <span
          aria-hidden
          className={`w-7 h-7 shrink-0 rounded-full inline-flex items-center justify-center text-sm font-semibold ${state === 'done' ? 'bg-emerald-600 text-white' : state === 'current' ? 'bg-amber-600 text-white' : 'bg-gray-100 text-gray-600'}`}
        >
          {state === 'done' ? <Check className="w-4 h-4" /> : n}
        </span>
        <div className="min-w-0 flex-1 space-y-3">
          <div className="flex flex-wrap items-baseline gap-x-3">
            <h3 className={`text-lg font-semibold ${state === 'locked' ? 'text-gray-600' : 'text-gray-900'}`}>
              <span className="sr-only">Step {n}: </span>
              {title}
            </h3>
            {state === 'done' && <span className="text-sm font-semibold text-emerald-800">Done</span>}
            {state === 'locked' && (
              <span className="inline-flex items-center gap-1 text-sm text-gray-600">
                <Lock className="w-3.5 h-3.5" aria-hidden /> Complete the earlier steps first
              </span>
            )}
          </div>
          {state !== 'locked' && children}
        </div>
      </div>
    </li>
  );
}

/**
 * Everything before the exam starts: rules and consent, identity check, access code, camera check and the schedule.
 * Shows only the steps this exam needs. Starting happens here (full screen needs the click) and hands the running
 * attempt and the camera stream to the player.
 */
export function PreExam({ testKey, onReady }: { testKey: string; onReady: (data: StartData, stream: MediaStream | null) => void }) {
  const [status, setStatus] = useState<ExamStatus | null>(null);
  const [loadError, setLoadError] = useState<{ message: string; status: number } | null>(null);
  const [checking, setChecking] = useState(false);
  const [consent, setConsent] = useState(false);
  const [code, setCode] = useState('');
  const [codeError, setCodeError] = useState('');
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraBusy, setCameraBusy] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [covered, setCovered] = useState(false);
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<{ message: string; code?: string; login?: boolean } | null>(null);
  const [tick, setTick] = useState(0);
  const clockRef = useRef(new ServerClock());
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  streamRef.current = stream;
  const handedOff = useRef(false);
  const mounted = useRef(false);
  const fsSupported = typeof window !== 'undefined' && fullscreenSupported();

  const fetchStatus = useCallback(
    async (quiet = false) => {
      if (!quiet) setChecking(true);
      try {
        const data = await apiJson<ExamStatus>(`/api/exam/${encodeURIComponent(testKey)}/status`);
        clockRef.current.sync(data.now);
        setStatus(data);
        setLoadError(null);
        if (data.verification) setConsent(true); // consent was given when the photos were sent
      } catch (e) {
        const err = e as ApiError;
        setLoadError((prev) => (quiet && prev === null && status ? null : { message: err.message, status: err.status }));
      } finally {
        setChecking(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [testKey]
  );

  useEffect(() => {
    void fetchStatus(true);
  }, [fetchStatus]);

  // Camera: release it when this screen goes away unless it was handed to the exam (deferred for strict mode)
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      setTimeout(() => {
        if (!mounted.current && !handedOff.current) stopStream(streamRef.current);
      }, 0);
    };
  }, []);

  const settings = status?.settings;
  const pendingVerification = status?.verification?.status === 'PENDING';

  // Poll the approval every 10 s while waiting
  useEffect(() => {
    if (!pendingVerification) return;
    const id = setInterval(() => void fetchStatus(true), 10_000);
    return () => clearInterval(id);
  }, [pendingVerification, fetchStatus]);

  // Countdown: ticks each second only when the exam has a schedule
  const scheduled = Boolean(settings?.startsAt || settings?.endsAt);
  useEffect(() => {
    if (!scheduled) return;
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [scheduled]);

  const nowMs = clockRef.current.now();
  void tick;
  const win = settings ? windowAt(settings.startsAt, settings.endsAt, nowMs) : 'open';

  // When the window changes (opens or closes), ask the server again so the blocked message is current
  const lastWin = useRef<string | null>(null);
  useEffect(() => {
    if (!settings) return;
    if (lastWin.current && lastWin.current !== win) void fetchStatus(true);
    lastWin.current = win;
  }, [win, settings, fetchStatus]);

  // Camera check: keep an eye on the preview so a covered lens or a dead camera is noticed before Start
  useEffect(() => {
    const v = videoRef.current;
    if (v) {
      v.srcObject = stream;
      if (stream) v.play().catch(() => {});
    }
    if (!stream) return;
    const track = stream.getVideoTracks()[0];
    const onEnded = () => setStream(null);
    track?.addEventListener('ended', onEnded);
    let stop = false;
    const check = async () => {
      const el = videoRef.current;
      if (!el || stop) return;
      if (await waitForFrame(el)) setCovered(looksCovered(frameStats(el)));
    };
    void check();
    const id = setInterval(check, 2500);
    return () => {
      stop = true;
      clearInterval(id);
      track?.removeEventListener('ended', onEnded);
    };
  }, [stream]);

  const allowCamera = async () => {
    setCameraBusy(true);
    setCameraError('');
    const r = await requestCamera();
    if (r.stream) {
      stopStream(streamRef.current);
      setStream(r.stream);
    } else setCameraError(r.error || 'Could not start the camera.');
    setCameraBusy(false);
  };

  /* ------------------------------- derived ------------------------------- */

  const resume = Boolean(status?.openAttempt);
  const ownSession = Boolean(status?.openAttempt && loadStoredSession(testKey)?.attemptId === status.openAttempt.id);
  const verification = status?.verification ?? null;
  const steps = useMemo(() => {
    if (!settings) return [] as StepKey[];
    const list: StepKey[] = [];
    if (!resume) list.push('rules');
    if (!resume && settings.requireIdCheck) list.push('identity');
    if (!resume && settings.needsAccessCode) list.push('code');
    if (settings.requireCamera) list.push('camera');
    list.push('start');
    return list;
  }, [settings, resume]);

  const cameraReady = Boolean(stream && streamIsLive(stream)) && !covered;
  const done: Record<StepKey, boolean> = {
    rules: !settings?.requireConsent || consent,
    identity: verification?.status === 'APPROVED',
    code: code.trim().length > 0,
    camera: cameraReady,
    start: false,
  };
  const firstOpen = steps.find((k) => !done[k]) ?? 'start';
  const allBeforeStartDone = steps.filter((k) => k !== 'start').every((k) => done[k]);

  const hardBlock = status?.blocked && !resume && !STEP_CODES.includes(status.blocked.code) && status.blocked.code !== 'NOT_STARTED' && status.blocked.code !== 'ENDED' ? status.blocked : null;
  const canStart = Boolean(settings) && allBeforeStartDone && win === 'open' && !hardBlock && !starting;

  /* -------------------------------- start -------------------------------- */

  const start = async () => {
    if (!settings || !canStart) return;
    setStarting(true);
    setStartError(null);
    setCodeError('');
    // Must run straight from the click so the browser allows full screen.
    if (fsSupported) {
      const ok = await enterFullscreen();
      if (!ok) {
        setStartError({ message: 'Full screen was blocked. Allow full screen for this site in your browser, then press the button again.' });
        setStarting(false);
        return;
      }
    }
    try {
      const stored = loadStoredSession(testKey);
      const tabToken = stored && status?.openAttempt && stored.attemptId === status.openAttempt.id ? stored.sessionToken : undefined;
      const body: Record<string, unknown> = { testKey };
      if (settings.needsAccessCode && code.trim()) body.accessCode = code.trim();
      if (settings.requireConsent && consent) body.consent = true;
      if (tabToken) body.tabToken = tabToken;
      const data = await apiJson<StartData>('/api/mcq/start', jsonInit('POST', body));
      handedOff.current = true;
      void preloadFaceDetector();
      onReady(data, streamRef.current);
    } catch (e) {
      await leaveFullscreen();
      const err = e as ApiError;
      const c = err.code as ExamBlockCode | undefined;
      if (c === 'ACCESS_CODE_INVALID' || c === 'ACCESS_CODE_REQUIRED') setCodeError(err.message);
      else if (c === 'ACTIVE_ELSEWHERE') {
        setStartError({
          code: c,
          message: 'This exam is already open in another tab or device. Close it there, then press the button again. It is released automatically about a minute after the other tab stops.',
        });
        void fetchStatus(true);
      } else if (c === 'SESSION_REPLACED') setStartError({ code: c, message: 'This exam was opened in another tab or device. Refresh this page and try again.' });
      else if (err.status === 401) setStartError({ message: 'Your login has expired. Log in again to continue.', login: true });
      else if (err.status === 0) setStartError({ message: 'Could not reach the server. Check your connection and try again.' });
      else {
        setStartError({ code: c, message: err.message });
        if (c && (STEP_CODES.includes(c) || c === 'NOT_STARTED' || c === 'ENDED' || c === 'RETAKE_NOT_ALLOWED')) void fetchStatus(true);
      }
    } finally {
      setStarting(false);
    }
  };

  const resetSession = () => {
    clearStoredSession(testKey);
    void fetchStatus();
  };

  /* -------------------------------- render -------------------------------- */

  if (!status || !settings) {
    if (loadError) {
      return (
        <section className="bg-white rounded-2xl border border-gray-200 p-6 space-y-3 max-w-3xl" aria-labelledby="pre-error">
          <h2 id="pre-error" className="text-xl font-semibold text-gray-900">
            Could not load the exam
          </h2>
          <Notice tone="error">{loadError.status === 404 ? 'This exam was not found, or you are not enrolled in its course.' : loadError.message}</Notice>
          <button type="button" onClick={() => void fetchStatus()} disabled={checking} className={secondaryBtn}>
            {checking ? <ButtonSpinner label="Loading..." /> : (<><RefreshCw className="w-4 h-4" aria-hidden /> Try again</>)}
          </button>
        </section>
      );
    }
    return (
      <section className="bg-white rounded-2xl border border-gray-200 p-6 max-w-3xl" aria-busy="true">
        <div className="flex items-center gap-2 text-sm text-gray-700" role="status">
          <ButtonSpinner label="" /> Getting your exam ready...
        </div>
      </section>
    );
  }

  const every = settings.captureEverySeconds < 90 ? `${settings.captureEverySeconds} seconds` : `${Math.round(settings.captureEverySeconds / 60)} minutes`;
  const countedList = 'leaving full screen, switching to another tab or window, copying, pasting or cutting, printing or saving, and a stopped or covered camera';
  const stepsView = steps.map((k, i) => ({ key: k, n: i + 1 }));
  const stateOf = (k: StepKey): StepState => (k !== 'start' && done[k] ? 'done' : steps.indexOf(k) > steps.indexOf(firstOpen) ? 'locked' : 'current');

  const numberOf = (k: StepKey) => stepsView.find((s) => s.key === k)?.n ?? 0;

  return (
    <div className="space-y-4 max-w-3xl">
      {resume && (
        <Notice tone="warn">
          <p className="font-semibold">You have an exam in progress.</p>
          <p>Your timer kept running. Press the button below to continue where you stopped.{status.openAttempt?.activeElsewhere && !ownSession ? ' It looks open in another tab or device: close that one first. It is released about a minute after the other tab stops.' : ''}</p>
        </Notice>
      )}
      {status.retakeGrant && !resume && <Notice tone="success">Your teacher allowed you to take this exam again.</Notice>}

      {win === 'before' && settings.startsAt && (
        <Notice tone="info">
          <span className="font-semibold">The exam opens in {formatDuration((Date.parse(settings.startsAt) - nowMs) / 1000)}.</span> You can finish the steps below now. Keep this page open: the start button unlocks by itself.
        </Notice>
      )}
      {win === 'closed' && !resume && <Notice tone="error">{status.blocked?.message || 'The exam window has closed, so this exam can no longer be started.'}</Notice>}
      {hardBlock && <Notice tone="error">{hardBlock.message}</Notice>}
      <ol className="bg-white rounded-2xl border border-gray-200 divide-y divide-gray-200">
        {steps.includes('rules') && (
          <Shell n={numberOf('rules')} title="Rules and consent" state={stateOf('rules')}>
            <div className="space-y-3 text-sm text-gray-800 max-w-prose">
              <ul className="space-y-2 list-disc pl-5">
                <li>
                  You have <strong>{settings.timeLimit} minutes</strong> for {settings.questionCount} questions. The timer is kept by the server: reloading the page or changing your device clock does not change it. The exam is submitted automatically when time is up.
                </li>
                <li>
                  The exam runs in <strong>full screen</strong> in one browser tab. Only one tab or device can have it open: opening it somewhere else stops the first one.
                </li>
                <li>
                  These count as <strong>violations</strong>: {countedList}. After <strong>{settings.maxViolations} violations</strong> your exam is submitted automatically with the answers you have given. Right-click, blocked keyboard shortcuts and losing your internet connection are also recorded for your teacher, but do not count towards the limit.
                </li>
                {settings.requireCamera && (
                  <li>
                    Your camera stays on, and about once every {every} (at a random moment) it takes a <strong>still photo</strong>. <strong>No video is recorded or streamed.</strong> Your teacher reviews these photos. A basic check on your device may count faces in each photo, only as a hint for your teacher.
                  </li>
                )}
                {settings.requireIdCheck && (
                  <li>
                    The selfie and the photo of your ID card are stored privately, can only be seen by your teacher and the administrators, and are <strong>deleted after {settings.photoRetentionDays} days</strong>.
                  </li>
                )}
                {settings.requireCamera && !settings.requireIdCheck && (
                  <li>
                    The photos are stored privately, can only be seen by your teacher and the administrators, and are <strong>deleted after {settings.photoRetentionDays} days</strong>.
                  </li>
                )}
              </ul>
              {!fsSupported && (
                <Notice tone="warn">This device or browser cannot show full screen (common on phones). The exam still runs with all the other checks, and leaving or switching the tab is still recorded.</Notice>
              )}
              {settings.requireConsent ? (
                <label className="flex items-start gap-3 rounded-lg border border-gray-300 px-4 py-3 cursor-pointer focus-within:shadow-[0_0_0_3px_#e3eeff] hover:bg-gray-50 transition">
                  <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5 w-4 h-4 accent-amber-600 shrink-0" />
                  <span>I have read these rules. I agree to the photos and checks described above and understand that my teacher will review them.</span>
                </label>
              ) : (
                <p className="text-gray-700">By starting you agree to follow these rules.</p>
              )}
            </div>
          </Shell>
        )}

        {steps.includes('identity') && (
          <Shell n={numberOf('identity')} title="Identity check" state={stateOf('identity')}>
            <IdentityCheck
              testKey={testKey}
              consent={consent}
              verification={verification}
              checking={checking}
              onCheckNow={() => void fetchStatus()}
              onSubmitted={(v: ExamVerificationState) => {
                setStatus((s) => (s ? { ...s, verification: v } : s));
                void fetchStatus(true);
              }}
            />
          </Shell>
        )}

        {steps.includes('code') && (
          <Shell n={numberOf('code')} title="Access code" state={stateOf('code')}>
            <div className="space-y-2 max-w-sm">
              <label htmlFor="exam-access-code" className="block text-sm font-semibold text-gray-900">
                Enter the access code from your teacher
              </label>
              <input
                id="exam-access-code"
                type="text"
                value={code}
                onChange={(e) => {
                  setCode(e.target.value);
                  setCodeError('');
                }}
                autoComplete="off"
                autoCapitalize="off"
                spellCheck={false}
                aria-invalid={Boolean(codeError)}
                aria-describedby={codeError ? 'exam-code-error' : undefined}
                className={`h-11 w-full rounded-lg border px-3 text-base text-gray-900 bg-white focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_#e3eeff] ${codeError ? 'border-red-500' : 'border-gray-300 focus-visible:border-amber-600'}`}
              />
              {codeError && (
                <p id="exam-code-error" role="alert" className="text-sm text-red-700">
                  {codeError}
                </p>
              )}
            </div>
          </Shell>
        )}
        {steps.includes('camera') && (
          <Shell n={numberOf('camera')} title="Camera check" state={stateOf('camera')}>
            <div className="space-y-3 max-w-prose">
              <p className="text-sm text-gray-700">Allow your camera and check that you can see yourself. It stays on during the exam, and you can see its preview in the top bar.</p>
              {stream && (
                <div className="space-y-2">
                  <video ref={videoRef} muted playsInline autoPlay aria-label="Your camera preview" className="w-full max-w-xs aspect-[4/3] rounded-xl bg-gray-900 object-cover -scale-x-100" />
                  {covered && <Notice tone="error">The picture is black. Uncover the camera and make sure the room is lit.</Notice>}
                </div>
              )}
              {!stream && cameraError && <Notice tone="error">{cameraError}</Notice>}
              {!stream && (
                <button type="button" onClick={allowCamera} disabled={cameraBusy} className={secondaryBtn}>
                  {cameraBusy ? <ButtonSpinner label="Waiting for permission..." /> : (<><Camera className="w-4 h-4" aria-hidden /> {cameraError ? 'Try again' : 'Allow camera'}</>)}
                </button>
              )}
            </div>
          </Shell>
        )}
        <Shell n={numberOf('start')} title={resume ? 'Resume the exam' : 'Start the exam'} state={stateOf('start')}>
          <div className="space-y-3 max-w-prose">
            {(settings.startsAt || settings.endsAt) && (
              <dl className="text-sm text-gray-800 space-y-1">
                {settings.startsAt && (
                  <div className="flex flex-wrap gap-x-2">
                    <dt className="font-semibold">Opens:</dt>
                    <dd>{formatWhen(settings.startsAt)}</dd>
                  </div>
                )}
                {settings.endsAt && (
                  <div className="flex flex-wrap gap-x-2">
                    <dt className="font-semibold">Closes:</dt>
                    <dd>{formatWhen(settings.endsAt)}</dd>
                  </div>
                )}
              </dl>
            )}
            {win === 'open' && settings.endsAt && !resume && (
              <p className="text-sm text-gray-700">
                The window closes in {formatDuration((Date.parse(settings.endsAt) - nowMs) / 1000)}. If it closes while you are working, the exam is submitted at that moment.
              </p>
            )}
            {startError && (
              <Notice tone="error">
                <p>{startError.message}</p>
                {startError.login && (
                  <p className="mt-1">
                    <Link href={`/login?redirect=/assignments/tests/${testKey}`} className="font-semibold underline">
                      Log in
                    </Link>
                  </p>
                )}
                {startError.code === 'ACTIVE_ELSEWHERE' && (
                  <button type="button" onClick={resetSession} className="mt-1 font-semibold underline rounded focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_#e3eeff]">
                    Check again
                  </button>
                )}
              </Notice>
            )}
            {!allBeforeStartDone && !starting && <p className="text-sm text-gray-700">Finish the steps above to unlock the start button.</p>}
            <div>
              <button type="button" onClick={start} disabled={!canStart} className={primaryBtn}>
                {starting ? <ButtonSpinner label={resume ? 'Resuming...' : 'Starting...'} /> : (<>{fsSupported && <Maximize className="w-4 h-4" aria-hidden />} {resume ? 'Resume exam' : fsSupported ? 'Start exam in full screen' : 'Start exam'}</>)}
              </button>
            </div>
          </div>
        </Shell>
      </ol>
    </div>
  );
}

