'use client';

import React, { useCallback, useState } from 'react';
import { Camera, CircleAlert, Flag, ImageOff, Info, Play, Send } from 'lucide-react';
import { formatClock } from '@/lib/mcq';
import { formatDateTime, formatTime } from '@/lib/format';
import { Badge, ImageViewer, SafeImg, VerificationBadge, type ViewerItem } from '@/components/proctoring/ui';
import { VerificationDecision } from '@/components/proctoring/actions';
import type { CaptureItem, LegacySnapshot, TimelineItem } from '@/components/proctoring/types';

export interface IdentityInfo {
  id: string;
  status: string;
  createdAt: string;
  purgedAt: string | null;
  reviewer: string | null;
  reviewedAt: string | null;
  rejectReason: string | null;
}

const offset = (s: number) => `+${formatClock(Math.max(0, s))}`;
const captureUrl = (id: string) => `/api/proctor/media/capture/${id}`;

function FaceBadge({ count }: { count: number | null }) {
  if (count === null || count === undefined) return null;
  return <Badge tone={count === 1 ? 'good' : 'bad'}>{count === 0 ? '0 faces' : count === 1 ? '1 face' : `${count} faces`}</Badge>;
}

function Heading({ title, note }: { title: string; note?: string }) {
  return (
    <div className="space-y-0.5">
      <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
      {note && <p className="text-sm text-gray-600 max-w-prose">{note}</p>}
    </div>
  );
}

/** Photos and timeline of one attempt. One shared full size viewer for every photo. */
export function AttemptEvidence({
  student,
  identity,
  captures,
  legacy,
  timeline,
  startedAt,
  mediaPurgedAt,
  captureEvery,
}: {
  student: string;
  identity: IdentityInfo | null;
  captures: CaptureItem[];
  legacy: LegacySnapshot[];
  timeline: TimelineItem[];
  startedAt: string;
  mediaPurgedAt: string | null;
  captureEvery: number | null;
}) {
  const [viewer, setViewer] = useState<{ items: ViewerItem[]; index: number } | null>(null);
  const closeViewer = useCallback(() => setViewer(null), []);
  const setIndex = useCallback((index: number) => setViewer((v) => (v ? { ...v, index } : v)), []);

  const idItems: ViewerItem[] = identity
    ? [
        { src: `/api/proctor/media/verification/${identity.id}/selfie`, title: `Selfie of ${student}`, caption: `Submitted ${formatDateTime(identity.createdAt)}` },
        { src: `/api/proctor/media/verification/${identity.id}/id`, title: `ID card photo of ${student}`, caption: `Submitted ${formatDateTime(identity.createdAt)}` },
      ]
    : [];

  const capItems: ViewerItem[] = captures.map((c, i) => ({
    src: captureUrl(c.id),
    title: `Camera photo ${i + 1} of ${captures.length}`,
    caption: `${offset(c.offsetSeconds)} after the start, ${formatTime(c.at)}${c.faceCount === null ? '' : `, ${c.faceCount} face${c.faceCount === 1 ? '' : 's'} counted by the browser`}`,
  }));
  // Only photos that still exist can be opened in the viewer.
  const openable = captures.filter((c) => !c.purged).map((c) => ({ id: c.id, item: capItems[captures.indexOf(c)] }));
  const openCapture = (id: string) => setViewer({ items: openable.map((o) => o.item), index: Math.max(0, openable.findIndex((o) => o.id === id)) });
  const legacyItems: ViewerItem[] = legacy.map((s, i) => ({ src: s.img, title: `Snapshot ${i + 1} of ${legacy.length}`, caption: formatTime(s.at) }));

  return (
    <div className="space-y-8">
      {/* Identity */}
      <section aria-labelledby="ev-identity" className="space-y-3">
        <div id="ev-identity">
          <Heading title="Identity" note="Compare the face on the ID card with the selfie, and with the camera photos below." />
        </div>
        {!identity ? (
          <p className="text-sm text-gray-700 bg-white rounded-xl border border-gray-200 px-4 py-3">No identity check is on record for this student and exam.</p>
        ) : (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-gray-700">
              <VerificationBadge status={identity.status} />
              <span>Submitted {formatDateTime(identity.createdAt)}</span>
              {identity.status !== 'PENDING' && identity.reviewer && (
                <span>
                  {identity.status === 'APPROVED' ? 'Approved' : 'Rejected'} by {identity.reviewer}
                  {identity.reviewedAt ? ` on ${formatDateTime(identity.reviewedAt)}` : ''}
                </span>
              )}
              {identity.rejectReason && <span>Reason: {identity.rejectReason}</span>}
            </div>
            {identity.purgedAt ? (
              <p className="text-sm text-gray-700 inline-flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
                <ImageOff className="w-4 h-4 shrink-0" aria-hidden /> Photos deleted after the retention period ({formatDateTime(identity.purgedAt)}).
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <figure className="space-y-1.5">
                  <SafeImg src={idItems[0].src} alt={idItems[0].title} onClick={() => setViewer({ items: idItems, index: 0 })} className="aspect-[4/3] rounded-lg border border-gray-200" />
                  <figcaption className="text-sm font-semibold text-gray-800">Selfie</figcaption>
                </figure>
                <figure className="space-y-1.5">
                  <SafeImg src={idItems[1].src} alt={idItems[1].title} onClick={() => setViewer({ items: idItems, index: 1 })} className="aspect-[4/3] rounded-lg border border-gray-200" />
                  <figcaption className="text-sm font-semibold text-gray-800">ID card photo</figcaption>
                </figure>
              </div>
            )}
            {identity.status === 'PENDING' && !identity.purgedAt && <VerificationDecision id={identity.id} student={student} />}
          </div>
        )}
      </section>

      {/* Camera photos */}
      <section aria-labelledby="ev-captures" className="space-y-3">
        <div id="ev-captures">
          <Heading
            title={`Camera photos (${captures.length + legacy.length})`}
            note={`One still photo at a random moment${captureEvery ? ` in every ${captureEvery >= 60 ? `${Math.round((captureEvery / 60) * 10) / 10} minute${captureEvery === 60 ? '' : 's'}` : `${captureEvery} seconds`}` : ''}. The face count comes from the student's browser and can be wrong, so look at the photo.`}
          />
        </div>
        {mediaPurgedAt && (
          <p className="text-sm text-gray-700 inline-flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
            <ImageOff className="w-4 h-4 shrink-0" aria-hidden /> Photos for this attempt were deleted after the retention period ({formatDateTime(mediaPurgedAt)}).
          </p>
        )}
        {captures.length === 0 && legacy.length === 0 ? (
          <p className="text-sm text-gray-700 bg-white rounded-xl border border-gray-200 px-4 py-3">{mediaPurgedAt ? 'Nothing left to show.' : 'No camera photos were taken during this attempt. Either the test does not use the camera or the camera was blocked.'}</p>
        ) : (
          <>
            {captures.length > 0 && (
              <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                {captures.map((c, i) => (
                  <li key={c.id} className="space-y-1.5">
                    {c.purged ? (
                      <div className="aspect-[4/3] rounded-lg border border-gray-200 bg-gray-50 flex flex-col items-center justify-center gap-1 text-xs text-gray-700 text-center p-2">
                        <ImageOff className="w-5 h-5 text-gray-500" aria-hidden /> Deleted after retention
                      </div>
                    ) : (
                      <SafeImg src={captureUrl(c.id)} alt={capItems[i].title} onClick={() => openCapture(c.id)} className="aspect-[4/3] rounded-lg border border-gray-200" />
                    )}
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-gray-700">
                      <span className="tabular-nums font-semibold">{offset(c.offsetSeconds)}</span>
                      <span className="tabular-nums">{formatTime(c.at)}</span>
                      <FaceBadge count={c.faceCount} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
            {legacy.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-semibold text-gray-800">Snapshots from the earlier proctoring version ({legacy.length})</p>
                <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                  {legacy.map((s, i) => (
                    <li key={i} className="space-y-1.5">
                      <SafeImg src={s.img} alt={legacyItems[i].title} onClick={() => setViewer({ items: legacyItems, index: i })} className="aspect-[4/3] rounded-lg border border-gray-200" />
                      <p className="text-xs text-gray-700 tabular-nums">{formatTime(s.at)}</p>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </section>

      {/* Timeline */}
      <section aria-labelledby="ev-timeline" className="space-y-3">
        <div id="ev-timeline">
          <Heading title="Timeline" note="Everything the server recorded, in order, with the server's own clock. Counted events add to the violation total." />
        </div>
        <ol className="bg-white rounded-2xl border border-gray-200 divide-y divide-gray-100">
          <TimelineRow icon={<Play className="w-4 h-4" aria-hidden />} tone="neutral" offsetText="+00:00" at={startedAt} label="Attempt started" />
          {timeline.map((t) => {
            if (t.kind === 'capture') {
              return (
                <TimelineRow key={t.id} icon={<Camera className="w-4 h-4" aria-hidden />} tone="neutral" offsetText={offset(t.offsetSeconds)} at={t.at} label="Camera photo taken">
                  <div className="flex flex-wrap items-center gap-2">
                    <FaceBadge count={t.faceCount ?? null} />
                    {t.purged ? (
                      <span className="text-xs text-gray-600">Deleted after retention</span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => t.captureId && openCapture(t.captureId)}
                        className="text-sm font-semibold text-amber-600 hover:underline rounded focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_#e3eeff]"
                      >
                        View photo
                      </button>
                    )}
                  </div>
                </TimelineRow>
              );
            }
            const auto = t.type === 'AUTO_SUBMIT';
            return (
              <TimelineRow
                key={t.id}
                icon={auto ? <Send className="w-4 h-4" aria-hidden /> : t.counted ? <Flag className="w-4 h-4" aria-hidden /> : t.type === 'NOTE' ? <Info className="w-4 h-4" aria-hidden /> : <CircleAlert className="w-4 h-4" aria-hidden />}
                tone={auto ? 'bad' : t.counted ? 'bad' : 'neutral'}
                offsetText={offset(t.offsetSeconds)}
                at={t.at}
                label={t.label ?? t.type ?? 'Event'}
                badge={t.counted ? <Badge tone="bad">Counted</Badge> : undefined}
              >
                {t.detail && <p className="text-sm text-gray-700 break-words">{t.detail}</p>}
              </TimelineRow>
            );
          })}
          {timeline.length === 0 && (
            <li className="px-4 py-4 text-sm text-gray-700">Nothing suspicious was recorded for this attempt.</li>
          )}
        </ol>
      </section>

      {viewer && <ImageViewer items={viewer.items} index={viewer.index} onIndex={setIndex} onClose={closeViewer} />}
    </div>
  );
}

function TimelineRow({ icon, tone, offsetText, at, label, badge, children }: { icon: React.ReactNode; tone: 'neutral' | 'bad'; offsetText: string; at: string; label: string; badge?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <li className="grid grid-cols-[4.5rem_minmax(0,1fr)] sm:grid-cols-[6rem_minmax(0,1fr)] gap-3 px-4 py-3 items-start">
      <div className="text-sm tabular-nums">
        <p className="font-semibold text-gray-900">{offsetText}</p>
        <p className="text-xs text-gray-600 hidden sm:block">{formatTime(at)}</p>
      </div>
      <div className="min-w-0 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`inline-flex w-6 h-6 rounded-full items-center justify-center shrink-0 ${tone === 'bad' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-700'}`}>{icon}</span>
          <span className="text-sm font-semibold text-gray-900">{label}</span>
          {badge}
          <span className="text-xs text-gray-600 tabular-nums sm:hidden">{formatTime(at)}</span>
        </div>
        {children}
      </div>
    </li>
  );
}
