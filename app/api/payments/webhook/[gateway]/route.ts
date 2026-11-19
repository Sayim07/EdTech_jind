import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getGateway } from '@/lib/payments';
import { applyGatewayRefund, failPayment, fulfillPayment, recordMethod } from '@/lib/payments/fulfill';

/**
 * Server-to-server confirmation from the gateway. This is what enrolls a student whose browser closed
 * before the redirect, so it is authenticated by signature only (no cookies).
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ gateway: string }> }) {
  const { gateway: id } = await params;
  const gateway = getGateway(id);
  if (!gateway) return NextResponse.json({ error: 'Unknown gateway' }, { status: 404 });

  const raw = await req.text();
  const event = gateway.parseWebhook(raw, req.headers.get('x-razorpay-signature') || req.headers.get('x-signature'));
  if (!event) return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });

  if (event.type === 'refund' && event.paymentId && event.refund) {
    await applyGatewayRefund(event.paymentId, event.refund);
  } else if (event.type !== 'ignored' && event.orderId) {
    const payment = await prisma.payment.findUnique({ where: { gatewayOrderId: event.orderId } });
    if (payment && payment.gateway === gateway.id) {
      if (event.type === 'paid' && event.paymentId) await fulfillPayment(payment.id, event.paymentId);
      else if (event.type === 'failed') {
        await failPayment(payment.id, event.reason || 'Payment failed');
        if (event.paymentId) await recordMethod(payment.id, event.paymentId);
      }
    }
  }
  // Always 200 for authentic events so the gateway stops retrying.
  return NextResponse.json({ ok: true });
}
