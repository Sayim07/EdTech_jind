import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { canReviewCourse } from '@/lib/proctor-access';

/** A teacher/admin compares the selfie with the ID photo and approves or rejects exam access. */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Please log in' }, { status: 401 });
  const { id } = await params;

  const v = await prisma.examVerification.findUnique({ where: { id } });
  if (!v || !(await canReviewCourse(user, v.courseId))) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (v.purgedAt) return NextResponse.json({ error: 'The photos were deleted after the retention period.' }, { status: 409 });

  const body = await req.json().catch(() => ({}));
  const action = body.action === 'APPROVE' ? 'APPROVE' : body.action === 'REJECT' ? 'REJECT' : '';
  if (!action) return NextResponse.json({ error: 'Choose approve or reject.' }, { status: 400 });
  const reason = typeof body.reason === 'string' ? body.reason.trim().slice(0, 300) : '';
  if (action === 'REJECT' && !reason) return NextResponse.json({ error: 'Add a reason so the student knows what to fix.' }, { status: 400 });

  // Only a pending check can be decided; a decided one can be reversed by the same people, but it is always recorded.
  const verification = await prisma.examVerification.update({
    where: { id },
    data: { status: action === 'APPROVE' ? 'APPROVED' : 'REJECTED', rejectReason: action === 'REJECT' ? reason : null, reviewedById: user.id, reviewedAt: new Date() },
  });
  return NextResponse.json({ verification: { id: verification.id, status: verification.status, rejectReason: verification.rejectReason, reviewedAt: verification.reviewedAt } });
}
