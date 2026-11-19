import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { priceFor } from '@/lib/coupons';
import { rateLimit } from '@/lib/rate-limit';

/** Previews a coupon on the checkout page. The real price is recalculated when the order is created. */
export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Please log in' }, { status: 401 });

  // Stops someone trying codes one after another.
  const limited = rateLimit(`coupon:${user.id}`, 20, 10 * 60 * 1000);
  if (limited) return limited;

  const body = await req.json().catch(() => ({}));
  const course = typeof body.courseId === 'string' ? await prisma.course.findUnique({ where: { id: body.courseId } }) : null;
  if (!course || !course.published) return NextResponse.json({ error: 'Course not found' }, { status: 404 });

  const price = await priceFor({ userId: user.id, userEmail: user.email, course, code: body.code });
  if (!price.ok) return NextResponse.json({ error: price.error }, { status: 400 });
  return NextResponse.json({ code: price.couponCode, original: price.original / 100, discount: price.discount / 100, total: price.total / 100 });
}
