import crypto from 'crypto';
import { prisma } from '@/lib/prisma';
import { QuestionDraft, TestDraft } from '@/lib/mcq';
import { Attachment, CourseContentDraft, LessonDraft, LessonType, ModuleDraft, isNew, validateContent } from '@/lib/course-content-shared';

/* ----------------------------------------------------------------------------------------------
 * Loading: database rows -> editable drafts
 * ---------------------------------------------------------------------------------------------- */

function parseOptions(raw: string): string[] {
  try {
    const arr = JSON.parse(raw);
    if (Array.isArray(arr)) return [0, 1, 2, 3].map((i) => String(arr[i] ?? ''));
  } catch {}
  return ['', '', '', ''];
}

function parseAttachments(raw: string | null): Attachment[] {
  try {
    const arr = JSON.parse(raw || '[]');
    return Array.isArray(arr) ? arr.filter((a) => a && typeof a.url === 'string').map((a) => ({ name: String(a.name || a.url.split('/').pop() || 'file'), url: a.url })) : [];
  } catch {
    return [];
  }
}

type TestRow = {
  id: string;
  title: string;
  timeLimit: number;
  passingMarks: number;
  allowRetakes: boolean;
  requireCamera: boolean;
  requireIdCheck: boolean;
  requireConsent: boolean;
  accessCode: string | null;
  startsAt: Date | null;
  endsAt: Date | null;
  questionCount: number | null;
  randomizeQuestions: boolean;
  randomizeOptions: boolean;
  maxViolations: number;
  captureEverySeconds: number;
  photoRetentionDays: number;
  questions: { id: string; text: string; options: string; correctIndex: number; explanation: string | null }[];
};

const toTestDraft = (t: TestRow): TestDraft => ({
  id: t.id,
  title: t.title,
  timeLimit: t.timeLimit,
  passingMarks: t.passingMarks,
  allowRetakes: t.allowRetakes,
  requireCamera: t.requireCamera,
  requireIdCheck: t.requireIdCheck,
  requireConsent: t.requireConsent,
  accessCode: t.accessCode || '',
  startsAt: t.startsAt ? t.startsAt.toISOString() : '',
  endsAt: t.endsAt ? t.endsAt.toISOString() : '',
  questionCount: t.questionCount,
  randomizeQuestions: t.randomizeQuestions,
  randomizeOptions: t.randomizeOptions,
  maxViolations: t.maxViolations,
  captureEverySeconds: t.captureEverySeconds,
  photoRetentionDays: t.photoRetentionDays,
  questions: t.questions.map((q) => ({ id: q.id, text: q.text, options: parseOptions(q.options), correctIndex: q.correctIndex, explanation: q.explanation || '' })),
});

export async function loadCourseContent(courseId: string): Promise<CourseContentDraft> {
  const [modules, courseTests] = await Promise.all([
    prisma.module.findMany({
      where: { courseId },
      orderBy: { order: 'asc' },
      include: {
        lessons: { orderBy: { order: 'asc' } },
        assignments: { orderBy: { order: 'asc' } },
        tests: { orderBy: [{ order: 'asc' }, { createdAt: 'asc' }], include: { questions: { orderBy: { order: 'asc' } } } },
      },
    }),
    prisma.mcqTest.findMany({
      where: { courseId },
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
      include: { questions: { orderBy: { order: 'asc' } } },
    }),
  ]);

  return {
    modules: modules.map(
      (m): ModuleDraft => ({
        id: m.id,
        title: m.title,
        lessons: m.lessons.map(
          (l): LessonDraft => ({
            id: l.id,
            title: l.title,
            type: (['VIDEO', 'YOUTUBE', 'AUDIO', 'PPT', 'PDF'].includes(l.type) ? l.type : l.audioUrl && !l.videoUrl && !l.fileUrl ? 'AUDIO' : 'VIDEO') as LessonType,
            videoUrl: l.videoUrl || '',
            audioUrl: l.audioUrl || '',
            fileUrl: l.fileUrl || '',
            duration: l.duration || '',
            content: l.content || '',
          }),
        ),
        assignments: [
          ...m.assignments.map((a) => ({
            id: a.id,
            kind: 'WRITTEN' as const,
            title: a.title,
            summary: a.description || '',
            instructions: a.instructions || '',
            maxScore: a.maxScore,
            attachments: parseAttachments(a.attachments),
          })),
          ...m.tests.filter((t) => t.kind === 'ASSIGNMENT').map((t) => ({ id: t.id, kind: 'MCQ' as const, test: toTestDraft(t) })),
        ],
        tests: m.tests.filter((t) => t.kind !== 'ASSIGNMENT').map(toTestDraft),
      }),
    ),
    tests: courseTests.map(toTestDraft),
  };
}

/* ----------------------------------------------------------------------------------------------
 * Saving: editable drafts -> database rows
 *
 * Only what actually changed is written. The database is remote (each round trip costs real time), and
 * untouched lessons keep their ids, so student progress and submissions survive every save.
 * ---------------------------------------------------------------------------------------------- */

const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '') || 'lesson';
const clean = (s: string | null | undefined) => (s ?? '').trim();
const orNull = (s: string | null | undefined) => clean(s) || null;

function questionRows(t: TestDraft) {
  return t.questions.map((q: QuestionDraft, i) => ({
    order: i + 1,
    text: q.text.trim(),
    options: JSON.stringify(q.options.map((o) => o.trim())),
    correctIndex: q.correctIndex as number,
    explanation: q.explanation.trim() || null,
  }));
}
const questionSig = (rows: { text: string; options: string; correctIndex: number; explanation: string | null }[]) =>
  JSON.stringify(rows.map((r) => [r.text, JSON.parse(r.options), r.correctIndex, r.explanation || null]));


/**
 * The exam controls of a test. An MCQ assignment is never proctored, so its camera, ID check, consent, code and
 * window are always switched off, whatever the draft carries.
 */
function examSettings(t: TestDraft, kind: 'TEST' | 'ASSIGNMENT') {
  const proctored = kind === 'TEST';
  const date = (iso: string) => (proctored && iso ? new Date(iso) : null);
  return {
    requireCamera: proctored && Boolean(t.requireCamera),
    requireIdCheck: proctored && Boolean(t.requireIdCheck),
    requireConsent: proctored && Boolean(t.requireConsent),
    accessCode: proctored ? orNull(t.accessCode) : null,
    startsAt: date(t.startsAt),
    endsAt: date(t.endsAt),
    questionCount: proctored && t.questionCount ? Math.round(t.questionCount) : null,
    randomizeQuestions: Boolean(t.randomizeQuestions),
    randomizeOptions: Boolean(t.randomizeOptions),
    maxViolations: Math.round(t.maxViolations),
    captureEverySeconds: Math.round(t.captureEverySeconds),
    photoRetentionDays: Math.round(t.photoRetentionDays),
  };
}

type ExamSettings = ReturnType<typeof examSettings>;
function examChanged(row: ExamSettings, next: ExamSettings) {
  const time = (d: Date | null) => (d ? d.getTime() : null);
  return (
    row.requireCamera !== next.requireCamera ||
    row.requireIdCheck !== next.requireIdCheck ||
    row.requireConsent !== next.requireConsent ||
    (row.accessCode ?? null) !== next.accessCode ||
    time(row.startsAt) !== time(next.startsAt) ||
    time(row.endsAt) !== time(next.endsAt) ||
    (row.questionCount ?? null) !== next.questionCount ||
    row.randomizeQuestions !== next.randomizeQuestions ||
    row.randomizeOptions !== next.randomizeOptions ||
    row.maxViolations !== next.maxViolations ||
    row.captureEverySeconds !== next.captureEverySeconds ||
    row.photoRetentionDays !== next.photoRetentionDays
  );
}

/** Existing ids are kept; drafts created in the browser (new-xxx) get a real UUID so children can reference them. */
const realId = (id: string) => (isNew(id) ? crypto.randomUUID() : id);

export async function syncCourseContent(courseId: string, content: CourseContentDraft): Promise<string | null> {
  const problem = validateContent(content);
  if (problem) return problem;

  const [dbModules, dbCourseTests] = await Promise.all([
    prisma.module.findMany({
      where: { courseId },
      include: { lessons: true, assignments: true, tests: { include: { questions: true } } },
    }),
    prisma.mcqTest.findMany({ where: { courseId }, include: { questions: true } }),
  ]);

  const dbModuleById = new Map(dbModules.map((m) => [m.id, m]));
  const dbLessons = new Map(dbModules.flatMap((m) => m.lessons).map((l) => [l.id, l]));
  const dbAssignments = new Map(dbModules.flatMap((m) => m.assignments).map((a) => [a.id, a]));
  const dbTests = new Map([...dbModules.flatMap((m) => m.tests), ...dbCourseTests].map((t) => [t.id, t]));

  const keepModules = new Set<string>();
  const keepLessons = new Set<string>();
  const keepAssignments = new Set<string>();
  const keepTests = new Set<string>();

  const newModules: { id: string; title: string; order: number; courseId: string }[] = [];
  const moduleUpdates: { id: string; data: { title: string; order: number } }[] = [];
  const newLessons: any[] = [];
  const lessonUpdates: { id: string; data: any }[] = [];
  const newAssignments: any[] = [];
  const assignmentUpdates: { id: string; data: any }[] = [];
  const newTests: any[] = [];
  const testUpdates: { id: string; data: any }[] = [];
  const questionReplacements: { testId: string; rows: ReturnType<typeof questionRows> }[] = [];

  const planTest = (t: TestDraft, parent: { courseId: string } | { moduleId: string }, kind: 'TEST' | 'ASSIGNMENT', order: number) => {
    const id = dbTests.has(t.id) ? t.id : realId(t.id);
    keepTests.add(id);
    const exam = examSettings(t, kind);
    const data = {
      title: t.title.trim(),
      timeLimit: Math.round(t.timeLimit),
      passingMarks: Math.round(t.passingMarks),
      allowRetakes: Boolean(t.allowRetakes),
      ...exam,
      kind,
      order,
      ...('courseId' in parent ? { courseId: parent.courseId, moduleId: null } : { moduleId: parent.moduleId, courseId: null }),
    };
    const rows = questionRows(t);
    const existing = dbTests.get(id);
    if (!existing) {
      newTests.push({ id, ...data });
      questionReplacements.push({ testId: id, rows });
    } else {
      const changed = existing.title !== data.title || existing.timeLimit !== data.timeLimit || existing.passingMarks !== data.passingMarks || existing.allowRetakes !== data.allowRetakes || examChanged(existing, exam) || existing.kind !== data.kind || existing.order !== order || existing.courseId !== (data.courseId ?? null) || existing.moduleId !== (data.moduleId ?? null);
      if (changed) testUpdates.push({ id, data });
      const dbSig = questionSig([...existing.questions].sort((a, b) => a.order - b.order));
      if (dbSig !== questionSig(rows)) questionReplacements.push({ testId: id, rows });
    }
  };

  content.modules.forEach((m, mi) => {
    const moduleId = dbModuleById.has(m.id) ? m.id : realId(m.id);
    keepModules.add(moduleId);
    const existingModule = dbModuleById.get(moduleId);
    if (!existingModule) newModules.push({ id: moduleId, title: m.title.trim(), order: mi + 1, courseId });
    else if (existingModule.title !== m.title.trim() || existingModule.order !== mi + 1) moduleUpdates.push({ id: moduleId, data: { title: m.title.trim(), order: mi + 1 } });

    m.lessons.forEach((l, li) => {
      const id = dbLessons.has(l.id) ? l.id : realId(l.id);
      keepLessons.add(id);
      const data = {
        title: l.title.trim(),
        slug: slugify(l.title),
        order: li + 1,
        type: l.type,
        videoUrl: l.type === 'VIDEO' || l.type === 'YOUTUBE' ? orNull(l.videoUrl) : null,
        audioUrl: l.type === 'AUDIO' ? orNull(l.audioUrl) : null,
        fileUrl: l.type === 'PPT' || l.type === 'PDF' ? orNull(l.fileUrl) : null,
        duration: orNull(l.duration),
        content: orNull(l.content),
        moduleId,
      };
      const e = dbLessons.get(id);
      if (!e) newLessons.push({ id, ...data });
      else if (e.title !== data.title || e.order !== data.order || e.type !== data.type || e.videoUrl !== data.videoUrl || e.audioUrl !== data.audioUrl || e.fileUrl !== data.fileUrl || (e.duration ?? null) !== data.duration || (e.content ?? null) !== data.content || e.moduleId !== moduleId) {
        lessonUpdates.push({ id, data });
      }
    });

    let assignmentOrder = 0;
    for (const a of m.assignments) {
      assignmentOrder += 1;
      if (a.kind === 'MCQ') {
        planTest(a.test, { moduleId }, 'ASSIGNMENT', assignmentOrder);
        continue;
      }
      const id = dbAssignments.has(a.id) ? a.id : realId(a.id);
      keepAssignments.add(id);
      const data = {
        title: a.title.trim(),
        description: a.summary.trim(),
        instructions: orNull(a.instructions),
        attachments: a.attachments.length ? JSON.stringify(a.attachments.map((x) => ({ name: x.name, url: x.url }))) : null,
        maxScore: Math.round(a.maxScore),
        order: assignmentOrder,
        moduleId,
      };
      const e = dbAssignments.get(id);
      if (!e) newAssignments.push({ id, ...data });
      else if (e.title !== data.title || e.description !== data.description || (e.instructions ?? null) !== data.instructions || (e.attachments ?? null) !== data.attachments || e.maxScore !== data.maxScore || e.order !== data.order || e.moduleId !== moduleId) {
        assignmentUpdates.push({ id, data });
      }
    }

    m.tests.forEach((t, ti) => planTest(t, { moduleId }, 'TEST', ti + 1));
  });

  content.tests.forEach((t, ti) => planTest(t, { courseId }, 'TEST', ti + 1));

  const deleteModules = dbModules.filter((m) => !keepModules.has(m.id)).map((m) => m.id);
  const deleteLessons = [...dbLessons.keys()].filter((id) => !keepLessons.has(id));
  const deleteAssignments = [...dbAssignments.keys()].filter((id) => !keepAssignments.has(id));
  const deleteTests = [...dbTests.keys()].filter((id) => !keepTests.has(id));

  await prisma.$transaction(
    async (tx) => {
      // Parents first when creating, children first when removing. Deleting a module cascades to what is inside it.
      if (deleteTests.length) await tx.mcqTest.deleteMany({ where: { id: { in: deleteTests } } });
      if (deleteAssignments.length) await tx.assignment.deleteMany({ where: { id: { in: deleteAssignments } } });
      if (deleteLessons.length) await tx.lesson.deleteMany({ where: { id: { in: deleteLessons } } });
      if (deleteModules.length) await tx.module.deleteMany({ where: { id: { in: deleteModules } } });

      if (newModules.length) await tx.module.createMany({ data: newModules });
      for (const u of moduleUpdates) await tx.module.update({ where: { id: u.id }, data: u.data });

      if (newLessons.length) await tx.lesson.createMany({ data: newLessons });
      for (const u of lessonUpdates) await tx.lesson.update({ where: { id: u.id }, data: u.data });

      if (newAssignments.length) await tx.assignment.createMany({ data: newAssignments });
      for (const u of assignmentUpdates) await tx.assignment.update({ where: { id: u.id }, data: u.data });

      if (newTests.length) await tx.mcqTest.createMany({ data: newTests });
      for (const u of testUpdates) await tx.mcqTest.update({ where: { id: u.id }, data: u.data });

      const replaceIds = questionReplacements.filter((r) => !newTests.some((t) => t.id === r.testId)).map((r) => r.testId);
      if (replaceIds.length) await tx.mcqQuestion.deleteMany({ where: { testId: { in: replaceIds } } });
      const rows = questionReplacements.flatMap((r) => r.rows.map((q) => ({ ...q, testId: r.testId })));
      if (rows.length) await tx.mcqQuestion.createMany({ data: rows });
    },
    { timeout: 120_000, maxWait: 20_000 },
  );

  return null;
}
