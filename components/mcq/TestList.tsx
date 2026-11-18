import React from 'react';
import Link from 'next/link';
import { ArrowRight, ClipboardCheck } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { resolveCourseTests } from '@/lib/mcq-server';

const fmt = (d: Date) => d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

function Status({ kind }: { kind: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' }) {
  const map = {
    NOT_STARTED: ['Not started', 'bg-gray-100 text-gray-700'],
    IN_PROGRESS: ['In progress', 'bg-amber-100 text-amber-800'],
    COMPLETED: ['Completed', 'bg-emerald-100 text-emerald-800'],
  } as const;
  return <span className={`inline-flex px-2.5 py-0.5 rounded-md text-xs font-semibold ${map[kind][1]}`}>{map[kind][0]}</span>;
}

/** MCQ tests for every course the student is enrolled in (real tests, or the built-in sample when a course has none). */
export async function TestList({ userId }: { userId: string }) {
  const enrollments = await prisma.enrollment.findMany({
    where: { userId },
    include: { course: true },
    orderBy: { createdAt: 'desc' },
  });
  const attempts = await prisma.mcqAttempt.findMany({
    where: { userId },
    orderBy: { startedAt: 'desc' },
    select: { id: true, testKey: true, status: true, percentage: true, passed: true, submittedAt: true, startedAt: true },
  });

  const groups = await Promise.all(
    enrollments.map(async (e) => ({ course: e.course, tests: await resolveCourseTests(e.course) }))
  );

  if (groups.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-dashed border-gray-300 p-10 text-center space-y-3">
        <ClipboardCheck className="w-8 h-8 text-amber-600 mx-auto" />
        <p className="text-gray-600">Enroll in a course to take its MCQ tests.</p>
        <Link href="/dashboard" className="inline-flex h-10 px-5 items-center rounded-lg bg-amber-600 hover:bg-[#0060eb] text-white font-semibold text-sm transition">
          Go to dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {groups.map(({ course, tests }) => (
        <section key={course.id} className="space-y-4" aria-labelledby={`tests-${course.id}`}>
          <h2 id={`tests-${course.id}`} className="text-2xl font-semibold text-gray-900">
            {course.title}
          </h2>
          <ul className="bg-white rounded-2xl border border-gray-200 divide-y divide-gray-200">
            {tests.map((t) => {
              const mine = attempts.filter((a) => a.testKey === t.key);
              const open = mine.find((a) => a.status === 'IN_PROGRESS');
              const done = mine.filter((a) => a.status === 'SUBMITTED');
              const best = done.reduce<number | null>((m, a) => (a.percentage !== null && (m === null || a.percentage > m) ? a.percentage : m), null);
              const latest = done[0];
              const kind = open ? 'IN_PROGRESS' : done.length ? 'COMPLETED' : 'NOT_STARTED';
              const cta = open ? 'Resume' : done.length ? (t.allowRetakes ? 'Retake / history' : 'View history') : 'Start test';
              return (
                <li key={t.key} className="p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="min-w-0 space-y-2">
                    <div className="flex flex-wrap items-center gap-3">
                      <h3 className="text-base font-semibold text-gray-900">{t.title}</h3>
                      <Status kind={kind} />
                      {t.isSample && <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-amber-50 text-amber-700">Practice test</span>}
                    </div>
                    <dl className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-gray-600">
                      <div className="flex gap-1.5"><dt>Course:</dt><dd className="text-gray-900">{course.title}</dd></div>
                      <div className="flex gap-1.5"><dt>Questions:</dt><dd className="text-gray-900">{t.questions.length}</dd></div>
                      <div className="flex gap-1.5"><dt>Time limit:</dt><dd className="text-gray-900">{t.timeLimit} min</dd></div>
                      <div className="flex gap-1.5"><dt>Passing marks:</dt><dd className="text-gray-900">{t.passingMarks}%</dd></div>
                    </dl>
                    {done.length > 0 && best !== null && (
                      <p className="text-sm text-gray-700">
                        Best score {best}%
                        {latest ? ` · Latest ${latest.percentage ?? 0}% on ${fmt(latest.submittedAt || latest.startedAt)}` : ''} · {done.length} attempt{done.length === 1 ? '' : 's'}
                      </p>
                    )}
                  </div>
                  <Link
                    href={`/assignments/tests/${t.key}`}
                    className="shrink-0 h-10 px-4 rounded-lg border border-amber-600 text-amber-600 hover:bg-amber-50 font-semibold text-sm flex items-center gap-2 transition self-start lg:self-auto"
                  >
                    {cta} <ArrowRight className="w-4 h-4" />
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
