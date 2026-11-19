// Shared (browser + server) description of a course's content tree and its validation.
//
//   Course
//   ├── Module            (any number)
//   │   ├── Lessons       Video Class | Audio | Presentation | PDF
//   │   ├── Assignments   Written | MCQ
//   │   └── Tests         MCQ
//   └── Course-level tests (stand alone, no module needed)
//
// A test belongs to a course OR a module, never both: the two places live in different arrays and the
// database has a CHECK constraint backing that up.
import { TestDraft, blankTest, newId, validateTest } from '@/lib/mcq';

export type LessonType = 'VIDEO' | 'YOUTUBE' | 'AUDIO' | 'PPT' | 'PDF';

export const LESSON_TYPES: { value: 'VIDEO' | 'AUDIO' | 'PPT' | 'PDF'; label: string }[] = [
  { value: 'VIDEO', label: 'Video Class' },
  { value: 'AUDIO', label: 'Audio' },
  { value: 'PPT', label: 'Presentation' },
  { value: 'PDF', label: 'PDF' },
];

export interface Attachment {
  name: string;
  url: string;
}

export interface LessonDraft {
  id: string;
  title: string;
  /** YOUTUBE is a Video Class whose source is a YouTube link; VIDEO is an uploaded file. */
  type: LessonType;
  videoUrl: string;
  audioUrl: string;
  fileUrl: string;
  duration: string;
  content: string;
}

export interface WrittenAssignmentDraft {
  id: string;
  kind: 'WRITTEN';
  title: string;
  summary: string;
  instructions: string;
  maxScore: number;
  attachments: Attachment[];
}

export interface McqAssignmentDraft {
  id: string;
  kind: 'MCQ';
  test: TestDraft;
}

export type AssignmentDraft = WrittenAssignmentDraft | McqAssignmentDraft;

export interface ModuleDraft {
  id: string;
  title: string;
  lessons: LessonDraft[];
  assignments: AssignmentDraft[];
  tests: TestDraft[];
}

export interface CourseContentDraft {
  modules: ModuleDraft[];
  /** Standalone tests that belong to the course itself, not to any module. */
  tests: TestDraft[];
}

export const isNew = (id: string) => id.startsWith('new-');

export const blankLesson = (): LessonDraft => ({ id: newId(), title: '', type: 'VIDEO', videoUrl: '', audioUrl: '', fileUrl: '', duration: '', content: '' });
export const blankWritten = (): WrittenAssignmentDraft => ({ id: newId(), kind: 'WRITTEN', title: '', summary: '', instructions: '', maxScore: 100, attachments: [] });
export const blankMcqAssignment = (): McqAssignmentDraft => ({ id: newId(), kind: 'MCQ', test: { ...blankTest(), allowRetakes: true, requireCamera: false, requireIdCheck: false, requireConsent: false } });
export const blankModule = (n: number): ModuleDraft => ({ id: newId(), title: `Module ${n}`, lessons: [], assignments: [], tests: [] });

export const isYouTube = (url: string) => /^(https?:\/\/)?(www\.|m\.)?(youtube\.com\/(watch\?v=|embed\/|shorts\/)|youtu\.be\/)[\w-]{6,}/i.test(url.trim());

/** What a lesson still needs before students can use it. Null when it is complete. */
export function lessonGap(l: LessonDraft): string | null {
  if (l.type === 'YOUTUBE') return isYouTube(l.videoUrl) ? null : 'Paste a valid YouTube link';
  if (l.type === 'VIDEO') return l.videoUrl.trim() ? null : 'Upload a video or paste a YouTube link';
  if (l.type === 'AUDIO') return l.audioUrl.trim() ? null : 'Upload an audio file';
  return l.fileUrl.trim() ? null : l.type === 'PDF' ? 'Upload a PDF' : 'Upload a presentation';
}

export function assignmentTitle(a: AssignmentDraft) {
  return a.kind === 'WRITTEN' ? a.title : a.test.title;
}

/** Returns the first thing wrong with the whole content tree, as a sentence an admin can act on. */
export function validateContent(c: CourseContentDraft): string | null {
  for (let mi = 0; mi < c.modules.length; mi++) {
    const m = c.modules[mi];
    const where = `Module ${mi + 1}`;
    if (!m.title.trim()) return `${where} needs a name`;
    for (const l of m.lessons) {
      if (!l.title.trim()) return `${where} "${m.title}": every lesson needs a name`;
      if (l.type === 'YOUTUBE' && !isYouTube(l.videoUrl)) return `Lesson "${l.title}": paste a valid YouTube link`;
    }
    for (const a of m.assignments) {
      if (a.kind === 'WRITTEN') {
        if (!a.title.trim()) return `${where} "${m.title}": every assignment needs a title`;
        if (!a.instructions.trim()) return `Assignment "${a.title}": add instructions`;
        if (!(a.maxScore >= 1 && a.maxScore <= 1000)) return `Assignment "${a.title}": maximum score must be 1 to 1000`;
      } else {
        const problem = validateTest(a.test, { proctored: false });
        if (problem) return `MCQ assignment: ${problem}`;
      }
    }
    for (const t of m.tests) {
      const problem = validateTest(t);
      if (problem) return problem;
    }
  }
  for (const t of c.tests) {
    const problem = validateTest(t);
    if (problem) return problem;
  }
  return null;
}

export const emptyContent = (): CourseContentDraft => ({ modules: [], tests: [] });
