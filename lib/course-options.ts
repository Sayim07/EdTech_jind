import { prisma } from '@/lib/prisma';

/** Categories created by admins, plus any still in use by a course (older courses), sorted. */
export async function courseCategories(): Promise<string[]> {
  const [created, used] = await Promise.all([
    prisma.category.findMany({ select: { name: true } }),
    prisma.course.findMany({ distinct: ['category'], select: { category: true } }),
  ]);
  return Array.from(new Set([...created.map((c) => c.name), ...used.map((r) => r.category).filter(Boolean)])).sort((a, b) => a.localeCompare(b));
}

/** Names of active instructors from the Staff page, offered as suggestions in the course form. */
export async function activeInstructors(): Promise<string[]> {
  const rows = await prisma.staffMember.findMany({ where: { role: 'INSTRUCTOR', active: true }, select: { name: true }, orderBy: { name: 'asc' } });
  return rows.map((r) => r.name);
}
