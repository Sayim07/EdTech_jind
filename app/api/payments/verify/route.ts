import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { getGateway } from '@/lib/payments';
import { failPayment, fulfillPayment } from '@/lib/payments/fulfill';

/** Called by the browser after the gateway reports success. Access is granted only if the signature checks out. */
export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Please log in' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { paymentId, gatewayOrderId, gatewayPaymentId, signature } = body as Record<string, string | undefined>;
  if (!paymentId || !gatewayOrderId || !gatewayPaymentId || !signature) {
    return NextResponse.json({ error: 'Missing payment details' }, { status: 400 });
  }

  const payment = await prisma.payment.findUnique({ where: { id: paymentId }, include: { course: { select: { slug: true } } } });
  if (!payment || payment.userId !== user.id) return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
  if (payment.gatewayOrderId !== gatewayOrderId) return NextResponse.json({ error: 'Payment does not match this order' }, { status: 400 });

  if (payment.status === 'PAID') return NextResponse.json({ success: true, paymentId: payment.id, slug: payment.course.slug });

  const gateway = getGateway(payment.gateway);
  if (!gateway || !gateway.verifyPayment({ orderId: gatewayOrderId, paymentId: gatewayPaymentId, signature })) {
    await failPayment(payment.id, 'Signature verification failed');
    return NextResponse.json({ error: 'We could not verify this payment.' }, { status: 400 });
  }

  await fulfillPayment(payment.id, gatewayPaymentId);
  return NextResponse.json({ success: true, paymentId: payment.id, slug: payment.course.slug });
}
