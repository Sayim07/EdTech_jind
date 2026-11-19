import React from 'react';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { Navbar } from '@/components/Navbar';
import { MobileBottomNav } from '@/components/MobileBottomNav';
import { PaymentsSubNav } from '@/components/admin/PaymentsSubNav';
import { RefundsClient, type RefundRow, type RefundablePayment } from './RefundsClient';

export const metadata = { title: 'Refunds | CIM India Admin' };
export const dynamic = 'force-dynamic';

export default async function RefundsPage() {
  const user = await getSessionUser();
  if (!user || user.role !== 'ADMIN') redirect('/login?tab=admin&error=AdminAccessOnly');

  const [refunds, paid] = await Promise.all([
    prisma.refund.findMany({
      orderBy: { createdAt: 'desc' },
      take: 300,
      include: { payment: { select: { id: true, amount: true, user: { select: { name: true, email: true } }, course: { select: { title: true } } } } },
    }),
    prisma.payment.findMany({
      where: { status: 'PAID', amount: { gt: 0 }, gatewayPaymentId: { not: null } },
      orderBy: { paidAt: 'desc' },
      take: 500,
      select: { id: true, amount: true, refundedAmount: true, paidAt: true, couponCode: true, note: true, method: true, user: { select: { name: true, email: true } }, course: { select: { title: true } } },
    }),
  ]);

  const history: RefundRow[] = refunds.map((r) => ({
    id: r.id,
    amount: r.amount / 100,
    status: r.status as RefundRow['status'],
    reason: r.reason,
    failureReason: r.failureReason,
    createdAt: r.createdAt.toISOString(),
    processedAt: r.processedAt ? r.processedAt.toISOString() : null,
    gatewayRefundId: r.gatewayRefundId,
    student: r.payment.user.name,
    email: r.payment.user.email,
    course: r.payment.course.title,
    paymentAmount: r.payment.amount / 100,
  }));
  const refundable: RefundablePayment[] = paid
    .filter((p) => p.amount - p.refundedAmount > 0)
    .map((p) => ({
      id: p.id,
      student: p.user.name,
      email: p.user.email,
      course: p.course.title,
      amount: p.amount / 100,
      refunded: p.refundedAmount / 100,
      paidAt: p.paidAt ? p.paidAt.toISOString() : null,
      note: p.note,
    }));

  return (
    <>
      <Navbar />
      <main className="flex-1 pb-24 lg:pb-12 bg-gray-50 min-h-screen">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">
          <div>
            <h1 className="text-3xl font-semibold text-gray-900">Payments</h1>
            <p className="text-sm text-gray-600 mt-1">Coupon codes, refunds and revenue reports.</p>
          </div>
          <PaymentsSubNav active="refunds" />
          <RefundsClient history={history} refundable={refundable} />
        </div>
      </main>
      <MobileBottomNav role="ADMIN" isLoggedIn />
    </>
  );
}
