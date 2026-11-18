import React from 'react';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { Navbar } from '@/components/Navbar';
import { MobileBottomNav } from '@/components/MobileBottomNav';
import { AdminClient } from './AdminClient';

export default async function AdminStudioPage() {
  const user = await getSessionUser();

  if (!user || user.role !== 'ADMIN') {
    redirect('/login?tab=admin&error=AdminAccessOnly');
  }

  // Fetch initial data for admin studio
  const [courses, students, enrollments] = await Promise.all([
    prisma.course.findMany({
      include: {
        modules: {
          include: {
            lessons: true,
          },
        },
        _count: { select: { enrollments: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.user.findMany({
      where: { role: 'STUDENT' },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
        enrollments: {
          select: {
            id: true,
            amountPaid: true,
            createdAt: true,
            course: { select: { id: true, title: true } },
          },
        },
        _count: { select: { submissions: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.enrollment.findMany({
      include: {
        user: { select: { id: true, name: true, email: true } },
        course: { select: { id: true, title: true, price: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  const totalRevenue = enrollments.reduce((sum, e) => sum + (e.amountPaid || 0), 0);

  return (
    <>
      <Navbar />

      <main className="flex-1 pb-24 lg:pb-12 bg-gray-50">
        <AdminClient
          adminUser={user}
          initialCourses={courses}
          initialStudents={students}
          initialEnrollments={enrollments}
          totalRevenue={totalRevenue}
        />
      </main>

      <MobileBottomNav role="ADMIN" isLoggedIn={true} />
    </>
  );
}
