import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { canReviewCourse } from '@/lib/proctor-access';
import { getPrivate } from '@/lib/proctor-storage';
import { imageResponse } from '@/lib/proctor-media';

/** A random camera photo, streamed from private storage to staff who may review that course. */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Please log in' }, { status: 401 });
  const { id } = await params;
  const c = await prisma.proctorCapture.findUnique({ where: { id }, include: { attempt: { select: { courseId: true } } } });
  if (!c || !(await canReviewCourse(user, c.attempt.courseId))) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (!c.key) return NextResponse.json({ error: 'This photo was deleted after the retention period.' }, { status: 410 });
  return imageResponse(await getPrivate(c.key));
}
