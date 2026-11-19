import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { canReviewCourse } from '@/lib/proctor-access';
import { getPrivate } from '@/lib/proctor-storage';
import { imageResponse } from '@/lib/proctor-media';

/** The selfie or the ID card photo of a verification, for staff who may review that course. Never public. */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string; kind: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Please log in' }, { status: 401 });
  const { id, kind } = await params;
  if (kind !== 'selfie' && kind !== 'id') return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const v = await prisma.examVerification.findUnique({ where: { id } });
  if (!v || !(await canReviewCourse(user, v.courseId))) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const key = kind === 'selfie' ? v.selfieKey : v.idKey;
  if (!key) return NextResponse.json({ error: 'This photo was deleted after the retention period.' }, { status: 410 });
  return imageResponse(await getPrivate(key));
}
