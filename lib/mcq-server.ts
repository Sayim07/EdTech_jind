import { prisma } from '@/lib/prisma';
import { sampleQuestionsFor } from '@/lib/mcq-sample';
import { AttemptResult, StoredQuestion, TestDraft, gradeAnswers, validateTest } from '@/lib/mcq';

export interface ResolvedTest {
  key: string; // McqTest.id, or "sample-<courseId>"
  courseId: string;
  title: string;
  timeLimit: number;
  passingMarks: number;
  allowRetakes: boolean;
  isSample: boolean;
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
  const real = await prisma.mcqTest.findMany({
    where: { courseId: course.id },
    orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
    include: { questions: { orderBy: { order: 'asc' } } },
  });
  const usable = real.filter((t) => t.questions.length > 0);
  if (usable.length > 0) {
    return usable.map((t) => ({
      key: t.id,
      courseId: course.id,
      title: t.title,
      timeLimit: t.timeLimit,
      passingMarks: t.passingMarks,
      allowRetakes: t.allowRetakes,
      isSample: false,
      questions: t.questions.map((q) => {
        const c = compact(parseOptions(q.options), q.correctIndex);
        return { id: q.id, text: q.text, options: c.options, correctIndex: c.correctIndex, explanation: q.explanation };
      }),
    }));
  }
  const sample = sampleQuestionsFor(course);
  return [
    {
      key: `sample-${course.id}`,
      courseId: course.id,
      title: `${course.title}: Practice Test`,
      timeLimit: 15,
      passingMarks: 60,
      allowRetakes: true,
      isSample: true,
      questions: sample.map((q, i) => ({ id: `s${i + 1}`, text: q.text, options: q.options, correctIndex: q.correctIndex, explanation: q.explanation })),
    },
  ];
}

export async function findTestByKey(userId: string, key: string): Promise<ResolvedTest | null> {
  const courseId = key.startsWith('sample-')
    ? key.slice('sample-'.length)
    : (await prisma.mcqTest.findUnique({ where: { id: key }, select: { courseId: true } }))?.courseId;
  if (!courseId) return null;
  const enrollment = await prisma.enrollment.findUnique({ where: { userId_courseId: { userId, courseId } } });
  if (!enrollment) return null;
  const course = await prisma.course.findUnique({ where: { id: courseId } });
  if (!course) return null;
  return (await resolveCourseTests(course)).find((t) => t.key === key) || null;
}

/** Replaces a course's tests with the given drafts (create / update / delete in one go). */
export async function syncCourseTests(courseId: string, tests: TestDraft[]): Promise<string | null> {
  for (const t of tests) {
    const problem = validateTest(t);
    if (problem) return problem;
  }
  const existing = await prisma.mcqTest.findMany({ where: { courseId }, select: { id: true } });
  const existingIds = new Set(existing.map((t) => t.id));
  const keepIds = new Set(tests.filter((t) => existingIds.has(t.id)).map((t) => t.id));

  await prisma.$transaction(async (tx) => {
    const toDelete = [...existingIds].filter((id) => !keepIds.has(id));
    if (toDelete.length) await tx.mcqTest.deleteMany({ where: { id: { in: toDelete } } });

    for (let i = 0; i < tests.length; i++) {
      const t = tests[i];
      const data = {
        title: t.title.trim(),
        timeLimit: Math.round(t.timeLimit),
        passingMarks: Math.round(t.passingMarks),
        allowRetakes: Boolean(t.allowRetakes),
        order: i + 1,
      };
      const questions = t.questions.map((q, qi) => ({
        order: qi + 1,
        text: q.text.trim(),
        options: JSON.stringify(q.options.map((o) => o.trim())),
        correctIndex: q.correctIndex as number,
        explanation: q.explanation.trim() || null,
      }));
      if (keepIds.has(t.id)) {
        await tx.mcqTest.update({ where: { id: t.id }, data });
        await tx.mcqQuestion.deleteMany({ where: { testId: t.id } });
        await tx.mcqQuestion.createMany({ data: questions.map((q) => ({ ...q, testId: t.id })) });
      } else {
        await tx.mcqTest.create({ data: { ...data, courseId, questions: { create: questions } } });
      }
    }
  });
  return null;
}

export async function loadTestDrafts(courseId: string): Promise<TestDraft[]> {
  const tests = await prisma.mcqTest.findMany({
    where: { courseId },
    orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
    include: { questions: { orderBy: { order: 'asc' } } },
  });
  return tests.map((t) => ({
    id: t.id,
    title: t.title,
    timeLimit: t.timeLimit,
    passingMarks: t.passingMarks,
    allowRetakes: t.allowRetakes,
    questions: t.questions.map((q) => ({
      id: q.id,
      text: q.text,
      options: parseOptions(q.options),
      correctIndex: q.correctIndex,
      explanation: q.explanation || '',
    })),
  }));
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
