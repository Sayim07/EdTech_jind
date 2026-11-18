import React from 'react';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { ArrowLeft, AlertTriangle } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { parseJson } from '@/lib/mcq-server';
import { Navbar } from '@/components/Navbar';
import { MobileBottomNav } from '@/components/MobileBottomNav';

export const metadata = { title: 'Student test attempts | CIM India Admin' };

const fmt = (d: Date) => d.toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

export default async function AdminAttemptsPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user || user.role !== 'ADMIN') redirect('/login?tab=admin&error=AdminAccessOnly');

  const { id } = await params;
  const course = await prisma.course.findUnique({ where: { id }, select: { id: true, title: true } });
  if (!course) notFound();

  const attempts = await prisma.mcqAttempt.findMany({
    where: { courseId: id, status: 'SUBMITTED' },
    orderBy: { submittedAt: 'desc' },
    include: { user: { select: { name: true, email: true } } },
    take: 200,
  });

  return (
    <>
      <Navbar />
      <main className="flex-1 pb-24 lg:pb-12 bg-gray-50 min-h-screen">
        <div className="w-full px-4 sm:px-6 lg:px-10 py-5 sm:py-8 space-y-6">
          <Link href={`/admin/courses/${course.id}`} className="inline-flex items-center gap-1.5 text-sm font-semibold text-amber-600 hover:underline">
            <ArrowLeft className="w-4 h-4" /> Back to {course.title}
          </Link>
          <div>
            <h1 className="text-3xl font-semibold text-gray-900">Student test attempts</h1>
            <p className="text-gray-600 mt-1">{course.title}. Submitted attempts with full-screen warnings and camera snapshots.</p>
          </div>

          {attempts.length === 0 ? (
            <p className="bg-white rounded-2xl border border-gray-200 p-8 text-center text-gray-600">No student has submitted a test for this course yet.</p>
          ) : (
            <ul className="space-y-4">
              {attempts.map((a) => {
                const snaps = parseJson<{ t: string; img: string }[]>(a.snapshots, []);
                return (
                  <li key={a.id} className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                      <div className="min-w-0">
                        <h2 className="text-base font-semibold text-gray-900">
                          {a.user.name} <span className="font-normal text-gray-600">({a.user.email})</span>
                        </h2>
                        <p className="text-sm text-gray-600">
                          {a.testTitle} · {a.submittedAt ? fmt(a.submittedAt) : ''}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-sm">
                        <span className="font-semibold text-gray-900 tabular-nums">
                          {a.score}/{a.total} ({a.percentage}%)
                        </span>
                        <span className={`px-2.5 py-0.5 rounded-md text-xs font-semibold ${a.passed ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-700'}`}>{a.passed ? 'Passed' : 'Not passed'}</span>
                        <span className={`px-2.5 py-0.5 rounded-md text-xs font-semibold ${a.violations > 0 ? 'bg-orange-100 text-orange-800' : 'bg-gray-100 text-gray-700'}`}>
                          Full-screen exits: {a.violations}
                        </span>
                        {a.autoSubmitted && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-semibold bg-red-100 text-red-700">
                            <AlertTriangle className="w-3.5 h-3.5" /> {a.autoReason === 'PROCTORING' ? 'Auto-submitted: proctoring' : 'Auto-submitted: time up'}
                          </span>
                        )}
                        <Link href={`/assignments/tests/review/${a.id}`} className="font-semibold text-amber-600 hover:underline">
                          View answers
                        </Link>
                      </div>
                    </div>

                    <details className="group">
                      <summary className="cursor-pointer text-sm font-semibold text-gray-800 hover:text-amber-600">
                        Camera snapshots ({snaps.length})
                      </summary>
                      {snaps.length === 0 ? (
                        <p className="text-sm text-gray-600 mt-3">No snapshots were captured.</p>
                      ) : (
                        <ul className="mt-3 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 gap-3">
                          {snaps.map((s, i) => (
                            <li key={i} className="space-y-1">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={s.img} alt={`Snapshot ${i + 1} of ${a.user.name}`} loading="lazy" className="w-full rounded-lg border border-gray-200 bg-gray-100" />
                              <p className="text-xs text-gray-600">{new Date(s.t).toLocaleTimeString('en-IN')}</p>
                            </li>
                          ))}
                        </ul>
                      )}
                    </details>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </main>
      <MobileBottomNav role="ADMIN" isLoggedIn />
    </>
  );
}
