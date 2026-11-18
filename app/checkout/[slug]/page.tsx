import React from 'react';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { ArrowLeft, ShieldCheck } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { listGateways } from '@/lib/payments';
import { formatPrice } from '@/lib/utils';
import { Navbar } from '@/components/Navbar';
import { MobileBottomNav } from '@/components/MobileBottomNav';
import { CheckoutClient } from './CheckoutClient';

export const metadata = { title: 'Checkout | CIM India' };
export const dynamic = 'force-dynamic';

export default async function CheckoutPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const user = await getSessionUser();
  if (!user) redirect(`/login?redirect=/checkout/${slug}`);

  const course = await prisma.course.findUnique({ where: { slug } });
  if (!course || !course.published) notFound();

  // Nothing to pay for: send the student where they can actually use the course.
  const enrolled = await prisma.enrollment.findUnique({ where: { userId_courseId: { userId: user.id, courseId: course.id } } });
  if (enrolled) redirect(`/learn/${course.slug}`);
  if (course.price <= 0) redirect(`/courses/${course.slug}`);

  const gateways = listGateways();

  return (
    <>
      <Navbar wide />
      <main className="flex-1 pb-24 lg:pb-12">
        <div className="w-full px-4 sm:px-6 lg:px-10 py-5 sm:py-8 space-y-6">
          <Link href={`/courses/${course.slug}`} className="inline-flex items-center gap-1.5 text-sm font-semibold text-amber-600 hover:underline">
            <ArrowLeft className="w-4 h-4" /> Back to course
          </Link>

          <h1 className="text-3xl sm:text-4xl font-semibold text-gray-900 leading-tight">Checkout</h1>

          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_24rem] gap-6 items-start">
            <CheckoutClient courseId={course.id} courseSlug={course.slug} gateways={gateways} price={course.price} />

            <aside className="bg-white rounded-2xl border border-gray-200 p-6 space-y-5" aria-labelledby="summary">
              <h2 id="summary" className="text-lg font-semibold text-gray-900">
                Order summary
              </h2>
              <div className="flex gap-3">
                {course.thumbnail ? (
                  <img src={course.thumbnail} alt="" className="w-20 h-14 rounded-lg object-cover shrink-0" />
                ) : (
                  <div className="w-20 h-14 rounded-lg bg-amber-100 shrink-0" aria-hidden />
                )}
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900 line-clamp-2">{course.title}</p>
                  <p className="text-xs text-gray-600 mt-0.5">{course.instructorName}</p>
                </div>
              </div>
              <dl className="space-y-2 text-sm border-t border-gray-200 pt-4">
                {course.originalPrice && course.originalPrice > course.price && (
                  <>
                    <div className="flex justify-between text-gray-600">
                      <dt>List price</dt>
                      <dd className="line-through tabular-nums">{formatPrice(course.originalPrice)}</dd>
                    </div>
                    <div className="flex justify-between text-emerald-700">
                      <dt>Discount</dt>
                      <dd className="tabular-nums">-{formatPrice(course.originalPrice - course.price)}</dd>
                    </div>
                  </>
                )}
                <div className="flex justify-between text-base font-semibold text-gray-900 pt-2">
                  <dt>Total</dt>
                  <dd className="tabular-nums">{formatPrice(course.price)}</dd>
                </div>
              </dl>
              <p className="flex items-start gap-2 text-xs text-gray-600">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" aria-hidden />
                Payments are processed securely by the gateway. We never see or store your card or UPI details.
              </p>
            </aside>
          </div>
        </div>
      </main>
      <MobileBottomNav role={user.role} isLoggedIn />
    </>
  );
}
