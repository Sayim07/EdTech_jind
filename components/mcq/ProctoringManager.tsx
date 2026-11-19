'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AlertCircle, Camera, CameraOff, Maximize, ShieldCheck } from 'lucide-react';
import { MAX_CAPTURE_BYTES, SESSION_HEADER, type ProctorEventType } from '@/lib/proctor';
import { ButtonSpinner } from '@/components/ui/Loaders';
import { Dialog, primaryBtn } from './Dialog';
import { countFaces, preloadFaceDetector } from '@/components/exam/face';
import { enterFullscreen, encodeStill, frameStats, fullscreenSupported, looksCovered, randomUnit, requestCamera, stopStream, streamIsLive } from '@/components/exam/camera';

export { enterFullscreen, fullscreenSupported, leaveFullscreen, requestCamera, stopStream } from '@/components/exam/camera';

interface Options {
  /** True while the exam is running (listeners, captures and the camera watch only run then). */
  active: boolean;
  /** Camera stream opened during the pre-exam checks. */
  initialStream: MediaStream | null;
  requireCamera: boolean;
  captureEverySeconds: number;
  attemptId: string;
  sessionToken: string;
  report: (type: ProctorEventType, detail?: string) => void;
  onSessionReplaced: () => void;
}

type CameraProblem = null | 'stopped' | 'covered';

const GUARD_STYLE_ID = 'exam-guard-style';

/**
 * Browser side proctoring while an exam runs: full screen, focus, copy/paste/print and shortcut guards, the camera
 * watch and the random still photos. It only REPORTS (to useExamRun); the server decides what counts. No video is
 * recorded or streamed: the camera stream feeds the preview tile and, now and then, one still image.
 */
export function useProctoring({ active, initialStream, requireCamera, captureEverySeconds, attemptId, sessionToken, report, onSessionReplaced }: Options) {
  const [stream, setStream] = useState<MediaStream | null>(initialStream);
  const [videoEl, setVideoEl] = useState<HTMLVideoElement | null>(null);
  const [fsWarning, setFsWarning] = useState(false);
  const [fsError, setFsError] = useState('');
  const [problem, setProblem] = useState<CameraProblem>(null);
  const [cameraBusy, setCameraBusy] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const fsSupported = typeof window !== 'undefined' && fullscreenSupported();

  const reportRef = useRef(report);
  reportRef.current = report;
  const replacedRef = useRef(onSessionReplaced);
  replacedRef.current = onSessionReplaced;
  const streamRef = useRef<MediaStream | null>(stream);
  streamRef.current = stream;
  const videoRef = useRef<HTMLVideoElement | null>(null);
  videoRef.current = videoEl;
  const problemRef = useRef<CameraProblem>(null);
  problemRef.current = problem;
  const mounted = useRef(false);

  // Release the camera when the exam screen goes away (deferred so React strict mode's test unmount does not stop it)
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      setTimeout(() => {
        if (!mounted.current) stopStream(streamRef.current);
      }, 0);
    };
  }, []);

  // Show the live preview
  useEffect(() => {
    if (!videoEl) return;
    videoEl.srcObject = stream;
    if (stream) videoEl.play().catch(() => {});
  }, [videoEl, stream]);

  /* ----------------------------- full screen ----------------------------- */

  useEffect(() => {
    if (!active || !fsSupported) return;
    const onChange = () => {
      if (document.fullscreenElement) {
        setFsWarning(false);
        setFsError('');
        return;
      }
      reportRef.current('FULLSCREEN_EXIT');
      setFsWarning(true);
    };
    document.addEventListener('fullscreenchange', onChange);
    // Starting (or resuming after a refresh) outside full screen: ask for it, but it is not a violation.
    if (!document.fullscreenElement) setFsWarning(true);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, [active, fsSupported]);

  const reenterFullscreen = useCallback(async () => {
    const ok = await enterFullscreen();
    if (ok) {
      setFsWarning(false);
      setFsError('');
    } else setFsError('Full screen was blocked. Allow full screen for this site in your browser, then try again.');
  }, []);

  /* ------------------------ focus, clipboard, shortcuts ------------------------ */

  useEffect(() => {
    if (!active) return;
    const r = (t: ProctorEventType, d?: string) => reportRef.current(t, d);
    const block = (e: Event) => e.preventDefault();

    const style = document.createElement('style');
    style.id = GUARD_STYLE_ID;
    style.textContent = '@media print { body { display: none !important; } } .exam-guard, .exam-guard * { -webkit-user-select: none; user-select: none; -webkit-touch-callout: none; }';
    document.head.appendChild(style);

    const onVisibility = () => {
      if (document.hidden) r('TAB_HIDDEN');
    };
    const onBlur = () => r('WINDOW_BLUR');
    const onCopy = (e: Event) => {
      e.preventDefault();
      r('COPY');
    };
    const onCut = (e: Event) => {
      e.preventDefault();
      r('CUT');
    };
    const onPaste = (e: Event) => {
      e.preventDefault();
      r('PASTE');
    };
    const onContext = (e: Event) => {
      e.preventDefault();
      r('CONTEXT_MENU');
    };
    const onBeforePrint = () => r('PRINT');
    const onKeyDown = (e: KeyboardEvent) => {
      const k = (e.key || '').toLowerCase();
      const mod = e.ctrlKey || e.metaKey;
      if (k === 'f12') {
        e.preventDefault();
        r('SHORTCUT', 'F12');
      } else if (mod && e.shiftKey && (k === 'i' || k === 'j' || k === 'c')) {
        e.preventDefault();
        r('SHORTCUT', `Ctrl+Shift+${k.toUpperCase()}`);
      } else if (mod && k === 'u') {
        e.preventDefault();
        r('SHORTCUT', 'Ctrl+U');
      } else if (mod && (k === 'p' || k === 's')) {
        e.preventDefault();
        r('PRINT', k === 'p' ? 'Ctrl+P' : 'Ctrl+S');
      } else if (mod && k === 'a') {
        e.preventDefault();
        r('SHORTCUT', 'Ctrl+A');
      } else if (mod && k === 'c') {
        e.preventDefault();
        r('COPY', 'Ctrl+C');
      } else if (mod && k === 'x') {
        e.preventDefault();
        r('CUT', 'Ctrl+X');
      } else if (mod && k === 'v') {
        e.preventDefault();
        r('PASTE', 'Ctrl+V');
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'PrintScreen') {
        r('SHORTCUT', 'PrintScreen');
        // Best effort: replace whatever the screenshot put on the clipboard.
        navigator.clipboard?.writeText(' ').catch(() => {});
      }
    };

    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('blur', onBlur);
    document.addEventListener('copy', onCopy);
    document.addEventListener('cut', onCut);
    document.addEventListener('paste', onPaste);
    document.addEventListener('contextmenu', onContext);
    document.addEventListener('selectstart', block);
    document.addEventListener('dragstart', block);
    window.addEventListener('beforeprint', onBeforePrint);
    window.addEventListener('keydown', onKeyDown, true);
    window.addEventListener('keyup', onKeyUp, true);
    return () => {
      style.remove();
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('blur', onBlur);
      document.removeEventListener('copy', onCopy);
      document.removeEventListener('cut', onCut);
      document.removeEventListener('paste', onPaste);
      document.removeEventListener('contextmenu', onContext);
      document.removeEventListener('selectstart', block);
      document.removeEventListener('dragstart', block);
      window.removeEventListener('beforeprint', onBeforePrint);
      window.removeEventListener('keydown', onKeyDown, true);
      window.removeEventListener('keyup', onKeyUp, true);
    };
  }, [active]);

  /* ------------------------------ camera watch ------------------------------ */

  const markProblem = useCallback((kind: Exclude<CameraProblem, null>) => {
    if (problemRef.current) return; // one report per episode
    problemRef.current = kind;
    setProblem(kind);
    reportRef.current('CAMERA_LOST', kind === 'covered' ? 'covered or black image' : 'camera stopped');
  }, []);

  useEffect(() => {
    if (!active || !requireCamera || !stream) return;
    const track = stream.getVideoTracks()[0];
    let muteTimer: ReturnType<typeof setTimeout> | undefined;
    const onEnded = () => markProblem('stopped');
    const onMute = () => {
      muteTimer = setTimeout(() => {
        if (track?.muted) markProblem('stopped');
      }, 5000);
    };
    const onUnmute = () => clearTimeout(muteTimer);
    if (!track || track.readyState === 'ended') markProblem('stopped');
    track?.addEventListener('ended', onEnded);
    track?.addEventListener('mute', onMute);
    track?.addEventListener('unmute', onUnmute);

    // A covered lens keeps the track alive but sends black frames: look at the preview now and then.
    let dark = 0;
    const watch = setInterval(() => {
      const v = videoRef.current;
      if (!v || document.hidden || !streamIsLive(stream)) return;
      const covered = looksCovered(frameStats(v));
      if (covered) {
        dark += 1;
        if (dark >= 2) markProblem('covered');
      } else {
        dark = 0;
        if (problemRef.current === 'covered') {
          problemRef.current = null;
          setProblem(null);
        }
      }
    }, 8000);

    return () => {
      clearTimeout(muteTimer);
      clearInterval(watch);
      track?.removeEventListener('ended', onEnded);
      track?.removeEventListener('mute', onMute);
      track?.removeEventListener('unmute', onUnmute);
    };
  }, [active, requireCamera, stream, markProblem]);

  const reenableCamera = useCallback(async () => {
    setCameraBusy(true);
    setCameraError('');
    const r = await requestCamera();
    if (r.stream) {
      stopStream(streamRef.current);
      problemRef.current = null;
      setProblem(null);
      setStream(r.stream);
    } else setCameraError(r.error || 'Could not start the camera.');
    setCameraBusy(false);
  }, []);

  /* ---------------------------- random still photos ---------------------------- */

  useEffect(() => {
    if (!active || !requireCamera || !stream) return;
    void preloadFaceDetector(); // lazy and optional: never blocks the exam
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const pending: { blob: Blob; face: number | null }[] = [];
    let uploading = false;

    const drain = async () => {
      if (uploading || cancelled) return;
      uploading = true;
      try {
        while (pending.length && !cancelled) {
          const item = pending[0];
          const form = new FormData();
          form.append('image', item.blob, 'capture.jpg');
          if (item.face !== null) form.append('faceCount', String(item.face));
          let res: Response;
          try {
            res = await fetch(`/api/mcq/attempts/${attemptId}/captures`, { method: 'POST', body: form, headers: { [SESSION_HEADER]: sessionToken } });
          } catch {
            break; // offline: keep it and try again later
          }
          if (res.ok) pending.shift();
          else if (res.status === 409) {
            const data = await res.json().catch(() => ({}));
            if (data?.code === 'SESSION_REPLACED') replacedRef.current();
            pending.length = 0;
          } else if (res.status >= 500 || res.status === 429 || res.status === 401) break;
          else pending.shift(); // refused (too large, wrong type): do not retry
        }
      } finally {
        uploading = false;
      }
    };

    const capture = async () => {
      const v = videoRef.current;
      if (!v || cancelled || !streamIsLive(stream)) return;
      const enc = await encodeStill(v, { maxWidth: 480, quality: 0.6, maxBytes: MAX_CAPTURE_BYTES - 10_000 });
      if (!enc || cancelled) return;
      if (looksCovered(frameStats(v))) markProblem('covered');
      const face = await countFaces(enc.canvas);
      if (face === 0) reportRef.current('FACE_MISSING');
      else if (face !== null && face >= 2) reportRef.current('MULTIPLE_FACES', `${face} faces`);
      if (pending.length < 10) pending.push({ blob: enc.blob, face });
      void drain();
    };

    // One photo at a random moment inside every window, never in the same place twice, never while the tab is hidden.
    const windowMs = Math.max(30, captureEverySeconds) * 1000;
    const t0 = performance.now();
    let k = 0;
    let last = t0;
    const plan = () => {
      if (cancelled) return;
      const now = performance.now();
      const winEnd = t0 + (k + 1) * windowMs;
      let at = t0 + k * windowMs + randomUnit() * windowMs;
      at = Math.max(at, now + 2000, last + Math.min(10_000, windowMs * 0.2));
      const fire = async () => {
        if (cancelled) return;
        if ((document.hidden || problemRef.current) && performance.now() < winEnd) {
          timer = setTimeout(fire, 2500); // wait for the student to come back, still inside this window
          return;
        }
        if (!document.hidden && !problemRef.current) {
          last = performance.now();
          await capture();
        }
        k = Math.max(k + 1, Math.floor((performance.now() - t0) / windowMs));
        plan();
      };
      timer = setTimeout(fire, at - now);
    };
    plan();
    const retry = setInterval(() => void drain(), 20_000);
    return () => {
      cancelled = true;
      clearTimeout(timer);
      clearInterval(retry);
    };
  }, [active, requireCamera, stream, captureEverySeconds, attemptId, sessionToken, markProblem]);

  return { stream, videoRef: setVideoEl, fsSupported, fsWarning, fsError, reenterFullscreen, cameraProblem: problem, cameraBusy, cameraError, reenableCamera };
}

/* ------------------------------- interface ------------------------------- */

export function ProctoringBanner({
  videoRef,
  showCamera,
  cameraProblem,
  violations,
  maxViolations,
}: {
  videoRef: (el: HTMLVideoElement | null) => void;
  showCamera: boolean;
  cameraProblem: CameraProblem;
  violations: number;
  maxViolations: number;
}) {
  const bad = violations > 0;
  return (
    <div role="region" aria-label="Proctoring status" className="bg-amber-50 border-b border-amber-200 text-amber-900">
      <div className="w-full px-4 sm:px-6 lg:px-10 py-1.5 flex items-center gap-3 text-xs sm:text-sm">
        <ShieldCheck className="w-4 h-4 shrink-0" aria-hidden />
        <p className="font-semibold min-w-0 flex-1 truncate sm:flex-none">Proctoring in progress</p>
        <p className={`hidden md:block flex-1 text-amber-900/80`}>Stay in full screen on this tab. Switching away is recorded.</p>
        {showCamera && (
          <div className="flex items-center gap-2" title={cameraProblem ? 'Your camera is not working' : 'Your camera is on. Only occasional still photos are taken.'}>
            <video ref={videoRef} muted playsInline aria-hidden className="w-9 h-7 sm:w-12 sm:h-9 rounded bg-gray-900 object-cover -scale-x-100" />
            <span className={`flex items-center gap-1 font-semibold ${cameraProblem ? 'text-red-700' : ''}`}>
              {cameraProblem ? <CameraOff className="w-4 h-4" aria-hidden /> : <Camera className="w-4 h-4 text-red-600" aria-hidden />}
              <span className="hidden sm:inline">{cameraProblem ? 'Camera off' : 'Camera on'}</span>
              <span className="sr-only sm:hidden">{cameraProblem ? 'Camera off' : 'Camera on'}</span>
            </span>
          </div>
        )}
        <p aria-live="polite" className={`shrink-0 font-semibold tabular-nums ${bad ? 'text-red-700' : ''}`}>
          <span className="sm:hidden" aria-hidden>
            {violations}/{maxViolations}
          </span>
          <span className="sr-only sm:not-sr-only">
            Violations {violations} of {maxViolations}
          </span>
        </p>
      </div>
    </div>
  );
}

export function FullscreenWarning({ violations, maxViolations, error, onReenter }: { violations: number; maxViolations: number; error?: string; onReenter: () => void }) {
  const left = maxViolations - violations;
  return (
    <Dialog
      title="Return to full screen"
      tone="danger"
      actions={
        <button type="button" onClick={onReenter} className={primaryBtn}>
          <Maximize className="w-4 h-4" /> Return to full screen
        </button>
      }
    >
      <p>This exam must be taken in full screen. Leaving it is recorded. Your timer is still running.</p>
      <p className="font-semibold text-gray-900">
        Violations so far: {violations} of {maxViolations}.{' '}
        {violations > 0 ? (left <= 1 ? 'One more and your exam is submitted automatically.' : `${left} more and your exam is submitted automatically.`) : ''}
      </p>
      {error && (
        <p role="alert" className="flex items-start gap-2 text-red-700">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden /> {error}
        </p>
      )}
    </Dialog>
  );
}

export function CameraProblemDialog({ problem, busy, error, onRetry }: { problem: Exclude<CameraProblem, null>; busy: boolean; error: string; onRetry: () => void }) {
  return (
    <Dialog
      title={problem === 'covered' ? 'Your camera looks covered' : 'Your camera stopped'}
      tone="danger"
      actions={
        <button type="button" onClick={onRetry} disabled={busy} className={primaryBtn}>
          {busy ? <ButtonSpinner label="Starting camera..." /> : (<><Camera className="w-4 h-4" /> Turn camera back on</>)}
        </button>
      }
    >
      <p>
        {problem === 'covered'
          ? 'The camera image is black. Uncover the lens and make sure the room is lit, then turn the camera back on.'
          : 'This exam needs your camera for the whole time. Check that it is plugged in and not used by another app, then turn it back on.'}
      </p>
      <p>This was recorded for your teacher. Your timer is still running.</p>
      {error && (
        <p role="alert" className="flex items-start gap-2 text-red-700">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden /> {error}
        </p>
      )}
    </Dialog>
  );
}
