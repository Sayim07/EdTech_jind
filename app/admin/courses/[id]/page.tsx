import React from 'react';
import { notFound, redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { Navbar } from '@/components/Navbar';
import { MobileBottomNav } from '@/components/MobileBottomNav';
import { EditCourseClient } from './EditCourseClient';

export const metadata = {
  title: 'Edit Course & Pricing | CIM India Admin',
  description: 'Update course details, pricing, syllabus, and preview student experience in real time.',
};

export default async function AdminEditCoursePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getSessionUser();

  if (!user || user.role !== 'ADMIN') {
    redirect('/login?tab=admin&error=AdminAccessOnly');
  }

  const { id } = await params;

  const course = await prisma.course.findFirst({
    where: {
      OR: [{ id }, { slug: id }],
    },
    include: {
      modules: {
        orderBy: { order: 'asc' },
        include: {
          lessons: {
            orderBy: { order: 'asc' },
            include: { assignments: true },
          },
        },
      },
      _count: { select: { enrollments: true } },
    },
  });

  if (!course) {
    notFound();
  }

  return (
    <>
      <Navbar />

      <main className="flex-1 pb-24 md:pb-12 bg-gray-50 min-h-screen">
        <EditCourseClient adminUser={user} initialCourse={course} />
      </main>

      <MobileBottomNav role="ADMIN" isLoggedIn={true} />
    </>
  );
}
