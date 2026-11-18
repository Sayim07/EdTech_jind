'use client';

import React, { useState } from 'react';
import { AlertCircle, ChevronDown, ChevronUp, Plus, Trash2 } from 'lucide-react';
import { OPTION_LABELS, QuestionDraft, TestDraft, blankQuestion, validateTest } from '@/lib/mcq';

export const fieldCls =
  'w-full px-3.5 py-2.5 rounded-lg border border-gray-300 bg-white text-gray-900 text-sm placeholder-gray-400 focus:outline-none focus:border-amber-600 focus:shadow-[0_0_0_3px_#e3eeff] transition';
export const iconBtn =
  'h-8 w-8 inline-flex items-center justify-center rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-gray-900 disabled:opacity-40 disabled:cursor-not-allowed transition focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_#e3eeff]';

export function move<T>(arr: T[], from: number, to: number): T[] {
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

export function QuestionEditor({
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
/**
 * The editor for ONE MCQ test or MCQ assignment: its settings and its questions
 * (add, edit, remove and reorder). The surrounding list lives in the course content builder.
 */
export function TestFields({ test, onChange, kind = 'TEST' }: { test: TestDraft; onChange: (t: TestDraft) => void; kind?: 'TEST' | 'ASSIGNMENT' }) {
  const [openQuestion, setOpenQuestion] = useState<string | null>(test.questions[0]?.id ?? null);
  const label = kind === 'ASSIGNMENT' ? 'assignment' : 'test';

  const patch = (p: Partial<TestDraft>) => onChange({ ...test, ...p });
  const patchQuestion = (qid: string, p: Partial<QuestionDraft>) => patch({ questions: test.questions.map((q) => (q.id === qid ? { ...q, ...p } : q)) });
  const addQuestion = () => {
    const q = blankQuestion();
    patch({ questions: [...test.questions, q] });
    setOpenQuestion(q.id);
  };
  const problem = validateTest(test);

  return (
    <div className="space-y-5">
      {problem && (
        <p role="alert" className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /> {problem}. Saving the course is blocked until this is fixed.
        </p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="sm:col-span-2">
          <label htmlFor={`tt-${test.id}`} className="block text-sm font-semibold text-gray-700 mb-1">
            Title
          </label>
          <input id={`tt-${test.id}`} value={test.title} onChange={(e) => patch({ title: e.target.value })} className={fieldCls} placeholder={kind === 'ASSIGNMENT' ? 'e.g. Week 1 practice questions' : 'e.g. Module 1 Quiz'} />
        </div>
        <div>
          <label htmlFor={`tl-${test.id}`} className="block text-sm font-semibold text-gray-700 mb-1">
            Time limit (minutes)
          </label>
          <input id={`tl-${test.id}`} type="number" min={1} max={600} value={test.timeLimit} onChange={(e) => patch({ timeLimit: Number(e.target.value) })} className={fieldCls} />
        </div>
        <div>
          <label htmlFor={`tp-${test.id}`} className="block text-sm font-semibold text-gray-700 mb-1">
            Passing marks (%)
          </label>
          <input id={`tp-${test.id}`} type="number" min={0} max={100} value={test.passingMarks} onChange={(e) => patch({ passingMarks: Number(e.target.value) })} className={fieldCls} />
        </div>
      </div>

      <label className="inline-flex items-center gap-3 cursor-pointer">
        <input type="checkbox" checked={test.allowRetakes} onChange={(e) => patch({ allowRetakes: e.target.checked })} className="w-4 h-4 accent-[#0056d2]" />
        <span className="text-sm font-semibold text-gray-700">Allow retakes</span>
      </label>

      <div className="space-y-3">
        <h4 className="text-sm font-semibold text-gray-900">Questions</h4>
        <ul className="space-y-2">
          {test.questions.map((q, qi) => (
            <QuestionEditor
              key={q.id}
              q={q}
              index={qi}
              count={test.questions.length}
              open={openQuestion === q.id}
              onToggle={() => setOpenQuestion(openQuestion === q.id ? null : q.id)}
              onChange={(p) => patchQuestion(q.id, p)}
              onMove={(dir) => patch({ questions: move(test.questions, qi, qi + dir) })}
              onDelete={() => patch({ questions: test.questions.filter((x) => x.id !== q.id) })}
            />
          ))}
        </ul>
        <button type="button" onClick={addQuestion} className="h-9 px-3 rounded-lg border border-amber-600 text-amber-600 hover:bg-amber-50 text-sm font-semibold inline-flex items-center gap-2 transition">
          <Plus className="w-4 h-4" /> Add question
        </button>
        {test.questions.length === 0 && <p className="text-sm text-gray-600">This {label} needs at least one question.</p>}
      </div>
    </div>
  );
}
