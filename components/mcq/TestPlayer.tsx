'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, Clock, Flag, MonitorX, WifiOff } from 'lucide-react';
import { AttemptResult, OPTION_LABELS, formatClock } from '@/lib/mcq';
import { ButtonSpinner } from '@/components/ui/Loaders';
import { apiJson, jsonInit } from '@/components/exam/api';
import { leaveFullscreen, stopStream } from '@/components/exam/camera';
import { Notice } from '@/components/exam/Notice';
import { PreExam } from '@/components/exam/PreExam';
import { clearStoredSession, loadStoredSession, useExamRun } from '@/components/exam/useExamRun';
import type { ApiError, StartData } from '@/components/exam/types';
import { Dialog, primaryBtn, secondaryBtn } from './Dialog';
import { QuestionPalette } from './QuestionPalette';
import { ResultsView } from './ResultsView';
import { CameraProblemDialog, FullscreenWarning, ProctoringBanner, useProctoring } from './ProctoringManager';

export interface TestInfo {
  key: string;
  title: string;
  courseTitle: string;
  questionCount: number;
  timeLimit: number;
  passingMarks: number;
  allowRetakes: boolean;
  isSample: boolean;
  /** MCQ assignments run without full screen, camera or the pre-exam steps. Real tests are proctored. */
  proctored?: boolean;
}

type Phase = 'intro' | 'running' | 'done';

export function TestPlayer({ test, canStart, blockedReason, inProgress }: { test: TestInfo; canStart: boolean; blockedReason?: string; inProgress: boolean }) {
  const [phase, setPhase] = useState<Phase>('intro');
  const [data, setData] = useState<StartData | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [result, setResult] = useState<AttemptResult | null>(null);
  const proctored = test.proctored !== false;

  const onFinished = useCallback((r: AttemptResult) => {
    setResult(r);
    setPhase('done');
    window.scrollTo({ top: 0 });
  }, []);

  if (phase === 'running' && data) {
    return <Runner key={data.attemptId} test={test} data={data} stream={stream} proctored={proctored} onFinished={onFinished} />;
  }

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

  if (proctored) {
    return (
      <PreExam
        testKey={test.key}
        onReady={(d, s) => {
          setData(d);
          setStream(s);
          setPhase('running');
          window.scrollTo({ top: 0 });
        }}
      />
    );
  }

  return (
    <SimpleIntro
      test={test}
      canStart={canStart}
      blockedReason={blockedReason}
      inProgress={inProgress}
      onReady={(d) => {
        setData(d);
        setPhase('running');
      }}
    />
  );
}

/** MCQ assignments: no full screen, camera or checks. Just rules of the test and a start button. */
function SimpleIntro({ test, canStart, blockedReason, inProgress, onReady }: { test: TestInfo; canStart: boolean; blockedReason?: string; inProgress: boolean; onReady: (d: StartData) => void }) {
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState('');

  const start = async () => {
    setError('');
    setStarting(true);
    try {
      const stored = loadStoredSession(test.key);
      const d = await apiJson<StartData>('/api/mcq/start', jsonInit('POST', { testKey: test.key, ...(stored ? { tabToken: stored.sessionToken } : {}) }));
      onReady(d);
    } catch (e) {
      const err = e as ApiError;
      if (err.code === 'ACTIVE_ELSEWHERE') setError('This test is already open in another tab or device. Close it there and try again in a minute.');
      else setError(err.message);
      setStarting(false);
    }
  };

  return (
    <section className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4 max-w-3xl" aria-labelledby="before-begin">
      <h2 id="before-begin" className="text-xl font-semibold text-gray-900">
        Before you begin
      </h2>
      <ul className="text-sm text-gray-700 space-y-2 max-w-prose list-disc pl-5">
        <li>
          You have <strong>{test.timeLimit} minutes</strong> for {test.questionCount} questions. The test is submitted automatically at 00:00.
        </li>
        <li>One answer per question. You can move back, change answers and flag questions for review.</li>
      </ul>
      {error && <Notice tone="error">{error}</Notice>}
      {!canStart && blockedReason && <p className="text-sm text-gray-700">{blockedReason}</p>}
      <button type="button" onClick={start} disabled={starting || !canStart} className={primaryBtn}>
        {starting ? <ButtonSpinner label="Starting..." /> : inProgress ? 'Resume' : 'Start'}
      </button>
    </section>
  );
}

/* ------------------------------ running exam ------------------------------ */

function Runner({ test, data, stream, proctored, onFinished }: { test: TestInfo; data: StartData; stream: MediaStream | null; proctored: boolean; onFinished: (r: AttemptResult) => void }) {
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>(data.answers || {});
  const [flagged, setFlagged] = useState<Set<string>>(new Set());
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [announce, setAnnounce] = useState('');
  const [toast, setToast] = useState<{ id: number; text: string } | null>(null);
  const streamRef = useRef<MediaStream | null>(stream);

  const handleFinished = useCallback(
    (r: AttemptResult) => {
      stopStream(streamRef.current);
      void leaveFullscreen();
      onFinished(r);
    },
    [onFinished]
  );

  const run = useExamRun({ testKey: test.key, start: data, answers, onFinished: handleFinished });
  const ended = run.replaced || Boolean(run.fatal);
  const useCamera = proctored && data.requireCamera;

  const proctor = useProctoring({
    active: proctored && !ended,
    initialStream: stream,
    requireCamera: useCamera,
    captureEverySeconds: data.captureEverySeconds,
    attemptId: data.attemptId,
    sessionToken: data.sessionToken,
    report: run.report,
    onSessionReplaced: run.markReplaced,
  });
  streamRef.current = proctor.stream;

  // This tab lost the exam to another one, or hit a fatal error: release the camera and full screen
  useEffect(() => {
    if (!ended) return;
    stopStream(streamRef.current);
    void leaveFullscreen();
  }, [ended]);

  // Warn before accidentally closing the tab
  useEffect(() => {
    if (ended) return;
    const h = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', h);
    return () => window.removeEventListener('beforeunload', h);
  }, [ended]);

  // Violation notices show for a while
  useEffect(() => {
    if (!run.notice) return;
    setToast(run.notice);
    const id = setTimeout(() => setToast((t) => (t && t.id === run.notice!.id ? null : t)), 12000);
    return () => clearTimeout(id);
  }, [run.notice]);

  // Spoken time checks at sensible intervals (the visible timer itself is not announced every second)
  useEffect(() => {
    const marks: Record<number, string> = { 600: '10 minutes remaining', 300: '5 minutes remaining', 60: '1 minute remaining', 30: '30 seconds remaining', 10: '10 seconds remaining' };
    if (marks[run.remaining]) setAnnounce(marks[run.remaining]);
  }, [run.remaining]);

  const ids = useMemo(() => data.questions.map((q) => q.id), [data.questions]);
  const answeredCount = ids.filter((id) => answers[id] !== undefined).length;
  const flaggedCount = ids.filter((id) => flagged.has(id)).length;

  if (run.replaced) {
    return (
      <div className="fixed inset-0 z-[90] bg-gray-50 overflow-y-auto flex items-center justify-center p-4" data-testid="session-replaced">
        <section role="alert" className="w-full max-w-lg bg-white rounded-2xl border border-gray-200 p-6 sm:p-8 space-y-4">
          <MonitorX className="w-8 h-8 text-red-700" aria-hidden />
          <h1 className="text-2xl font-semibold text-gray-900">This exam was opened in another tab or device</h1>
          <p className="text-sm text-gray-700 max-w-prose">
            An exam can only be open in one place at a time, so this tab has been stopped. Your answers up to your last save are kept, and your timer is still running. Continue in the other tab. To continue here instead, close the other tab, wait about a minute and reload this page.
          </p>
          <div className="flex flex-wrap gap-2">
            <button type="button" className={primaryBtn} onClick={() => window.location.reload()}>
              Reload this page
            </button>
            <Link href="/assignments?tab=tests" className={secondaryBtn}>
              Back to MCQ tests
            </Link>
          </div>
        </section>
      </div>
    );
  }

  if (run.fatal) {
    return (
      <div className="fixed inset-0 z-[90] bg-gray-50 overflow-y-auto flex items-center justify-center p-4">
        <section role="alert" className="w-full max-w-lg bg-white rounded-2xl border border-gray-200 p-6 sm:p-8 space-y-4">
          <h1 className="text-2xl font-semibold text-gray-900">This exam cannot continue</h1>
          <p className="text-sm text-gray-700">{run.fatal}</p>
          <Link
            href="/assignments?tab=tests"
            onClick={() => clearStoredSession(test.key)}
            className={secondaryBtn}
          >
            Back to MCQ tests
          </Link>
        </section>
      </div>
    );
  }

  const q = data.questions[current];
  const isFlagged = flagged.has(q.id);
  const low = run.remaining <= 60;
  const proctorDialog = proctored && (proctor.fsWarning ? 'fs' : proctor.cameraProblem ? 'camera' : null);

  return (
    <div className="exam-guard fixed inset-0 z-[90] bg-gray-50 overflow-y-auto" data-testid="test-runner">
      <div className="sticky top-0 z-10">
        {proctored && <ProctoringBanner videoRef={proctor.videoRef} showCamera={useCamera} cameraProblem={proctor.cameraProblem} violations={run.violations} maxViolations={run.maxViolations} />}
        <header className="bg-white border-b border-gray-200">
          <div className="w-full px-4 sm:px-6 lg:px-10 py-2.5 flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-base sm:text-lg font-semibold text-gray-900">{test.title}</h1>
              <p className="text-xs text-gray-600">
                Question {current + 1} of {ids.length}
              </p>
            </div>
            <div role="timer" aria-label="Time remaining" aria-live="off" className={`h-10 px-3 rounded-lg inline-flex items-center gap-2 text-base font-semibold tabular-nums ${low ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-800'}`}>
              <Clock className="w-4 h-4" aria-hidden /> {formatClock(run.remaining)}
            </div>
            <button type="button" onClick={() => setConfirmOpen(true)} disabled={run.submitting} className={`${primaryBtn} hidden sm:inline-flex`}>
              {run.submitting ? <ButtonSpinner label="Submitting..." /> : 'Submit test'}
            </button>
          </div>
        </header>
        {(run.connection === 'reconnecting' || run.signedOut || toast || run.timeUp) && (
          <div className="bg-white border-b border-gray-200 px-4 sm:px-6 lg:px-10 py-2 space-y-2">
            {run.connection === 'reconnecting' && !run.signedOut && (
              <p role="status" className="flex items-center gap-2 text-sm text-amber-900">
                <WifiOff className="w-4 h-4 shrink-0" aria-hidden /> Reconnecting, your answers are kept. The timer keeps running and everything is sent as soon as the connection is back.
              </p>
            )}
            {run.signedOut && (
              <p role="alert" className="text-sm text-red-700">
                You were signed out. Open the{' '}
                <a href={`/login?redirect=/assignments/tests/${test.key}`} target="_blank" rel="noreferrer" className="font-semibold underline">
                  login page
                </a>{' '}
                in a new tab and sign in: this exam keeps going here and your answers are kept.
              </p>
            )}
            {toast && (
              <p role="status" className="text-sm font-semibold text-red-700">
                {toast.text}
              </p>
            )}
            {run.timeUp && (
              <p role="status" className="text-sm font-semibold text-gray-900">
                Time is up. Submitting your exam{run.submitError ? '' : '...'}
                {run.submitError && <span className="font-normal text-red-700"> {run.submitError} Trying again.</span>}
              </p>
            )}
          </div>
        )}
      </div>

      <div className="w-full px-4 sm:px-6 lg:px-10 py-5 sm:py-8 grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 items-start">
        <main className="bg-white rounded-2xl border border-gray-200 p-5 sm:p-8 space-y-6">
          {run.submitError && !run.timeUp && <Notice tone="error">{run.submitError}</Notice>}
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
                    <input type="radio" name={`q-${q.id}`} checked={selected} onChange={() => setAnswers((a) => ({ ...a, [q.id]: i }))} className="mt-1 w-4 h-4 accent-amber-600 shrink-0" />
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
                className="text-sm font-semibold text-amber-700 hover:underline rounded focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_#e3eeff]"
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
              className={isFlagged ? 'h-10 px-5 rounded-lg bg-orange-50 border border-orange-400 text-orange-800 font-semibold text-sm inline-flex items-center gap-2 transition active:scale-[0.98] focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_#e3eeff]' : secondaryBtn}
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

        <aside className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4 lg:sticky lg:top-28">
          <h2 className="text-base font-semibold text-gray-900">Question palette</h2>
          <p className="text-sm text-gray-600">
            {answeredCount} of {ids.length} answered
          </p>
          <QuestionPalette ids={ids} answers={answers} flagged={flagged} current={current} onSelect={setCurrent} />
          <button type="button" onClick={() => setConfirmOpen(true)} className={`${primaryBtn} w-full sm:hidden`}>
            Submit test
          </button>
        </aside>
      </div>

      {proctorDialog === 'fs' && <FullscreenWarning violations={run.violations} maxViolations={run.maxViolations} error={proctor.fsError} onReenter={proctor.reenterFullscreen} />}
      {proctorDialog === 'camera' && proctor.cameraProblem && <CameraProblemDialog problem={proctor.cameraProblem} busy={proctor.cameraBusy} error={proctor.cameraError} onRetry={proctor.reenableCamera} />}

      {confirmOpen && !proctorDialog && (
        <Dialog
          title="Submit your test?"
          onClose={() => setConfirmOpen(false)}
          actions={
            <>
              <button type="button" onClick={() => setConfirmOpen(false)} className={secondaryBtn}>
                Keep working
              </button>
              <button
                type="button"
                disabled={run.submitting}
                onClick={async () => {
                  await run.submit();
                  setConfirmOpen(false);
                }}
                className={primaryBtn}
              >
                {run.submitting ? <ButtonSpinner label="Submitting..." /> : 'Submit test'}
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
          {run.submitError && (
            <p role="alert" className="text-red-700">
              {run.submitError}
            </p>
          )}
        </Dialog>
      )}

      <span className="sr-only" role="status" aria-live="polite">
        {announce}
      </span>
    </div>
  );
}
