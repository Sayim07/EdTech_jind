import React from 'react';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { Navbar } from '@/components/Navbar';
import { MobileBottomNav } from '@/components/MobileBottomNav';
import { DashboardClient } from './DashboardClient';

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;
  const user = await getSessionUser();

  if (!user) {
    redirect('/login?redirect=/dashboard');
  }

  // Administrators manage courses and students on /admin and should never see the student "My Courses" view.
  if (user.role === 'ADMIN') {
    redirect('/admin');
  }

  // Fetch enrolled courses for this student
  const enrollments = await prisma.enrollment.findMany({
    where: { userId: user.id },
    include: {
      course: {
        include: {
          modules: {
            include: {
              lessons: { select: { id: true, title: true, type: true, duration: true } },
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

  // Per-course progress for the signed-in student
  const doneRows = await prisma.lessonProgress.findMany({
    where: { userId: user.id },
    select: { lesson: { select: { module: { select: { courseId: true } } } } },
  });
  const doneByCourse: Record<string, number> = {};
  for (const r of doneRows) {
    const cid = r.lesson.module.courseId;
    doneByCourse[cid] = (doneByCourse[cid] || 0) + 1;
  }
  const progress: Record<string, number> = {};
  for (const e of enrollments) {
    const total = e.course.modules.reduce((n, m) => n + m.lessons.length, 0);
    progress[e.courseId] = total ? Math.min(100, Math.round(((doneByCourse[e.courseId] || 0) / total) * 100)) : 0;
  }

  return (
    <>
      <Navbar wide />

      <main className="flex-1 pb-24 lg:pb-12 bg-parchment-50">
        <DashboardClient
          user={user}
          enrollments={enrollments}
          popularCourses={popularCourses}
          progress={progress}
          initialTab={tab === 'my_courses' ? 'my_courses' : 'explore'}
        />
      </main>

      <MobileBottomNav role={user.role} isLoggedIn={true} />
    </>
  );
}
