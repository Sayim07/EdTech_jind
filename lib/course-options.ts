import { prisma } from '@/lib/prisma';

const DEFAULT_CATEGORIES = ['Anthropology & Gastronomy', 'World History', 'Global Economics & Culture', 'Ancient Civilizations', 'Culinary History & Science'];

/** Categories already in use by any course, plus the built-in ones, sorted. */
export async function courseCategories(): Promise<string[]> {
  const rows = await prisma.course.findMany({ distinct: ['category'], select: { category: true } });
  return Array.from(new Set([...DEFAULT_CATEGORIES, ...rows.map((r) => r.category).filter(Boolean)])).sort((a, b) => a.localeCompare(b));
}

/** Names of active instructors from the Staff page, offered as suggestions in the course form. */
export async function activeInstructors(): Promise<string[]> {
  const rows = await prisma.staffMember.findMany({ where: { role: 'INSTRUCTOR', active: true }, select: { name: true }, orderBy: { name: 'asc' } });
  return rows.map((r) => r.name);
}
