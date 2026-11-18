import React from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ClipboardList, ArrowRight } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { Navbar } from '@/components/Navbar';
import { MobileBottomNav } from '@/components/MobileBottomNav';
import { TestList } from '@/components/mcq/TestList';

export const metadata = { title: 'Assignments | CIM India' };

const fmt = (d: Date) => d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

function StatusBadge({ status, score, max }: { status: string; score: number | null; max: number }) {
  if (status === 'GRADED') {
    return (
      <span className="inline-flex px-2.5 py-0.5 rounded-md text-xs font-semibold bg-emerald-100 text-emerald-800">
        Graded{score !== null ? `: ${score}/${max}` : ''}
      </span>
    );
  }
  if (status === 'SUBMITTED') {
    return <span className="inline-flex px-2.5 py-0.5 rounded-md text-xs font-semibold bg-amber-100 text-amber-800">Submitted</span>;
  }
  return <span className="inline-flex px-2.5 py-0.5 rounded-md text-xs font-semibold bg-gray-100 text-gray-700">Not submitted</span>;
}

export default async function AssignmentsPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab } = await searchParams;
  const activeTab = tab === 'tests' ? 'tests' : 'assignments';
  const user = await getSessionUser();
  if (!user) redirect(`/login?redirect=/assignments${activeTab === 'tests' ? '?tab=tests' : ''}`);

  const enrollments = await prisma.enrollment.findMany({
    where: { userId: user.id },
    include: {
      course: {
        include: {
          modules: {
            orderBy: { order: 'asc' },
            include: {
              lessons: {
                orderBy: { order: 'asc' },
                include: { assignments: { include: { submissions: { where: { userId: user.id } } } } },
              },
            },
          },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  const groups = enrollments
    .map((e) => ({
      course: e.course,
      items: e.course.modules.flatMap((m) =>
        m.lessons.flatMap((l) =>
          l.assignments.map((a) => ({ assignment: a, lesson: l, submission: a.submissions[0] || null }))
        )
      ),
    }))
    .filter((g) => g.items.length > 0);

  const all = groups.flatMap((g) => g.items);
  const pending = all.filter((i) => !i.submission).length;
  const submitted = all.filter((i) => i.submission?.status === 'SUBMITTED').length;
  const graded = all.filter((i) => i.submission?.status === 'GRADED').length;

  return (
    <>
      <Navbar wide />
      <main className="flex-1 pb-24 lg:pb-12">
        <div className="w-full px-4 sm:px-6 lg:px-10 py-5 sm:py-8 space-y-8">
          <section className="bg-amber-100 rounded-2xl p-6 sm:p-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <h1 className="text-3xl sm:text-4xl font-semibold text-amber-800 leading-tight">Assignments</h1>
              <p className="text-base text-gray-600 mt-1">Everything you need to submit, and the feedback you have received.</p>
            </div>
            <dl className="grid grid-cols-3 gap-6 text-center shrink-0">
              {[
                { label: 'To do', value: pending },
                { label: 'Submitted', value: submitted },
                { label: 'Graded', value: graded },
              ].map((s) => (
                <div key={s.label}>
                  <dd className="text-2xl font-semibold text-amber-600">{s.value}</dd>
                  <dt className="text-xs text-gray-600">{s.label}</dt>
                </div>
              ))}
            </dl>
          </section>

          <nav aria-label="Assignment types" className="flex gap-1 border-b border-gray-200">
            {[
              { id: 'assignments', label: 'Assignments', href: '/assignments' },
              { id: 'tests', label: 'MCQ Tests', href: '/assignments?tab=tests' },
            ].map((t) => (
              <Link
                key={t.id}
                href={t.href}
                aria-current={activeTab === t.id ? 'page' : undefined}
                className={`px-4 py-2.5 text-sm font-semibold -mb-px border-b-2 transition focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_#e3eeff] rounded-t-lg ${
                  activeTab === t.id ? 'border-amber-600 text-amber-600' : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                {t.label}
              </Link>
            ))}
          </nav>

          {activeTab === 'tests' ? (
            <TestList userId={user.id} />
          ) : groups.length === 0 ? (
            <div className="bg-white rounded-2xl border border-dashed border-gray-300 p-10 text-center space-y-3">
              <ClipboardList className="w-8 h-8 text-amber-600 mx-auto" />
              <p className="text-gray-600">
                {enrollments.length === 0
                  ? 'Enroll in a course to see its assignments here.'
                  : 'None of your courses have assignments yet.'}
              </p>
              <Link
                href="/dashboard"
                className="inline-flex h-10 px-5 items-center rounded-lg bg-amber-600 hover:bg-[#0060eb] text-white font-semibold text-sm transition"
              >
                Go to dashboard
              </Link>
            </div>
          ) : (
            groups.map(({ course, items }) => (
              <section key={course.id} className="space-y-4" aria-labelledby={`course-${course.id}`}>
                <h2 id={`course-${course.id}`} className="text-2xl font-semibold text-gray-900">
                  {course.title}
                </h2>
                <ul className="bg-white rounded-2xl border border-gray-200 divide-y divide-gray-200">
                  {items.map(({ assignment, lesson, submission }) => (
                    <li key={assignment.id} className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-3">
                          <h3 className="text-base font-semibold text-gray-900">{assignment.title}</h3>
                          <StatusBadge status={submission?.status || 'PENDING'} score={submission?.score ?? null} max={assignment.maxScore} />
                        </div>
                        <p className="text-sm text-gray-600">
                          {lesson.title}
                          {submission ? ` · Submitted ${fmt(submission.submittedAt)}` : ''}
                        </p>
                        {submission?.feedback && (
                          <p className="text-sm text-gray-700 bg-gray-50 rounded-lg px-3 py-2 mt-2 max-w-3xl">
                            <span className="font-semibold">Feedback: </span>
                            {submission.feedback}
                          </p>
                        )}
                      </div>
                      <Link
                        href={`/learn/${course.slug}?lesson=${lesson.id}&tab=assignment`}
                        className="shrink-0 h-10 px-4 rounded-lg border border-amber-600 text-amber-600 hover:bg-amber-50 font-semibold text-sm flex items-center gap-2 transition self-start md:self-auto"
                      >
                        {submission ? 'View / resubmit' : 'Start assignment'} <ArrowRight className="w-4 h-4" />
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ))
          )}
        </div>
      </main>
      <MobileBottomNav role={user.role} isLoggedIn />
    </>
  );
}
