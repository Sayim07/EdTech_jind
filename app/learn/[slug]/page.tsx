import React from 'react';
import { redirect, notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { ClassroomPlayerClient } from './ClassroomPlayerClient';

export default async function CourseClassroomPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
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
  if (user.role !== 'ADMIN') {
    const enrollment = await prisma.enrollment.findUnique({
      where: {
        userId_courseId: {
          userId: user.id,
          courseId: course.id,
        },
      },
    });

    if (!enrollment) {
      redirect(`/courses/${course.slug}?unauthorized=true`);
    }
  }

  return (
    <ClassroomPlayerClient
      course={course}
      user={user}
    />
  );
}
