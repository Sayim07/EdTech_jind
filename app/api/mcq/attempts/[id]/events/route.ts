import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { parseJson, toResult } from '@/lib/mcq-server';
import { attemptDeadline, finishIfExpired, loadOwnedAttempt, parseEvents, recordEvents, settingsForTestKey, submitForViolations } from '@/lib/exam';

/**
 * The exam tab reports things like leaving full screen or switching tabs. The server stamps them with ITS time, decides
 * which count, and submits the attempt itself when the exam's violation limit is reached: the browser cannot talk its
 * way out of that.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: 'Please log in' }, { status: 401 });
    const { id } = await params;
    const body = await req.json().catch(() => ({}));

    const loaded = await loadOwnedAttempt(req, user.id, id);
    if ('error' in loaded) return loaded.error;
    const attempt = loaded.attempt;
    if (attempt.status !== 'IN_PROGRESS') return NextResponse.json({ error: 'Already submitted', autoSubmitted: Boolean(attempt.autoSubmitted), result: toResult(attempt) }, { status: 409 });

    const expired = await finishIfExpired(attempt);
    if (expired) return NextResponse.json({ violations: expired.violations, maxViolations: (await settingsForTestKey(attempt.testKey)).maxViolations, autoSubmitted: true, result: toResult(expired) });

    const settings = await settingsForTestKey(attempt.testKey);
    const events = parseEvents(body.events);
    if (!events.length) return NextResponse.json({ violations: attempt.violations, maxViolations: settings.maxViolations, autoSubmitted: false });

    const { violations, limitReached } = await recordEvents(attempt, events, settings.maxViolations);
    await prisma.mcqAttempt.update({ where: { id }, data: { sessionLastSeenAt: new Date() } });

    if (limitReached) {
      // Latest answers from the tab, if it sent them, otherwise the last autosave.
      const latest = body.answers && typeof body.answers === 'object' && !Array.isArray(body.answers) ? (body.answers as Record<string, number>) : parseJson<Record<string, number>>(attempt.answers, {});
      const result = await submitForViolations(id, violations, latest);
      return NextResponse.json({ violations, maxViolations: settings.maxViolations, autoSubmitted: true, result });
    }
    return NextResponse.json({ violations, maxViolations: settings.maxViolations, autoSubmitted: false, remainingSeconds: Math.max(0, Math.round((attemptDeadline(attempt).getTime() - Date.now()) / 1000)) });
  } catch (err) {
    console.error('Proctor events error:', err);
    return NextResponse.json({ error: 'Could not record events' }, { status: 500 });
  }
}
