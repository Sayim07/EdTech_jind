import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { finalizeAttempt, parseJson, toResult } from '@/lib/mcq-server';
import { MAX_SNAPSHOTS, MAX_SNAPSHOT_CHARS, MAX_VIOLATIONS } from '@/lib/mcq';

const GRACE_SECONDS = 60;

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: 'Please log in' }, { status: 401 });
    const { id } = await params;
    const body = await req.json();

    const attempt = await prisma.mcqAttempt.findUnique({ where: { id } });
    if (!attempt || attempt.userId !== user.id) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    if (attempt.status === 'SUBMITTED') return NextResponse.json({ result: toResult(attempt) });

    const elapsed = (Date.now() - attempt.startedAt.getTime()) / 1000;
    const late = elapsed > attempt.timeLimit * 60 + GRACE_SECONDS;

    // Only well-formed, size-capped snapshot images are stored.
    const snapshots = (Array.isArray(body.snapshots) ? body.snapshots : [])
      .filter(
        (s: any) =>
          s &&
          typeof s.t === 'string' &&
          typeof s.img === 'string' &&
          s.img.startsWith('data:image/jpeg;base64,') &&
          s.img.length <= MAX_SNAPSHOT_CHARS
      )
      .slice(0, MAX_SNAPSHOTS)
      .map((s: any) => ({ t: s.t.slice(0, 40), img: s.img }));

    const violations = Number.isInteger(body.violations) ? body.violations : attempt.violations;
    const reason =
      violations >= MAX_VIOLATIONS && body.autoReason === 'PROCTORING'
        ? 'PROCTORING'
        : body.autoReason === 'TIME_UP' || late
          ? 'TIME_UP'
          : null;

    const done = await finalizeAttempt(id, {
      // A very late submission is graded on the last autosaved answers only.
      answers: late ? parseJson(attempt.answers, {}) : body.answers && typeof body.answers === 'object' ? body.answers : {},
      violations,
      autoSubmitted: reason !== null,
      autoReason: reason,
      snapshots,
    });
    if (!done) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ result: toResult(done) });
  } catch (err) {
    console.error('MCQ submit error:', err);
    return NextResponse.json({ error: 'Could not submit the test' }, { status: 500 });
  }
}
