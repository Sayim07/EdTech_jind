import React from 'react';
import { notFound, redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { formatPrice } from '@/lib/utils';
import { Navbar } from '@/components/Navbar';
import { MobileBottomNav } from '@/components/MobileBottomNav';
import { ResultClient } from './ResultClient';

export const metadata = { title: 'Payment status | CIM India' };
export const dynamic = 'force-dynamic';

export default async function PaymentResultPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user) redirect(`/login?redirect=/checkout/result/${id}`);

  const payment = await prisma.payment.findUnique({ where: { id }, include: { course: { select: { title: true, slug: true } } } });
  if (!payment || payment.userId !== user.id) notFound();

  return (
    <>
      <Navbar wide />
      <main className="flex-1 pb-24 lg:pb-12">
        <div className="w-full px-4 sm:px-6 lg:px-10 py-8 sm:py-14">
          <ResultClient
            paymentId={payment.id}
            initialStatus={payment.status as 'CREATED' | 'PAID' | 'FAILED'}
            failureReason={payment.failureReason}
            courseTitle={payment.course.title}
            courseSlug={payment.course.slug}
            amount={formatPrice(payment.amount / 100)}
            reference={payment.gatewayPaymentId}
          />
        </div>
      </main>
      <MobileBottomNav role={user.role} isLoggedIn />
    </>
  );
}
