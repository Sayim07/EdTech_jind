'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { AlertCircle, CheckCircle2, ChevronDown, ChevronUp, ClipboardCheck, Plus, Trash2, Users } from 'lucide-react';
import { OPTION_LABELS, QuestionDraft, TestDraft, blankQuestion, blankTest, validateTest } from '@/lib/mcq';

interface Props {
  tests: TestDraft[];
  setTests: (v: TestDraft[]) => void;
  /** Present when editing an existing course: enables the attempts review link. */
  courseId?: string;
}

const fieldCls =
  'w-full px-3.5 py-2.5 rounded-lg border border-gray-300 bg-white text-gray-900 text-sm placeholder-gray-400 focus:outline-none focus:border-amber-600 focus:shadow-[0_0_0_3px_#e3eeff] transition';
const iconBtn =
  'h-8 w-8 inline-flex items-center justify-center rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-gray-900 disabled:opacity-40 disabled:cursor-not-allowed transition focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_#e3eeff]';

function move<T>(arr: T[], from: number, to: number): T[] {
  if (to < 0 || to >= arr.length) return arr;
  const next = arr.slice();
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

/** Quick per-question problem used for inline hints. */
function questionProblem(q: QuestionDraft): string | null {
  if (!q.text.trim()) return 'Question text is empty';
  if (q.options.filter((o) => o.trim()).length < 2) return 'Fill in at least two options';
  if (q.correctIndex === null) return 'Choose the correct answer';
  if (!q.options[q.correctIndex]?.trim()) return 'The correct answer is an empty option';
  return null;
}

function QuestionEditor({
  q,
  index,
  count,
  open,
  onToggle,
  onChange,
  onMove,
  onDelete,
}: {
  q: QuestionDraft;
  index: number;
  count: number;
  open: boolean;
  onToggle: () => void;
  onChange: (patch: Partial<QuestionDraft>) => void;
  onMove: (dir: -1 | 1) => void;
  onDelete: () => void;
}) {
  const problem = questionProblem(q);
  const groupName = `correct-${q.id}`;
  return (
    <li className="rounded-lg border border-gray-200 bg-white">
      <div className="flex items-center gap-2 p-2.5">
        <button type="button" onClick={onToggle} aria-expanded={open} className="flex-1 min-w-0 flex items-center gap-3 text-left rounded-lg px-1.5 py-1 hover:bg-gray-50">
          <span className="w-7 h-7 shrink-0 rounded-md bg-amber-50 text-amber-700 text-sm font-semibold flex items-center justify-center">{index + 1}</span>
          <span className={`truncate text-sm ${q.text.trim() ? 'text-gray-900 font-medium' : 'text-gray-400'}`}>{q.text.trim() || 'Untitled question'}</span>
          {problem && <span className="hidden sm:inline shrink-0 text-xs text-red-600">{problem}</span>}
          {open ? <ChevronUp className="w-4 h-4 text-gray-500 ml-auto shrink-0" /> : <ChevronDown className="w-4 h-4 text-gray-500 ml-auto shrink-0" />}
        </button>
        <button type="button" className={iconBtn} onClick={() => onMove(-1)} disabled={index === 0} aria-label={`Move question ${index + 1} up`}>
          <ChevronUp className="w-4 h-4" />
        </button>
        <button type="button" className={iconBtn} onClick={() => onMove(1)} disabled={index === count - 1} aria-label={`Move question ${index + 1} down`}>
          <ChevronDown className="w-4 h-4" />
        </button>
        <button type="button" className={`${iconBtn} hover:!text-red-600`} onClick={onDelete} aria-label={`Delete question ${index + 1}`}>
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {open && (
        <div className="border-t border-gray-100 p-4 space-y-4">
          <div>
            <label htmlFor={`qt-${q.id}`} className="block text-sm font-semibold text-gray-700 mb-1">
              Question
            </label>
            <textarea id={`qt-${q.id}`} rows={2} value={q.text} onChange={(e) => onChange({ text: e.target.value })} className={fieldCls} placeholder="Type the question" />
          </div>

          <fieldset className="space-y-2">
            <legend className="text-sm font-semibold text-gray-700 mb-1">Options (select the correct one)</legend>
            {OPTION_LABELS.map((label, i) => (
              <div key={label} className="flex items-center gap-2.5">
                <input
                  type="radio"
                  name={groupName}
                  checked={q.correctIndex === i}
                  onChange={() => onChange({ correctIndex: i })}
                  aria-label={`Option ${label} is correct`}
                  className="w-4 h-4 accent-[#0056d2] shrink-0"
                />
                <span className="w-5 text-sm font-semibold text-gray-600 shrink-0">{label}</span>
                <input
                  type="text"
                  value={q.options[i]}
                  onChange={(e) => onChange({ options: q.options.map((o, oi) => (oi === i ? e.target.value : o)) })}
                  placeholder={`Option ${label}${i > 1 ? ' (optional)' : ''}`}
                  aria-label={`Option ${label} text`}
                  className={fieldCls}
                />
              </div>
            ))}
          </fieldset>

          <div>
            <label htmlFor={`qe-${q.id}`} className="block text-sm font-semibold text-gray-700 mb-1">
              Explanation (optional)
            </label>
            <textarea id={`qe-${q.id}`} rows={2} value={q.explanation} onChange={(e) => onChange({ explanation: e.target.value })} className={fieldCls} placeholder="Shown to students after they submit" />
          </div>
        </div>
      )}
    </li>
  );
}

/** Create, edit, delete and reorder a course's MCQ tests and questions. Fully controlled by the parent form. */
export function AdminTestBuilder({ tests, setTests, courseId }: Props) {
  const [openTest, setOpenTest] = useState<string | null>(tests[0]?.id ?? null);
  const [openQuestion, setOpenQuestion] = useState<string | null>(null);

  const patchTest = (id: string, patch: Partial<TestDraft>) => setTests(tests.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  const patchQuestion = (tid: string, qid: string, patch: Partial<QuestionDraft>) =>
    setTests(tests.map((t) => (t.id === tid ? { ...t, questions: t.questions.map((q) => (q.id === qid ? { ...q, ...patch } : q)) } : t)));

  const addTest = () => {
    const t = blankTest();
    setTests([...tests, t]);
    setOpenTest(t.id);
    setOpenQuestion(t.questions[0].id);
  };

  const removeTest = (t: TestDraft) => {
    const existing = !t.id.startsWith('new-');
    const msg = existing
      ? `Delete "${t.title || 'this test'}"? Student attempts of this test stay in history, but the test disappears for students once you save.`
      : `Remove "${t.title || 'this test'}"?`;
    if (confirm(msg)) setTests(tests.filter((x) => x.id !== t.id));
  };

  const addQuestion = (t: TestDraft) => {
    const q = blankQuestion();
    patchTest(t.id, { questions: [...t.questions, q] });
    setOpenQuestion(q.id);
  };

  return (
    <div className="bg-white p-5 sm:p-6 rounded-2xl border border-gray-200 shadow-sm space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 pb-3">
        <div className="flex items-center gap-2">
          <ClipboardCheck className="w-4 h-4 text-amber-600" />
          <h2 className="text-sm sm:text-base font-semibold text-gray-900">MCQ tests</h2>
        </div>
        <div className="flex items-center gap-2">
          {courseId && (
            <Link
              href={`/admin/courses/${courseId}/attempts`}
              className="h-9 px-3 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 text-sm font-semibold inline-flex items-center gap-2 transition"
            >
              <Users className="w-4 h-4" /> Student attempts
            </Link>
          )}
          <button
            type="button"
            onClick={addTest}
            className="h-9 px-3 rounded-lg bg-amber-600 hover:bg-[#0060eb] text-white text-sm font-semibold inline-flex items-center gap-2 transition active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" /> Add test
          </button>
        </div>
      </div>

      <p className="text-sm text-gray-600 max-w-prose">
        Tests appear under Assignments &gt; MCQ Tests for enrolled students as soon as the course is saved. Until a course has a test, students see a built-in practice test.
      </p>

      {tests.length === 0 && (
        <div className="rounded-lg border border-dashed border-gray-300 p-6 text-center text-sm text-gray-600">No tests yet. Add one to replace the built-in practice test.</div>
      )}

      <ul className="space-y-3">
        {tests.map((t, ti) => {
          const open = openTest === t.id;
          const problem = validateTest(t);
          return (
            <li key={t.id} className="rounded-xl border border-gray-200">
              <div className="flex items-center gap-2 p-3">
                <button type="button" onClick={() => setOpenTest(open ? null : t.id)} aria-expanded={open} className="flex-1 min-w-0 flex items-center gap-3 text-left rounded-lg px-1.5 py-1 hover:bg-gray-50">
                  {problem ? <AlertCircle className="w-4 h-4 text-red-600 shrink-0" aria-label="Needs attention" /> : <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" aria-label="Ready" />}
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-gray-900">{t.title.trim() || 'Untitled test'}</span>
                    <span className="block text-xs text-gray-600">
                      {t.questions.length} question{t.questions.length === 1 ? '' : 's'} · {t.timeLimit} min · pass {t.passingMarks}%
                    </span>
                  </span>
                  {open ? <ChevronUp className="w-4 h-4 text-gray-500 ml-auto shrink-0" /> : <ChevronDown className="w-4 h-4 text-gray-500 ml-auto shrink-0" />}
                </button>
                <button type="button" className={iconBtn} onClick={() => setTests(move(tests, ti, ti - 1))} disabled={ti === 0} aria-label="Move test up">
                  <ChevronUp className="w-4 h-4" />
                </button>
                <button type="button" className={iconBtn} onClick={() => setTests(move(tests, ti, ti + 1))} disabled={ti === tests.length - 1} aria-label="Move test down">
                  <ChevronDown className="w-4 h-4" />
                </button>
                <button type="button" className={`${iconBtn} hover:!text-red-600`} onClick={() => removeTest(t)} aria-label="Delete test">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {open && (
                <div className="border-t border-gray-100 p-4 space-y-5">
                  {problem && (
                    <p role="alert" className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2 flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /> {problem}. Saving the course is blocked until this is fixed.
                    </p>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="sm:col-span-2">
                      <label htmlFor={`tt-${t.id}`} className="block text-sm font-semibold text-gray-700 mb-1">
                        Test title
                      </label>
                      <input id={`tt-${t.id}`} value={t.title} onChange={(e) => patchTest(t.id, { title: e.target.value })} className={fieldCls} placeholder="e.g. Module 1 Quiz" />
                    </div>
                    <div>
                      <label htmlFor={`tl-${t.id}`} className="block text-sm font-semibold text-gray-700 mb-1">
                        Time limit (minutes)
                      </label>
                      <input id={`tl-${t.id}`} type="number" min={1} max={600} value={t.timeLimit} onChange={(e) => patchTest(t.id, { timeLimit: Number(e.target.value) })} className={fieldCls} />
                    </div>
                    <div>
                      <label htmlFor={`tp-${t.id}`} className="block text-sm font-semibold text-gray-700 mb-1">
                        Passing marks (%)
                      </label>
                      <input id={`tp-${t.id}`} type="number" min={0} max={100} value={t.passingMarks} onChange={(e) => patchTest(t.id, { passingMarks: Number(e.target.value) })} className={fieldCls} />
                    </div>
                  </div>

                  <label className="inline-flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" checked={t.allowRetakes} onChange={(e) => patchTest(t.id, { allowRetakes: e.target.checked })} className="w-4 h-4 accent-[#0056d2]" />
                    <span className="text-sm font-semibold text-gray-700">Allow retakes</span>
                  </label>

                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-gray-900">Questions</h3>
                    <ul className="space-y-2">
                      {t.questions.map((q, qi) => (
                        <QuestionEditor
                          key={q.id}
                          q={q}
                          index={qi}
                          count={t.questions.length}
                          open={openQuestion === q.id}
                          onToggle={() => setOpenQuestion(openQuestion === q.id ? null : q.id)}
                          onChange={(patch) => patchQuestion(t.id, q.id, patch)}
                          onMove={(dir) => patchTest(t.id, { questions: move(t.questions, qi, qi + dir) })}
                          onDelete={() => patchTest(t.id, { questions: t.questions.filter((x) => x.id !== q.id) })}
                        />
                      ))}
                    </ul>
                    <button
                      type="button"
                      onClick={() => addQuestion(t)}
                      className="h-9 px-3 rounded-lg border border-amber-600 text-amber-600 hover:bg-amber-50 text-sm font-semibold inline-flex items-center gap-2 transition"
                    >
                      <Plus className="w-4 h-4" /> Add question
                    </button>
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
