import React from 'react';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { Navbar } from '@/components/Navbar';
import { MobileBottomNav } from '@/components/MobileBottomNav';
import { DashboardClient } from './DashboardClient';
import { durationToMinutes } from '@/lib/course';
import { resolveCourseTests } from '@/lib/mcq-server';

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  await searchParams;
  const user = await getSessionUser();

  if (!user) {
    redirect('/login?redirect=/dashboard');
  }

  // Administrators manage courses and students on /admin and should never see the student "My Courses" view.
  if (user.role === 'ADMIN') {
    redirect('/admin?tab=home');
  }

  // Fetch enrolled courses for this student
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
                select: { id: true, title: true, type: true, duration: true },
              },
              assignments: { orderBy: { order: 'asc' }, select: { id: true, title: true, submissions: { where: { userId: user.id }, select: { id: true } } } },
            },
          },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  // Fetch popular/recommended courses for catalog exploration
  const popularCourses = await prisma.course.findMany({
    where: { published: true },
    include: {
      modules: {
        include: {
          lessons: { select: { id: true } },
        },
      },
      _count: { select: { enrollments: true } },
    },
    orderBy: { enrollments: { _count: 'desc' } },
  });

  // Per-course progress + activity feed for the signed-in student
  const doneRows = await prisma.lessonProgress.findMany({
    where: { userId: user.id },
    select: { lessonId: true, completedAt: true, lesson: { select: { duration: true } } },
  });
  const doneIds = new Set(doneRows.map((r) => r.lessonId));

  const progress: Record<string, number> = {};
  const nextLesson: Record<string, { id: string; title: string; type: string; duration: string | null } | null> = {};
  const todo: { kind: 'assignment' | 'test'; title: string; course: string; href: string }[] = [];
  let totalLessons = 0;
  let doneLessons = 0;
  for (const e of enrollments) {
    const lessons = e.course.modules.flatMap((m) => m.lessons);
    const done = lessons.filter((l) => doneIds.has(l.id)).length;
    totalLessons += lessons.length;
    doneLessons += done;
    progress[e.courseId] = lessons.length ? Math.min(100, Math.round((done / lessons.length) * 100)) : 0;
    const next = lessons.find((l) => !doneIds.has(l.id)) || null;
    nextLesson[e.courseId] = next ? { id: next.id, title: next.title, type: next.type, duration: next.duration } : null;
    for (const m of e.course.modules) {
      for (const a of m.assignments) {
        if (a.submissions.length === 0) todo.push({ kind: 'assignment', title: a.title, course: e.course.title, href: `/learn/${e.course.slug}?assignment=${a.id}` });
      }
    }
  }

  const attempts = await prisma.mcqAttempt.findMany({
    where: { userId: user.id },
    select: { testKey: true, status: true, startedAt: true, submittedAt: true },
  });
  const submittedKeys = new Set(attempts.filter((a) => a.status === 'SUBMITTED').map((a) => a.testKey));
  for (const e of enrollments) {
    for (const t of await resolveCourseTests(e.course)) {
      if (!submittedKeys.has(t.key)) todo.push({ kind: t.kind === 'ASSIGNMENT' ? 'assignment' : 'test', title: t.title, course: e.course.title, href: `/assignments/tests/${t.key}` });
    }
  }

  // Timestamped activity (last ~6 months) feeds the calendar and statistics widgets
  const since = Date.now() - 190 * 24 * 3600 * 1000;
  const activity = [
    ...doneRows.map((r) => ({ t: r.completedAt.toISOString(), minutes: Math.round(durationToMinutes(r.lesson.duration)) })),
    ...attempts.filter((a) => a.submittedAt).map((a) => ({ t: a.submittedAt!.toISOString(), minutes: Math.max(1, Math.round((a.submittedAt!.getTime() - a.startedAt.getTime()) / 60000)) })),
  ].filter((a) => new Date(a.t).getTime() >= since);

  const certificates = enrollments.filter((e) => e.certificateCode).length;

  return (
    <>
      <Navbar wide />

      <main className="flex-1 pb-24 lg:pb-12 bg-parchment-50">
        <DashboardClient
          user={user}
          enrollments={enrollments}
          popularCourses={popularCourses}
          progress={progress}
          nextLesson={nextLesson}
          todo={todo.slice(0, 5)}
          activity={activity}
          overall={{ totalLessons, doneLessons, certificates }}
        />
      </main>

      <MobileBottomNav role={user.role} isLoggedIn={true} />
    </>
  );
}
