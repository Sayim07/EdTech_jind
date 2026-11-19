import React from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Award, Lock, Receipt, ArrowRight } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { formatPrice } from '@/lib/utils';
import { Navbar } from '@/components/Navbar';
import { MobileBottomNav } from '@/components/MobileBottomNav';
import { PurchasesSubNav } from '@/components/PurchasesSubNav';

export const metadata = { title: 'Purchases & Certificates | CIM India' };

const fmt = (d: Date) => d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

export default async function PurchasesPage() {
  const user = await getSessionUser();
  if (!user) redirect('/login?redirect=/purchases');

  const enrollments = await prisma.enrollment.findMany({
    where: { userId: user.id },
    include: { course: { include: { modules: { include: { lessons: { select: { id: true } } } } } } },
    orderBy: { createdAt: 'desc' },
  });

  const done = await prisma.lessonProgress.findMany({
    where: { userId: user.id },
    select: { lessonId: true },
  });
  const doneIds = new Set(done.map((d) => d.lessonId));

  const rows = enrollments.map((e) => {
    const lessonIds = e.course.modules.flatMap((m) => m.lessons.map((l) => l.id));
    const completed = lessonIds.filter((id) => doneIds.has(id)).length;
    return { e, total: lessonIds.length, completed };
  });

  const totalSpent = enrollments.reduce((sum, e) => sum + (e.amountPaid || 0), 0);

  return (
    <>
      <Navbar wide />
      <main className="flex-1 pb-24 lg:pb-12">
        <div className="w-full px-4 sm:px-6 lg:px-10 py-5 sm:py-8 space-y-8">
          <PurchasesSubNav active="purchases" />
          <section className="bg-amber-100 rounded-2xl p-6 sm:p-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <h1 className="text-3xl sm:text-4xl font-semibold text-amber-800 leading-tight">
                Purchases &amp; Certificates
              </h1>
              <p className="text-base text-gray-600 mt-1">
                Your receipts, and a certificate for every course you complete.
              </p>
            </div>
            <div className="text-left sm:text-right">
              <div className="text-2xl font-semibold text-amber-600">{formatPrice(totalSpent)}</div>
              <div className="text-xs text-gray-600">
                Total spent on {enrollments.length} {enrollments.length === 1 ? 'course' : 'courses'}
              </div>
            </div>
          </section>

          <section className="space-y-4" aria-labelledby="certs-heading">
            <h2 id="certs-heading" className="text-2xl font-semibold text-gray-900">
              Certificates
            </h2>
            {rows.length === 0 ? (
              <p className="text-gray-600">Enroll in a course and finish every lesson to earn your first certificate.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {rows.map(({ e, total, completed }) => {
                  const earned = !!e.certificateCode;
                  const pct = total ? Math.round((completed / total) * 100) : 0;
                  return (
                    <article key={e.id} className="bg-white rounded-2xl border border-gray-200 p-5 flex flex-col gap-4">
                      <div className="flex items-start gap-3">
                        <div
                          className={`w-11 h-11 rounded-lg flex items-center justify-center shrink-0 ${
                            earned ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'
                          }`}
                        >
                          {earned ? <Award className="w-6 h-6" /> : <Lock className="w-5 h-5" />}
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-base font-semibold text-gray-900 leading-snug">{e.course.title}</h3>
                          <p className="text-sm text-gray-600">
                            {earned && e.completedAt
                              ? `Completed on ${fmt(e.completedAt)}`
                              : 'Available after you complete the course'}
                          </p>
                        </div>
                      </div>
                      {earned ? (
                        <Link
                          href={`/certificates/${e.certificateCode}`}
                          className="h-10 rounded-lg bg-amber-600 hover:bg-[#0060eb] text-white font-semibold text-sm flex items-center justify-center gap-2 transition active:scale-[0.98]"
                        >
                          View &amp; download certificate <ArrowRight className="w-4 h-4" />
                        </Link>
                      ) : (
                        <div className="space-y-2">
                          <div className="flex justify-between text-xs font-semibold text-gray-600">
                            <span>
                              {completed} of {total} lessons completed
                            </span>
                            <span>{pct}%</span>
                          </div>
                          <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full bg-amber-600 rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                          <Link
                            href={`/learn/${e.course.slug}`}
                            className="text-sm font-semibold text-amber-600 hover:underline inline-block"
                          >
                            {completed > 0 ? 'Continue learning' : 'Start learning'}
                          </Link>
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            )}
          </section>

          <section className="space-y-4" aria-labelledby="purchases-heading">
            <h2 id="purchases-heading" className="text-2xl font-semibold text-gray-900">
              Purchase history
            </h2>
            {rows.length === 0 ? (
              <div className="bg-white rounded-2xl border border-dashed border-gray-300 p-10 text-center space-y-3">
                <Receipt className="w-8 h-8 text-amber-600 mx-auto" />
                <p className="text-gray-600">You have not purchased any courses yet.</p>
                <Link
                  href="/dashboard"
                  className="inline-flex h-10 px-5 items-center rounded-lg bg-amber-600 hover:bg-[#0060eb] text-white font-semibold text-sm transition"
                >
                  Browse courses
                </Link>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-gray-200 overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-gray-100 text-gray-700">
                    <tr>
                      <th scope="col" className="px-5 py-3 font-semibold">Course</th>
                      <th scope="col" className="px-5 py-3 font-semibold">Date</th>
                      <th scope="col" className="px-5 py-3 font-semibold">Transaction ID</th>
                      <th scope="col" className="px-5 py-3 font-semibold">Status</th>
                      <th scope="col" className="px-5 py-3 font-semibold text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {rows.map(({ e }) => (
                      <tr key={e.id}>
                        <td className="px-5 py-3.5">
                          <Link href={`/learn/${e.course.slug}`} className="font-semibold text-gray-900 hover:text-amber-600">
                            {e.course.title}
                          </Link>
                        </td>
                        <td className="px-5 py-3.5 text-gray-600 whitespace-nowrap">{fmt(e.createdAt)}</td>
                        <td className="px-5 py-3.5 text-gray-600 font-mono text-xs whitespace-nowrap">
                          {e.paymentId || '-'}
                        </td>
                        <td className="px-5 py-3.5">
                          <span
                            className={`inline-flex px-2.5 py-0.5 rounded-md text-xs font-semibold ${
                              e.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {e.status === 'COMPLETED' ? 'Completed' : 'In progress'}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-right font-semibold text-gray-900 whitespace-nowrap">
                          {e.amountPaid > 0 ? formatPrice(e.amountPaid) : 'Free'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      </main>
      <MobileBottomNav role={user.role} isLoggedIn />
    </>
  );
}
