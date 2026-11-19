import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { finalizeAttempt, parseJson, toResult } from '@/lib/mcq-server';
import { attemptDeadline, loadOwnedAttempt, withinGrace } from '@/lib/exam';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: 'Please log in' }, { status: 401 });
    const { id } = await params;
    const body = await req.json().catch(() => ({}));

    // Already finished (for example submitted automatically): just return the result.
    const existing = await prisma.mcqAttempt.findUnique({ where: { id } });
    if (existing && existing.userId === user.id && existing.status === 'SUBMITTED') return NextResponse.json({ result: toResult(existing) });

    const loaded = await loadOwnedAttempt(req, user.id, id);
    if ('error' in loaded) return loaded.error;
    const attempt = loaded.attempt;

    // The server's clock decides. A submission well after the deadline is graded on the last autosave only.
    const late = !withinGrace(attemptDeadline(attempt));
    const timedOut = Date.now() >= attemptDeadline(attempt).getTime();
    const reason = body.autoReason === 'PROCTORING' ? null : timedOut || late ? 'TIME_UP' : null;

    const done = await finalizeAttempt(id, {
      answers: late ? parseJson(attempt.answers, {}) : body.answers && typeof body.answers === 'object' ? body.answers : parseJson(attempt.answers, {}),
      violations: attempt.violations,
      autoSubmitted: reason !== null,
      autoReason: reason,
    });
    if (!done) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ result: toResult(done) });
  } catch (err) {
    console.error('MCQ submit error:', err);
    return NextResponse.json({ error: 'Could not submit the test' }, { status: 500 });
  }
}
