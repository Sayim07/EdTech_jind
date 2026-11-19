import { prisma } from '@/lib/prisma';

interface Viewer {
  id: string;
  role: string;
}

/** ADMIN may review everything; an INSTRUCTOR only the courses they teach. */
export async function canReviewCourse(user: Viewer | null | undefined, courseId: string): Promise<boolean> {
  if (!user) return false;
  if (user.role === 'ADMIN') return true;
  if (user.role !== 'INSTRUCTOR') return false;
  const c = await prisma.course.findFirst({ where: { id: courseId, instructor: { userId: user.id } }, select: { id: true } });
  return Boolean(c);
}

/** The course ids this person may review. null means every course (admin). */
export async function reviewableCourseIds(user: Viewer | null | undefined): Promise<string[] | null> {
  if (!user) return [];
  if (user.role === 'ADMIN') return null;
  if (user.role !== 'INSTRUCTOR') return [];
  return (await prisma.course.findMany({ where: { instructor: { userId: user.id } }, select: { id: true } })).map((c) => c.id);
}
