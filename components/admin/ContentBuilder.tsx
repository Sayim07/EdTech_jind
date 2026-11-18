'use client';

import React, { useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  ClipboardCheck,
  FileQuestion,
  FileText,
  FolderPlus,
  Headphones,
  Layers,
  Link2,
  PencilLine,
  Plus,
  PlayCircle,
  Presentation,
  Trash2,
  UploadCloud,
} from 'lucide-react';
import { TestDraft, blankTest, validateTest } from '@/lib/mcq';
import {
  AssignmentDraft,
  CourseContentDraft,
  LESSON_TYPES,
  LessonDraft,
  ModuleDraft,
  assignmentTitle,
  blankLesson,
  blankMcqAssignment,
  blankModule,
  blankWritten,
  isNew,
  isYouTube,
  lessonGap,
  validateContent,
} from '@/lib/course-content-shared';
import { TestFields, fieldCls, iconBtn, move } from '@/components/admin/AdminTestBuilder';
import { MediaField } from '@/components/admin/MediaField';
import { Dialog, primaryBtn, secondaryBtn } from '@/components/mcq/Dialog';

/** One tone per kind of content, so a glance tells lessons, assignments and tests apart. */
const TONE = {
  module: { bg: '#ece8ff', fg: '#5b3df5', label: 'Module' },
  lesson: { bg: '#dff2fd', fg: '#0369a1', label: 'Lesson' },
  assignment: { bg: '#fff0d1', fg: '#b45309', label: 'Assignment' },
  test: { bg: '#dbf5e5', fg: '#15803d', label: 'Test' },
} as const;

type Kind = keyof typeof TONE;

const LESSON_ICON: Record<string, typeof PlayCircle> = { VIDEO: PlayCircle, YOUTUBE: PlayCircle, AUDIO: Headphones, PPT: Presentation, PDF: FileText };
const lessonTypeLabel = (l: LessonDraft) => (l.type === 'YOUTUBE' ? 'Video Class (YouTube)' : l.type === 'VIDEO' ? 'Video Class' : LESSON_TYPES.find((t) => t.value === l.type)?.label || l.type);

function Tag({ kind, children }: { kind: Kind; children?: React.ReactNode }) {
  const t = TONE[kind];
  return (
    <span className="inline-flex items-center h-6 px-2 rounded-md text-xs font-semibold shrink-0" style={{ background: t.bg, color: t.fg }}>
      {children ?? t.label}
    </span>
  );
}

function IconChip({ kind, icon: Icon }: { kind: Kind; icon: typeof PlayCircle }) {
  const t = TONE[kind];
  return (
    <span className="w-9 h-9 rounded-lg inline-flex items-center justify-center shrink-0" style={{ background: t.bg, color: t.fg }} aria-hidden>
      <Icon className="w-[18px] h-[18px]" />
    </span>
  );
}

interface Pending {
  title: string;
  message: string;
  run: () => void;
}

interface Props {
  content: CourseContentDraft;
  onChange: (c: CourseContentDraft) => void;
}

export function ContentBuilder({ content, onChange }: Props) {
  const [openModules, setOpenModules] = useState<Set<string>>(() => new Set(content.modules.slice(0, 1).map((m) => m.id)));
  const [openItem, setOpenItem] = useState<string | null>(null);
  const [pending, setPending] = useState<Pending | null>(null);

  const set = (next: Partial<CourseContentDraft>) => onChange({ ...content, ...next });
  const patchModule = (id: string, patch: Partial<ModuleDraft>) => set({ modules: content.modules.map((m) => (m.id === id ? { ...m, ...patch } : m)) });

  const toggleModule = (id: string) =>
    setOpenModules((cur) => {
      const n = new Set(cur);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });

  const addModule = () => {
    const m = blankModule(content.modules.length + 1);
    set({ modules: [...content.modules, m] });
    setOpenModules((cur) => new Set(cur).add(m.id));
  };
  const addCourseTest = () => {
    const t = blankTest();
    set({ tests: [...content.tests, t] });
    setOpenItem(t.id);
  };

  const ask = (title: string, message: string, run: () => void) => setPending({ title, message, run });

  const problem = validateContent(content);
  const lessonCount = content.modules.reduce((n, m) => n + m.lessons.length, 0);
  const assignmentCount = content.modules.reduce((n, m) => n + m.assignments.length, 0);
  const testCount = content.modules.reduce((n, m) => n + m.tests.length, 0) + content.tests.length;
  const allOpen = content.modules.length > 0 && content.modules.every((m) => openModules.has(m.id));

  return (
    <section className="bg-white rounded-2xl border border-gray-200" aria-labelledby="builder-title">
      <div className="p-5 sm:p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-gray-200">
        <div>
          <h2 id="builder-title" className="text-xl font-semibold text-gray-900">
            Course content
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            {content.modules.length} module{content.modules.length === 1 ? '' : 's'} · {lessonCount} lesson{lessonCount === 1 ? '' : 's'} · {assignmentCount} assignment{assignmentCount === 1 ? '' : 's'} · {testCount} test{testCount === 1 ? '' : 's'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {content.modules.length > 1 && (
            <button type="button" className={secondaryBtn} onClick={() => setOpenModules(allOpen ? new Set() : new Set(content.modules.map((m) => m.id)))}>
              {allOpen ? 'Collapse all' : 'Expand all'}
            </button>
          )}
          <button type="button" onClick={addModule} className={primaryBtn}>
            <FolderPlus className="w-4 h-4" aria-hidden /> Add Module
          </button>
          <button type="button" onClick={addCourseTest} className="h-10 px-5 rounded-lg border border-emerald-700 text-emerald-800 hover:bg-emerald-50 font-semibold text-sm inline-flex items-center justify-center gap-2 transition active:scale-[0.98] focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_#e3eeff]">
            <Plus className="w-4 h-4" aria-hidden /> Add Test
          </button>
        </div>
      </div>

      {problem && (
        <p role="alert" className="mx-5 sm:mx-6 mt-5 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden /> {problem}. Saving is blocked until this is fixed.
        </p>
      )}

      {content.modules.length === 0 && content.tests.length === 0 && (
        <div className="p-10 text-center space-y-2">
          <p className="font-semibold text-gray-900">No content yet</p>
          <p className="text-sm text-gray-600 max-w-md mx-auto">Start with a module to group lessons, assignments and tests, or add a test that belongs to the whole course.</p>
        </div>
      )}

      <ol className="divide-y divide-gray-200">
        {content.modules.map((m, mi) => {
          const open = openModules.has(m.id);
          return (
            <li key={m.id}>
              <div className="flex items-center gap-2 px-4 sm:px-6 py-3 bg-gray-50">
                <button type="button" onClick={() => toggleModule(m.id)} aria-expanded={open} aria-label={`${open ? 'Collapse' : 'Expand'} ${m.title || 'module'}`} className={iconBtn}>
                  {open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </button>
                <IconChip kind="module" icon={Layers} />
                <div className="min-w-0 flex-1">
                  <label htmlFor={`mn-${m.id}`} className="sr-only">
                    Module {mi + 1} name
                  </label>
                  <input
                    id={`mn-${m.id}`}
                    value={m.title}
                    onChange={(e) => patchModule(m.id, { title: e.target.value })}
                    placeholder={`Module ${mi + 1} name`}
                    className="w-full bg-transparent text-base font-semibold text-gray-900 placeholder:text-gray-500 rounded px-1.5 py-1 hover:bg-white focus:bg-white focus:outline-none focus:shadow-[0_0_0_3px_#e3eeff]"
                  />
                  <p className="text-xs text-gray-600 px-1.5">
                    {m.lessons.length} lesson{m.lessons.length === 1 ? '' : 's'} · {m.assignments.length} assignment{m.assignments.length === 1 ? '' : 's'} · {m.tests.length} test{m.tests.length === 1 ? '' : 's'}
                  </p>
                </div>
                <button type="button" className={iconBtn} disabled={mi === 0} onClick={() => set({ modules: move(content.modules, mi, mi - 1) })} aria-label="Move module up">
                  <ChevronUp className="w-4 h-4" />
                </button>
                <button type="button" className={iconBtn} disabled={mi === content.modules.length - 1} onClick={() => set({ modules: move(content.modules, mi, mi + 1) })} aria-label="Move module down">
                  <ChevronDown className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  className={`${iconBtn} hover:!text-red-600`}
                  aria-label="Delete module"
                  onClick={() =>
                    ask(
                      `Delete "${m.title || 'this module'}"?`,
                      isNew(m.id) && m.lessons.length + m.assignments.length + m.tests.length === 0
                        ? 'This empty module will be removed.'
                        : 'Everything inside it goes too: its lessons, assignments and tests. Student progress and submissions for them are removed when you save. This cannot be undone.',
                      () => set({ modules: content.modules.filter((x) => x.id !== m.id) }),
                    )
                  }
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {open && (
                <ModuleBody
                  module={m}
                  openItem={openItem}
                  setOpenItem={setOpenItem}
                  onChange={(patch) => patchModule(m.id, patch)}
                  ask={ask}
                />
              )}
            </li>
          );
        })}
      </ol>

      {content.tests.length > 0 && (
        <div className="border-t border-gray-200">
          <div className="px-4 sm:px-6 py-3 bg-gray-50 flex items-center gap-3">
            <IconChip kind="test" icon={ClipboardCheck} />
            <div>
              <h3 className="text-base font-semibold text-gray-900">Course-level tests</h3>
              <p className="text-xs text-gray-600">Belong to the whole course, not to any module.</p>
            </div>
          </div>
          <ul className="divide-y divide-gray-100">
            {content.tests.map((t, ti) => (
              <TestRow
                key={t.id}
                test={t}
                index={ti}
                count={content.tests.length}
                open={openItem === t.id}
                onToggle={() => setOpenItem(openItem === t.id ? null : t.id)}
                onChange={(nt) => set({ tests: content.tests.map((x) => (x.id === t.id ? nt : x)) })}
                onMove={(dir) => set({ tests: move(content.tests, ti, ti + dir) })}
                onDelete={() =>
                  ask(
                    `Delete "${t.title || 'this test'}"?`,
                    isNew(t.id) ? 'This test will be removed.' : 'Students lose access to this test when you save. Their past attempts stay in the history.',
                    () => set({ tests: content.tests.filter((x) => x.id !== t.id) }),
                  )
                }
              />
            ))}
          </ul>
        </div>
      )}

      {pending && (
        <Dialog
          title={pending.title}
          tone="danger"
          onClose={() => setPending(null)}
          actions={
            <>
              <button type="button" className={secondaryBtn} onClick={() => setPending(null)}>
                Keep it
              </button>
              <button
                type="button"
                className="h-10 px-5 rounded-lg bg-red-700 hover:bg-red-800 text-white font-semibold text-sm transition active:scale-[0.98] focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_#fecaca]"
                onClick={() => {
                  pending.run();
                  setPending(null);
                }}
              >
                Delete
              </button>
            </>
          }
        >
          <p>{pending.message}</p>
        </Dialog>
      )}
    </section>
  );
}

/* ------------------------------- inside a module ------------------------------- */

function ModuleBody({
  module: m,
  openItem,
  setOpenItem,
  onChange,
  ask,
}: {
  module: ModuleDraft;
  openItem: string | null;
  setOpenItem: (id: string | null) => void;
  onChange: (patch: Partial<ModuleDraft>) => void;
  ask: (title: string, message: string, run: () => void) => void;
}) {
  const addLesson = () => {
    const l = blankLesson();
    onChange({ lessons: [...m.lessons, l] });
    setOpenItem(l.id);
  };
  const addAssignment = (kind: 'WRITTEN' | 'MCQ') => {
    const a = kind === 'WRITTEN' ? blankWritten() : blankMcqAssignment();
    onChange({ assignments: [...m.assignments, a] });
    setOpenItem(a.id);
  };
  const addTest = () => {
    const t = blankTest();
    onChange({ tests: [...m.tests, t] });
    setOpenItem(t.id);
  };
  const [assignmentMenu, setAssignmentMenu] = useState(false);

  return (
    <div>
      {m.lessons.length + m.assignments.length + m.tests.length === 0 && <p className="px-4 sm:px-6 py-5 text-sm text-gray-600">This module is empty. Add a lesson, an assignment or a test below.</p>}

      <ul className="divide-y divide-gray-100">
        {m.lessons.map((l, li) => (
          <LessonRow
            key={l.id}
            lesson={l}
            open={openItem === l.id}
            first={li === 0}
            last={li === m.lessons.length - 1}
            onToggle={() => setOpenItem(openItem === l.id ? null : l.id)}
            onChange={(nl) => onChange({ lessons: m.lessons.map((x) => (x.id === l.id ? nl : x)) })}
            onMove={(dir) => onChange({ lessons: move(m.lessons, li, li + dir) })}
            onDelete={() =>
              ask(
                `Delete "${l.title || 'this lesson'}"?`,
                isNew(l.id) ? 'This lesson will be removed.' : 'Students who completed it lose that progress when you save. This cannot be undone.',
                () => onChange({ lessons: m.lessons.filter((x) => x.id !== l.id) }),
              )
            }
          />
        ))}

        {m.assignments.map((a, ai) => (
          <AssignmentRow
            key={a.id}
            assignment={a}
            open={openItem === a.id}
            first={ai === 0}
            last={ai === m.assignments.length - 1}
            onToggle={() => setOpenItem(openItem === a.id ? null : a.id)}
            onChange={(na) => onChange({ assignments: m.assignments.map((x) => (x.id === a.id ? na : x)) })}
            onMove={(dir) => onChange({ assignments: move(m.assignments, ai, ai + dir) })}
            onDelete={() =>
              ask(
                `Delete "${assignmentTitle(a) || 'this assignment'}"?`,
                isNew(a.id) ? 'This assignment will be removed.' : 'Student submissions for it are removed when you save. This cannot be undone.',
                () => onChange({ assignments: m.assignments.filter((x) => x.id !== a.id) }),
              )
            }
          />
        ))}

        {m.tests.map((t, ti) => (
          <TestRow
            key={t.id}
            test={t}
            index={ti}
            count={m.tests.length}
            open={openItem === t.id}
            onToggle={() => setOpenItem(openItem === t.id ? null : t.id)}
            onChange={(nt) => onChange({ tests: m.tests.map((x) => (x.id === t.id ? nt : x)) })}
            onMove={(dir) => onChange({ tests: move(m.tests, ti, ti + dir) })}
            onDelete={() =>
              ask(
                `Delete "${t.title || 'this test'}"?`,
                isNew(t.id) ? 'This test will be removed.' : 'Students lose access to this test when you save. Their past attempts stay in the history.',
                () => onChange({ tests: m.tests.filter((x) => x.id !== t.id) }),
              )
            }
          />
        ))}
      </ul>

      <div className="px-4 sm:px-6 py-4 flex flex-wrap items-center gap-2 border-t border-gray-100">
        <button type="button" onClick={addLesson} className="h-9 px-3 rounded-lg border border-sky-700 text-sky-800 hover:bg-sky-50 text-sm font-semibold inline-flex items-center gap-1.5 transition focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_#e3eeff]">
          <Plus className="w-4 h-4" aria-hidden /> Add Lesson
        </button>
        <div className="relative">
          <button
            type="button"
            onClick={() => setAssignmentMenu((v) => !v)}
            aria-expanded={assignmentMenu}
            aria-haspopup="true"
            className="h-9 px-3 rounded-lg border border-amber-700 text-amber-800 hover:bg-amber-50 text-sm font-semibold inline-flex items-center gap-1.5 transition focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_#e3eeff]"
          >
            <Plus className="w-4 h-4" aria-hidden /> Add Assignment <ChevronDown className="w-3.5 h-3.5" aria-hidden />
          </button>
          {assignmentMenu && (
            <div className="absolute z-20 mt-1 w-56 rounded-xl bg-white border border-gray-200 shadow-lg p-1" role="menu">
              {(
                [
                  ['WRITTEN', 'Written assignment', PencilLine],
                  ['MCQ', 'MCQ assignment', FileQuestion],
                ] as const
              ).map(([kind, label, Icon]) => (
                <button
                  key={kind}
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    addAssignment(kind);
                    setAssignmentMenu(false);
                  }}
                  className="w-full h-10 px-3 rounded-lg text-sm font-semibold text-gray-800 hover:bg-gray-100 inline-flex items-center gap-2 text-left"
                >
                  <Icon className="w-4 h-4 text-amber-700" aria-hidden /> {label}
                </button>
              ))}
            </div>
          )}
        </div>
        <button type="button" onClick={addTest} className="h-9 px-3 rounded-lg border border-emerald-700 text-emerald-800 hover:bg-emerald-50 text-sm font-semibold inline-flex items-center gap-1.5 transition focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_#e3eeff]">
          <Plus className="w-4 h-4" aria-hidden /> Add Test
        </button>
      </div>
    </div>
  );
}

/* ----------------------------------- rows ----------------------------------- */

function RowShell({
  kind,
  icon,
  title,
  fallback,
  meta,
  status,
  open,
  onToggle,
  first,
  last,
  onMove,
  onDelete,
  children,
}: {
  kind: Kind;
  icon: typeof PlayCircle;
  title: string;
  fallback: string;
  meta: React.ReactNode;
  status: { ok: boolean; text: string };
  open: boolean;
  onToggle: () => void;
  first: boolean;
  last: boolean;
  onMove: (dir: -1 | 1) => void;
  onDelete: () => void;
  children: React.ReactNode;
}) {
  return (
    <li className={open ? 'bg-sky-50/40' : ''}>
      <div className="flex items-center gap-2 pl-4 sm:pl-12 pr-4 sm:pr-6 py-3">
        <button type="button" onClick={onToggle} aria-expanded={open} className="flex-1 min-w-0 flex items-center gap-3 text-left rounded-lg px-1.5 py-1 hover:bg-gray-50 focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_#e3eeff]">
          <IconChip kind={kind} icon={icon} />
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-2 flex-wrap">
              <span className={`truncate text-sm font-semibold ${title.trim() ? 'text-gray-900' : 'text-gray-600'}`}>{title.trim() || fallback}</span>
              <Tag kind={kind} />
            </span>
            <span className="block text-xs text-gray-600 mt-0.5">{meta}</span>
          </span>
          <span className={`hidden sm:inline-flex items-center gap-1 text-xs font-semibold ${status.ok ? 'text-emerald-700' : 'text-amber-800'}`}>
            {status.ok ? <CheckCircle2 className="w-3.5 h-3.5" aria-hidden /> : <AlertCircle className="w-3.5 h-3.5" aria-hidden />} {status.text}
          </span>
          {open ? <ChevronUp className="w-4 h-4 text-gray-500 shrink-0" aria-hidden /> : <ChevronDown className="w-4 h-4 text-gray-500 shrink-0" aria-hidden />}
        </button>
        <button type="button" className={iconBtn} disabled={first} onClick={() => onMove(-1)} aria-label="Move up">
          <ChevronUp className="w-4 h-4" />
        </button>
        <button type="button" className={iconBtn} disabled={last} onClick={() => onMove(1)} aria-label="Move down">
          <ChevronDown className="w-4 h-4" />
        </button>
        <button type="button" className={`${iconBtn} hover:!text-red-600`} onClick={onDelete} aria-label="Delete">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
      {open && <div className="pl-4 sm:pl-12 pr-4 sm:pr-6 pb-5 pt-1">{children}</div>}
    </li>
  );
}

function Field({ id, label, children, hint }: { id: string; label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-semibold text-gray-700 mb-1">
        {label}
      </label>
      {children}
      {hint && <p className="text-xs text-gray-600 mt-1">{hint}</p>}
    </div>
  );
}

function LessonRow({ lesson: l, open, first, last, onToggle, onChange, onMove, onDelete }: { lesson: LessonDraft; open: boolean; first: boolean; last: boolean; onToggle: () => void; onChange: (l: LessonDraft) => void; onMove: (d: -1 | 1) => void; onDelete: () => void }) {
  const gap = lessonGap(l);
  const isVideo = l.type === 'VIDEO' || l.type === 'YOUTUBE';
  const patch = (p: Partial<LessonDraft>) => onChange({ ...l, ...p });

  const setBase = (value: string) => {
    // Changing the kind of lesson clears media that no longer applies.
    if (value === 'VIDEO') patch({ type: 'VIDEO', audioUrl: '', fileUrl: '' });
    else if (value === 'AUDIO') patch({ type: 'AUDIO', videoUrl: '', fileUrl: '' });
    else patch({ type: value as LessonDraft['type'], videoUrl: '', audioUrl: '' });
  };

  return (
    <RowShell
      kind="lesson"
      icon={LESSON_ICON[l.type] || PlayCircle}
      title={l.title}
      fallback="Untitled lesson"
      meta={lessonTypeLabel(l) + (l.duration ? ` · ${l.duration}` : '')}
      status={gap ? { ok: false, text: 'Needs media' } : { ok: true, text: 'Ready' }}
      open={open}
      onToggle={onToggle}
      first={first}
      last={last}
      onMove={onMove}
      onDelete={onDelete}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl">
        <Field id={`lt-${l.id}`} label="Lesson name">
          <input id={`lt-${l.id}`} value={l.title} onChange={(e) => patch({ title: e.target.value })} className={fieldCls} placeholder="e.g. The first hearths" />
        </Field>
        <Field id={`ly-${l.id}`} label="Lesson type">
          <select id={`ly-${l.id}`} value={l.type === 'YOUTUBE' ? 'VIDEO' : l.type} onChange={(e) => setBase(e.target.value)} className={fieldCls}>
            {LESSON_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </Field>

        {isVideo && (
          <div className="md:col-span-2 space-y-3">
            <div role="group" aria-label="Video source" className="inline-flex p-1 rounded-full bg-gray-100">
              {(
                [
                  ['YOUTUBE', 'YouTube link', Link2],
                  ['VIDEO', 'Upload a video', UploadCloud],
                ] as const
              ).map(([value, label, Icon]) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={l.type === value}
                  onClick={() => patch({ type: value, videoUrl: l.type === value ? l.videoUrl : '' })}
                  className={`h-8 px-3.5 rounded-full text-sm font-semibold inline-flex items-center gap-1.5 transition focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_#e3eeff] ${l.type === value ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-700 hover:text-gray-900'}`}
                >
                  <Icon className="w-3.5 h-3.5" aria-hidden /> {label}
                </button>
              ))}
            </div>
            {l.type === 'YOUTUBE' ? (
              <Field id={`lu-${l.id}`} label="YouTube URL" hint={l.videoUrl && !isYouTube(l.videoUrl) ? undefined : 'Students watch it inside the classroom.'}>
                <input id={`lu-${l.id}`} value={l.videoUrl} onChange={(e) => patch({ videoUrl: e.target.value })} className={fieldCls} placeholder="https://www.youtube.com/watch?v=..." inputMode="url" />
                {l.videoUrl && !isYouTube(l.videoUrl) && <p className="text-xs text-red-700 mt-1">This does not look like a YouTube link.</p>}
              </Field>
            ) : (
              <MediaField label="Video file" kind="video" value={l.videoUrl} onChange={(url) => patch({ videoUrl: url })} hint="MP4, WebM or MOV. Uploaded to your cloud storage." />
            )}
          </div>
        )}
        {l.type === 'AUDIO' && (
          <div className="md:col-span-2">
            <MediaField label="Audio file" kind="audio" value={l.audioUrl} onChange={(url) => patch({ audioUrl: url })} hint="MP3, M4A or WAV." />
          </div>
        )}
        {l.type === 'PPT' && (
          <div className="md:col-span-2">
            <MediaField label="Presentation" kind="slides" value={l.fileUrl} onChange={(url) => patch({ fileUrl: url })} hint="PowerPoint (.pptx or .ppt)." />
          </div>
        )}
        {l.type === 'PDF' && (
          <div className="md:col-span-2">
            <MediaField label="PDF file" kind="pdf" value={l.fileUrl} onChange={(url) => patch({ fileUrl: url })} />
          </div>
        )}

        <Field id={`ld-${l.id}`} label="Duration (optional)" hint="Shown to students, for example 14:20 or 20 mins.">
          <input id={`ld-${l.id}`} value={l.duration} onChange={(e) => patch({ duration: e.target.value })} className={fieldCls} placeholder="14:20" />
        </Field>
        <div className="md:col-span-2">
          <Field id={`lc-${l.id}`} label="Lesson notes (optional)">
            <textarea id={`lc-${l.id}`} rows={3} value={l.content} onChange={(e) => patch({ content: e.target.value })} className={fieldCls} placeholder="Shown under the lesson in the classroom" />
          </Field>
        </div>
      </div>
      {gap && <p className="text-xs text-amber-800 mt-3">{gap}. Students will see an empty lesson until you do.</p>}
    </RowShell>
  );
}

function AssignmentRow({ assignment: a, open, first, last, onToggle, onChange, onMove, onDelete }: { assignment: AssignmentDraft; open: boolean; first: boolean; last: boolean; onToggle: () => void; onChange: (a: AssignmentDraft) => void; onMove: (d: -1 | 1) => void; onDelete: () => void }) {
  const written = a.kind === 'WRITTEN';
  const problem = written ? (!a.title.trim() ? 'Needs a title' : !a.instructions.trim() ? 'Needs instructions' : null) : validateTest(a.test);
  const title = assignmentTitle(a);

  return (
    <RowShell
      kind="assignment"
      icon={written ? PencilLine : FileQuestion}
      title={title}
      fallback={written ? 'Untitled written assignment' : 'Untitled MCQ assignment'}
      meta={written ? `Written assignment · ${a.maxScore} points${a.attachments.length ? ` · ${a.attachments.length} attachment${a.attachments.length === 1 ? '' : 's'}` : ''}` : `MCQ assignment · ${a.test.questions.length} question${a.test.questions.length === 1 ? '' : 's'}`}
      status={problem ? { ok: false, text: 'Needs attention' } : { ok: true, text: 'Ready' }}
      open={open}
      onToggle={onToggle}
      first={first}
      last={last}
      onMove={onMove}
      onDelete={onDelete}
    >
      {a.kind === 'WRITTEN' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl">
          <Field id={`at-${a.id}`} label="Assignment title">
            <input id={`at-${a.id}`} value={a.title} onChange={(e) => onChange({ ...a, title: e.target.value })} className={fieldCls} placeholder="e.g. Trace one dish across two cultures" />
          </Field>
          <Field id={`am-${a.id}`} label="Maximum score">
            <input id={`am-${a.id}`} type="number" min={1} max={1000} value={a.maxScore} onChange={(e) => onChange({ ...a, maxScore: Number(e.target.value) })} className={fieldCls} />
          </Field>
          <div className="md:col-span-2">
            <Field id={`ai-${a.id}`} label="Instructions">
              <textarea id={`ai-${a.id}`} rows={5} value={a.instructions} onChange={(e) => onChange({ ...a, instructions: e.target.value })} className={fieldCls} placeholder="What should students do, and what counts as a good answer?" />
            </Field>
          </div>
          <div className="md:col-span-2">
            <Field id={`as-${a.id}`} label="Short summary (optional)" hint="One line shown in lists. Leave blank to show the title only.">
              <input id={`as-${a.id}`} value={a.summary} maxLength={160} onChange={(e) => onChange({ ...a, summary: e.target.value })} className={fieldCls} />
            </Field>
          </div>
          <div className="md:col-span-2 space-y-3">
            <h4 className="text-sm font-semibold text-gray-700">Attachments (optional)</h4>
            {a.attachments.map((f, i) => (
              <MediaField
                key={`${f.url}-${i}`}
                label={`Attachment ${i + 1}`}
                kind="document"
                value={f.url}
                onChange={(url) => onChange({ ...a, attachments: url ? a.attachments.map((x, xi) => (xi === i ? { name: url.split('/').pop() || 'file', url } : x)) : a.attachments.filter((_, xi) => xi !== i) })}
              />
            ))}
            <MediaField
              key={`new-attachment-${a.attachments.length}`}
              label={a.attachments.length ? 'Add another attachment' : 'Add an attachment'}
              kind="document"
              value=""
              onChange={(url) => url && onChange({ ...a, attachments: [...a.attachments, { name: decodeURIComponent(url.split('/').pop() || 'file'), url }] })}
              hint="PDF, Word, PowerPoint or image."
            />
          </div>
        </div>
      ) : (
        <div className="max-w-4xl">
          <p className="text-sm text-gray-600 mb-4">MCQ assignments are marked automatically. Students take them without full-screen or camera checks.</p>
          <TestFields test={a.test} kind="ASSIGNMENT" onChange={(t) => onChange({ ...a, test: t })} />
        </div>
      )}
    </RowShell>
  );
}

function TestRow({ test: t, index, count, open, onToggle, onChange, onMove, onDelete }: { test: TestDraft; index: number; count: number; open: boolean; onToggle: () => void; onChange: (t: TestDraft) => void; onMove: (d: -1 | 1) => void; onDelete: () => void }) {
  const problem = validateTest(t);
  return (
    <RowShell
      kind="test"
      icon={ClipboardCheck}
      title={t.title}
      fallback="Untitled test"
      meta={`MCQ test · ${t.questions.length} question${t.questions.length === 1 ? '' : 's'} · ${t.timeLimit} min · pass ${t.passingMarks}%`}
      status={problem ? { ok: false, text: 'Needs attention' } : { ok: true, text: 'Ready' }}
      open={open}
      onToggle={onToggle}
      first={index === 0}
      last={index === count - 1}
      onMove={onMove}
      onDelete={onDelete}
    >
      <div className="max-w-4xl">
        <p className="text-sm text-gray-600 mb-4">Proctored: full screen and camera snapshots during the test. Appears under Assignments &gt; MCQ Tests for enrolled students.</p>
        <TestFields test={t} onChange={onChange} />
      </div>
    </RowShell>
  );
}
