import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { findTestByKey, finalizeAttempt, parseJson, type ResolvedTest } from '@/lib/mcq-server';
import { StoredQuestion } from '@/lib/mcq';
import {
  attemptDeadline,
  blocked,
  deadlineFor,
  deviceLabel,
  drawQuestions,
  examWindow,
  hashToken,
  latestVerification,
  newSessionToken,
  remainingSeconds,
  safeEqual,
  sessionIsFresh,
  toPublic,
} from '@/lib/exam';
import { rateLimit } from '@/lib/rate-limit';

/**
 * Starts an exam attempt, or resumes the one already running. Everything that decides whether the student may sit the
 * exam is checked HERE, on the server: schedule, identity approval, access code, consent, retakes and the single session.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: 'Please log in' }, { status: 401 });
    if (user.role !== 'STUDENT') return NextResponse.json({ error: 'Only students can take tests.' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const testKey = typeof body.testKey === 'string' ? body.testKey : '';
    if (!testKey) return NextResponse.json({ error: 'Missing test' }, { status: 400 });

    const test = await findTestByKey(user.id, testKey);
    if (!test) return NextResponse.json({ error: 'Test not found. Enroll in the course first.' }, { status: 404 });
    const s = test.settings;
    // MCQ assignments are not proctored: no identity check, consent, code or camera. They still get a timer and one session.
    const proctored = test.kind !== 'ASSIGNMENT';

    /* ── a running attempt: close it if time is up, otherwise resume it (one session only) ── */
    const open = await prisma.mcqAttempt.findFirst({ where: { userId: user.id, testKey, status: 'IN_PROGRESS' }, orderBy: { startedAt: 'desc' } });
    if (open) {
      if (Date.now() >= attemptDeadline(open).getTime()) {
        await finalizeAttempt(open.id, { answers: parseJson(open.answers, {}), violations: open.violations, autoSubmitted: true, autoReason: 'TIME_UP' });
      } else {
        const tabToken = typeof body.tabToken === 'string' ? body.tabToken : '';
        const sameTab = Boolean(open.sessionHash && tabToken && safeEqual(hashToken(tabToken), open.sessionHash));
        if (!sameTab && sessionIsFresh(open)) {
          // Another tab or device is actively running this exam. Tell the owner, refuse this one.
          await prisma.proctorEvent.create({ data: { attemptId: open.id, type: 'SESSION_CONFLICT', detail: deviceLabel(req), counted: false } });
          return blocked('ACTIVE_ELSEWHERE', 'This exam is already open in another tab or device. Close it there first, then try again in about a minute.', 409);
        }
        // Same tab refreshed, or the old session went quiet (crash, lost network): this tab takes over, timer unchanged.
        const token = sameTab ? tabToken : newSessionToken();
        if (!sameTab) {
          await prisma.proctorEvent.create({ data: { attemptId: open.id, type: 'NOTE', detail: `Exam resumed on a new tab or device: ${deviceLabel(req)}`, counted: false } });
        }
        const resumed = await prisma.mcqAttempt.update({ where: { id: open.id }, data: { sessionHash: hashToken(token), sessionLastSeenAt: new Date(), sessionDevice: deviceLabel(req) } });
        return NextResponse.json(payload(resumed, parseJson<StoredQuestion[]>(resumed.questions, []), s, token));
      }
    }

    /* ── new attempt: every rule is checked here ── */
    const now = new Date();
    const w = examWindow(s, now);
    if (w === 'before') return blocked('NOT_STARTED', `This exam opens on ${s.startsAt!.toISOString()}.`);
    if (w === 'closed') return blocked('ENDED', 'This exam is closed.');

    // Retakes
    let grantId: string | null = null;
    const done = await prisma.mcqAttempt.count({ where: { userId: user.id, testKey, status: 'SUBMITTED' } });
    if (!test.allowRetakes && done > 0) {
      const grant = await prisma.examRetakeGrant.findFirst({ where: { userId: user.id, testKey, usedAt: null }, orderBy: { createdAt: 'asc' } });
      if (!grant) return blocked('RETAKE_NOT_ALLOWED', 'Retakes are not allowed for this test. Ask your teacher to approve one.');
      grantId = grant.id;
    }

    let verificationId: string | null = null;
    if (proctored && s.requireIdCheck) {
      const v = await latestVerification(user.id, testKey);
      if (!v) return blocked('VERIFICATION_REQUIRED', 'Verify your identity first: take a selfie and a photo of your ID card.');
      if (v.status === 'PENDING') return blocked('VERIFICATION_PENDING', 'Your identity check is waiting for your teacher to approve it.');
      if (v.status === 'REJECTED') return blocked('VERIFICATION_REJECTED', v.rejectReason ? `Your identity check was not accepted: ${v.rejectReason}` : 'Your identity check was not accepted. Please submit it again.');
      verificationId = v.id;
    }

    if (proctored && s.accessCode) {
      const limited = rateLimit(`exam-code:${user.id}:${testKey}`, 10, 10 * 60_000);
      if (limited) return limited;
      const given = typeof body.accessCode === 'string' ? body.accessCode.trim() : '';
      if (!given) return blocked('ACCESS_CODE_REQUIRED', 'Enter the access code your teacher gave you.');
      if (!safeEqual(given.toLowerCase(), s.accessCode.trim().toLowerCase())) return blocked('ACCESS_CODE_INVALID', 'That access code is not correct.');
    }

    if (proctored && s.requireConsent && body.consent !== true) return blocked('CONSENT_REQUIRED', 'You must accept the proctoring notice to start.');

    const questions = drawQuestions(test.questions, proctored ? s : { ...s, questionCount: null });
    const token = newSessionToken();
    let attempt;
    try {
      attempt = await prisma.mcqAttempt.create({
        data: {
          userId: user.id,
          courseId: test.courseId,
          testKey,
          testTitle: test.title,
          timeLimit: test.timeLimit,
          passingMarks: test.passingMarks,
          questions: JSON.stringify(questions),
          startedAt: now,
          deadlineAt: deadlineFor(now, test.timeLimit, s),
          sessionHash: hashToken(token),
          sessionLastSeenAt: now,
          sessionDevice: deviceLabel(req),
          consentAt: proctored && s.requireConsent ? now : null,
          verificationId,
        },
      });
    } catch (err: any) {
      // Two tabs pressed Start at the same moment: the database lets exactly one through.
      if (err?.code === 'P2002') return blocked('ACTIVE_ELSEWHERE', 'This exam was just started in another tab or device.', 409);
      throw err;
    }
    if (grantId) await prisma.examRetakeGrant.update({ where: { id: grantId }, data: { usedAt: now } });

    return NextResponse.json(payload(attempt, questions, s, token));
  } catch (err) {
    console.error('MCQ start error:', err);
    return NextResponse.json({ error: 'Could not start the test' }, { status: 500 });
  }
}

function payload(
  a: { id: string; testTitle: string; timeLimit: number; startedAt: Date; deadlineAt: Date | null; answers: string; violations: number },
  stored: StoredQuestion[],
  s: ResolvedTest['settings'],
  sessionToken: string
) {
  const deadline = attemptDeadline(a);
  return {
    attemptId: a.id,
    title: a.testTitle,
    questions: toPublic(stored),
    remainingSeconds: remainingSeconds(deadline),
    serverNow: new Date().toISOString(),
    deadlineAt: deadline.toISOString(),
    answers: parseJson<Record<string, number>>(a.answers, {}),
    violations: a.violations,
    maxViolations: s.maxViolations,
    captureEverySeconds: s.captureEverySeconds,
    requireCamera: s.requireCamera,
    sessionToken,
  };
}
