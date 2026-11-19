import React from 'react';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { Navbar } from '@/components/Navbar';
import { MobileBottomNav } from '@/components/MobileBottomNav';
import { PaymentsSubNav } from '@/components/admin/PaymentsSubNav';
import { CouponsClient, type CouponRow } from './CouponsClient';

export const metadata = { title: 'Coupons | CIM India Admin' };
export const dynamic = 'force-dynamic';

export default async function CouponsPage() {
  const user = await getSessionUser();
  if (!user || user.role !== 'ADMIN') redirect('/login?tab=admin&error=AdminAccessOnly');

  const [coupons, usage, courses] = await Promise.all([
    prisma.coupon.findMany({ orderBy: { createdAt: 'desc' } }),
    prisma.couponRedemption.groupBy({ by: ['couponId'], where: { status: 'REDEEMED' }, _count: { _all: true }, _sum: { amount: true } }),
    prisma.course.findMany({ select: { id: true, title: true }, orderBy: { title: 'asc' } }),
  ]);
  const used = new Map(usage.map((u) => [u.couponId, { count: u._count._all, discount: (u._sum.amount ?? 0) / 100 }]));

  const rows: CouponRow[] = coupons.map((c) => ({
    id: c.id,
    code: c.code,
    description: c.description,
    type: c.type as 'PERCENT' | 'FIXED',
    value: c.value,
    maxDiscount: c.maxDiscount,
    minOrder: c.minOrder,
    startsAt: c.startsAt ? c.startsAt.toISOString() : null,
    expiresAt: c.expiresAt ? c.expiresAt.toISOString() : null,
    maxUses: c.maxUses,
    perUserLimit: c.perUserLimit,
    active: c.active,
    courseIds: c.courseIds,
    allowedEmails: c.allowedEmails,
    uses: used.get(c.id)?.count ?? 0,
    discounted: used.get(c.id)?.discount ?? 0,
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
          <PaymentsSubNav active="coupons" />
          <CouponsClient initial={rows} courses={courses} />
        </div>
      </main>
      <MobileBottomNav role="ADMIN" isLoggedIn />
    </>
  );
}
