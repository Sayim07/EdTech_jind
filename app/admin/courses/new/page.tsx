import React from 'react';
import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/auth';
import { Navbar } from '@/components/Navbar';
import { MobileBottomNav } from '@/components/MobileBottomNav';
import { CourseBuilder } from '@/components/admin/CourseBuilder';
import { emptyContent } from '@/lib/course-content-shared';
import { courseCategories, activeInstructors } from '@/lib/course-options';

export const metadata = {
  title: 'New Course | CIM India Admin',
  description: 'Create a course with modules, lessons, assignments and tests.',
};

export default async function NewCoursePage() {
  const user = await getSessionUser();
  if (!user || user.role !== 'ADMIN') redirect('/login?tab=admin&error=AdminAccessOnly');

  const [categories, instructors] = await Promise.all([courseCategories(), activeInstructors()]);

  return (
    <>
      <Navbar />
      <main className="flex-1 pb-24 lg:pb-12 bg-gray-50 min-h-screen">
        <CourseBuilder mode="create" initialContent={emptyContent()} categories={categories} instructors={instructors} />
      </main>
      <MobileBottomNav role="ADMIN" isLoggedIn />
    </>
  );
}
