'use client';

import React, { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, RotateCcw, ShieldAlert, ShieldCheck, X } from 'lucide-react';
import { ReasonDialog, apiError, primaryBtn, smallBtn } from '@/components/proctoring/ui';

/** Calls the API, refreshes the server data on success, and returns an error message (or null). */
function useApiAction() {
  const router = useRouter();
  return useCallback(
    async (url: string, method: 'POST' | 'PATCH', body: unknown, fallback: string): Promise<string | null> => {
      try {
        const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        if (!res.ok) return await apiError(res, fallback);
        router.refresh();
        return null;
      } catch {
        return 'Could not reach the server. Check your connection and try again.';
      }
    },
    [router],
  );
}

/** Approve or reject one identity check. Reject needs a reason, which the student sees. */
export function VerificationDecision({ id, student, size = 'default' }: { id: string; student: string; size?: 'default' | 'small' }) {
  const call = useApiAction();
  const [rejecting, setRejecting] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const closeReject = useCallback(() => setRejecting(false), []);

  const approve = async () => {
    setBusy(true);
    setError(null);
    const problem = await call(`/api/proctor/verifications/${id}`, 'PATCH', { action: 'APPROVE' }, 'Could not approve this identity check.');
    setBusy(false);
    if (problem) setError(problem);
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={approve} disabled={busy} className={`${primaryBtn} ${size === 'small' ? '!h-9 !px-3.5' : ''}`}>
          <Check className="w-4 h-4" aria-hidden /> {busy ? 'Approving...' : 'Approve'}
        </button>
        <button type="button" onClick={() => setRejecting(true)} disabled={busy} className={`${smallBtn} ${size === 'small' ? '' : '!h-10 !px-5'} !text-red-800 !border-red-300 hover:!bg-red-50`}>
          <X className="w-4 h-4" aria-hidden /> Reject
        </button>
      </div>
      {error && (
        <p role="alert" className="text-sm font-semibold text-red-700">
          {error}
        </p>
      )}
      {rejecting && (
        <ReasonDialog
          title={`Reject identity check for ${student}`}
          tone="danger"
          intro="The student is told the reason and can submit new photos."
          label="Reason"
          placeholder="For example: the ID card is not readable, or the face does not match"
          required
          submitLabel="Reject"
          onClose={closeReject}
          onSubmit={async (reason) => {
            const problem = await call(`/api/proctor/verifications/${id}`, 'PATCH', { action: 'REJECT', reason }, 'Could not reject this identity check.');
            if (!problem) setRejecting(false);
            return problem;
          }}
        />
      )}
    </div>
  );
}

/** Mark an attempt Valid or Suspicious, or put it back to Not reviewed, with an optional note. */
export function AttemptReviewActions({ attemptId, status, note }: { attemptId: string; status: string; note: string | null }) {
  const call = useApiAction();
  const [target, setTarget] = useState<'VALID' | 'SUSPICIOUS' | 'PENDING' | null>(null);
  const close = useCallback(() => setTarget(null), []);

  const copy = {
    VALID: { title: 'Mark this attempt as valid', label: 'Note', submit: 'Mark valid', intro: 'You found nothing in the photos or the timeline that casts doubt on this attempt.' },
    SUSPICIOUS: { title: 'Mark this attempt as suspicious', label: 'What did you see?', submit: 'Mark suspicious', intro: 'Other staff will see this note. The student is not told automatically.' },
    PENDING: { title: 'Put back to not reviewed', label: 'Note', submit: 'Reset review', intro: 'The attempt returns to the review queue.' },
  } as const;

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => setTarget('VALID')} aria-pressed={status === 'VALID'} className={`${smallBtn} !h-10 !px-4 ${status === 'VALID' ? '!bg-emerald-100 !border-emerald-300 !text-emerald-900' : ''}`}>
          <ShieldCheck className="w-4 h-4" aria-hidden /> Mark valid
        </button>
        <button type="button" onClick={() => setTarget('SUSPICIOUS')} aria-pressed={status === 'SUSPICIOUS'} className={`${smallBtn} !h-10 !px-4 ${status === 'SUSPICIOUS' ? '!bg-red-100 !border-red-300 !text-red-900' : ''}`}>
          <ShieldAlert className="w-4 h-4" aria-hidden /> Mark suspicious
        </button>
        {status !== 'PENDING' && (
          <button type="button" onClick={() => setTarget('PENDING')} className={`${smallBtn} !h-10 !px-4`}>
            <RotateCcw className="w-4 h-4" aria-hidden /> Reset
          </button>
        )}
      </div>
      {target && (
        <ReasonDialog
          key={target}
          title={copy[target].title}
          intro={copy[target].intro}
          label={copy[target].label}
          submitLabel={copy[target].submit}
          tone={target === 'SUSPICIOUS' ? 'danger' : 'default'}
          initial={note ?? ''}
          onClose={close}
          onSubmit={async (text) => {
            const problem = await call(`/api/proctor/attempts/${attemptId}/review`, 'PATCH', { status: target, note: text || undefined }, 'Could not save the review.');
            if (!problem) setTarget(null);
            return problem;
          }}
        />
      )}
    </>
  );
}

/** Lets one student take an exam again. Needs the student and the exam, so it works from any attempt row. */
export function RetakeButton({ userId, testKey, student, testTitle, compact, alreadyAllowed }: { userId: string; testKey: string; student: string; testTitle: string; compact?: boolean; alreadyAllowed?: boolean }) {
  const call = useApiAction();
  const [open, setOpen] = useState(false);
  const [granted, setDone] = useState(false);
  const done = granted || Boolean(alreadyAllowed);
  const close = useCallback(() => setOpen(false), []);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} disabled={done} className={`${smallBtn} ${compact ? '' : '!h-10 !px-4'}`}>
        <RotateCcw className="w-4 h-4" aria-hidden /> {done ? 'Retake allowed' : 'Allow retake'}
      </button>
      {open && (
        <ReasonDialog
          title={`Allow ${student} to retake`}
          intro={
            <p>
              {student} will be able to start <strong>{testTitle}</strong> one more time. The grant is used up as soon as the new attempt begins, and the earlier attempt stays on record.
            </p>
          }
          label="Reason"
          placeholder="For example: internet failure during the exam"
          submitLabel="Allow retake"
          onClose={close}
          onSubmit={async (reason) => {
            const problem = await call('/api/proctor/retakes', 'POST', { userId, testKey, reason: reason || undefined }, 'Could not allow a retake.');
            if (!problem) {
              setDone(true);
              setOpen(false);
            }
            return problem;
          }}
        />
      )}
    </>
  );
}
