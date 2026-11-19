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
  searchParams: Promise<{ lesson?: string; assignment?: string }>;
}) {
  const { slug } = await params;
  const { lesson, assignment } = await searchParams;
  const user = await getSessionUser();

  if (!user) {
    redirect(`/login?redirect=/learn/${slug}`);
  }

  // Course, enrollment and progress do not depend on each other (all keyed by the slug), so ask for them at once.
  const [course, enrollment, progress] = await Promise.all([
  prisma.course.findUnique({
    where: { slug },
    include: {
      modules: {
        orderBy: { order: 'asc' },
        include: {
          lessons: { orderBy: { order: 'asc' } },
          assignments: {
            orderBy: { order: 'asc' },
            include: { submissions: { where: { userId: user.id }, orderBy: { submittedAt: 'desc' }, take: 1 } },
          },
          tests: { where: { questions: { some: {} } }, orderBy: { order: 'asc' }, select: { id: true, title: true, kind: true } },
        },
      },
      mcqTests: { where: { questions: { some: {} } }, orderBy: { order: 'asc' }, select: { id: true, title: true, kind: true } },
    },
  }),
  prisma.enrollment.findFirst({ where: { userId: user.id, course: { slug } } }),
  prisma.lessonProgress.findMany({
    where: { userId: user.id, lesson: { module: { course: { slug } } } },
    select: { lessonId: true },
  }),
  ]);

  if (!course) notFound();

  // Admins always have access

  if (!enrollment && user.role !== 'ADMIN') {
    redirect(`/courses/${course.slug}?unauthorized=true`);
  }

  return (
    <ClassroomPlayerClient
      course={{ ...course, tests: course.mcqTests }}
      user={{ id: user.id, name: user.name, email: user.email, role: user.role }}
      initialLessonId={lesson}
      initialAssignmentId={assignment}
      canTrackProgress={!!enrollment}
      initialCompletedIds={progress.map((p) => p.lessonId)}
      initialCertificateCode={enrollment?.certificateCode ?? null}
    />
  );
}
