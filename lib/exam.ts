import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { finalizeAttempt, parseJson, toResult } from '@/lib/mcq-server';
import { PublicQuestion, StoredQuestion } from '@/lib/mcq';
import {
  CLIENT_EVENT_TYPES,
  COUNTED_TYPES,
  DEFAULT_EXAM_SETTINGS,
  EVENT_TYPES,
  FOCUS_DEDUPE_SECONDS,
  FOCUS_FAMILY,
  SESSION_HEADER,
  SESSION_STALE_SECONDS,
  SUBMIT_GRACE_SECONDS,
  type ExamBlockCode,
  type ExamSettings,
  type ExamWindow,
  type ProctorEventType,
} from '@/lib/proctor';
import { deletePrivate } from '@/lib/proctor-storage';

/* ───────────── randomness ───────────── */

/** Fisher-Yates with a cryptographic source, so the order cannot be predicted or reproduced. */
export function shuffle<T>(items: readonly T[]): T[] {
  const a = items.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = crypto.randomInt(i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Picks the questions for ONE student's attempt: draws `questionCount` from the bank (all when empty), shuffles the
 * question order and each question's answers (remapping the correct index). The result is frozen in the attempt, so a
 * refresh or resume shows exactly the same order.
 */
export function drawQuestions(bank: StoredQuestion[], s: ExamSettings): StoredQuestion[] {
  let pool = bank.slice();
  if (s.questionCount && s.questionCount > 0 && s.questionCount < pool.length) pool = shuffle(pool).slice(0, s.questionCount);
  if (s.randomizeQuestions) pool = shuffle(pool);
  else pool.sort((a, b) => bank.findIndex((q) => q.id === a.id) - bank.findIndex((q) => q.id === b.id));
  if (!s.randomizeOptions) return pool;
  return pool.map((q) => {
    const order = shuffle(q.options.map((_, i) => i));
    return { ...q, options: order.map((i) => q.options[i]), correctIndex: order.indexOf(q.correctIndex) };
  });
}

export const toPublic = (qs: StoredQuestion[]): PublicQuestion[] => qs.map((q) => ({ id: q.id, text: q.text, options: q.options }));

/* ───────────── schedule and timer ───────────── */

export function examWindow(s: ExamSettings, now = new Date()): ExamWindow {
  if (s.startsAt && now < s.startsAt) return 'before';
  if (s.endsAt && now > s.endsAt) return 'closed';
  return 'open';
}

/** The moment an attempt must end: its time limit, or the exam window's close, whichever comes first. */
export function deadlineFor(start: Date, timeLimitMinutes: number, s: ExamSettings): Date {
  const byLimit = new Date(start.getTime() + timeLimitMinutes * 60_000);
  return s.endsAt && s.endsAt < byLimit ? s.endsAt : byLimit;
}

export const attemptDeadline = (a: { startedAt: Date; timeLimit: number; deadlineAt: Date | null }) => a.deadlineAt ?? new Date(a.startedAt.getTime() + a.timeLimit * 60_000);
export const remainingSeconds = (deadline: Date, now = new Date()) => Math.max(0, Math.round((deadline.getTime() - now.getTime()) / 1000));

/** Settings for the exam an attempt belongs to (the built-in practice test has none, so it uses the defaults). */
export async function settingsForTestKey(testKey: string): Promise<ExamSettings> {
  if (testKey.startsWith('sample-')) return { ...DEFAULT_EXAM_SETTINGS };
  const t = await prisma.mcqTest.findUnique({ where: { id: testKey } });
  if (!t) return { ...DEFAULT_EXAM_SETTINGS };
  return {
    requireCamera: t.requireCamera,
    requireIdCheck: t.requireIdCheck,
    requireConsent: t.requireConsent,
    accessCode: t.accessCode,
    startsAt: t.startsAt,
    endsAt: t.endsAt,
    questionCount: t.questionCount,
    randomizeQuestions: t.randomizeQuestions,
    randomizeOptions: t.randomizeOptions,
    maxViolations: t.maxViolations,
    captureEverySeconds: t.captureEverySeconds,
    photoRetentionDays: t.photoRetentionDays,
  };
}

/* ───────────── one active session ───────────── */

export const newSessionToken = () => crypto.randomBytes(24).toString('base64url');
export const hashToken = (t: string) => crypto.createHash('sha256').update(t).digest('hex');

export function safeEqual(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

export const sessionIsFresh = (a: { sessionLastSeenAt: Date | null }, now = new Date()) => Boolean(a.sessionLastSeenAt && now.getTime() - a.sessionLastSeenAt.getTime() < SESSION_STALE_SECONDS * 1000);

export function deviceLabel(req: NextRequest) {
  return (req.headers.get('user-agent') || 'unknown').slice(0, 160);
}

export const blocked = (code: ExamBlockCode, message: string, status = 403) => NextResponse.json({ code, error: message }, { status });

/**
 * Loads an attempt for its owner and checks the session token. Returns the attempt, or a ready-made error response.
 * A tab that does not hold the current token is told its exam was taken over.
 */
export async function loadOwnedAttempt(req: NextRequest, userId: string, attemptId: string, opts: { requireSession?: boolean } = {}) {
  const attempt = await prisma.mcqAttempt.findUnique({ where: { id: attemptId } });
  if (!attempt || attempt.userId !== userId) return { error: NextResponse.json({ error: 'Not found' }, { status: 404 }) } as const;
  if (opts.requireSession !== false) {
    const token = req.headers.get(SESSION_HEADER) || '';
    if (!attempt.sessionHash || !token || !safeEqual(hashToken(token), attempt.sessionHash)) {
      return { error: blocked('SESSION_REPLACED', 'This exam is open in another tab or device, so this one has been stopped.', 409) } as const;
    }
  }
  return { attempt } as const;
}

/* ───────────── finishing an attempt ───────────── */

/** Submits an attempt whose server deadline has passed (graded on the last autosave). */
export async function finishIfExpired(attempt: { id: string; startedAt: Date; timeLimit: number; deadlineAt: Date | null; answers: string; violations: number; status: string }) {
  if (attempt.status !== 'IN_PROGRESS') return null;
  if (Date.now() < attemptDeadline(attempt).getTime()) return null;
  const done = await finalizeAttempt(attempt.id, { answers: parseJson(attempt.answers, {}), violations: attempt.violations, autoSubmitted: true, autoReason: 'TIME_UP' });
  return done;
}

/** Whether a submission arriving now is still inside the grace period after the server deadline. */
export const withinGrace = (deadline: Date, now = new Date()) => now.getTime() <= deadline.getTime() + SUBMIT_GRACE_SECONDS * 1000;

/* ───────────── violation events ───────────── */

export interface IncomingEvent {
  type: ProctorEventType;
  clientAt?: Date | null;
  detail?: string | null;
}

export function parseEvents(raw: unknown): IncomingEvent[] {
  if (!Array.isArray(raw)) return [];
  const out: IncomingEvent[] = [];
  for (const e of raw.slice(0, 20)) {
    if (!e || typeof e.type !== 'string' || !CLIENT_EVENT_TYPES.includes(e.type as ProctorEventType)) continue;
    const t = typeof e.clientAt === 'string' ? new Date(e.clientAt) : null;
    out.push({ type: e.type as ProctorEventType, clientAt: t && !Number.isNaN(t.getTime()) ? t : null, detail: typeof e.detail === 'string' ? e.detail.slice(0, 200) : null });
  }
  return out;
}

/**
 * Stores events with the SERVER time and decides which count. Tab switch, window blur and leaving fullscreen usually all
 * fire for one action, so only one of them counts per FOCUS_DEDUPE_SECONDS. Returns the new counted total and whether the
 * attempt reached the limit (the caller then submits it).
 */
export async function recordEvents(attempt: { id: string; violations: number }, events: IncomingEvent[], maxViolations: number) {
  let counted = 0;
  const now = new Date();
  const lastFocus = await prisma.proctorEvent.findFirst({ where: { attemptId: attempt.id, counted: true, type: { in: FOCUS_FAMILY } }, orderBy: { at: 'desc' }, select: { at: true } });
  let lastFocusAt = lastFocus?.at.getTime() ?? 0;
  const rows = events.map((e) => {
    let isCounted = COUNTED_TYPES.includes(e.type);
    if (isCounted && FOCUS_FAMILY.includes(e.type)) {
      if (now.getTime() - lastFocusAt < FOCUS_DEDUPE_SECONDS * 1000) isCounted = false;
      else lastFocusAt = now.getTime();
    }
    if (isCounted) counted++;
    return { attemptId: attempt.id, type: e.type, clientAt: e.clientAt ?? null, detail: e.detail ?? null, counted: isCounted, at: now };
  });
  if (rows.length) await prisma.proctorEvent.createMany({ data: rows });
  const violations = attempt.violations + counted;
  if (counted) await prisma.mcqAttempt.update({ where: { id: attempt.id }, data: { violations } });
  return { violations, limitReached: violations >= maxViolations };
}

/** Submits for too many violations and writes the AUTO_SUBMIT line in the timeline. */
export async function submitForViolations(attemptId: string, violations: number, answers: Record<string, number>) {
  const done = await finalizeAttempt(attemptId, { answers, violations, autoSubmitted: true, autoReason: 'PROCTORING' });
  await prisma.proctorEvent.create({ data: { attemptId, type: 'AUTO_SUBMIT', detail: `Violation limit reached (${violations})`, counted: false } });
  return done ? toResult(done) : null;
}

/* ───────────── verification ───────────── */

export async function latestVerification(userId: string, testKey: string) {
  return prisma.examVerification.findFirst({ where: { userId, testKey }, orderBy: { createdAt: 'desc' } });
}

export const retentionDate = (days: number) => new Date(Date.now() + Math.min(Math.max(days, 1), 365) * 86_400_000);

/* ───────────── retention: delete expired photos ───────────── */

export async function purgeExpiredMedia(limit = 200) {
  const now = new Date();
  let purged = 0;
  const [verifs, caps] = await Promise.all([
    prisma.examVerification.findMany({ where: { purgeAfter: { lte: now }, purgedAt: null }, take: limit }),
    prisma.proctorCapture.findMany({ where: { purgeAfter: { lte: now }, purgedAt: null }, take: limit }),
  ]);
  for (const v of verifs) {
    try {
      await Promise.all([v.selfieKey ? deletePrivate(v.selfieKey) : null, v.idKey ? deletePrivate(v.idKey) : null]);
      await prisma.examVerification.update({ where: { id: v.id }, data: { selfieKey: null, idKey: null, purgedAt: now } });
      purged++;
    } catch (err) {
      console.error('Could not purge verification photos:', err);
    }
  }
  for (const c of caps) {
    try {
      if (c.key) await deletePrivate(c.key);
      await prisma.proctorCapture.update({ where: { id: c.id }, data: { key: null, purgedAt: now } });
      purged++;
    } catch (err) {
      console.error('Could not purge capture:', err);
    }
  }
  return purged;
}

export { EVENT_TYPES };
