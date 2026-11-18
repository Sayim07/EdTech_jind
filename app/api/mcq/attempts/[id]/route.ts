import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { toResult } from '@/lib/mcq-server';

// Autosave answers and the proctoring violation counter while a test is running.
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: 'Please log in' }, { status: 401 });
    const { id } = await params;
    const body = await req.json();

    const attempt = await prisma.mcqAttempt.findUnique({ where: { id } });
    if (!attempt || attempt.userId !== user.id) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (attempt.status !== 'IN_PROGRESS') return NextResponse.json({ error: 'Already submitted' }, { status: 409 });

    const data: { answers?: string; violations?: number } = {};
    if (body.answers && typeof body.answers === 'object') data.answers = JSON.stringify(body.answers);
    if (Number.isInteger(body.violations)) data.violations = Math.max(attempt.violations, Math.min(body.violations, 50));
    await prisma.mcqAttempt.update({ where: { id }, data });
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 });
  }
}

// Result of a submitted attempt, for its owner or an admin.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Please log in' }, { status: 401 });
  const { id } = await params;
  const attempt = await prisma.mcqAttempt.findUnique({ where: { id } });
  if (!attempt || (attempt.userId !== user.id && user.role !== 'ADMIN')) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (attempt.status !== 'SUBMITTED') return NextResponse.json({ error: 'Test not submitted yet' }, { status: 409 });
  return NextResponse.json({ result: toResult(attempt) });
}
