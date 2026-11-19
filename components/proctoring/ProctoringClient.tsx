'use client';

import React, { useCallback, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Camera, ChevronDown, ChevronUp, Clock, ImageOff, TriangleAlert } from 'lucide-react';
import { Chips, FilterBar, Select, controlClass } from '@/components/admin/FilterBar';
import { formatDateTime, istDay } from '@/lib/format';
import { Badge, ImageViewer, ReviewBadge, SafeImg, VerificationBadge, type ViewerItem } from '@/components/proctoring/ui';
import { RetakeButton, VerificationDecision } from '@/components/proctoring/actions';
import type { AttemptRow, CourseOption, GrantRow, VerificationRow } from '@/components/proctoring/types';

type Tab = 'identity' | 'attempts' | 'retakes';

const photoUrl = (id: string, part: 'selfie' | 'id') => `/api/proctor/media/verification/${id}/${part}`;

export function ProctoringClient({
  courses,
  verifications,
  attempts,
  grants,
  initialTab,
  initialCourse,
}: {
  courses: CourseOption[];
  verifications: VerificationRow[];
  attempts: AttemptRow[];
  grants: GrantRow[];
  initialTab: Tab;
  initialCourse: string;
}) {
  const [tab, setTab] = useState<Tab>(initialTab);
  const [query, setQuery] = useState('');
  const [course, setCourse] = useState(courses.some((c) => c.id === initialCourse) ? initialCourse : 'ALL');
  const [exam, setExam] = useState('ALL');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [vStatus, setVStatus] = useState<'ALL' | VerificationRow['status']>('ALL');
  const [aStatus, setAStatus] = useState<'ALL' | 'SUBMITTED' | 'IN_PROGRESS' | 'AUTO'>('ALL');
  const [aReview, setAReview] = useState<'ALL' | 'PENDING' | 'VALID' | 'SUSPICIOUS'>('ALL');
  const [gStatus, setGStatus] = useState<'ALL' | 'UNUSED' | 'USED'>('ALL');
  const [viewer, setViewer] = useState<{ items: ViewerItem[]; index: number } | null>(null);
  const closeViewer = useCallback(() => setViewer(null), []);
  const setViewerIndex = useCallback((index: number) => setViewer((v) => (v ? { ...v, index } : v)), []);

  const q = query.trim().toLowerCase();
  const inDate = (iso: string) => {
    if (!from && !to) return true;
    const day = istDay(iso);
    return (!from || day >= from) && (!to || day <= to);
  };
  const common = (r: { courseId: string; testKey: string; student: string; email: string; createdAt?: string }) =>
    (course === 'ALL' || r.courseId === course) && (exam === 'ALL' || r.testKey === exam) && (!q || `${r.student} ${r.email}`.toLowerCase().includes(q));

  const exams = useMemo(() => {
    const m = new Map<string, { title: string; courseId: string }>();
    for (const r of [...verifications, ...attempts, ...grants]) if (!m.has(r.testKey)) m.set(r.testKey, { title: r.test, courseId: r.courseId });
    return [...m.entries()].filter(([, v]) => course === 'ALL' || v.courseId === course).sort((a, b) => a[1].title.localeCompare(b[1].title));
  }, [verifications, attempts, grants, course]);

  const vRows = useMemo(
    () =>
      verifications
        .filter((v) => common(v) && inDate(v.createdAt) && (vStatus === 'ALL' || v.status === vStatus))
        // Waiting ones first (oldest first, so nobody waits longest), then everything else newest first.
        .sort((a, b) => {
          if ((a.status === 'PENDING') !== (b.status === 'PENDING')) return a.status === 'PENDING' ? -1 : 1;
          return a.status === 'PENDING' ? a.createdAt.localeCompare(b.createdAt) : b.createdAt.localeCompare(a.createdAt);
        }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [verifications, course, exam, q, from, to, vStatus],
  );
  const aRows = useMemo(
    () =>
      attempts.filter(
        (a) =>
          common({ ...a }) &&
          inDate(a.startedAt) &&
          (aStatus === 'ALL' || (aStatus === 'AUTO' ? a.autoSubmitted : a.status === aStatus)) &&
          (aReview === 'ALL' || a.reviewStatus === aReview),
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [attempts, course, exam, q, from, to, aStatus, aReview],
  );
  const gRows = useMemo(
    () => grants.filter((g) => common(g) && inDate(g.createdAt) && (gStatus === 'ALL' || (gStatus === 'USED') === Boolean(g.usedAt))),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [grants, course, exam, q, from, to, gStatus],
  );

  const pending = verifications.filter((v) => v.status === 'PENDING').length;
  const toReview = attempts.filter((a) => a.status === 'SUBMITTED' && a.reviewStatus === 'PENDING').length;
  const unused = grants.filter((g) => !g.usedAt).length;
  // Student and exam pairs that already have an unused retake, so the button says so.
  const waiting = useMemo(() => new Set(grants.filter((g) => !g.usedAt).map((g) => `${g.userId}:${g.testKey}`)), [grants]);

  const statusFilterActive = tab === 'identity' ? vStatus !== 'ALL' : tab === 'attempts' ? aStatus !== 'ALL' || aReview !== 'ALL' : gStatus !== 'ALL';
  const active = Boolean(query || course !== 'ALL' || exam !== 'ALL' || from || to || statusFilterActive);
  const clear = () => {
    setQuery('');
    setCourse('ALL');
    setExam('ALL');
    setFrom('');
    setTo('');
    setVStatus('ALL');
    setAStatus('ALL');
    setAReview('ALL');
    setGStatus('ALL');
  };

  const tabs: { id: Tab; label: string; count: number; hint: string }[] = [
    { id: 'identity', label: 'Identity checks', count: pending, hint: 'waiting' },
    { id: 'attempts', label: 'Attempts', count: toReview, hint: 'to review' },
    { id: 'retakes', label: 'Retakes', count: unused, hint: 'unused' },
  ];
  const onTabKey = (e: React.KeyboardEvent, i: number) => {
    const next = e.key === 'ArrowRight' ? (i + 1) % tabs.length : e.key === 'ArrowLeft' ? (i - 1 + tabs.length) % tabs.length : -1;
    if (next < 0) return;
    e.preventDefault();
    setTab(tabs[next].id);
    document.getElementById(`ptab-${tabs[next].id}`)?.focus();
  };

  const noun = tab === 'identity' ? 'identity checks' : tab === 'attempts' ? 'attempts' : 'retake grants';
  const shown = tab === 'identity' ? vRows.length : tab === 'attempts' ? aRows.length : gRows.length;
  const total = tab === 'identity' ? verifications.length : tab === 'attempts' ? attempts.length : grants.length;

  return (
    <div className="space-y-4">
      <div role="tablist" aria-label="Proctoring sections" className="flex gap-1 overflow-x-auto border-b border-gray-200">
        {tabs.map((t, i) => (
          <button
            key={t.id}
            id={`ptab-${t.id}`}
            role="tab"
            type="button"
            aria-selected={tab === t.id}
            aria-controls="ppanel"
            tabIndex={tab === t.id ? 0 : -1}
            onClick={() => setTab(t.id)}
            onKeyDown={(e) => onTabKey(e, i)}
            className={`px-3 sm:px-4 h-11 inline-flex items-center gap-2 text-sm font-semibold whitespace-nowrap border-b-2 -mb-px transition rounded-t focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_#e3eeff] ${
              tab === t.id ? 'border-amber-600 text-amber-700' : 'border-transparent text-gray-700 hover:text-gray-900 hover:border-gray-300'
            }`}
          >
            {t.label}
            {t.count > 0 && (
              <span className="min-w-[1.4rem] h-5 px-1.5 rounded-full bg-orange-100 text-orange-900 text-xs font-bold tabular-nums inline-flex items-center justify-center" title={`${t.count} ${t.hint}`}>
                <span className="sr-only">{t.count} {t.hint}</span>
                <span aria-hidden>{t.count}</span>
              </span>
            )}
          </button>
        ))}
      </div>

      <div id="ppanel" role="tabpanel" aria-labelledby={`ptab-${tab}`} className="bg-white rounded-2xl border border-gray-200">
        <FilterBar query={query} onQuery={setQuery} placeholder="Search student name or email" shown={shown} total={total} noun={noun} active={active} onClear={clear}>
          <Select label="Course" value={course} onChange={(v) => { setCourse(v); setExam('ALL'); }} options={[{ value: 'ALL', label: 'All courses' }, ...courses.map((c) => ({ value: c.id, label: c.title }))]} />
          <Select label="Exam" value={exam} onChange={setExam} options={[{ value: 'ALL', label: 'All exams' }, ...exams.map(([id, v]) => ({ value: id, label: v.title }))]} />
          {tab === 'attempts' && (
            <>
              <Select
                label="Attempt status"
                value={aStatus}
                onChange={(v) => setAStatus(v as typeof aStatus)}
                options={[
                  { value: 'ALL', label: 'Any status' },
                  { value: 'SUBMITTED', label: 'Submitted' },
                  { value: 'IN_PROGRESS', label: 'In progress' },
                  { value: 'AUTO', label: 'Auto-submitted' },
                ]}
              />
              <Select
                label="Review status"
                value={aReview}
                onChange={(v) => setAReview(v as typeof aReview)}
                options={[
                  { value: 'ALL', label: 'Any review status' },
                  { value: 'PENDING', label: 'Not reviewed' },
                  { value: 'VALID', label: 'Valid' },
                  { value: 'SUSPICIOUS', label: 'Suspicious' },
                ]}
              />
            </>
          )}
        </FilterBar>

        <div className="px-4 sm:px-5 py-3 flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-gray-200">
          {tab === 'identity' && (
            <Chips
              label="Filter by decision"
              value={vStatus}
              onChange={setVStatus}
              options={[
                { value: 'ALL', label: 'All', count: verifications.length },
                { value: 'PENDING', label: 'Waiting', count: pending },
                { value: 'APPROVED', label: 'Approved', count: verifications.filter((v) => v.status === 'APPROVED').length },
                { value: 'REJECTED', label: 'Rejected', count: verifications.filter((v) => v.status === 'REJECTED').length },
              ]}
            />
          )}
          {tab === 'retakes' && (
            <Chips
              label="Filter by use"
              value={gStatus}
              onChange={setGStatus}
              options={[
                { value: 'ALL', label: 'All', count: grants.length },
                { value: 'UNUSED', label: 'Unused', count: unused },
                { value: 'USED', label: 'Used', count: grants.length - unused },
              ]}
            />
          )}
          {tab === 'attempts' && <p className="text-sm text-gray-700">Open an attempt to see the photos and the timeline, then mark it valid or suspicious.</p>}
          <DateFilters from={from} to={to} onFrom={setFrom} onTo={setTo} />
        </div>

        {tab === 'identity' && <IdentityList rows={vRows} empty={verifications.length === 0} onOpen={(items, index) => setViewer({ items, index })} />}
        {tab === 'attempts' && <AttemptList rows={aRows} empty={attempts.length === 0} waiting={waiting} />}
        {tab === 'retakes' && <GrantList rows={gRows} empty={grants.length === 0} />}
      </div>

      {viewer && <ImageViewer items={viewer.items} index={viewer.index} onIndex={setViewerIndex} onClose={closeViewer} />}
    </div>
  );
}

/** Date range that wraps on a phone instead of running off the screen. */
function DateFilters({ from, to, onFrom, onTo }: { from: string; to: string; onFrom: (v: string) => void; onTo: (v: string) => void }) {
  return (
    <div className="grid grid-cols-2 sm:flex sm:items-center gap-2">
      <label className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-1.5 text-sm text-gray-700 min-w-0">
        From
        <input type="date" value={from} max={to || undefined} onChange={(e) => onFrom(e.target.value)} className={`${controlClass} w-full min-w-0`} />
      </label>
      <label className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-1.5 text-sm text-gray-700 min-w-0">
        To
        <input type="date" value={to} min={from || undefined} onChange={(e) => onTo(e.target.value)} className={`${controlClass} w-full min-w-0`} />
      </label>
    </div>
  );
}

function Empty({ none, title, text }: { none: boolean; title: string; text: string }) {
  return (
    <div className="p-10 text-center space-y-1">
      <p className="font-semibold text-gray-900">{none ? title : 'Nothing matches these filters'}</p>
      <p className="text-sm text-gray-600 max-w-prose mx-auto">{none ? text : 'Try a different search or clear the filters.'}</p>
    </div>
  );
}

/* ---------------------------------------------------------------- Identity checks */

function IdentityList({ rows, empty, onOpen }: { rows: VerificationRow[]; empty: boolean; onOpen: (items: ViewerItem[], index: number) => void }) {
  if (rows.length === 0) return <Empty none={empty} title="No identity checks yet" text="When a student submits a selfie and ID photo for an exam that needs one, it appears here for you to approve." />;
  return (
    <ul className="divide-y divide-gray-200">
      {rows.map((v) => (
        <IdentityRow key={v.id} v={v} onOpen={onOpen} />
      ))}
    </ul>
  );
}

function IdentityRow({ v, onOpen }: { v: VerificationRow; onOpen: (items: ViewerItem[], index: number) => void }) {
  const pending = v.status === 'PENDING';
  const [open, setOpen] = useState(false);
  const showPhotos = !v.purgedAt && (pending || open);
  const items: ViewerItem[] = [
    { src: photoUrl(v.id, 'selfie'), title: `Selfie of ${v.student}`, caption: `Submitted ${formatDateTime(v.createdAt)}` },
    { src: photoUrl(v.id, 'id'), title: `ID card photo of ${v.student}`, caption: `Submitted ${formatDateTime(v.createdAt)}` },
  ];

  return (
    <li className="p-4 sm:p-5 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-semibold text-gray-900">
            {v.student} <span className="font-normal text-gray-700 break-all">({v.email})</span>
          </p>
          <p className="text-sm text-gray-700">
            {v.test} <span className="text-gray-500">in</span> {v.course}
          </p>
          <p className="text-sm text-gray-600 inline-flex items-center gap-1.5 mt-0.5">
            <Clock className="w-3.5 h-3.5" aria-hidden /> Submitted {formatDateTime(v.createdAt)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <VerificationBadge status={v.status} />
          {!pending && !v.purgedAt && (
            <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className="h-9 px-3 rounded-lg text-sm font-semibold text-amber-600 hover:bg-amber-50 inline-flex items-center gap-1 focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_#e3eeff]">
              {open ? 'Hide photos' : 'View photos'} {open ? <ChevronUp className="w-4 h-4" aria-hidden /> : <ChevronDown className="w-4 h-4" aria-hidden />}
            </button>
          )}
        </div>
      </div>

      {v.purgedAt && (
        <p className="text-sm text-gray-700 inline-flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
          <ImageOff className="w-4 h-4 shrink-0" aria-hidden /> Photos deleted after the retention period ({formatDateTime(v.purgedAt)}).
        </p>
      )}

      {showPhotos && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <figure className="space-y-1.5">
            <SafeImg src={items[0].src} alt={items[0].title} onClick={() => onOpen(items, 0)} className="aspect-[4/3] rounded-lg border border-gray-200" />
            <figcaption className="text-sm font-semibold text-gray-800">Selfie</figcaption>
          </figure>
          <figure className="space-y-1.5">
            <SafeImg src={items[1].src} alt={items[1].title} onClick={() => onOpen(items, 1)} className="aspect-[4/3] rounded-lg border border-gray-200" />
            <figcaption className="text-sm font-semibold text-gray-800">ID card photo</figcaption>
          </figure>
        </div>
      )}

      {pending && !v.purgedAt && (
        <div className="space-y-2">
          <p className="text-sm text-gray-700 max-w-prose">Check that the face on the ID card is the person in the selfie and the name on the card matches {v.student}. Click a photo to see it full size.</p>
          <VerificationDecision id={v.id} student={v.student} />
        </div>
      )}
      {!pending && (
        <p className="text-sm text-gray-700">
          {v.status === 'APPROVED' ? 'Approved' : 'Rejected'}
          {v.reviewer ? ` by ${v.reviewer}` : ''}
          {v.reviewedAt ? ` on ${formatDateTime(v.reviewedAt)}` : ''}
          {v.status === 'REJECTED' && v.rejectReason ? `. Reason: ${v.rejectReason}` : ''}
        </p>
      )}
    </li>
  );
}

/* ---------------------------------------------------------------- Attempts */

const ATTEMPT_GRID = 'md:grid-cols-[minmax(0,1.3fr)_minmax(0,1.3fr)_minmax(0,0.9fr)_minmax(0,1fr)_minmax(0,11rem)]';

function AttemptList({ rows, empty, waiting }: { rows: AttemptRow[]; empty: boolean; waiting: Set<string> }) {
  if (rows.length === 0) return <Empty none={empty} title="No attempts yet" text="Attempts appear here as soon as a student starts an exam in one of your courses." />;
  return (
    <div>
      <div className={`hidden md:grid ${ATTEMPT_GRID} gap-4 px-5 py-3 text-sm font-semibold text-gray-600 border-b border-gray-200`} aria-hidden>
        <span>Student</span>
        <span>Exam</span>
        <span>Result</span>
        <span>Proctoring</span>
        <span>Review</span>
      </div>
      <ul className="divide-y divide-gray-200">
        {rows.map((a) => {
          const submitted = a.status === 'SUBMITTED';
          const overLimit = a.maxViolations !== null && a.violations >= a.maxViolations;
          return (
            <li key={a.id} className={`grid grid-cols-1 ${ATTEMPT_GRID} gap-x-4 gap-y-2 px-4 sm:px-5 py-4 items-start`}>
              <div className="min-w-0">
                <Link href={`/proctoring/attempts/${a.id}`} className="font-semibold text-gray-900 hover:text-amber-600 hover:underline break-words focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_#e3eeff] rounded">
                  {a.student}
                </Link>
                <p className="text-sm text-gray-600 break-all">{a.email}</p>
              </div>
              <div className="min-w-0 text-sm">
                <p className="text-gray-900 font-medium break-words">{a.test}</p>
                <p className="text-gray-600 break-words">{a.course}</p>
                <p className="text-gray-600 tabular-nums">{formatDateTime(a.submittedAt ?? a.startedAt)}</p>
              </div>
              <div className="text-sm space-y-1">
                {submitted && a.total !== null ? (
                  <>
                    <p className="font-semibold text-gray-900 tabular-nums">
                      {a.score}/{a.total} <span className="font-normal text-gray-700">({a.percentage}%)</span>
                    </p>
                    <Badge tone={a.passed ? 'good' : 'bad'}>{a.passed ? 'Passed' : 'Not passed'}</Badge>
                  </>
                ) : (
                  <Badge tone="neutral">{submitted ? 'Submitted' : 'In progress'}</Badge>
                )}
              </div>
              <div className="text-sm space-y-1">
                <p className={`tabular-nums ${overLimit ? 'font-semibold text-red-800' : 'text-gray-900'}`}>
                  {a.violations}
                  {a.maxViolations !== null ? ` of ${a.maxViolations}` : ''} violation{a.violations === 1 ? '' : 's'}
                </p>
                <p className="text-gray-700 inline-flex items-center gap-1.5">
                  <Camera className="w-3.5 h-3.5" aria-hidden /> {a.captures} photo{a.captures === 1 ? '' : 's'}
                </p>
                {a.autoSubmitted && (
                  <p>
                    <Badge tone={a.autoReason === 'PROCTORING' ? 'bad' : 'neutral'}>
                      {a.autoReason === 'PROCTORING' && <TriangleAlert className="w-3 h-3" aria-hidden />}
                      {a.autoReason === 'PROCTORING' ? 'Auto-submitted: violations' : 'Auto-submitted: time up'}
                    </Badge>
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <div>
                  <ReviewBadge status={a.reviewStatus} />
                  {a.reviewer && a.reviewStatus !== 'PENDING' && <p className="text-xs text-gray-600 mt-1">by {a.reviewer}</p>}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link href={`/proctoring/attempts/${a.id}`} className="h-9 px-3.5 rounded-lg bg-amber-600 hover:bg-[#0060eb] text-white text-sm font-semibold inline-flex items-center gap-1.5 transition active:scale-[0.98] focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_#e3eeff]">
                    Review <ArrowRight className="w-4 h-4" aria-hidden />
                  </Link>
                  {submitted && <RetakeButton userId={a.userId} testKey={a.testKey} student={a.student} testTitle={a.test} compact alreadyAllowed={waiting.has(`${a.userId}:${a.testKey}`)} />}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/* ---------------------------------------------------------------- Retakes */

function GrantList({ rows, empty }: { rows: GrantRow[]; empty: boolean }) {
  if (rows.length === 0) return <Empty none={empty} title="No retakes allowed yet" text="To let a student take an exam again, open one of their attempts and choose Allow retake." />;
  return (
    <ul className="divide-y divide-gray-200">
      {rows.map((g) => (
        <li key={g.id} className="px-4 sm:px-5 py-4 flex flex-col md:flex-row md:items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-semibold text-gray-900">
              {g.student} <span className="font-normal text-gray-700 break-all">({g.email})</span>
            </p>
            <p className="text-sm text-gray-700">
              {g.test} <span className="text-gray-500">in</span> {g.course}
            </p>
            <p className="text-sm text-gray-600 mt-0.5">
              Allowed by {g.grantedBy} on {formatDateTime(g.createdAt)}
              {g.reason ? `. Reason: ${g.reason}` : ''}
            </p>
          </div>
          <div className="shrink-0 text-sm text-gray-700 md:text-right space-y-1">
            <Badge tone={g.usedAt ? 'neutral' : 'wait'}>{g.usedAt ? 'Used' : 'Not used yet'}</Badge>
            {g.usedAt && <p className="text-xs text-gray-600">{formatDateTime(g.usedAt)}</p>}
          </div>
        </li>
      ))}
    </ul>
  );
}
