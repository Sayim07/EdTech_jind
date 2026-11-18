import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { findTestByKey, finalizeAttempt, parseJson } from '@/lib/mcq-server';
import { PublicQuestion, StoredQuestion } from '@/lib/mcq';

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: 'Please log in' }, { status: 401 });

    const { testKey } = await req.json();
    if (typeof testKey !== 'string') return NextResponse.json({ error: 'Missing test' }, { status: 400 });

    const test = await findTestByKey(user.id, testKey);
    if (!test) return NextResponse.json({ error: 'Test not found. Enroll in the course first.' }, { status: 404 });

    // Resume (or close out) an unfinished attempt.
    const open = await prisma.mcqAttempt.findFirst({
      where: { userId: user.id, testKey, status: 'IN_PROGRESS' },
      orderBy: { startedAt: 'desc' },
    });
    if (open) {
      const elapsed = (Date.now() - open.startedAt.getTime()) / 1000;
      if (elapsed >= open.timeLimit * 60) {
        await finalizeAttempt(open.id, {
          answers: parseJson(open.answers, {}),
          violations: open.violations,
          autoSubmitted: true,
          autoReason: 'TIME_UP',
        });
      } else {
        return NextResponse.json(payload(open, parseJson<StoredQuestion[]>(open.questions, [])));
      }
    }

    if (!test.allowRetakes) {
      const done = await prisma.mcqAttempt.count({ where: { userId: user.id, testKey, status: 'SUBMITTED' } });
      if (done > 0) return NextResponse.json({ error: 'Retakes are not allowed for this test.' }, { status: 403 });
    }

    const attempt = await prisma.mcqAttempt.create({
      data: {
        userId: user.id,
        courseId: test.courseId,
        testKey,
        testTitle: test.title,
        timeLimit: test.timeLimit,
        passingMarks: test.passingMarks,
        questions: JSON.stringify(test.questions),
      },
    });
    return NextResponse.json(payload(attempt, test.questions));
  } catch (err) {
    console.error('MCQ start error:', err);
    return NextResponse.json({ error: 'Could not start the test' }, { status: 500 });
  }
}

function payload(
  a: { id: string; testTitle: string; timeLimit: number; startedAt: Date; answers: string; violations: number },
  stored: StoredQuestion[]
) {
  const questions: PublicQuestion[] = stored.map((q) => ({ id: q.id, text: q.text, options: q.options }));
  const remainingSeconds = Math.max(0, Math.round(a.timeLimit * 60 - (Date.now() - a.startedAt.getTime()) / 1000));
  return {
    attemptId: a.id,
    title: a.testTitle,
    questions,
    remainingSeconds,
    answers: parseJson<Record<string, number>>(a.answers, {}),
    violations: a.violations,
  };
}
