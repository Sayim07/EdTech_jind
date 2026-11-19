import { prisma } from '@/lib/prisma';
import { getGateway } from '@/lib/payments';
import { studentJoined, studentLeft } from '@/lib/chat/sync';

/**
 * Marks a payment as paid and enrolls the student. Safe to call more than once for the same payment
 * (browser verify and the webhook both call it), so access is granted exactly once.
 */
export async function fulfillPayment(paymentRowId: string, gatewayPaymentId: string) {
  const result = await prisma.$transaction(async (tx) => {
    const payment = await tx.payment.findUnique({ where: { id: paymentRowId } });
    if (!payment) throw new Error('Payment not found');

    // A payment that was refunded in full stays refunded: a replayed "paid" event must not give access back.
    if (payment.status === 'REFUNDED') return { payment, enrollment: null };

    if (payment.status === 'CREATED' || payment.status === 'FAILED') {
      await tx.payment.update({
        where: { id: payment.id },
        data: { status: 'PAID', gatewayPaymentId, failureReason: null, paidAt: new Date() },
      });
    }

    const existing = await tx.enrollment.findUnique({ where: { userId_courseId: { userId: payment.userId, courseId: payment.courseId } } });
    let enrollment = existing;
    if (!existing) {
      enrollment = await tx.enrollment.create({
        data: { userId: payment.userId, courseId: payment.courseId, amountPaid: payment.amount / 100, paymentId: gatewayPaymentId, status: 'ACTIVE' },
      });
    } else if (existing.paymentId && existing.paymentId !== gatewayPaymentId && payment.status !== 'PAID') {
      // The student already owns this course through another payment (for example two checkout tabs).
      // Nobody is enrolled twice; the charge is flagged so an admin can refund it.
      await tx.payment.update({ where: { id: payment.id }, data: { note: 'Duplicate payment: the student already owned this course. Refund this payment.' } });
    }

    await tx.couponRedemption.updateMany({ where: { paymentId: payment.id }, data: { status: 'REDEEMED' } });
    return { payment, enrollment };
  });
  await recordMethod(paymentRowId, gatewayPaymentId);
  // Put the student in the course's class chat. Never fails the payment.
  if (result.enrollment) await studentJoined(result.payment.courseId, result.payment.userId);
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
    where: { id: paymentRowId, status: { in: ['CREATED', 'FAILED'] } },
    data: { status: 'FAILED', failureReason: reason.slice(0, 300) },
  });
  // A failed attempt frees the coupon so the student can use it on the retry.
  await prisma.couponRedemption.updateMany({ where: { paymentId: paymentRowId, status: 'RESERVED' }, data: { status: 'RELEASED' } });
}

/**
 * Asks the gateway what really happened to an open or failed payment and repairs our record. This covers the
 * student who paid but whose browser closed and whose webhook never reached us.
 */
export async function reconcilePayment(paymentRowId: string): Promise<'paid' | 'failed' | 'open' | 'unknown'> {
  const p = await prisma.payment.findUnique({ where: { id: paymentRowId } });
  if (!p) return 'unknown';
  if (p.status === 'PAID' || p.status === 'REFUNDED') return 'paid';
  const gateway = getGateway(p.gateway);
  if (!gateway?.fetchOrderState || !p.gatewayOrderId) return 'unknown';
  const state = await gateway.fetchOrderState(p.gatewayOrderId);
  if (!state) return 'unknown';
  if (state.status === 'paid' && state.paymentId) {
    await fulfillPayment(p.id, state.paymentId);
    return 'paid';
  }
  if (state.status === 'failed' && p.status === 'CREATED') await failPayment(p.id, state.reason || 'Payment failed');
  return state.status === 'failed' ? 'failed' : 'open';
}

/**
 * Recomputes a payment's refund totals from its refund rows and keeps the enrollment in step:
 * a full refund removes access, and a refund that later fails gives it back.
 */
export async function syncRefundState(paymentRowId: string) {
  const out = await syncRefundStateInner(paymentRowId);
  if (out?.status === 'REFUNDED') {
    const p = await prisma.payment.findUnique({ where: { id: paymentRowId }, select: { courseId: true, userId: true } });
    if (p) await studentLeft(p.courseId, p.userId);
  }
  return out;
}

async function syncRefundStateInner(paymentRowId: string) {
  return prisma.$transaction(async (tx) => {
    const payment = await tx.payment.findUnique({ where: { id: paymentRowId }, include: { refunds: true } });
    if (!payment || (payment.status !== 'PAID' && payment.status !== 'REFUNDED')) return null;

    const total = payment.refunds.filter((r) => r.status !== 'FAILED').reduce((sum, r) => sum + r.amount, 0);
    const status = payment.amount > 0 && total >= payment.amount ? 'REFUNDED' : 'PAID';
    await tx.payment.update({ where: { id: payment.id }, data: { refundedAmount: total, status } });

    if (status === 'REFUNDED') {
      await tx.enrollment.deleteMany({ where: { userId: payment.userId, courseId: payment.courseId } });
      await tx.couponRedemption.updateMany({ where: { paymentId: payment.id }, data: { status: 'RELEASED' } });
    } else if (payment.status === 'REFUNDED') {
      // A refund failed after access was removed: put the student back.
      await tx.enrollment.upsert({
        where: { userId_courseId: { userId: payment.userId, courseId: payment.courseId } },
        update: {},
        create: { userId: payment.userId, courseId: payment.courseId, amountPaid: payment.amount / 100, paymentId: payment.gatewayPaymentId, status: 'ACTIVE' },
      });
      await tx.couponRedemption.updateMany({ where: { paymentId: payment.id }, data: { status: 'REDEEMED' } });
    }
    return { refunded: total, status };
  });
}

/** Admin-started refund. Reserves the amount first so two clicks cannot refund more than was paid. */
export async function createRefund(args: { paymentId: string; amount: number; reason?: string; adminId: string }): Promise<{ ok: true; refundId: string; status: string } | { ok: false; error: string }> {
  const { paymentId, amount, reason, adminId } = args;
  if (!Number.isInteger(amount) || amount <= 0) return { ok: false, error: 'Enter an amount greater than zero.' };

  type Reserved = { error: string } | { error?: undefined; row: { id: string }; gateway: NonNullable<ReturnType<typeof getGateway>>; gatewayPaymentId: string };
  const reserved: Reserved = await prisma.$transaction(async (tx): Promise<Reserved> => {
    const p = await tx.payment.findUnique({ where: { id: paymentId }, include: { refunds: true } });
    if (!p) return { error: 'Payment not found.' } as const;
    if (p.status !== 'PAID' || !p.gatewayPaymentId) return { error: 'Only a successful payment can be refunded.' } as const;
    const gateway = getGateway(p.gateway);
    if (!gateway?.refund) return { error: 'This payment cannot be refunded online.' } as const;
    const already = p.refunds.filter((r) => r.status !== 'FAILED').reduce((s, r) => s + r.amount, 0);
    const remaining = p.amount - already;
    if (amount > remaining) return { error: `Only ₹${(remaining / 100).toFixed(2)} is left to refund on this payment.` } as const;
    const row = await tx.refund.create({ data: { paymentId, amount, reason: reason?.slice(0, 300) || null, createdBy: adminId } });
    return { row, gateway, gatewayPaymentId: p.gatewayPaymentId } as const;
  });
  if (reserved.error !== undefined) return { ok: false, error: reserved.error };

  try {
    const out = await reserved.gateway.refund!({ paymentId: reserved.gatewayPaymentId, amount, receipt: reserved.row.id, reason });
    await prisma.refund.update({
      where: { id: reserved.row.id },
      data: { gatewayRefundId: out.id, status: out.status, processedAt: out.status === 'PROCESSED' ? new Date() : null },
    });
    await syncRefundState(paymentId);
    return { ok: true, refundId: reserved.row.id, status: out.status };
  } catch (err: any) {
    await prisma.refund.update({ where: { id: reserved.row.id }, data: { status: 'FAILED', failureReason: String(err?.message || 'Refund failed').slice(0, 300) } });
    await syncRefundState(paymentId);
    return { ok: false, error: err?.message || 'The gateway could not process this refund.' };
  }
}

/** Applies a refund update the gateway sent us (also covers refunds started from the gateway's own dashboard). */
export async function applyGatewayRefund(gatewayPaymentId: string, refund: { id: string; amount: number; status: 'PROCESSED' | 'FAILED' | 'PENDING' }) {
  const payment = await prisma.payment.findUnique({ where: { gatewayPaymentId } });
  if (!payment) return;
  const existing = await prisma.refund.findUnique({ where: { gatewayRefundId: refund.id } });
  const processedAt = refund.status === 'PROCESSED' ? new Date() : null;
  if (existing) {
    // Never move a finished refund backwards because an older event arrived late.
    if (existing.status === 'PROCESSED') return;
    await prisma.refund.update({ where: { id: existing.id }, data: { status: refund.status, processedAt, failureReason: refund.status === 'FAILED' ? 'Refund failed at the gateway' : null } });
  } else {
    await prisma.refund.create({
      data: { paymentId: payment.id, amount: refund.amount, status: refund.status, gatewayRefundId: refund.id, processedAt, reason: 'Started from the payment gateway dashboard' },
    });
  }
  await syncRefundState(payment.id);
}
