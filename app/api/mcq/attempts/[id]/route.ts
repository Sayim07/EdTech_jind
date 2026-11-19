import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { toResult } from '@/lib/mcq-server';
import { attemptDeadline, finishIfExpired, loadOwnedAttempt, remainingSeconds } from '@/lib/exam';
import { canReviewCourse } from '@/lib/proctor-access';

/**
 * Heartbeat and autosave while a test is running. Called every few seconds with the answers so far. It proves the tab is
 * alive (single-session rule), saves the answers, and returns the SERVER's view of the remaining time, so a changed
 * device clock cannot stretch or shrink the exam. Once the server deadline has passed it submits the attempt itself.
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: 'Please log in' }, { status: 401 });
    const { id } = await params;
    const body = await req.json().catch(() => ({}));

    const loaded = await loadOwnedAttempt(req, user.id, id);
    if ('error' in loaded) {
      // A submitted attempt is a normal end, not a conflict: tell the tab so it can show the result.
      const owned = await prisma.mcqAttempt.findUnique({ where: { id } });
      if (owned && owned.userId === user.id && owned.status === 'SUBMITTED') return NextResponse.json({ ok: true, status: 'SUBMITTED', result: toResult(owned) });
      return loaded.error;
    }
    const attempt = loaded.attempt;
    if (attempt.status === 'SUBMITTED') return NextResponse.json({ ok: true, status: 'SUBMITTED', result: toResult(attempt) });

    const expired = await finishIfExpired(attempt);
    if (expired) return NextResponse.json({ ok: true, status: 'SUBMITTED', result: toResult(expired) });

    const data: { answers?: string; sessionLastSeenAt: Date } = { sessionLastSeenAt: new Date() };
    if (body.answers && typeof body.answers === 'object' && !Array.isArray(body.answers)) {
      const clean: Record<string, number> = {};
      for (const [k, v] of Object.entries(body.answers).slice(0, 500)) if (Number.isInteger(v)) clean[k.slice(0, 80)] = v as number;
      data.answers = JSON.stringify(clean);
    }
    const updated = await prisma.mcqAttempt.update({ where: { id }, data });

    return NextResponse.json({
      ok: true,
      status: 'IN_PROGRESS',
      remainingSeconds: remainingSeconds(attemptDeadline(updated)),
      serverNow: new Date().toISOString(),
      violations: updated.violations,
    });
  } catch (err) {
    console.error('Attempt heartbeat error:', err);
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 });
  }
}

// Result of a submitted attempt, for its owner or for staff who may review that course.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Please log in' }, { status: 401 });
  const { id } = await params;
  const attempt = await prisma.mcqAttempt.findUnique({ where: { id } });
  if (!attempt) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (attempt.userId !== user.id && !(await canReviewCourse(user, attempt.courseId))) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (attempt.status !== 'SUBMITTED') return NextResponse.json({ error: 'Test not submitted yet' }, { status: 409 });
  return NextResponse.json({ result: toResult(attempt) });
}
