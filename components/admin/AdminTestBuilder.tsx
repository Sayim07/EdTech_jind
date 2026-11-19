'use client';

import React, { useEffect, useId, useState } from 'react';
import { AlertCircle, ChevronDown, ChevronUp, Plus, RefreshCw, ShieldCheck, Trash2 } from 'lucide-react';
import { OPTION_LABELS, QuestionDraft, TestDraft, blankQuestion, examSettingErrors, validateTest, type ExamSettingKey } from '@/lib/mcq';

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

/* ----------------------------------------------------------------------------------------------
 * Exam controls (tests only; MCQ assignments are never proctored)
 * ---------------------------------------------------------------------------------------------- */

const pad = (n: number) => String(n).padStart(2, '0');
/** ISO (UTC) -> value for <input type="datetime-local"> in the browser's own time zone. */
function toLocalInput(iso: string) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
/** datetime-local value -> ISO. */
function fromLocalInput(v: string) {
  if (!v) return '';
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? '' : d.toISOString();
}

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O/1/I, easy to read out loud
function generateCode(length = 8) {
  const bytes = new Uint32Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join('');
}

/** One group of related controls: a short heading on the left (stacked on phones), the controls on the right. */
function Group({ title, intro, children }: { title: string; intro: string; children: React.ReactNode }) {
  const id = useId();
  return (
    <div role="group" aria-labelledby={id} className="grid grid-cols-1 lg:grid-cols-[13rem_minmax(0,1fr)] gap-x-8 gap-y-3 p-4 sm:p-5">
      <div>
        <h5 id={id} className="text-sm font-semibold text-gray-900">
          {title}
        </h5>
        <p className="text-xs text-gray-600 mt-0.5 max-w-prose">{intro}</p>
      </div>
      <div className="space-y-4 min-w-0">{children}</div>
    </div>
  );
}

function Field({ label, hint, error, children, htmlFor, hintId }: { label: string; hint?: string; error?: string; children: React.ReactNode; htmlFor: string; hintId: string }) {
  return (
    <div className="min-w-0">
      <label htmlFor={htmlFor} className="block text-sm font-semibold text-gray-700 mb-1">
        {label}
      </label>
      {children}
      {hint && (
        <p id={hintId} className="text-xs text-gray-600 mt-1 max-w-prose">
          {hint}
        </p>
      )}
      {error && (
        <p role="alert" className="text-xs font-semibold text-red-700 mt-1 flex items-start gap-1">
          <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-px" aria-hidden /> {error}
        </p>
      )}
    </div>
  );
}

function Toggle({ label, hint, checked, onChange }: { label: string; hint: string; checked: boolean; onChange: (v: boolean) => void }) {
  const id = useId();
  return (
    <div className="flex items-start gap-3">
      <input id={id} type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} aria-describedby={`${id}-h`} className="w-4 h-4 mt-0.5 accent-[#0056d2] shrink-0 cursor-pointer" />
      <div className="min-w-0">
        <label htmlFor={id} className="text-sm font-semibold text-gray-700 cursor-pointer">
          {label}
        </label>
        <p id={`${id}-h`} className="text-xs text-gray-600 mt-0.5 max-w-prose">
          {hint}
        </p>
      </div>
    </div>
  );
}

const ghostBtn =
  'h-10 px-3 rounded-lg border border-gray-300 bg-white text-gray-800 hover:bg-gray-50 text-sm font-semibold inline-flex items-center justify-center gap-1.5 transition active:scale-[0.98] focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_#e3eeff] disabled:opacity-60 disabled:cursor-not-allowed';
const errCls = '!border-red-500 focus:!border-red-500';

function ExamControls({ test, patch }: { test: TestDraft; patch: (p: Partial<TestDraft>) => void }) {
  const uid = useId();
  const [open, setOpen] = useState(test.id.startsWith('new-'));
  const [zone, setZone] = useState('');
  useEffect(() => setZone(Intl.DateTimeFormat().resolvedOptions().timeZone || ''), []);
  const errors = examSettingErrors(test);
  const bad = (k: ExamSettingKey) => (errors[k] ? errCls : '');
  const num = (v: string) => (v === '' ? NaN : Number(v));
  const bank = test.questions.length;

  const summary = [
    test.requireIdCheck ? 'ID check' : null,
    test.requireCamera ? `photo every ${test.captureEverySeconds}s` : 'no camera',
    test.accessCode.trim() ? 'access code' : null,
    test.startsAt || test.endsAt ? 'scheduled' : null,
    `${test.maxViolations} violations allowed`,
  ]
    .filter(Boolean)
    .join(' · ');
  const hasProblem = Object.keys(errors).length > 0;

  return (
    <section aria-labelledby={`${uid}-h`} className="rounded-lg border border-gray-200 bg-white">
      <h4 id={`${uid}-h`} className="m-0">
        <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} aria-controls={`${uid}-body`} className="w-full flex items-center gap-3 text-left px-4 py-3 rounded-lg hover:bg-gray-50 focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_#e3eeff]">
          <ShieldCheck className="w-5 h-5 text-amber-600 shrink-0" aria-hidden />
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold text-gray-900">Exam controls</span>
            <span className="block text-xs text-gray-600 truncate">{summary}</span>
          </span>
          {hasProblem && <span className="text-xs font-semibold text-red-700 shrink-0">Needs attention</span>}
          {open ? <ChevronUp className="w-4 h-4 text-gray-500 shrink-0" aria-hidden /> : <ChevronDown className="w-4 h-4 text-gray-500 shrink-0" aria-hidden />}
        </button>
      </h4>

      {open && (
        <div id={`${uid}-body`} className="border-t border-gray-200 divide-y divide-gray-100">
          <Group title="Schedule" intro="When students may start. Leave blank for no limit.">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Opens" htmlFor={`${uid}-s`} hintId={`${uid}-s-h`} error={errors.startsAt}>
                <input id={`${uid}-s`} type="datetime-local" value={toLocalInput(test.startsAt)} onChange={(e) => patch({ startsAt: fromLocalInput(e.target.value) })} aria-invalid={Boolean(errors.startsAt)} className={`${fieldCls} ${bad('startsAt')}`} />
              </Field>
              <Field label="Closes" htmlFor={`${uid}-e`} hintId={`${uid}-e-h`} error={errors.endsAt}>
                <input id={`${uid}-e`} type="datetime-local" value={toLocalInput(test.endsAt)} onChange={(e) => patch({ endsAt: fromLocalInput(e.target.value) })} aria-invalid={Boolean(errors.endsAt)} className={`${fieldCls} ${bad('endsAt')}`} />
              </Field>
            </div>
            <p className="text-xs text-gray-600 max-w-prose">
              Nobody can start before it opens or after it closes, and an attempt still running at the closing time is submitted for the student.
              {zone && <> Times are in your time zone ({zone}).</>}
            </p>
          </Group>

          <Group title="Access code" intro="Students must type this to start.">
            <Field label="Code" htmlFor={`${uid}-c`} hintId={`${uid}-c-h`} error={errors.accessCode} hint="4 to 20 letters or digits. Share it with students when the exam begins. Leave blank for no code. Only staff can see it.">
              <div className="flex flex-col sm:flex-row gap-2 sm:max-w-md">
                <input
                  id={`${uid}-c`}
                  value={test.accessCode}
                  onChange={(e) => patch({ accessCode: e.target.value.replace(/\s+/g, '') })}
                  maxLength={20}
                  autoComplete="off"
                  spellCheck={false}
                  aria-invalid={Boolean(errors.accessCode)}
                  aria-describedby={`${uid}-c-h`}
                  placeholder="No code"
                  className={`${fieldCls} font-mono tracking-wider uppercase ${bad('accessCode')}`}
                />
                <button type="button" onClick={() => patch({ accessCode: generateCode() })} className={`${ghostBtn} shrink-0`}>
                  <RefreshCw className="w-4 h-4" aria-hidden /> Generate
                </button>
              </div>
            </Field>
          </Group>

          <Group title="Questions" intro="What each student gets from the bank.">
            <Field
              label="Questions per student"
              htmlFor={`${uid}-n`}
              hintId={`${uid}-n-h`}
              error={errors.questionCount}
              hint={`Leave blank to give every student all ${bank} question${bank === 1 ? '' : 's'}. Set a smaller number to draw a different random set for each student.`}
            >
              <div className="flex items-center gap-2">
                <input
                  id={`${uid}-n`}
                  type="number"
                  min={1}
                  max={Math.max(1, bank)}
                  value={test.questionCount ?? ''}
                  onChange={(e) => patch({ questionCount: e.target.value === '' ? null : num(e.target.value) })}
                  placeholder="All"
                  aria-invalid={Boolean(errors.questionCount)}
                  aria-describedby={`${uid}-n-h`}
                  className={`${fieldCls} !w-28 ${bad('questionCount')}`}
                />
                <span className="text-sm text-gray-700">of {bank} in the bank</span>
              </div>
            </Field>
            <Toggle label="Shuffle the questions" hint="Each student sees the questions in their own order." checked={test.randomizeQuestions} onChange={(v) => patch({ randomizeQuestions: v })} />
            <Toggle label="Shuffle the answer options" hint="Each student sees options A to D in their own order." checked={test.randomizeOptions} onChange={(v) => patch({ randomizeOptions: v })} />
          </Group>

          <Group title="Camera and identity" intro="Evidence a teacher can review afterwards. No video is recorded.">
            <Toggle label="Take camera photos during the exam" hint="Random still photos from the student's camera while they take the test. The exam asks for camera access." checked={test.requireCamera} onChange={(v) => patch({ requireCamera: v })} />
            <Field label="Photo interval (seconds)" htmlFor={`${uid}-i`} hintId={`${uid}-i-h`} error={errors.captureEverySeconds} hint="One photo is taken at a random moment in every interval. 30 to 600 seconds.">
              <input
                id={`${uid}-i`}
                type="number"
                min={30}
                max={600}
                step={10}
                disabled={!test.requireCamera}
                value={Number.isNaN(test.captureEverySeconds) ? '' : test.captureEverySeconds}
                onChange={(e) => patch({ captureEverySeconds: num(e.target.value) })}
                aria-invalid={Boolean(errors.captureEverySeconds)}
                aria-describedby={`${uid}-i-h`}
                className={`${fieldCls} !w-28 disabled:bg-gray-50 disabled:text-gray-500 ${bad('captureEverySeconds')}`}
              />
            </Field>
            <Toggle label="Identity check before the exam" hint="The student takes a selfie and a photo of their ID card. You approve it before they can start." checked={test.requireIdCheck} onChange={(v) => patch({ requireIdCheck: v })} />
            <Toggle label="Show a consent notice" hint="The student must accept that the exam is monitored (camera photos, tab and window activity) before starting." checked={test.requireConsent} onChange={(v) => patch({ requireConsent: v })} />
          </Group>

          <Group title="Violations and privacy" intro="What counts against a student, and how long photos are kept.">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Violation limit" htmlFor={`${uid}-v`} hintId={`${uid}-v-h`} error={errors.maxViolations} hint="The exam is submitted automatically when a student reaches this many violations (leaving the tab or full screen, copy and paste). 1 to 20.">
                <input
                  id={`${uid}-v`}
                  type="number"
                  min={1}
                  max={20}
                  value={Number.isNaN(test.maxViolations) ? '' : test.maxViolations}
                  onChange={(e) => patch({ maxViolations: num(e.target.value) })}
                  aria-invalid={Boolean(errors.maxViolations)}
                  aria-describedby={`${uid}-v-h`}
                  className={`${fieldCls} !w-28 ${bad('maxViolations')}`}
                />
              </Field>
              <Field label="Keep photos for (days)" htmlFor={`${uid}-r`} hintId={`${uid}-r-h`} error={errors.photoRetentionDays} hint="ID photos, selfies and camera photos are deleted automatically after this long. 1 to 365 days.">
                <input
                  id={`${uid}-r`}
                  type="number"
                  min={1}
                  max={365}
                  value={Number.isNaN(test.photoRetentionDays) ? '' : test.photoRetentionDays}
                  onChange={(e) => patch({ photoRetentionDays: num(e.target.value) })}
                  aria-invalid={Boolean(errors.photoRetentionDays)}
                  aria-describedby={`${uid}-r-h`}
                  className={`${fieldCls} !w-28 ${bad('photoRetentionDays')}`}
                />
              </Field>
            </div>
          </Group>
        </div>
      )}
    </section>
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
  const problem = validateTest(test, { proctored: kind !== 'ASSIGNMENT' });

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
      {kind !== 'ASSIGNMENT' && <p className="text-xs text-gray-600 -mt-3 max-w-prose">When off, a student can take this test once. You can still allow one student to retake it from the Proctoring page.</p>}

      {kind !== 'ASSIGNMENT' && <ExamControls test={test} patch={patch} />}

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
