import { prisma } from '@/lib/prisma';
import { getGateway } from '@/lib/payments';

/**
 * Marks a payment as paid and enrolls the student. Safe to call more than once for the same payment
 * (browser verify and the webhook both call it), so access is granted exactly once.
 */
export async function fulfillPayment(paymentRowId: string, gatewayPaymentId: string) {
  const result = await prisma.$transaction(async (tx) => {
    const payment = await tx.payment.findUnique({ where: { id: paymentRowId } });
    if (!payment) throw new Error('Payment not found');

    if (payment.status !== 'PAID') {
      await tx.payment.update({
        where: { id: payment.id },
        data: { status: 'PAID', gatewayPaymentId, failureReason: null, paidAt: new Date() },
      });
    }

    const enrollment = await tx.enrollment.upsert({
      where: { userId_courseId: { userId: payment.userId, courseId: payment.courseId } },
      update: {},
      create: {
        userId: payment.userId,
        courseId: payment.courseId,
        amountPaid: payment.amount / 100,
        paymentId: gatewayPaymentId,
        status: 'ACTIVE',
      },
    });
    return { payment, enrollment };
  });
  await recordMethod(paymentRowId, gatewayPaymentId);
  return result;
}

/** Saves how the customer paid. Best effort: enrollment must never depend on this lookup. */
export async function recordMethod(paymentRowId: string, gatewayPaymentId: string) {
  try {
    const p = await prisma.payment.findUnique({ where: { id: paymentRowId }, select: { gateway: true, method: true } });
    if (!p || p.method) return;
    const details = await getGateway(p.gateway)?.fetchPaymentDetails?.(gatewayPaymentId);
    if (!details) return;
    await prisma.payment.update({
      where: { id: paymentRowId },
      data: { method: details.method ?? null, methodDetail: details.detail ?? null, gatewayFee: details.fee ?? null },
    });
  } catch (err) {
    console.error('Could not record payment method:', err);
  }
}

/** Records a failed attempt. Never downgrades a payment that already succeeded. */
export async function failPayment(paymentRowId: string, reason: string) {
  await prisma.payment.updateMany({
    where: { id: paymentRowId, status: { not: 'PAID' } },
    data: { status: 'FAILED', failureReason: reason.slice(0, 300) },
  });
}
