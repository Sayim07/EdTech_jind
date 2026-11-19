import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { defaultGateway, getGateway } from '@/lib/payments';
import { fulfillPayment, reconcilePayment } from '@/lib/payments/fulfill';
import { parseBilling, priceFor } from '@/lib/coupons';
import { completion } from '@/lib/profile';

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Please log in to purchase this course' }, { status: 401 });

  // A profile with the required details must exist before anything can be bought. The checkout page checks this too,
  // but only this check cannot be skipped.
  if (user.role !== 'ADMIN') {
    const c = completion(user);
    if (!c.complete) {
      return NextResponse.json(
        { error: 'Please complete your profile before purchasing a course.', code: 'PROFILE_INCOMPLETE', missing: c.missingRequired.map((m) => m.label) },
        { status: 403 },
      );
    }
  }

  const body = await req.json().catch(() => ({}));
  const courseId = typeof body.courseId === 'string' ? body.courseId : '';
  if (!courseId) return NextResponse.json({ error: 'Course ID is required' }, { status: 400 });

  const course = await prisma.course.findUnique({ where: { id: courseId } });
  if (!course || !course.published) return NextResponse.json({ error: 'Course not found' }, { status: 404 });
  if (course.price <= 0) return NextResponse.json({ error: 'This course is free. Enroll directly.' }, { status: 400 });

  const parsed = parseBilling(body.billing);
  if (!parsed.billing) return NextResponse.json({ error: parsed.error, field: 'billing' }, { status: 400 });

  // An earlier attempt may have been paid even though we never heard back (closed tab, missed webhook).
  // Settle those first, so the student is never charged twice for the same course.
  const earlier = await prisma.payment.findMany({
    where: { userId: user.id, courseId, status: { in: ['CREATED', 'FAILED'] }, gatewayOrderId: { not: null }, createdAt: { gte: new Date(Date.now() - 24 * 3600 * 1000) } },
    orderBy: { createdAt: 'desc' },
    take: 3,
    select: { id: true },
  });
  await Promise.all(earlier.map((e) => reconcilePayment(e.id)));

  const enrolled = await prisma.enrollment.findUnique({ where: { userId_courseId: { userId: user.id, courseId } } });
  if (enrolled) return NextResponse.json({ error: 'You already own this course', alreadyEnrolled: true }, { status: 409 });

  // The amount always comes from the database, never from the browser.
  const price = await priceFor({ userId: user.id, userEmail: user.email, course, code: body.coupon });
  if (!price.ok) return NextResponse.json({ error: price.error, field: 'coupon' }, { status: 400 });

  const common = {
    userId: user.id,
    courseId,
    currency: 'INR',
    originalAmount: price.original,
    discountAmount: price.discount,
    couponId: price.couponId,
    couponCode: price.couponCode,
    billing: parsed.billing as any,
  };

  // A coupon that covers the whole price: no gateway involved, the student is enrolled straight away.
  if (price.total === 0) {
    const free = await prisma.payment.create({ data: { ...common, gateway: 'coupon', amount: 0, method: 'coupon', methodDetail: `Coupon ${price.couponCode}`, status: 'CREATED' } });
    if (price.couponId) await prisma.couponRedemption.create({ data: { couponId: price.couponId, userId: user.id, paymentId: free.id, amount: price.discount } });
    await fulfillPayment(free.id, `coupon_${free.id}`);
    return NextResponse.json({ free: true, paymentId: free.id });
  }

  const gateway = body.gateway ? getGateway(body.gateway) : defaultGateway();
  if (!gateway) return NextResponse.json({ error: 'Unknown payment method' }, { status: 400 });
  if (!gateway.isConfigured()) {
    return NextResponse.json({ error: 'Online payments are not set up yet. Please contact support.' }, { status: 503 });
  }

  const payment = await prisma.payment.create({ data: { ...common, gateway: gateway.id, amount: price.total } });
  if (price.couponId) await prisma.couponRedemption.create({ data: { couponId: price.couponId, userId: user.id, paymentId: payment.id, amount: price.discount } });

  try {
    const order = await gateway.createOrder({
      amount: price.total,
      currency: 'INR',
      receipt: payment.id,
      notes: { paymentId: payment.id, courseId, userId: user.id, ...(price.couponCode ? { coupon: price.couponCode } : {}) },
    });
    await prisma.payment.update({ where: { id: payment.id }, data: { gatewayOrderId: order.orderId } });

    return NextResponse.json({
      paymentId: payment.id,
      gateway: gateway.id,
      orderId: order.orderId,
      amount: order.amount,
      currency: order.currency,
      courseTitle: course.title,
      clientConfig: order.clientConfig,
      prefill: { name: parsed.billing.name, email: parsed.billing.email, contact: parsed.billing.phone },
    });
  } catch (err: any) {
    console.error('Create order error:', err);
    await prisma.payment.update({ where: { id: payment.id }, data: { status: 'FAILED', failureReason: 'Could not create order' } });
    await prisma.couponRedemption.updateMany({ where: { paymentId: payment.id }, data: { status: 'RELEASED' } });
    return NextResponse.json({ error: 'Could not start the payment. Please try again.' }, { status: 502 });
  }
}
