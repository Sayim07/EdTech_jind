import React from 'react';
import { redirect, notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { ClassroomPlayerClient } from './ClassroomPlayerClient';

export default async function CourseClassroomPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ lesson?: string; tab?: string }>;
}) {
  const { slug } = await params;
  const { lesson, tab } = await searchParams;
  const user = await getSessionUser();

  if (!user) {
    redirect(`/login?redirect=/learn/${slug}`);
  }

  const course = await prisma.course.findUnique({
    where: { slug },
    include: {
      modules: {
        orderBy: { order: 'asc' },
        include: {
          lessons: {
            orderBy: { order: 'asc' },
            include: {
              assignments: {
                include: {
                  submissions: {
                    where: { userId: user.id },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!course) notFound();

  // Verify enrollment (Admins always have access)
  const enrollment = await prisma.enrollment.findUnique({
    where: {
      userId_courseId: {
        userId: user.id,
        courseId: course.id,
      },
    },
  });

  if (!enrollment && user.role !== 'ADMIN') {
    redirect(`/courses/${course.slug}?unauthorized=true`);
  }

  const progress = enrollment
    ? await prisma.lessonProgress.findMany({
        where: { userId: user.id, lesson: { module: { courseId: course.id } } },
        select: { lessonId: true },
      })
    : [];

  return (
    <ClassroomPlayerClient
      course={course}
      user={user}
      initialLessonId={lesson}
      initialTab={tab === 'assignment' ? 'assignment' : 'notes'}
      canTrackProgress={!!enrollment}
      initialCompletedIds={progress.map((p) => p.lessonId)}
      initialCertificateCode={enrollment?.certificateCode ?? null}
    />
  );
}
