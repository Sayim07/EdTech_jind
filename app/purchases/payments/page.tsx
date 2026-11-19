import React from 'react';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { Navbar } from '@/components/Navbar';
import { MobileBottomNav } from '@/components/MobileBottomNav';
import { PurchasesSubNav } from '@/components/PurchasesSubNav';
import { PaymentHistory, type HistoryRow } from './PaymentHistory';

export const metadata = { title: 'Payment history | CIM India' };
export const dynamic = 'force-dynamic';

export default async function PaymentHistoryPage() {
  const user = await getSessionUser();
  if (!user) redirect('/login?redirect=/purchases/payments');

  const [payments, enrollments] = await Promise.all([
    prisma.payment.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: { course: { select: { slug: true, title: true } }, refunds: { orderBy: { createdAt: 'desc' } } },
    }),
    prisma.enrollment.findMany({ where: { userId: user.id }, select: { courseId: true } }),
  ]);
  const owned = new Set(enrollments.map((e) => e.courseId));

  const rows: HistoryRow[] = payments.map((p) => ({
    id: p.id,
    courseTitle: p.course.title,
    courseSlug: p.course.slug,
    status: p.status as HistoryRow['status'],
    amount: p.amount / 100,
    listPrice: p.originalAmount !== null ? p.originalAmount / 100 : null,
    discount: p.discountAmount / 100,
    coupon: p.couponCode,
    refunded: p.refundedAmount / 100,
    method: p.method,
    methodDetail: p.methodDetail,
    failureReason: p.failureReason,
    createdAt: p.createdAt.toISOString(),
    paidAt: p.paidAt ? p.paidAt.toISOString() : null,
    reference: p.gatewayPaymentId,
    billing: (p.billing as Record<string, string> | null) ?? null,
    owned: owned.has(p.courseId),
    refunds: p.refunds.map((r) => ({ id: r.id, amount: r.amount / 100, status: r.status as 'PENDING' | 'PROCESSED' | 'FAILED', createdAt: r.createdAt.toISOString(), processedAt: r.processedAt ? r.processedAt.toISOString() : null })),
  }));

  return (
    <>
      <Navbar wide />
      <main className="flex-1 pb-24 lg:pb-12">
        <div className="w-full px-4 sm:px-6 lg:px-10 py-5 sm:py-8 space-y-6">
          <div>
            <h1 className="text-3xl sm:text-4xl font-semibold text-gray-900 leading-tight">Payment history</h1>
            <p className="text-base text-gray-600 mt-1 max-w-prose">Every payment you have made or tried, with refunds and the option to retry one that did not go through.</p>
          </div>
          <PurchasesSubNav active="payments" />
          <PaymentHistory rows={rows} />
        </div>
      </main>
      <MobileBottomNav role={user.role} isLoggedIn />
    </>
  );
}
