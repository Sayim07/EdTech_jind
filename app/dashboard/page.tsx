import React from 'react';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { Navbar } from '@/components/Navbar';
import { MobileBottomNav } from '@/components/MobileBottomNav';
import { DashboardClient } from './DashboardClient';

export default async function DashboardPage() {
  const user = await getSessionUser();

  if (!user) {
    redirect('/login?redirect=/dashboard');
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
    take: 4,
  });

  return (
    <>
      <Navbar />

      <main className="flex-1 pb-24 md:pb-12 bg-parchment-50 dark:bg-ink-950">
        <DashboardClient
          user={user}
          enrollments={enrollments}
          popularCourses={popularCourses}
        />
      </main>

      <MobileBottomNav role={user.role} isLoggedIn={true} />
    </>
  );
}
