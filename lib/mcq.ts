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
  questions: QuestionDraft[];
}

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
  return { id: newId(), title: '', timeLimit: 30, passingMarks: 50, allowRetakes: true, questions: [blankQuestion()] };
}

/** Returns a human readable problem or null when the test can be saved. */
export function validateTest(t: TestDraft): string | null {
  if (!t.title.trim()) return 'Test title is required';
  if (!(t.timeLimit >= 1 && t.timeLimit <= 600)) return `"${t.title}": time limit must be 1 to 600 minutes`;
  if (!(t.passingMarks >= 0 && t.passingMarks <= 100)) return `"${t.title}": passing marks must be 0 to 100`;
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
