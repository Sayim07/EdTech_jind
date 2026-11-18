import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { defaultGateway, getGateway, toPaise } from '@/lib/payments';

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Please log in to purchase this course' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const courseId = typeof body.courseId === 'string' ? body.courseId : '';
  if (!courseId) return NextResponse.json({ error: 'Course ID is required' }, { status: 400 });

  const course = await prisma.course.findUnique({ where: { id: courseId } });
  if (!course || !course.published) return NextResponse.json({ error: 'Course not found' }, { status: 404 });
  if (course.price <= 0) return NextResponse.json({ error: 'This course is free. Enroll directly.' }, { status: 400 });

  const enrolled = await prisma.enrollment.findUnique({ where: { userId_courseId: { userId: user.id, courseId } } });
  if (enrolled) return NextResponse.json({ error: 'You already own this course', alreadyEnrolled: true }, { status: 409 });

  const gateway = body.gateway ? getGateway(body.gateway) : defaultGateway();
  if (!gateway) return NextResponse.json({ error: 'Unknown payment method' }, { status: 400 });
  if (!gateway.isConfigured()) {
    return NextResponse.json({ error: 'Online payments are not set up yet. Please contact support.' }, { status: 503 });
  }

  // The amount always comes from the database, never from the browser.
  const amount = toPaise(course.price);
  const payment = await prisma.payment.create({
    data: { userId: user.id, courseId, gateway: gateway.id, amount, currency: 'INR' },
  });

  try {
    const order = await gateway.createOrder({
      amount,
      currency: 'INR',
      receipt: payment.id,
      notes: { paymentId: payment.id, courseId, userId: user.id },
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
      prefill: { name: user.name, email: user.email },
    });
  } catch (err: any) {
    console.error('Create order error:', err);
    await prisma.payment.update({ where: { id: payment.id }, data: { status: 'FAILED', failureReason: 'Could not create order' } });
    return NextResponse.json({ error: 'Could not start the payment. Please try again.' }, { status: 502 });
  }
}
