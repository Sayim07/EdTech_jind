'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { AlertCircle, Camera, CheckCircle2, ChevronLeft, ChevronRight, Clock, Flag, Maximize, ShieldCheck } from 'lucide-react';
import { AttemptResult, MAX_VIOLATIONS, OPTION_LABELS, PublicQuestion, formatClock } from '@/lib/mcq';
import { ButtonSpinner } from '@/components/ui/Loaders';
import { Dialog, primaryBtn, secondaryBtn } from './Dialog';
import { QuestionPalette } from './QuestionPalette';
import { ResultsView } from './ResultsView';
import { CameraPreview, FullscreenWarning, enterFullscreen, fullscreenSupported, leaveFullscreen, requestCamera, stopStream, useProctoring } from './ProctoringManager';

export interface TestInfo {
  key: string;
  title: string;
  courseTitle: string;
  questionCount: number;
  timeLimit: number;
  passingMarks: number;
  allowRetakes: boolean;
  isSample: boolean;
}

interface Session {
  attemptId: string;
  questions: PublicQuestion[];
  endAt: number;
  startedElapsed: number;
  answers: Record<string, number>;
  violations: number;
}

type Phase = 'intro' | 'running' | 'submitting' | 'done';

export function TestPlayer({ test, canStart, blockedReason, inProgress }: { test: TestInfo; canStart: boolean; blockedReason?: string; inProgress: boolean }) {
  const [phase, setPhase] = useState<Phase>('intro');
  const [error, setError] = useState('');
  const [starting, setStarting] = useState(false);
  const [cameraBusy, setCameraBusy] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [result, setResult] = useState<AttemptResult | null>(null);

  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [flagged, setFlagged] = useState<Set<string>>(new Set());
  const [remaining, setRemaining] = useState(0);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [timeUpNotice, setTimeUpNotice] = useState(false);

  const answersRef = useRef(answers);
  answersRef.current = answers;
  const violationsRef = useRef(0);
  const submittingRef = useRef(false);
  const streamRef = useRef<MediaStream | null>(null);
  streamRef.current = stream;
  const fsSupported = typeof window !== 'undefined' ? fullscreenSupported() : true;

  const submit = useCallback(
    async (reason: 'TIME_UP' | 'PROCTORING' | null) => {
      if (submittingRef.current || !session) return;
      submittingRef.current = true;
      setConfirmOpen(false);
      setPhase('submitting');
      try {
        const res = await fetch(`/api/mcq/attempts/${session.attemptId}/submit`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            answers: answersRef.current,
            violations: violationsRef.current,
            autoReason: reason,
            snapshots: proctor.getSnapshots(),
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Could not submit the test');
        stopStream(streamRef.current);
        setStream(null);
        await leaveFullscreen();
        setResult(data.result);
        setPhase('done');
        window.scrollTo({ top: 0 });
      } catch (err: any) {
        submittingRef.current = false;
        setError(err.message || 'Could not submit the test. Check your connection and try again.');
        setPhase('running');
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [session]
  );

  const proctor = useProctoring({
    active: phase === 'running',
    stream,
    elapsedSeconds: session?.startedElapsed ?? 0,
    initialViolations: session?.violations ?? 0,
    onViolation: (n) => {
      violationsRef.current = n;
      if (session) {
        fetch(`/api/mcq/attempts/${session.attemptId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ violations: n }),
          keepalive: true,
        }).catch(() => {});
      }
    },
    onLimit: () => submit('PROCTORING'),
  });

  // Countdown, computed from an absolute end time so tab throttling cannot slow it
  useEffect(() => {
    if (phase !== 'running' || !session) return;
    const tick = () => {
      const left = Math.max(0, Math.round((session.endAt - Date.now()) / 1000));
      setRemaining(left);
      if (left <= 0) {
        setTimeUpNotice(true);
        submit('TIME_UP');
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [phase, session, submit]);

  // Debounced autosave
  useEffect(() => {
    if (phase !== 'running' || !session) return;
    const id = setTimeout(() => {
      fetch(`/api/mcq/attempts/${session.attemptId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers }),
      }).catch(() => {});
    }, 800);
    return () => clearTimeout(id);
  }, [answers, phase, session]);

  // Warn before accidentally closing the tab
  useEffect(() => {
    if (phase !== 'running') return;
    const h = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', h);
    return () => window.removeEventListener('beforeunload', h);
  }, [phase]);

  // Release the camera when leaving the page
  useEffect(() => () => stopStream(streamRef.current), []);

  const allowCamera = async () => {
    setCameraBusy(true);
    setCameraError('');
    const r = await requestCamera();
    if (r.stream) setStream(r.stream);
    else setCameraError(r.error || 'Could not start the camera.');
    setCameraBusy(false);
  };

  const start = async () => {
    setError('');
    setStarting(true);
    try {
      // Must run straight from the click so the browser allows full screen.
      if (fsSupported) {
        const ok = await enterFullscreen();
        if (!ok) throw new Error('Full screen was blocked. Allow full screen for this site and try again.');
      }
      const res = await fetch('/api/mcq/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ testKey: test.key }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not start the test');
      violationsRef.current = data.violations;
      setAnswers(data.answers || {});
      setSession({
        attemptId: data.attemptId,
        questions: data.questions,
        endAt: Date.now() + data.remainingSeconds * 1000,
        startedElapsed: test.timeLimit * 60 - data.remainingSeconds,
        answers: data.answers || {},
        violations: data.violations,
      });
      setCurrent(0);
      setPhase('running');
    } catch (err: any) {
      await leaveFullscreen();
      setError(err.message);
    } finally {
      setStarting(false);
    }
  };

  const ids = useMemo(() => session?.questions.map((q) => q.id) ?? [], [session]);
  const answeredCount = ids.filter((id) => answers[id] !== undefined).length;
  const flaggedCount = ids.filter((id) => flagged.has(id)).length;

  /* ------------------------------ intro ------------------------------ */
  if (phase === 'intro') {
    const cameraReady = Boolean(stream);
    return (
      <div className="space-y-6 max-w-3xl">
        <section className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
          <h2 className="text-xl font-semibold text-gray-900">Before you begin</h2>
          <ul className="text-sm text-gray-700 space-y-2 max-w-prose list-disc pl-5">
            <li>
              You have <strong>{test.timeLimit} minutes</strong> for {test.questionCount} questions. The test is submitted automatically at 00:00.
            </li>
            <li>
              The test runs in <strong>full screen</strong>. Leaving full screen gives a warning; the third time submits your test automatically.
            </li>
            <li>
              Your <strong>camera</strong> takes a small photo at random moments during the test. Photos are only visible to your instructors.
            </li>
            <li>One answer per question. You can move back, change answers and flag questions for review.</li>
          </ul>
          {!fsSupported && (
            <p className="text-sm text-orange-800 bg-orange-50 border border-orange-200 rounded-lg px-3 py-2">
              This device does not support full-screen mode. The test will still run, with camera snapshots only.
            </p>
          )}
        </section>

        <section className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4" aria-labelledby="camera-step">
          <h2 id="camera-step" className="text-xl font-semibold text-gray-900">Step 1: allow your camera</h2>
          {cameraReady ? (
            <p role="status" className="flex items-center gap-2 text-sm font-semibold text-emerald-800">
              <CheckCircle2 className="w-5 h-5" /> Camera is ready.
            </p>
          ) : (
            <>
              {cameraError && (
                <p role="alert" className="flex items-start gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2 max-w-prose">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /> {cameraError}
                </p>
              )}
              <button type="button" onClick={allowCamera} disabled={cameraBusy || !canStart} className={secondaryBtn}>
                {cameraBusy ? <ButtonSpinner label="Waiting for permission..." /> : (<><Camera className="w-4 h-4" /> {cameraError ? 'Try again' : 'Allow camera'}</>)}
              </button>
            </>
          )}
        </section>

        <section className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4" aria-labelledby="start-step">
          <h2 id="start-step" className="text-xl font-semibold text-gray-900">Step 2: {inProgress ? 'resume' : 'start'}</h2>
          {error && (
            <p role="alert" className="flex items-start gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2 max-w-prose">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /> {error}
            </p>
          )}
          {!canStart && blockedReason && <p className="text-sm text-gray-700">{blockedReason}</p>}
          <button type="button" onClick={start} disabled={!cameraReady || starting || !canStart} className={primaryBtn}>
            {starting ? <ButtonSpinner label="Starting..." /> : (<><Maximize className="w-4 h-4" /> {inProgress ? 'Resume test in full screen' : 'Start test in full screen'}</>)}
          </button>
          {!cameraReady && canStart && <p className="text-xs text-gray-600">Allow your camera first to enable the start button.</p>}
        </section>
      </div>
    );
  }

  /* ------------------------------ results ------------------------------ */
  if (phase === 'done' && result) {
    return (
      <div className="space-y-6">
        <div className="flex flex-wrap gap-3">
          <Link href="/assignments?tab=tests" className={secondaryBtn}>
            Back to MCQ tests
          </Link>
          {test.allowRetakes && (
            <button type="button" className={primaryBtn} onClick={() => window.location.reload()}>
              Retake test
            </button>
          )}
        </div>
        <ResultsView result={result} />
      </div>
    );
  }

  /* ------------------------------ running ------------------------------ */
  if (!session) return null;
  const q = session.questions[current];
  const isFlagged = flagged.has(q.id);
  const low = remaining <= 60;

  return (
    <div className="fixed inset-0 z-[90] bg-gray-50 overflow-y-auto" data-testid="test-runner">
      <header className="sticky top-0 z-10 bg-white border-b border-gray-200">
        <div className="w-full px-4 sm:px-6 lg:px-10 py-2.5 flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-base sm:text-lg font-semibold text-gray-900">{test.title}</h1>
            <p className="text-xs text-gray-600">
              Question {current + 1} of {ids.length}
              <span className="mx-2">·</span>
              <span className={proctor.violations > 0 ? 'text-red-700 font-semibold' : ''}>
                Warnings {proctor.violations}/{MAX_VIOLATIONS}
              </span>
            </p>
          </div>
          <CameraPreview videoRef={proctor.videoRef} />
          <div role="timer" aria-label="Time remaining" className={`h-10 px-3 rounded-lg inline-flex items-center gap-2 text-base font-semibold tabular-nums ${low ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-800'}`}>
            <Clock className="w-4 h-4" aria-hidden /> {formatClock(remaining)}
          </div>
          <button type="button" onClick={() => setConfirmOpen(true)} disabled={phase === 'submitting'} className={`${primaryBtn} hidden sm:inline-flex`}>
            {phase === 'submitting' ? <ButtonSpinner label="Submitting..." /> : 'Submit test'}
          </button>
        </div>
      </header>

      <div className="w-full px-4 sm:px-6 lg:px-10 py-5 sm:py-8 grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 items-start">
        <main className="bg-white rounded-2xl border border-gray-200 p-5 sm:p-8 space-y-6">
          {error && (
            <p role="alert" className="flex items-start gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /> {error}
            </p>
          )}
          <fieldset className="space-y-5 min-w-0">
            <legend className="text-xl sm:text-2xl font-semibold text-gray-900 leading-snug max-w-prose">{q.text}</legend>
            <div className="space-y-3">
              {q.options.map((opt, i) => {
                const selected = answers[q.id] === i;
                return (
                  <label
                    key={i}
                    className={`flex items-start gap-3.5 rounded-lg border px-4 py-3.5 cursor-pointer transition focus-within:shadow-[0_0_0_3px_#e3eeff] ${
                      selected ? 'border-amber-600 bg-amber-50' : 'border-gray-300 bg-white hover:bg-gray-50'
                    }`}
                  >
                    <input type="radio" name={`q-${q.id}`} checked={selected} onChange={() => setAnswers((a) => ({ ...a, [q.id]: i }))} className="mt-1 w-4 h-4 accent-[#0056d2] shrink-0" />
                    <span className="w-6 shrink-0 font-semibold text-gray-700">{OPTION_LABELS[i]}</span>
                    <span className="text-base text-gray-900">{opt}</span>
                  </label>
                );
              })}
            </div>
            {answers[q.id] !== undefined && (
              <button
                type="button"
                onClick={() =>
                  setAnswers((a) => {
                    const n = { ...a };
                    delete n[q.id];
                    return n;
                  })
                }
                className="text-sm font-semibold text-amber-600 hover:underline"
              >
                Clear answer
              </button>
            )}
          </fieldset>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-5">
            <button type="button" onClick={() => setCurrent((c) => Math.max(0, c - 1))} disabled={current === 0} className={secondaryBtn}>
              <ChevronLeft className="w-4 h-4" /> Previous
            </button>
            <button
              type="button"
              aria-pressed={isFlagged}
              onClick={() =>
                setFlagged((f) => {
                  const n = new Set(f);
                  if (n.has(q.id)) n.delete(q.id);
                  else n.add(q.id);
                  return n;
                })
              }
              className={isFlagged ? 'h-10 px-5 rounded-lg bg-orange-50 border border-orange-400 text-orange-800 font-semibold text-sm inline-flex items-center gap-2 transition active:scale-[0.98]' : secondaryBtn}
            >
              <Flag className="w-4 h-4" /> {isFlagged ? 'Marked for review' : 'Mark for review'}
            </button>
            {current < ids.length - 1 ? (
              <button type="button" onClick={() => setCurrent((c) => Math.min(ids.length - 1, c + 1))} className={primaryBtn}>
                Next <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button type="button" onClick={() => setConfirmOpen(true)} className={primaryBtn}>
                Finish &amp; submit
              </button>
            )}
          </div>
        </main>

        <aside className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4 lg:sticky lg:top-20">
          <h2 className="text-base font-semibold text-gray-900">Question palette</h2>
          <p className="text-sm text-gray-600">
            {answeredCount} of {ids.length} answered
          </p>
          <QuestionPalette ids={ids} answers={answers} flagged={flagged} current={current} onSelect={setCurrent} />
          <button type="button" onClick={() => setConfirmOpen(true)} className={`${primaryBtn} w-full sm:hidden`}>
            Submit test
          </button>
          <p className="flex items-start gap-2 text-xs text-gray-600">
            <ShieldCheck className="w-4 h-4 shrink-0 text-amber-600" aria-hidden /> Proctored: full screen and camera snapshots.
          </p>
        </aside>
      </div>

      {proctor.warningOpen && phase === 'running' && <FullscreenWarning violations={proctor.violations} onReenter={proctor.reenter} />}

      {confirmOpen && phase === 'running' && !proctor.warningOpen && (
        <Dialog
          title="Submit your test?"
          onClose={() => setConfirmOpen(false)}
          actions={
            <>
              <button type="button" onClick={() => setConfirmOpen(false)} className={secondaryBtn}>
                Keep working
              </button>
              <button type="button" onClick={() => submit(null)} className={primaryBtn}>
                Submit test
              </button>
            </>
          }
        >
          <dl className="grid grid-cols-3 gap-3 text-center">
            <div className="rounded-lg bg-gray-50 py-3">
              <dd className="text-2xl font-semibold text-gray-900">{answeredCount}</dd>
              <dt className="text-xs text-gray-600">Answered</dt>
            </div>
            <div className="rounded-lg bg-gray-50 py-3">
              <dd className="text-2xl font-semibold text-gray-900">{ids.length - answeredCount}</dd>
              <dt className="text-xs text-gray-600">Unanswered</dt>
            </div>
            <div className="rounded-lg bg-gray-50 py-3">
              <dd className="text-2xl font-semibold text-gray-900">{flaggedCount}</dd>
              <dt className="text-xs text-gray-600">Flagged</dt>
            </div>
          </dl>
          <p>You cannot change your answers after submitting.</p>
        </Dialog>
      )}

      {phase === 'running' && timeUpNotice && <span className="sr-only" role="status">Time is up. Submitting your test.</span>}
    </div>
  );
}
