import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { canReviewCourse } from '@/lib/proctor-access';

/** Marks an attempt Valid or Suspicious after looking at the ID photo, camera photos and violation timeline. */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Please log in' }, { status: 401 });
  const { id } = await params;

  const attempt = await prisma.mcqAttempt.findUnique({ where: { id }, select: { id: true, courseId: true } });
  if (!attempt || !(await canReviewCourse(user, attempt.courseId))) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const status = ['VALID', 'SUSPICIOUS', 'PENDING'].includes(body.status) ? (body.status as string) : '';
  if (!status) return NextResponse.json({ error: 'Choose Valid or Suspicious.' }, { status: 400 });
  const note = typeof body.note === 'string' ? body.note.trim().slice(0, 500) : '';

  await prisma.mcqAttempt.update({
    where: { id },
    data: { reviewStatus: status, reviewNote: note || null, reviewedById: status === 'PENDING' ? null : user.id, reviewedAt: status === 'PENDING' ? null : new Date() },
  });
  return NextResponse.json({ ok: true });
}
