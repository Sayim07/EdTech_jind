import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { findTestByKey } from '@/lib/mcq-server';
import { examWindow, latestVerification, sessionIsFresh } from '@/lib/exam';

/** Everything the exam page needs to know before Start. Never includes the access code or any answers. */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ testKey: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Please log in' }, { status: 401 });
  const { testKey } = await params;

  const test = await findTestByKey(user.id, testKey);
  if (!test) return NextResponse.json({ error: 'Test not found' }, { status: 404 });
  const s = test.settings;
  const proctored = test.kind !== 'ASSIGNMENT';
  const now = new Date();

  const [course, verification, grant, open, done] = await Promise.all([
    prisma.course.findUnique({ where: { id: test.courseId }, select: { title: true } }),
    latestVerification(user.id, testKey),
    prisma.examRetakeGrant.findFirst({ where: { userId: user.id, testKey, usedAt: null }, select: { id: true } }),
    prisma.mcqAttempt.findFirst({ where: { userId: user.id, testKey, status: 'IN_PROGRESS' }, select: { id: true, sessionLastSeenAt: true } }),
    prisma.mcqAttempt.count({ where: { userId: user.id, testKey, status: 'SUBMITTED' } }),
  ]);

  const window = examWindow(s, now);
  let blockedInfo: { code: string; message: string } | null = null;
  if (!open) {
    if (window === 'before') blockedInfo = { code: 'NOT_STARTED', message: 'This exam has not opened yet.' };
    else if (window === 'closed') blockedInfo = { code: 'ENDED', message: 'This exam is closed.' };
    else if (!test.allowRetakes && done > 0 && !grant) blockedInfo = { code: 'RETAKE_NOT_ALLOWED', message: 'Retakes are not allowed for this test. Ask your teacher to approve one.' };
  }

  return NextResponse.json({
    settings: {
      title: test.title,
      courseTitle: course?.title || '',
      questionCount: s.questionCount && s.questionCount < test.questions.length ? s.questionCount : test.questions.length,
      timeLimit: test.timeLimit,
      passingMarks: test.passingMarks,
      allowRetakes: test.allowRetakes,
      requireCamera: proctored && s.requireCamera,
      requireIdCheck: proctored && s.requireIdCheck,
      requireConsent: proctored && s.requireConsent,
      needsAccessCode: proctored && Boolean(s.accessCode),
      startsAt: s.startsAt ? s.startsAt.toISOString() : null,
      endsAt: s.endsAt ? s.endsAt.toISOString() : null,
      maxViolations: s.maxViolations,
      captureEverySeconds: s.captureEverySeconds,
      photoRetentionDays: s.photoRetentionDays,
    },
    now: now.toISOString(),
    window,
    verification: verification ? { id: verification.id, status: verification.status, rejectReason: verification.rejectReason } : null,
    retakeGrant: Boolean(grant),
    openAttempt: open ? { id: open.id, activeElsewhere: sessionIsFresh(open, now) } : null,
    blocked: blockedInfo,
  });
}
