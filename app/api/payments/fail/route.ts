import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { failPayment, recordMethod } from '@/lib/payments/fulfill';

/** The browser reports a declined payment so the attempt shows up as failed. It cannot affect a paid payment. */
export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Please log in' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const payment = typeof body.paymentId === 'string' ? await prisma.payment.findUnique({ where: { id: body.paymentId } }) : null;
  if (!payment || payment.userId !== user.id) return NextResponse.json({ error: 'Payment not found' }, { status: 404 });

  await failPayment(payment.id, typeof body.reason === 'string' && body.reason ? body.reason : 'Payment was not completed');
  if (typeof body.gatewayPaymentId === 'string' && body.gatewayPaymentId) await recordMethod(payment.id, body.gatewayPaymentId);
  return NextResponse.json({ ok: true });
}
