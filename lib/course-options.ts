import { prisma } from '@/lib/prisma';

/** Categories created by admins, plus any still in use by a course (older courses), sorted. */
export async function courseCategories(): Promise<string[]> {
  const [created, used] = await Promise.all([
    prisma.category.findMany({ select: { name: true } }),
    prisma.course.findMany({ distinct: ['category'], select: { category: true } }),
  ]);
  return Array.from(new Set([...created.map((c) => c.name), ...used.map((r) => r.category).filter(Boolean)])).sort((a, b) => a.localeCompare(b));
}

export interface InstructorOption {
  id: string;
  name: string;
  /** True when this instructor can sign in and answer student messages. */
  hasLogin: boolean;
}

export const DEFAULT_INSTRUCTOR_NAME = 'CIM India Faculty';

/** Active instructors from the Staff page, for the course form's instructor picker. */
export async function activeInstructors(): Promise<InstructorOption[]> {
  const rows = await prisma.staffMember.findMany({ where: { role: 'INSTRUCTOR', active: true }, select: { id: true, name: true, userId: true }, orderBy: { name: 'asc' } });
  return rows.map((r) => ({ id: r.id, name: r.name, hasLogin: !!r.userId }));
}

/** Checks an instructorId from a request. null/empty clears the instructor. */
export async function resolveInstructor(raw: unknown): Promise<{ id: string | null; name: string } | { error: string }> {
  if (raw === null || raw === '' || raw === undefined) return { id: null, name: DEFAULT_INSTRUCTOR_NAME };
  if (typeof raw !== 'string') return { error: 'Choose an instructor from the list.' };
  const staff = await prisma.staffMember.findUnique({ where: { id: raw }, select: { id: true, name: true, role: true, active: true } });
  if (!staff || staff.role !== 'INSTRUCTOR' || !staff.active) return { error: 'That instructor is not available. Choose an active instructor from the Staff list.' };
  return { id: staff.id, name: staff.name };
}
