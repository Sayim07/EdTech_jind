import React from 'react';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { findTestByKey } from '@/lib/mcq-server';
import { Navbar } from '@/components/Navbar';
import { MobileBottomNav } from '@/components/MobileBottomNav';
import { TestPlayer } from '@/components/mcq/TestPlayer';

export const metadata = { title: 'MCQ Test | CIM India' };

const fmt = (d: Date) => d.toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

export default async function TestPage({ params }: { params: Promise<{ testKey: string }> }) {
  const { testKey } = await params;
  const user = await getSessionUser();
  if (!user) redirect(`/login?redirect=/assignments/tests/${testKey}`);

  const test = await findTestByKey(user.id, testKey);
  if (!test) notFound();
  const course = await prisma.course.findUnique({ where: { id: test.courseId }, select: { title: true } });

  const attempts = await prisma.mcqAttempt.findMany({
    where: { userId: user.id, testKey },
    orderBy: { startedAt: 'desc' },
    select: { id: true, status: true, score: true, total: true, percentage: true, passed: true, autoSubmitted: true, autoReason: true, startedAt: true, submittedAt: true },
  });
  const done = attempts.filter((a) => a.status === 'SUBMITTED');
  const inProgress = attempts.some((a) => a.status === 'IN_PROGRESS');
  const blocked = !test.allowRetakes && done.length > 0;

  return (
    <>
      <Navbar wide />
      <main className="flex-1 pb-24 lg:pb-12">
        <div className="w-full px-4 sm:px-6 lg:px-10 py-5 sm:py-8 space-y-8">
          <Link href="/assignments?tab=tests" className="inline-flex items-center gap-1.5 text-sm font-semibold text-amber-600 hover:underline">
            <ArrowLeft className="w-4 h-4" /> All MCQ tests
          </Link>

          <section className="bg-amber-100 rounded-2xl p-6 sm:p-8 space-y-4">
            <div>
              <h1 className="text-3xl sm:text-4xl font-semibold text-amber-800 leading-tight">{test.title}</h1>
              <p className="text-base text-gray-600 mt-1">{course?.title}</p>
            </div>
            <dl className="flex flex-wrap gap-x-10 gap-y-3">
              {[
                ['Questions', test.questions.length],
                ['Time limit', `${test.timeLimit} min`],
                ['Passing marks', `${test.passingMarks}%`],
                ['Retakes', test.allowRetakes ? 'Allowed' : 'Not allowed'],
              ].map(([k, v]) => (
                <div key={k as string}>
                  <dd className="text-2xl font-semibold text-amber-600">{v}</dd>
                  <dt className="text-xs text-gray-600">{k}</dt>
                </div>
              ))}
            </dl>
          </section>

          <TestPlayer
            test={{
              key: test.key,
              title: test.title,
              courseTitle: course?.title || '',
              questionCount: test.questions.length,
              timeLimit: test.timeLimit,
              passingMarks: test.passingMarks,
              allowRetakes: test.allowRetakes,
              isSample: test.isSample,
              proctored: test.kind !== 'ASSIGNMENT',
            }}
            canStart={!blocked}
            blockedReason={blocked ? 'Retakes are turned off for this test, so it cannot be started again. You can still review your attempt below.' : undefined}
            inProgress={inProgress}
          />

          <section className="space-y-4" aria-labelledby="history">
            <h2 id="history" className="text-2xl font-semibold text-gray-900">
              Attempt history
            </h2>
            {done.length === 0 ? (
              <p className="text-sm text-gray-600 bg-white border border-gray-200 rounded-2xl p-6">No completed attempts yet.</p>
            ) : (
              <div className="relative bg-white rounded-2xl border border-gray-200 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-600 border-b border-gray-200">
                      <th scope="col" className="px-5 py-3 font-semibold">Submitted</th>
                      <th scope="col" className="px-5 py-3 font-semibold">Score</th>
                      <th scope="col" className="px-5 py-3 font-semibold">Result</th>
                      <th scope="col" className="px-5 py-3 font-semibold"><span className="sr-only">Review</span></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {done.map((a) => (
                      <tr key={a.id}>
                        <td className="px-5 py-3 text-gray-900 whitespace-nowrap">
                          {fmt(a.submittedAt || a.startedAt)}
                          {a.autoSubmitted && <span className="ml-2 text-xs text-orange-700">{a.autoReason === 'PROCTORING' ? 'auto-submitted (proctoring)' : 'auto-submitted (time up)'}</span>}
                        </td>
                        <td className="px-5 py-3 text-gray-900 tabular-nums whitespace-nowrap">
                          {a.score}/{a.total} ({a.percentage}%)
                        </td>
                        <td className="px-5 py-3">
                          <span className={`inline-flex px-2.5 py-0.5 rounded-md text-xs font-semibold ${a.passed ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-700'}`}>{a.passed ? 'Passed' : 'Not passed'}</span>
                        </td>
                        <td className="px-5 py-3 text-right">
                          <Link href={`/assignments/tests/review/${a.id}`} className="font-semibold text-amber-600 hover:underline">
                            Review
                          </Link>
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
