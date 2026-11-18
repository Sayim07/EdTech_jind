import React from 'react';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { toResult } from '@/lib/mcq-server';
import { Navbar } from '@/components/Navbar';
import { MobileBottomNav } from '@/components/MobileBottomNav';
import { ResultsView } from '@/components/mcq/ResultsView';

export const metadata = { title: 'Test review | CIM India' };

export default async function ReviewAttemptPage({ params }: { params: Promise<{ attemptId: string }> }) {
  const { attemptId } = await params;
  const user = await getSessionUser();
  if (!user) redirect(`/login?redirect=/assignments/tests/review/${attemptId}`);

  const attempt = await prisma.mcqAttempt.findUnique({ where: { id: attemptId } });
  if (!attempt || attempt.status !== 'SUBMITTED' || (attempt.userId !== user.id && user.role !== 'ADMIN')) notFound();

  return (
    <>
      <Navbar wide />
      <main className="flex-1 pb-24 lg:pb-12">
        <div className="w-full px-4 sm:px-6 lg:px-10 py-5 sm:py-8 space-y-6">
          <Link href={user.role === 'ADMIN' ? `/admin/courses/${attempt.courseId}/attempts` : `/assignments/tests/${attempt.testKey}`} className="inline-flex items-center gap-1.5 text-sm font-semibold text-amber-600 hover:underline">
            <ArrowLeft className="w-4 h-4" /> {user.role === 'ADMIN' ? 'All attempts' : 'Back to the test'}
          </Link>
          <ResultsView result={toResult(attempt)} />
        </div>
      </main>
      <MobileBottomNav role={user.role} isLoggedIn />
    </>
  );
}
