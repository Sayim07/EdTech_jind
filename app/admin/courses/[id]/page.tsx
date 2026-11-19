import React from 'react';
import { notFound, redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { Navbar } from '@/components/Navbar';
import { MobileBottomNav } from '@/components/MobileBottomNav';
import { CourseBuilder } from '@/components/admin/CourseBuilder';
import { loadCourseContent } from '@/lib/course-content';
import { courseCategories, activeInstructors } from '@/lib/course-options';

export const metadata = {
  title: 'Edit Course | CIM India Admin',
  description: 'Edit course details, modules, lessons, assignments and tests.',
};

export default async function AdminEditCoursePage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user || user.role !== 'ADMIN') redirect('/login?tab=admin&error=AdminAccessOnly');

  const { id } = await params;
  // Nothing here depends on anything else, so ask for it all at once. The address normally carries the course id, so the
  // content can be requested in the same breath; if someone used the slug instead, reload it with the real id.
  const [course, categories, instructors, guessedContent] = await Promise.all([
    prisma.course.findFirst({ where: { OR: [{ id }, { slug: id }] } }),
    courseCategories(),
    activeInstructors(),
    loadCourseContent(id),
  ]);
  if (!course) notFound();
  const content = course.id === id ? guessedContent : await loadCourseContent(course.id);

  return (
    <>
      <Navbar />
      <main className="flex-1 pb-24 lg:pb-12 bg-gray-50 min-h-screen">
        <CourseBuilder
          mode="edit"
          course={{
            id: course.id,
            slug: course.slug,
            title: course.title,
            shortDescription: course.shortDescription,
            description: course.description,
            price: course.price,
            originalPrice: course.originalPrice,
            category: course.category,
            level: course.level,
            instructorName: course.instructorName,
            thumbnail: course.thumbnail,
            totalHours: course.totalHours,
            faqs: course.faqs,
            published: course.published,
          }}
          initialContent={content}
          categories={categories}
          instructors={instructors}
        />
      </main>
      <MobileBottomNav role="ADMIN" isLoggedIn />
    </>
  );
}
