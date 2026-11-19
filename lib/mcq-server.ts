import { prisma } from '@/lib/prisma';
import { sampleQuestionsFor } from '@/lib/mcq-sample';
import { AttemptResult, StoredQuestion, gradeAnswers } from '@/lib/mcq';
import { DEFAULT_EXAM_SETTINGS, type ExamSettings } from '@/lib/proctor';

export interface ResolvedTest {
  key: string; // McqTest.id, or "sample-<courseId>"
  courseId: string;
  title: string;
  timeLimit: number;
  passingMarks: number;
  allowRetakes: boolean;
  isSample: boolean;
  /** TEST is proctored; ASSIGNMENT (an MCQ assignment inside a module) is not. */
  kind: 'TEST' | 'ASSIGNMENT';
  moduleTitle: string | null;
  /** Proctoring controls. For the built-in practice test these are the defaults. */
  settings: ExamSettings;
  /** The whole question bank. An attempt draws from it (see lib/exam.ts). */
  questions: StoredQuestion[];
}

function parseOptions(raw: string): string[] {
  try {
    const arr = JSON.parse(raw);
    if (Array.isArray(arr)) return [0, 1, 2, 3].map((i) => String(arr[i] ?? ''));
  } catch {}
  return ['', '', '', ''];
}

/** Compact the 4 option slots to non-empty ones, remapping the correct index. */
function compact(options: string[], correctIndex: number) {
  const kept: string[] = [];
  let mapped = 0;
  options.forEach((o, i) => {
    if (o.trim()) {
      if (i === correctIndex) mapped = kept.length;
      kept.push(o.trim());
    }
  });
  return { options: kept, correctIndex: mapped };
}

/**
 * Real tests for a course when the admin has created any, otherwise one built-in sample test.
 * The fallback disappears on its own once a real test exists: no code or config change needed.
 */
export async function resolveCourseTests(course: { id: string; title: string; slug: string; category?: string | null }): Promise<ResolvedTest[]> {
  // Course-level tests plus everything inside the course's modules (tests and MCQ assignments).
  const real = await prisma.mcqTest.findMany({
    where: { OR: [{ courseId: course.id }, { module: { courseId: course.id } }] },
    include: { questions: { orderBy: { order: 'asc' } }, module: { select: { title: true, order: true } } },
  });
  // Module order first, course-level tests last, then the admin's own ordering.
  real.sort((a, b) => (a.module?.order ?? 9999) - (b.module?.order ?? 9999) || a.order - b.order || a.createdAt.getTime() - b.createdAt.getTime());

  const usable = real.filter((t) => t.questions.length > 0);
  const mapped: ResolvedTest[] = usable.map((t) => ({
    key: t.id,
    courseId: course.id,
    title: t.title,
    timeLimit: t.timeLimit,
    passingMarks: t.passingMarks,
    allowRetakes: t.allowRetakes,
    isSample: false,
    kind: t.kind === 'ASSIGNMENT' ? 'ASSIGNMENT' : 'TEST',
    moduleTitle: t.module?.title ?? null,
    settings: {
      requireCamera: t.requireCamera,
      requireIdCheck: t.requireIdCheck,
      requireConsent: t.requireConsent,
      accessCode: t.accessCode,
      startsAt: t.startsAt,
      endsAt: t.endsAt,
      questionCount: t.questionCount,
      randomizeQuestions: t.randomizeQuestions,
      randomizeOptions: t.randomizeOptions,
      maxViolations: t.maxViolations,
      captureEverySeconds: t.captureEverySeconds,
      photoRetentionDays: t.photoRetentionDays,
    },
    questions: t.questions.map((q) => {
      const c = compact(parseOptions(q.options), q.correctIndex);
      return { id: q.id, text: q.text, options: c.options, correctIndex: c.correctIndex, explanation: q.explanation };
    }),
  }));

  // The built-in practice test only stands in while a course has no real test (MCQ assignments do not count).
  if (mapped.some((t) => t.kind === 'TEST')) return mapped;
  const sample = sampleQuestionsFor(course);
  return [
    ...mapped,
    {
      key: `sample-${course.id}`,
      courseId: course.id,
      title: `${course.title}: Practice Test`,
      timeLimit: 15,
      passingMarks: 60,
      allowRetakes: true,
      isSample: true,
      kind: 'TEST',
      moduleTitle: null,
      settings: { ...DEFAULT_EXAM_SETTINGS },
      questions: sample.map((q, i) => ({ id: `s${i + 1}`, text: q.text, options: q.options, correctIndex: q.correctIndex, explanation: q.explanation })),
    },
  ];
}

/**
 * Just the tests a course offers (id, title, kind), without loading any questions. For lists such as the dashboard
 * to-do, where pulling every question of every test only to show a title was the slowest part of the page.
 */
export async function listCourseTestsLight(course: { id: string; title: string }): Promise<{ key: string; title: string; kind: 'TEST' | 'ASSIGNMENT' }[]> {
  const rows = await prisma.mcqTest.findMany({
    where: { OR: [{ courseId: course.id }, { module: { courseId: course.id } }], questions: { some: {} } },
    select: { id: true, title: true, kind: true, order: true, createdAt: true, module: { select: { order: true } } },
  });
  rows.sort((a, b) => (a.module?.order ?? 9999) - (b.module?.order ?? 9999) || a.order - b.order || a.createdAt.getTime() - b.createdAt.getTime());
  const list = rows.map((t) => ({ key: t.id, title: t.title, kind: (t.kind === 'ASSIGNMENT' ? 'ASSIGNMENT' : 'TEST') as 'TEST' | 'ASSIGNMENT' }));
  // The built-in practice test stands in until a course has a real test (same rule as resolveCourseTests).
  if (!list.some((t) => t.kind === 'TEST')) list.push({ key: `sample-${course.id}`, title: `${course.title}: Practice Test`, kind: 'TEST' });
  return list;
}

/**
 * Test titles for every course a student is enrolled in, in ONE query, so a page can ask for it at the same moment as
 * the enrollments instead of waiting for them. Group the result by courseId; apply the sample-test rule per course
 * with withPracticeFallback().
 */
export async function listUserTestsLight(userId: string) {
  const rows = await prisma.mcqTest.findMany({
    where: {
      questions: { some: {} },
      OR: [{ course: { enrollments: { some: { userId } } } }, { module: { course: { enrollments: { some: { userId } } } } }],
    },
    select: { id: true, title: true, kind: true, order: true, createdAt: true, courseId: true, module: { select: { order: true, courseId: true } } },
  });
  rows.sort((a, b) => (a.module?.order ?? 9999) - (b.module?.order ?? 9999) || a.order - b.order || a.createdAt.getTime() - b.createdAt.getTime());
  return rows.map((t) => ({ key: t.id, courseId: (t.courseId ?? t.module?.courseId) as string, title: t.title, kind: (t.kind === 'ASSIGNMENT' ? 'ASSIGNMENT' : 'TEST') as 'TEST' | 'ASSIGNMENT' }));
}

/** Adds the built-in practice test when a course has no real test (same rule as resolveCourseTests). */
export function withPracticeFallback(course: { id: string; title: string }, tests: { key: string; title: string; kind: 'TEST' | 'ASSIGNMENT' }[]) {
  return tests.some((t) => t.kind === 'TEST') ? tests : [...tests, { key: `sample-${course.id}`, title: `${course.title}: Practice Test`, kind: 'TEST' as const }];
}

export async function findTestByKey(userId: string, key: string): Promise<ResolvedTest | null> {
  let courseId: string | null | undefined;
  if (key.startsWith('sample-')) courseId = key.slice('sample-'.length);
  else {
    const t = await prisma.mcqTest.findUnique({ where: { id: key }, select: { courseId: true, module: { select: { courseId: true } } } });
    courseId = t?.courseId ?? t?.module?.courseId;
  }
  if (!courseId) return null;
  const enrollment = await prisma.enrollment.findUnique({ where: { userId_courseId: { userId, courseId } } });
  if (!enrollment) return null;
  const course = await prisma.course.findUnique({ where: { id: courseId } });
  if (!course) return null;
  return (await resolveCourseTests(course)).find((t) => t.key === key) || null;
}

export function parseJson<T>(raw: string | null | undefined, fallback: T): T {
  try {
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function toResult(a: {
  id: string;
  testTitle: string;
  passingMarks: number;
  questions: string;
  answers: string;
  score: number | null;
  total: number | null;
  percentage: number | null;
  passed: boolean | null;
  autoSubmitted: boolean;
  autoReason: string | null;
  violations: number;
  submittedAt: Date | null;
}): AttemptResult {
  const questions = parseJson<StoredQuestion[]>(a.questions, []);
  const answers = parseJson<Record<string, number>>(a.answers, {});
  const review = questions.map((q) => ({
    id: q.id,
    text: q.text,
    options: q.options,
    selectedIndex: answers[q.id] ?? null,
    correctIndex: q.correctIndex,
    explanation: q.explanation || null,
  }));
  const correct = review.filter((r) => r.selectedIndex === r.correctIndex).length;
  const unanswered = review.filter((r) => r.selectedIndex === null).length;
  return {
    id: a.id,
    testTitle: a.testTitle,
    score: a.score ?? correct,
    total: a.total ?? questions.length,
    percentage: a.percentage ?? 0,
    passed: Boolean(a.passed),
    passingMarks: a.passingMarks,
    correct,
    incorrect: review.length - correct - unanswered,
    unanswered,
    autoSubmitted: a.autoSubmitted,
    autoReason: a.autoReason,
    violations: a.violations,
    submittedAt: (a.submittedAt || new Date()).toISOString(),
    review,
  };
}

export interface FinalizeOptions {
  answers: Record<string, number>;
  violations: number;
  autoSubmitted: boolean;
  autoReason: string | null;
  snapshots?: { t: string; img: string }[];
}

/** Grades an in-progress attempt on the server and stores the outcome. */
export async function finalizeAttempt(attemptId: string, opts: FinalizeOptions) {
  const attempt = await prisma.mcqAttempt.findUnique({ where: { id: attemptId } });
  if (!attempt) return null;
  if (attempt.status === 'SUBMITTED') return attempt;

  const questions = parseJson<StoredQuestion[]>(attempt.questions, []);
  const clean: Record<string, number> = {};
  for (const q of questions) {
    const v = opts.answers[q.id];
    if (Number.isInteger(v) && v >= 0 && v < q.options.length) clean[q.id] = v;
  }
  const g = gradeAnswers(questions, clean);
  const passed = g.percentage >= attempt.passingMarks;

  const updated = await prisma.mcqAttempt.updateMany({
    where: { id: attemptId, status: 'IN_PROGRESS' },
    data: {
      answers: JSON.stringify(clean),
      status: 'SUBMITTED',
      score: g.correct,
      total: g.total,
      percentage: g.percentage,
      passed,
      violations: Math.max(attempt.violations, Math.min(opts.violations, 50)),
      autoSubmitted: opts.autoSubmitted,
      autoReason: opts.autoReason,
      ...(opts.snapshots ? { snapshots: JSON.stringify(opts.snapshots) } : {}),
      submittedAt: new Date(),
    },
  });
  void updated;
  return prisma.mcqAttempt.findUnique({ where: { id: attemptId } });
}
