'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { COUNTED_TYPES, EVENT_LABELS, HEARTBEAT_SECONDS, type ProctorEventType } from '@/lib/proctor';
import { apiJson, jsonInit, ServerClock } from './api';
import { ApiError, type AttemptResult, type ExamEventInput, type StartData } from './types';

export type Connection = 'ok' | 'reconnecting';

/* The session token lives in sessionStorage (per tab) so a refresh resumes the SAME attempt. */
const storeKey = (testKey: string) => `exam-session:${testKey}`;
export function loadStoredSession(testKey: string): { attemptId: string; sessionToken: string } | null {
  try {
    const raw = sessionStorage.getItem(storeKey(testKey));
    if (!raw) return null;
    const v = JSON.parse(raw);
    return v && typeof v.attemptId === 'string' && typeof v.sessionToken === 'string' ? v : null;
  } catch {
    return null;
  }
}
export function saveStoredSession(testKey: string, attemptId: string, sessionToken: string) {
  try {
    sessionStorage.setItem(storeKey(testKey), JSON.stringify({ attemptId, sessionToken }));
  } catch {}
}
export function clearStoredSession(testKey: string) {
  try {
    sessionStorage.removeItem(storeKey(testKey));
  } catch {}
}

interface Options {
  testKey: string;
  start: StartData;
  answers: Record<string, number>;
  /** Called once with the final result (manual submit, time up, server deadline or violation limit). */
  onFinished: (result: AttemptResult) => void;
}

export interface RunNotice {
  id: number;
  text: string;
}

/**
 * Everything that talks to the server while an exam is running: the server owned countdown, the heartbeat that also
 * autosaves answers, batched proctoring events, offline recovery, the single session rule and submitting.
 */
export function useExamRun({ testKey, start, answers, onFinished }: Options) {
  const attemptId = start.attemptId;
  const token = start.sessionToken;

  const [remaining, setRemaining] = useState(start.remainingSeconds);
  const [violations, setViolations] = useState(start.violations);
  const [maxViolations, setMaxViolations] = useState(start.maxViolations);
  const [connection, setConnection] = useState<Connection>('ok');
  const [replaced, setReplaced] = useState(false);
  const [signedOut, setSignedOut] = useState(false);
  const [fatal, setFatal] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [timeUp, setTimeUp] = useState(false);
  const [notice, setNotice] = useState<RunNotice | null>(null);

  const clockRef = useRef<ServerClock>(new ServerClock());
  const syncRef = useRef({ rem: start.remainingSeconds, at: performance.now() });
  const doneRef = useRef(false);
  const answersRef = useRef(answers);
  answersRef.current = answers;
  const ackedRef = useRef(JSON.stringify(start.answers || {}));
  const hbInFlight = useRef(false);
  const hbPending = useRef(false);
  const failsRef = useRef(0);
  const offlineReported = useRef(false);
  const queueRef = useRef<ExamEventInput[]>([]);
  const flushing = useRef(false);
  const flushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSent = useRef<Record<string, number>>({});
  const submittingRef = useRef(false);
  const violationsRef = useRef(start.violations);
  const onFinishedRef = useRef(onFinished);
  onFinishedRef.current = onFinished;
  const noticeSeq = useRef(0);
  const maxRef = useRef(start.maxViolations);

  if (!clockRef.current.synced) clockRef.current.sync(start.serverNow);

  const resync = useCallback((rem: unknown, serverNow: unknown, sentAt?: number) => {
    if (typeof rem !== 'number') return;
    const now = performance.now();
    // Count from the middle of the round trip, so a slow connection does not eat the student's time.
    const at = sentAt !== undefined ? (sentAt + now) / 2 : now;
    syncRef.current = { rem, at };
    if (typeof serverNow === 'string') clockRef.current.sync(serverNow);
  }, []);

  const finish = useCallback(
    (result: AttemptResult) => {
      if (doneRef.current) return;
      doneRef.current = true;
      clearStoredSession(testKey);
      if (flushTimer.current) clearTimeout(flushTimer.current);
      onFinishedRef.current(result);
    },
    [testKey]
  );

  const markOnline = useCallback(() => {
    failsRef.current = 0;
    offlineReported.current = false;
    setConnection('ok');
    setSignedOut(false);
  }, []);

  const markOffline = useCallback(() => {
    failsRef.current += 1;
    setConnection('reconnecting');
    if (!offlineReported.current) {
      offlineReported.current = true;
      queueRef.current.push({ type: 'OFFLINE', clientAt: new Date().toISOString() });
    }
  }, []);

  /** Shared handling of failed calls. Returns true when the failure ended the exam in this tab. */
  const handleError = useCallback(
    (e: unknown): boolean => {
      const err = e as ApiError;
      if (err?.status === 409 && err.code === 'SESSION_REPLACED') {
        doneRef.current = true;
        clearStoredSession(testKey);
        setReplaced(true);
        return true;
      }
      if (err?.status === 409 && err.data?.result) {
        finish(err.data.result as AttemptResult);
        return true;
      }
      if (err?.status === 409) {
        // Already submitted somewhere else: fetch the result.
        apiJson<{ result: AttemptResult }>(`/api/mcq/attempts/${attemptId}`)
          .then((d) => finish(d.result))
          .catch(() => {});
        return false;
      }
      if (err?.status === 401) {
        setSignedOut(true);
        markOffline();
        return false;
      }
      if (err?.status === 404) {
        doneRef.current = true;
        setFatal('This exam attempt could not be found. Go back to the test page and open it again.');
        return true;
      }
      if (!err || err.status === 0 || err.status >= 500 || err.status === 429) {
        markOffline();
        return false;
      }
      return false;
    },
    [attemptId, finish, markOffline, testKey]
  );

  /* ------------------------------- events ------------------------------- */

  const flushEvents = useCallback(async () => {
    if (doneRef.current || flushing.current || !queueRef.current.length) return;
    flushing.current = true;
    const batch = queueRef.current.slice(0, 20);
    try {
      const data = await apiJson<{ violations: number; maxViolations: number; autoSubmitted: boolean; result?: AttemptResult; remainingSeconds?: number }>(
        `/api/mcq/attempts/${attemptId}/events`,
        jsonInit('POST', { events: batch, answers: answersRef.current }, token)
      );
      queueRef.current.splice(0, batch.length);
      markOnline();
      if (typeof data.violations === 'number') {
        const grew = data.violations > violationsRef.current;
        violationsRef.current = data.violations;
        setViolations(data.violations);
        if (typeof data.maxViolations === 'number') {
          maxRef.current = data.maxViolations;
          setMaxViolations(data.maxViolations);
        }
        if (grew && !data.autoSubmitted) {
          const counted = [...batch].reverse().find((b) => COUNTED_TYPES.includes(b.type as ProctorEventType));
          const what = counted ? EVENT_LABELS[counted.type as ProctorEventType] : 'A rule was broken';
          const max = data.maxViolations || maxRef.current;
          const left = max - data.violations;
          noticeSeq.current += 1;
          setNotice({
            id: noticeSeq.current,
            text: `Warning recorded: ${what.charAt(0).toLowerCase()}${what.slice(1)}. Violation ${data.violations} of ${max}. ${left === 1 ? 'One more and your exam is submitted automatically.' : `${left} more and your exam is submitted automatically.`}`,
          });
        }
      }
      if (data.autoSubmitted && data.result) finish(data.result);
    } catch (e) {
      const err = e as ApiError;
      if (err?.status === 400) queueRef.current.splice(0, batch.length); // a batch the server refuses must not block the queue
      else handleError(e);
    } finally {
      flushing.current = false;
      if (!doneRef.current && queueRef.current.length && failsRef.current === 0) {
        if (flushTimer.current) clearTimeout(flushTimer.current);
        flushTimer.current = setTimeout(() => void flushEvents(), 300);
      }
    }
  }, [attemptId, finish, handleError, markOnline, token]);

  const report = useCallback(
    (type: ProctorEventType, detail?: string) => {
      if (doneRef.current) return;
      // Identical bursts (a key held down, a double fired browser event) are sent once.
      const nowMs = performance.now();
      const dedupeKey = type === 'SHORTCUT' ? type + (detail || '') : type;
      if (nowMs - (lastSent.current[dedupeKey] ?? -1e9) < (type === 'SHORTCUT' ? 250 : 600)) return;
      lastSent.current[dedupeKey] = nowMs;
      queueRef.current.push({ type, clientAt: new Date().toISOString(), ...(detail ? { detail: detail.slice(0, 200) } : {}) });
      if (flushTimer.current) clearTimeout(flushTimer.current);
      // Counted events go out straight away; the rest are batched for a moment.
      flushTimer.current = setTimeout(() => void flushEvents(), COUNTED_TYPES.includes(type) ? 0 : 1500);
    },
    [flushEvents]
  );

  /* ------------------------------ heartbeat ------------------------------ */

  const sendHeartbeat = useCallback(
    async (force = false) => {
      if (doneRef.current) return;
      if (hbInFlight.current) {
        if (force) hbPending.current = true;
        return;
      }
      hbInFlight.current = true;
      const sentAt = performance.now();
      const json = JSON.stringify(answersRef.current);
      const changed = json !== ackedRef.current;
      try {
        const data = await apiJson<any>(`/api/mcq/attempts/${attemptId}`, jsonInit('PATCH', changed ? { answers: answersRef.current } : {}, token));
        markOnline();
        if (data.status === 'SUBMITTED' && data.result) {
          finish(data.result as AttemptResult);
          return;
        }
        if (changed) ackedRef.current = json;
        resync(data.remainingSeconds, data.serverNow, sentAt);
        if (typeof data.violations === 'number' && data.violations > violationsRef.current) {
          violationsRef.current = data.violations;
          setViolations(data.violations);
        }
        if (queueRef.current.length) void flushEvents();
      } catch (e) {
        handleError(e);
      } finally {
        hbInFlight.current = false;
        if (hbPending.current && !doneRef.current) {
          hbPending.current = false;
          void sendHeartbeat();
        }
      }
    },
    [attemptId, finish, flushEvents, handleError, markOnline, resync, token]
  );

  // Heartbeat loop with backoff while the connection is failing
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    let stopped = false;
    const loop = async () => {
      if (stopped || doneRef.current) return;
      await sendHeartbeat();
      if (stopped || doneRef.current) return;
      const fails = failsRef.current;
      const delay = fails === 0 ? HEARTBEAT_SECONDS * 1000 : Math.min(30_000, 2000 * 2 ** Math.min(fails, 4));
      timer = setTimeout(loop, delay);
    };
    timer = setTimeout(loop, HEARTBEAT_SECONDS * 1000);
    const wake = () => {
      if (!stopped && !doneRef.current) void sendHeartbeat(true);
    };
    window.addEventListener('online', wake);
    document.addEventListener('visibilitychange', wake);
    return () => {
      stopped = true;
      clearTimeout(timer);
      window.removeEventListener('online', wake);
      document.removeEventListener('visibilitychange', wake);
    };
  }, [sendHeartbeat]);

  // Save soon after each answer change
  useEffect(() => {
    if (JSON.stringify(answers) === ackedRef.current) return;
    const id = setTimeout(() => void sendHeartbeat(true), 1000);
    return () => clearTimeout(id);
  }, [answers, sendHeartbeat]);

  /** Another tab or device took the exam over (reported by any call that gets a SESSION_REPLACED answer). */
  const markReplaced = useCallback(() => {
    doneRef.current = true;
    clearStoredSession(testKey);
    setReplaced(true);
  }, [testKey]);

  /* ------------------------------- submit ------------------------------- */

  const submit = useCallback(async () => {
    if (doneRef.current || submittingRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);
    setSubmitError('');
    try {
      const data = await apiJson<{ result: AttemptResult }>(`/api/mcq/attempts/${attemptId}/submit`, jsonInit('POST', { answers: answersRef.current }, token));
      finish(data.result);
    } catch (e) {
      if (!handleError(e)) setSubmitError((e as ApiError)?.status === 0 ? 'Could not reach the server. Your answers are kept; check your connection and try again.' : (e as Error).message || 'Could not submit the test.');
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }, [attemptId, finish, handleError, token]);

  /* -------------------------------- timer -------------------------------- */

  useEffect(() => {
    const tick = () => {
      const s = syncRef.current;
      const left = Math.max(0, Math.ceil(s.rem - (performance.now() - s.at) / 1000));
      setRemaining(left);
      if (left <= 0 && !doneRef.current) setTimeUp(true);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  // When the clock reaches zero, submit (retrying while offline). The server also closes the attempt at its own deadline.
  useEffect(() => {
    if (!timeUp) return;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;
    const attempt = async () => {
      if (stopped || doneRef.current) return;
      await submit();
      if (!stopped && !doneRef.current) timer = setTimeout(attempt, 4000);
    };
    void attempt();
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, [timeUp, submit]);

  // Remember the session for a refresh and clean up
  useEffect(() => {
    saveStoredSession(testKey, attemptId, token);
  }, [testKey, attemptId, token]);

  useEffect(() => {
    const t = flushTimer;
    return () => {
      if (t.current) clearTimeout(t.current);
    };
  }, []);

  return { remaining, violations, maxViolations, connection, replaced, signedOut, fatal, submitting, submitError, timeUp, notice, report, submit, markReplaced, clock: clockRef.current };
}
