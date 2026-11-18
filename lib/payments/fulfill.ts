import { prisma } from '@/lib/prisma';

/**
 * Marks a payment as paid and enrolls the student. Safe to call more than once for the same payment
 * (browser verify and the webhook both call it), so access is granted exactly once.
 */
export async function fulfillPayment(paymentRowId: string, gatewayPaymentId: string) {
  return prisma.$transaction(async (tx) => {
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
}

/** Records a failed attempt. Never downgrades a payment that already succeeded. */
export async function failPayment(paymentRowId: string, reason: string) {
  await prisma.payment.updateMany({
    where: { id: paymentRowId, status: { not: 'PAID' } },
    data: { status: 'FAILED', failureReason: reason.slice(0, 300) },
  });
}
