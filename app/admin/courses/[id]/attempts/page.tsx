import React from 'react';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { ArrowLeft, ArrowRight, Camera, TriangleAlert } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { canReviewCourse } from '@/lib/proctor-access';
import { formatDateTime } from '@/lib/format';
import { Navbar } from '@/components/Navbar';
import { MobileBottomNav } from '@/components/MobileBottomNav';
import { Badge, ReviewBadge } from '@/components/proctoring/ui';

export const metadata = { title: 'Student test attempts | CIM India Admin' };
export const dynamic = 'force-dynamic';

export default async function AdminAttemptsPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user || user.role !== 'ADMIN') redirect('/login?tab=admin&error=AdminAccessOnly');

  const { id } = await params;
  const course = await prisma.course.findUnique({ where: { id }, select: { id: true, title: true } });
  if (!course || !(await canReviewCourse(user, id))) notFound();

  const attempts = await prisma.mcqAttempt.findMany({
    where: { courseId: id, status: 'SUBMITTED' },
    orderBy: { submittedAt: 'desc' },
    take: 200,
    select: {
      id: true,
      testTitle: true,
      score: true,
      total: true,
      percentage: true,
      passed: true,
      violations: true,
      autoSubmitted: true,
      autoReason: true,
      reviewStatus: true,
      submittedAt: true,
      user: { select: { name: true, email: true } },
      _count: { select: { captures: true } },
    },
  });
  const toReview = attempts.filter((a) => a.reviewStatus === 'PENDING').length;

  return (
    <>
      <Navbar />
      <main className="flex-1 pb-24 lg:pb-12 bg-gray-50 min-h-screen">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
          <Link href={`/admin/courses/${course.id}`} className="inline-flex items-center gap-1.5 text-sm font-semibold text-amber-600 hover:underline rounded focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_#e3eeff]">
            <ArrowLeft className="w-4 h-4" aria-hidden /> Back to {course.title}
          </Link>
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
            <div>
              <h1 className="text-3xl font-semibold text-gray-900">Student test attempts</h1>
              <p className="text-gray-600 mt-1 max-w-prose">
                {course.title}. Submitted attempts and whether they have been reviewed.
                {toReview > 0 ? ` ${toReview} still to review.` : ''}
              </p>
            </div>
            <Link
              href={`/proctoring?tab=attempts&course=${course.id}`}
              className="h-10 px-5 rounded-lg bg-amber-600 hover:bg-[#0060eb] text-white font-semibold text-sm inline-flex items-center justify-center gap-2 transition active:scale-[0.98] focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_#e3eeff] self-start"
            >
              Open in Proctoring <ArrowRight className="w-4 h-4" aria-hidden />
            </Link>
          </div>

          {attempts.length === 0 ? (
            <p className="bg-white rounded-2xl border border-gray-200 p-8 text-center text-gray-600">No student has submitted a test for this course yet.</p>
          ) : (
            <ul className="bg-white rounded-2xl border border-gray-200 divide-y divide-gray-200">
              {attempts.map((a) => (
                <li key={a.id} className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="text-base font-semibold text-gray-900 break-words">
                      {a.user.name} <span className="font-normal text-gray-700 break-all">({a.user.email})</span>
                    </h2>
                    <p className="text-sm text-gray-600">
                      {a.testTitle}
                      {a.submittedAt ? ` · ${formatDateTime(a.submittedAt)}` : ''}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="font-semibold text-gray-900 tabular-nums">
                      {a.score}/{a.total} ({a.percentage}%)
                    </span>
                    <Badge tone={a.passed ? 'good' : 'bad'}>{a.passed ? 'Passed' : 'Not passed'}</Badge>
                    <Badge tone={a.violations > 0 ? 'wait' : 'neutral'}>
                      {a.violations} violation{a.violations === 1 ? '' : 's'}
                    </Badge>
                    <span className="inline-flex items-center gap-1 text-gray-700">
                      <Camera className="w-3.5 h-3.5" aria-hidden /> {a._count.captures}
                      <span className="sr-only"> camera photos</span>
                    </span>
                    {a.autoSubmitted && (
                      <Badge tone={a.autoReason === 'PROCTORING' ? 'bad' : 'neutral'}>
                        {a.autoReason === 'PROCTORING' && <TriangleAlert className="w-3 h-3" aria-hidden />}
                        {a.autoReason === 'PROCTORING' ? 'Auto-submitted: violations' : 'Auto-submitted: time up'}
                      </Badge>
                    )}
                    <ReviewBadge status={a.reviewStatus} />
                    <Link href={`/proctoring/attempts/${a.id}`} className="font-semibold text-amber-600 hover:underline rounded focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_#e3eeff]">
                      Review
                    </Link>
                    <Link href={`/assignments/tests/review/${a.id}`} className="font-semibold text-amber-600 hover:underline rounded focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_#e3eeff]">
                      View answers
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
      <MobileBottomNav role="ADMIN" isLoggedIn />
    </>
  );
}
