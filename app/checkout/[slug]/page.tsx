import React from 'react';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { listGateways } from '@/lib/payments';
import { Navbar } from '@/components/Navbar';
import { MobileBottomNav } from '@/components/MobileBottomNav';
import { CheckoutClient } from './CheckoutClient';

export const metadata = { title: 'Checkout | CIM India' };
export const dynamic = 'force-dynamic';

export default async function CheckoutPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const user = await getSessionUser();
  if (!user) redirect(`/login?redirect=/checkout/${slug}`);

  const [course, recent] = await Promise.all([
    prisma.course.findUnique({ where: { slug } }),
    // Reuse the address from the student's last order so they only type it once.
    prisma.payment.findMany({ where: { userId: user.id }, orderBy: { createdAt: 'desc' }, take: 5, select: { billing: true } }),
  ]);
  const lastBilled = recent.find((p) => p.billing);
  if (!course || !course.published) notFound();

  // Nothing to pay for: send the student where they can actually use the course.
  const enrolled = await prisma.enrollment.findUnique({ where: { userId_courseId: { userId: user.id, courseId: course.id } } });
  if (enrolled) redirect(`/learn/${course.slug}`);
  if (course.price <= 0) redirect(`/courses/${course.slug}`);

  const saved = (lastBilled?.billing && typeof lastBilled.billing === 'object' ? lastBilled.billing : {}) as Record<string, string>;
  const billing = {
    name: saved.name || user.name || '',
    email: saved.email || user.email || '',
    phone: saved.phone || '',
    address: saved.address || '',
    city: saved.city || '',
    state: saved.state || '',
    pin: saved.pin || '',
    country: saved.country || 'India',
  };

  return (
    <>
      <Navbar wide />
      <main className="flex-1 pb-24 lg:pb-12">
        <div className="w-full px-4 sm:px-6 lg:px-10 py-5 sm:py-8 space-y-6">
          <Link href={`/courses/${course.slug}`} className="inline-flex items-center gap-1.5 text-sm font-semibold text-amber-600 hover:underline">
            <ArrowLeft className="w-4 h-4" /> Back to course
          </Link>

          <h1 className="text-3xl sm:text-4xl font-semibold text-gray-900 leading-tight">Checkout</h1>

          <CheckoutClient
            course={{ id: course.id, slug: course.slug, title: course.title, thumbnail: course.thumbnail, instructorName: course.instructorName, price: course.price, originalPrice: course.originalPrice }}
            gateways={listGateways()}
            initialBilling={billing}
          />
        </div>
      </main>
      <MobileBottomNav role={user.role} isLoggedIn />
    </>
  );
}
