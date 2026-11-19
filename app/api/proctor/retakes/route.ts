import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { findTestByKey } from '@/lib/mcq-server';
import { canReviewCourse } from '@/lib/proctor-access';

/** A teacher/admin lets one student take an exam again (used once, at the next Start). */
export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Please log in' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const userId = typeof body.userId === 'string' ? body.userId : '';
  const testKey = typeof body.testKey === 'string' ? body.testKey : '';
  if (!userId || !testKey) return NextResponse.json({ error: 'Choose a student and an exam.' }, { status: 400 });

  const test = await findTestByKey(userId, testKey);
  if (!test) return NextResponse.json({ error: 'That student is not enrolled in this exam.' }, { status: 404 });
  if (!(await canReviewCourse(user, test.courseId))) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // One open grant at a time per student and exam.
  const existing = await prisma.examRetakeGrant.findFirst({ where: { userId, testKey, usedAt: null } });
  if (existing) return NextResponse.json({ error: 'A retake is already approved and waiting to be used.' }, { status: 409 });

  const reason = typeof body.reason === 'string' ? body.reason.trim().slice(0, 300) : '';
  const grant = await prisma.examRetakeGrant.create({ data: { userId, testKey, courseId: test.courseId, reason: reason || null, grantedById: user.id } });
  return NextResponse.json({ grant }, { status: 201 });
}
