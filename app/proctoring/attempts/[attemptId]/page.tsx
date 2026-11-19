import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, TriangleAlert } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { canReviewCourse } from '@/lib/proctor-access';
import { EVENT_LABELS, type ProctorEventType } from '@/lib/proctor';
import { formatClock } from '@/lib/mcq';
import { formatDateTime } from '@/lib/format';
import { Navbar } from '@/components/Navbar';
import { MobileBottomNav } from '@/components/MobileBottomNav';
import { AttemptEvidence } from '@/components/proctoring/AttemptEvidence';
import { AttemptReviewActions, RetakeButton } from '@/components/proctoring/actions';
import { Badge, ReviewBadge } from '@/components/proctoring/ui';
import type { CaptureItem, LegacySnapshot, TimelineItem } from '@/components/proctoring/types';
import { requireReviewer } from '../../data';

export const metadata = { title: 'Review attempt | CIM India' };
export const dynamic = 'force-dynamic';

function legacySnapshots(raw: string): LegacySnapshot[] {
  try {
    const arr = JSON.parse(raw || '[]');
    if (!Array.isArray(arr)) return [];
    return arr.filter((s) => s && typeof s.img === 'string' && s.img.startsWith('data:image/') && typeof s.t === 'string').map((s) => ({ at: s.t, img: s.img }));
  } catch {
    return [];
  }
}

export default async function AttemptReviewPage({ params }: { params: Promise<{ attemptId: string }> }) {
  const user = await requireReviewer();
  const { attemptId } = await params;

  const attempt = await prisma.mcqAttempt.findUnique({
    where: { id: attemptId },
    include: {
      user: { select: { id: true, name: true, email: true } },
      events: { orderBy: { at: 'asc' } },
      captures: { orderBy: { takenAt: 'asc' } },
    },
  });
  // An instructor of another course gets the same answer as for an attempt that does not exist.
  if (!attempt || !(await canReviewCourse(user, attempt.courseId))) notFound();

  const verificationPromise = attempt.verificationId
    ? prisma.examVerification.findUnique({ where: { id: attempt.verificationId } })
    : prisma.examVerification
        .findFirst({ where: { userId: attempt.userId, testKey: attempt.testKey, status: 'APPROVED' }, orderBy: { createdAt: 'desc' } })
        .then((v) => v ?? prisma.examVerification.findFirst({ where: { userId: attempt.userId, testKey: attempt.testKey }, orderBy: { createdAt: 'desc' } }));

  const [verification, test, course, others, grants] = await Promise.all([
    verificationPromise,
    prisma.mcqTest.findUnique({ where: { id: attempt.testKey }, select: { maxViolations: true, captureEverySeconds: true, requireIdCheck: true, title: true } }),
    prisma.course.findUnique({ where: { id: attempt.courseId }, select: { title: true } }),
    prisma.mcqAttempt.findMany({
      where: { userId: attempt.userId, testKey: attempt.testKey, id: { not: attempt.id } },
      orderBy: { startedAt: 'desc' },
      take: 10,
      select: { id: true, startedAt: true, status: true, score: true, total: true, percentage: true },
    }),
    prisma.examRetakeGrant.findMany({ where: { userId: attempt.userId, testKey: attempt.testKey }, orderBy: { createdAt: 'desc' }, take: 10 }),
  ]);

  const staffIds = [attempt.reviewedById, verification?.reviewedById, ...grants.map((g) => g.grantedById)].filter((x): x is string => !!x);
  const staff = staffIds.length ? await prisma.user.findMany({ where: { id: { in: staffIds } }, select: { id: true, name: true } }) : [];
  const nameOf = (id: string | null | undefined) => (id ? staff.find((s) => s.id === id)?.name ?? 'Staff' : null);

  const start = attempt.startedAt.getTime();
  const sec = (d: Date) => Math.max(0, Math.round((d.getTime() - start) / 1000));

  const captures: CaptureItem[] = attempt.captures.map((c) => ({ id: c.id, at: c.takenAt.toISOString(), offsetSeconds: sec(c.takenAt), faceCount: c.faceCount, purged: Boolean(c.purgedAt || !c.key) }));
  const timeline: TimelineItem[] = [
    ...attempt.events.map(
      (e): TimelineItem => ({ id: `e-${e.id}`, kind: 'event', at: e.at.toISOString(), offsetSeconds: sec(e.at), type: e.type, label: EVENT_LABELS[e.type as ProctorEventType] ?? e.type, counted: e.counted, detail: e.detail }),
    ),
    ...attempt.captures.map((c): TimelineItem => ({ id: `c-${c.id}`, kind: 'capture', at: c.takenAt.toISOString(), offsetSeconds: sec(c.takenAt), captureId: c.id, faceCount: c.faceCount, purged: Boolean(c.purgedAt || !c.key) })),
  ].sort((a, b) => a.at.localeCompare(b.at));

  const submitted = attempt.status === 'SUBMITTED';
  const used = attempt.submittedAt ? Math.round((attempt.submittedAt.getTime() - start) / 1000) : null;
  const limit = test?.maxViolations ?? null;
  const counted = attempt.events.filter((e) => e.counted).length;
  const examTitle = test?.title ?? attempt.testTitle;

  const how = !submitted ? 'Still in progress' : attempt.autoReason === 'PROCTORING' ? 'Auto-submitted: violation limit reached' : attempt.autoReason === 'TIME_UP' || attempt.autoSubmitted ? 'Auto-submitted: time ran out' : 'Submitted by the student';

  const facts: { label: string; value: React.ReactNode }[] = [
    {
      label: 'Score',
      value: submitted && attempt.total !== null ? (
        <>
          <span className="tabular-nums">
            {attempt.score}/{attempt.total} ({attempt.percentage}%)
          </span>{' '}
          <Badge tone={attempt.passed ? 'good' : 'bad'}>{attempt.passed ? 'Passed' : 'Not passed'}</Badge>
        </>
      ) : (
        'Not graded yet'
      ),
    },
    { label: 'Violations counted', value: <span className={`tabular-nums ${limit !== null && attempt.violations >= limit ? 'text-red-800' : ''}`}>{limit !== null ? `${attempt.violations} of ${limit} allowed` : attempt.violations}</span> },
    { label: 'How it ended', value: how },
    { label: 'Time used', value: used !== null ? <span className="tabular-nums">{formatClock(used)} of {attempt.timeLimit} min</span> : `${attempt.timeLimit} min allowed` },
    { label: 'Started', value: <span className="tabular-nums">{formatDateTime(attempt.startedAt)}</span> },
    { label: 'Submitted', value: attempt.submittedAt ? <span className="tabular-nums">{formatDateTime(attempt.submittedAt)}</span> : 'Not yet' },
    { label: 'Consent accepted', value: attempt.consentAt ? <span className="tabular-nums">{formatDateTime(attempt.consentAt)}</span> : 'Not recorded' },
    {
      label: 'Session',
      value: attempt.sessionDevice || attempt.sessionLastSeenAt ? (
        <>
          {attempt.sessionDevice ? <span className="break-words">{attempt.sessionDevice}</span> : 'Unknown device'}
          {attempt.sessionLastSeenAt && <span className="block text-xs font-normal text-gray-600 tabular-nums">Last active {formatDateTime(attempt.sessionLastSeenAt)}</span>}
        </>
      ) : (
        'Not recorded'
      ),
    },
  ];

  return (
    <>
      <Navbar />
      <main className="flex-1 pb-24 lg:pb-12 bg-gray-50 min-h-screen">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
          <Link href={`/proctoring?tab=attempts&course=${attempt.courseId}`} className="inline-flex items-center gap-1.5 text-sm font-semibold text-amber-600 hover:underline rounded focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_#e3eeff]">
            <ArrowLeft className="w-4 h-4" aria-hidden /> Back to proctoring
          </Link>

          <header className="space-y-1">
            <h1 className="text-3xl font-semibold text-gray-900 break-words">{attempt.user.name}</h1>
            <p className="text-gray-700 break-all">{attempt.user.email}</p>
            <p className="text-gray-700">
              {examTitle} <span className="text-gray-500">in</span> {course?.title ?? 'a course'}
            </p>
          </header>

          {attempt.autoReason === 'PROCTORING' && (
            <p role="status" className="flex items-start gap-2 text-sm text-red-900 bg-red-50 border border-red-200 rounded-lg px-3 py-2.5">
              <TriangleAlert className="w-4 h-4 shrink-0 mt-0.5" aria-hidden /> This attempt was submitted automatically because the student reached the violation limit.
            </p>
          )}

          <section aria-labelledby="decision" className="bg-white rounded-2xl border border-gray-200 p-4 sm:p-6 space-y-5">
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
              <div className="space-y-1.5 min-w-0">
                <h2 id="decision" className="text-lg font-semibold text-gray-900">
                  Your decision
                </h2>
                <div className="flex flex-wrap items-center gap-2">
                  <ReviewBadge status={attempt.reviewStatus} />
                  {attempt.reviewStatus !== 'PENDING' && (
                    <span className="text-sm text-gray-700">
                      by {nameOf(attempt.reviewedById) ?? 'staff'}
                      {attempt.reviewedAt ? ` on ${formatDateTime(attempt.reviewedAt)}` : ''}
                    </span>
                  )}
                </div>
                {attempt.reviewNote && <p className="text-sm text-gray-800 max-w-prose break-words">Note: {attempt.reviewNote}</p>}
              </div>
              <div className="flex flex-col gap-2 md:items-end">
                <AttemptReviewActions attemptId={attempt.id} status={attempt.reviewStatus} note={attempt.reviewNote} />
                {submitted && <RetakeButton userId={attempt.userId} testKey={attempt.testKey} student={attempt.user.name} testTitle={examTitle} alreadyAllowed={grants.some((g) => !g.usedAt)} />}
              </div>
            </div>

            <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-4 border-t border-gray-100 pt-5">
              {facts.map((f) => (
                <div key={f.label} className="min-w-0">
                  <dt className="text-xs font-semibold text-gray-600">{f.label}</dt>
                  <dd className="text-sm font-semibold text-gray-900 mt-0.5">{f.value}</dd>
                </div>
              ))}
            </dl>
            {counted !== attempt.violations && (
              <p className="text-xs text-gray-600">The timeline marks {counted} counted event{counted === 1 ? '' : 's'}; the attempt total is {attempt.violations}.</p>
            )}
          </section>

          <AttemptEvidence
            student={attempt.user.name}
            identity={
              verification
                ? {
                    id: verification.id,
                    status: verification.status,
                    createdAt: verification.createdAt.toISOString(),
                    purgedAt: verification.purgedAt ? verification.purgedAt.toISOString() : null,
                    reviewer: nameOf(verification.reviewedById),
                    reviewedAt: verification.reviewedAt ? verification.reviewedAt.toISOString() : null,
                    rejectReason: verification.rejectReason,
                  }
                : null
            }
            captures={captures}
            legacy={legacySnapshots(attempt.snapshots)}
            timeline={timeline}
            startedAt={attempt.startedAt.toISOString()}
            mediaPurgedAt={attempt.mediaPurgedAt ? attempt.mediaPurgedAt.toISOString() : null}
            captureEvery={test?.captureEverySeconds ?? null}
          />

          {(others.length > 0 || grants.length > 0) && (
            <section aria-labelledby="history" className="space-y-3">
              <h2 id="history" className="text-lg font-semibold text-gray-900">
                This student on this exam
              </h2>
              <ul className="bg-white rounded-2xl border border-gray-200 divide-y divide-gray-100 text-sm">
                {others.map((o) => (
                  <li key={o.id} className="px-4 py-3 flex flex-wrap items-center justify-between gap-2">
                    <span className="text-gray-800 tabular-nums">
                      Other attempt, {formatDateTime(o.startedAt)}
                      {o.status === 'SUBMITTED' && o.total !== null ? `: ${o.score}/${o.total} (${o.percentage}%)` : ': in progress'}
                    </span>
                    <Link href={`/proctoring/attempts/${o.id}`} className="font-semibold text-amber-600 hover:underline rounded focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_#e3eeff]">
                      Open
                    </Link>
                  </li>
                ))}
                {grants.map((g) => (
                  <li key={g.id} className="px-4 py-3 flex flex-wrap items-center justify-between gap-2">
                    <span className="text-gray-800">
                      Retake allowed by {nameOf(g.grantedById)} on {formatDateTime(g.createdAt)}
                      {g.reason ? `. Reason: ${g.reason}` : ''}
                    </span>
                    <Badge tone={g.usedAt ? 'neutral' : 'wait'}>{g.usedAt ? 'Used' : 'Not used yet'}</Badge>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </main>
      <MobileBottomNav role={user.role} isLoggedIn />
    </>
  );
}
