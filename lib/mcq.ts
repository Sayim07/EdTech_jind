// Types and pure helpers shared by the student player, the admin builder and the API routes.

export const OPTION_LABELS = ['A', 'B', 'C', 'D'] as const;
export const MAX_VIOLATIONS = 3;
export const SNAPSHOT_WINDOW_SECONDS = 120;
export const MAX_SNAPSHOTS = 120;
export const MAX_SNAPSHOT_CHARS = 90_000; // data URL length cap per image

export interface QuestionDraft {
  id: string;
  text: string;
  options: string[]; // always length 4
  correctIndex: number | null;
  explanation: string;
}

export interface TestDraft {
  id: string;
  title: string;
  timeLimit: number;
  passingMarks: number;
  allowRetakes: boolean;
  /** Exam controls. Only meaningful for tests (kind TEST); MCQ assignments are never proctored. */
  requireCamera: boolean;
  requireIdCheck: boolean;
  requireConsent: boolean;
  /** Plain text, shown to staff only. Empty = no code. */
  accessCode: string;
  /** ISO timestamps, or '' when not set. The builder converts to and from datetime-local. */
  startsAt: string;
  endsAt: string;
  /** How many questions each student gets from the bank. null = all of them. */
  questionCount: number | null;
  randomizeQuestions: boolean;
  randomizeOptions: boolean;
  maxViolations: number;
  captureEverySeconds: number;
  photoRetentionDays: number;
  questions: QuestionDraft[];
}

/** Defaults for the exam controls, matching the database defaults. */
export const EXAM_DEFAULTS = {
  requireCamera: true,
  requireIdCheck: false,
  requireConsent: true,
  accessCode: '',
  startsAt: '',
  endsAt: '',
  questionCount: null as number | null,
  randomizeQuestions: true,
  randomizeOptions: true,
  maxViolations: 3,
  captureEverySeconds: 120,
  photoRetentionDays: 30,
};

export const ACCESS_CODE_PATTERN = /^[A-Za-z0-9]{4,20}$/;

/** Question as stored in an attempt snapshot (server side). */
export interface StoredQuestion {
  id: string;
  text: string;
  options: string[];
  correctIndex: number;
  explanation?: string | null;
}

/** Question sent to the browser while a test is in progress: no answers. */
export interface PublicQuestion {
  id: string;
  text: string;
  options: string[];
}

export interface ReviewItem {
  id: string;
  text: string;
  options: string[];
  selectedIndex: number | null;
  correctIndex: number;
  explanation: string | null;
}

export interface AttemptResult {
  id: string;
  testTitle: string;
  score: number;
  total: number;
  percentage: number;
  passed: boolean;
  passingMarks: number;
  correct: number;
  incorrect: number;
  unanswered: number;
  autoSubmitted: boolean;
  autoReason: string | null;
  violations: number;
  submittedAt: string;
  review: ReviewItem[];
}

export function newId() {
  return `new-${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
}

export function blankQuestion(): QuestionDraft {
  return { id: newId(), text: '', options: ['', '', '', ''], correctIndex: null, explanation: '' };
}

export function blankTest(): TestDraft {
  // A new test asks for an ID check by default; everything else keeps the database default.
  return { id: newId(), title: '', timeLimit: 30, passingMarks: 50, allowRetakes: true, ...EXAM_DEFAULTS, requireIdCheck: true, questions: [blankQuestion()] };
}

export type ExamSettingKey = 'startsAt' | 'endsAt' | 'accessCode' | 'questionCount' | 'maxViolations' | 'captureEverySeconds' | 'photoRetentionDays';

/** Problems with the exam controls, keyed by field, so the builder can show each one beside its input. */
export function examSettingErrors(t: TestDraft): Partial<Record<ExamSettingKey, string>> {
  const e: Partial<Record<ExamSettingKey, string>> = {};
  const inRange = (n: unknown, min: number, max: number) => typeof n === 'number' && Number.isInteger(n) && n >= min && n <= max;
  if (!inRange(t.maxViolations, 1, 20)) e.maxViolations = 'Violation limit must be a whole number from 1 to 20';
  if (!inRange(t.captureEverySeconds, 30, 600)) e.captureEverySeconds = 'Photo interval must be 30 to 600 seconds';
  if (!inRange(t.photoRetentionDays, 1, 365)) e.photoRetentionDays = 'Photo retention must be 1 to 365 days';
  if (t.questionCount !== null && t.questionCount !== undefined && !inRange(t.questionCount, 1, t.questions.length)) {
    e.questionCount = t.questions.length === 0 ? 'Add questions first' : `Questions per student must be 1 to ${t.questions.length} (the size of the bank)`;
  }
  const starts = t.startsAt ? Date.parse(t.startsAt) : null;
  const ends = t.endsAt ? Date.parse(t.endsAt) : null;
  if (t.startsAt && Number.isNaN(starts)) e.startsAt = 'Enter a valid opening time';
  if (t.endsAt && Number.isNaN(ends)) e.endsAt = 'Enter a valid closing time';
  if (!e.startsAt && !e.endsAt && starts !== null && ends !== null && ends <= starts) e.endsAt = 'The closing time must be after the opening time';
  if (t.accessCode.trim() && !ACCESS_CODE_PATTERN.test(t.accessCode.trim())) e.accessCode = 'Access code must be 4 to 20 letters or digits';
  return e;
}

/** Returns a human readable problem or null when the test can be saved. Pass proctored:false for MCQ assignments. */
export function validateTest(t: TestDraft, opts: { proctored?: boolean } = {}): string | null {
  if (!t.title.trim()) return 'Test title is required';
  if (!(t.timeLimit >= 1 && t.timeLimit <= 600)) return `"${t.title}": time limit must be 1 to 600 minutes`;
  if (!(t.passingMarks >= 0 && t.passingMarks <= 100)) return `"${t.title}": passing marks must be 0 to 100`;
  if (opts.proctored !== false) {
    const first = Object.values(examSettingErrors(t))[0];
    if (first) return `"${t.title}": ${first.charAt(0).toLowerCase()}${first.slice(1)}`;
  }
  if (t.questions.length === 0) return `"${t.title}": add at least one question`;
  for (let i = 0; i < t.questions.length; i++) {
    const q = t.questions[i];
    const n = i + 1;
    if (!q.text.trim()) return `"${t.title}", question ${n}: question text is empty`;
    const filled = q.options.filter((o) => o.trim()).length;
    if (filled < 2) return `"${t.title}", question ${n}: fill in at least two options`;
    if (q.correctIndex === null || q.correctIndex < 0 || q.correctIndex > 3) return `"${t.title}", question ${n}: choose the correct answer`;
    if (!q.options[q.correctIndex]?.trim()) return `"${t.title}", question ${n}: the correct answer cannot be an empty option`;
  }
  return null;
}

export function gradeAnswers(questions: StoredQuestion[], answers: Record<string, number>) {
  let correct = 0;
  let unanswered = 0;
  for (const q of questions) {
    const a = answers[q.id];
    if (a === undefined || a === null) unanswered++;
    else if (a === q.correctIndex) correct++;
  }
  const total = questions.length;
  const percentage = total ? Math.round((correct / total) * 1000) / 10 : 0;
  return { correct, unanswered, incorrect: total - correct - unanswered, total, percentage };
}

export function formatClock(totalSeconds: number) {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const mm = String(m).padStart(2, '0');
  const ss = String(sec).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}
