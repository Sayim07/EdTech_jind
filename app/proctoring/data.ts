import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { reviewableCourseIds } from '@/lib/proctor-access';
import type { AttemptRow, CourseOption, GrantRow, VerificationRow } from '@/components/proctoring/types';

/** Staff only: ADMIN and INSTRUCTOR. Everyone else is sent away. */
export async function requireReviewer() {
  const user = await getSessionUser();
  if (!user) redirect('/login');
  if (user.role !== 'ADMIN' && user.role !== 'INSTRUCTOR') redirect('/dashboard');
  return user;
}

const iso = (d: Date | null | undefined) => (d ? d.toISOString() : null);

/** Everything the /proctoring list needs, limited to the courses this person may review. */
export async function loadProctoringLists(user: { id: string; role: string }) {
  const ids = await reviewableCourseIds(user); // null = every course
  const scoped = ids ? { courseId: { in: ids } } : {};

  const [courses, verifications, attempts, grants] = await Promise.all([
    prisma.course.findMany({ where: ids ? { id: { in: ids } } : {}, select: { id: true, title: true }, orderBy: { title: 'asc' } }),
    prisma.examVerification.findMany({ where: scoped, orderBy: { createdAt: 'desc' }, take: 500, include: { user: { select: { name: true, email: true } } } }),
    prisma.mcqAttempt.findMany({
      where: scoped,
      orderBy: { startedAt: 'desc' },
      take: 500,
      select: {
        id: true,
        userId: true,
        courseId: true,
        testKey: true,
        testTitle: true,
        status: true,
        score: true,
        total: true,
        percentage: true,
        passed: true,
        violations: true,
        autoSubmitted: true,
        autoReason: true,
        reviewStatus: true,
        reviewedById: true,
        startedAt: true,
        submittedAt: true,
        user: { select: { name: true, email: true } },
        _count: { select: { captures: true } },
      },
    }),
    prisma.examRetakeGrant.findMany({ where: scoped, orderBy: { createdAt: 'desc' }, take: 300 }),
  ]);

  const testKeys = [...new Set([...verifications.map((v) => v.testKey), ...attempts.map((a) => a.testKey), ...grants.map((g) => g.testKey)])];
  const userIds = [...new Set([...verifications.map((v) => v.reviewedById), ...attempts.map((a) => a.reviewedById), ...grants.map((g) => g.grantedById), ...grants.map((g) => g.userId)].filter((x): x is string => !!x))];

  const [tests, people] = await Promise.all([
    prisma.mcqTest.findMany({ where: { id: { in: testKeys } }, select: { id: true, title: true, maxViolations: true } }),
    prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true, email: true } }),
  ]);
  const testById = new Map(tests.map((t) => [t.id, t]));
  const personById = new Map(people.map((p) => [p.id, p]));
  const courseTitle = new Map(courses.map((c) => [c.id, c.title]));
  const titleOf = (key: string, fallback?: string) => testById.get(key)?.title ?? fallback ?? 'Deleted exam';

  const courseOptions: CourseOption[] = courses.map((c) => ({ id: c.id, title: c.title }));

  const verificationRows: VerificationRow[] = verifications.map((v) => ({
    id: v.id,
    userId: v.userId,
    student: v.user.name,
    email: v.user.email,
    courseId: v.courseId,
    course: courseTitle.get(v.courseId) ?? 'Course',
    testKey: v.testKey,
    test: titleOf(v.testKey),
    status: v.status as VerificationRow['status'],
    rejectReason: v.rejectReason,
    reviewer: v.reviewedById ? personById.get(v.reviewedById)?.name ?? 'Staff' : null,
    reviewedAt: iso(v.reviewedAt),
    createdAt: v.createdAt.toISOString(),
    purgedAt: iso(v.purgedAt),
  }));

  const attemptRows: AttemptRow[] = attempts.map((a) => ({
    id: a.id,
    userId: a.userId,
    student: a.user.name,
    email: a.user.email,
    courseId: a.courseId,
    course: courseTitle.get(a.courseId) ?? 'Course',
    testKey: a.testKey,
    test: titleOf(a.testKey, a.testTitle),
    status: a.status,
    score: a.score,
    total: a.total,
    percentage: a.percentage,
    passed: a.passed,
    violations: a.violations,
    maxViolations: testById.get(a.testKey)?.maxViolations ?? null,
    autoSubmitted: a.autoSubmitted,
    autoReason: a.autoReason,
    reviewStatus: a.reviewStatus,
    reviewer: a.reviewedById ? personById.get(a.reviewedById)?.name ?? 'Staff' : null,
    captures: a._count.captures,
    startedAt: a.startedAt.toISOString(),
    submittedAt: iso(a.submittedAt),
  }));

  const grantRows: GrantRow[] = grants.map((g) => ({
    id: g.id,
    userId: g.userId,
    student: personById.get(g.userId)?.name ?? 'Student',
    email: personById.get(g.userId)?.email ?? '',
    courseId: g.courseId,
    course: courseTitle.get(g.courseId) ?? 'Course',
    testKey: g.testKey,
    test: titleOf(g.testKey),
    reason: g.reason,
    grantedBy: personById.get(g.grantedById)?.name ?? 'Staff',
    createdAt: g.createdAt.toISOString(),
    usedAt: iso(g.usedAt),
  }));

  return { courseOptions, verifications: verificationRows, attempts: attemptRows, grants: grantRows };
}
