'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ImageOff, Loader2, X } from 'lucide-react';
import { Dialog, primaryBtn, secondaryBtn } from '@/components/mcq/Dialog';
import type { ReviewStatus, VerificationStatus } from '@/lib/proctor';

export { primaryBtn, secondaryBtn };

export const dangerBtn =
  'h-10 px-5 rounded-lg bg-red-700 hover:bg-red-800 text-white font-semibold text-sm inline-flex items-center justify-center gap-2 transition active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_#fecaca]';
export const smallBtn =
  'h-9 px-3.5 rounded-lg border border-gray-300 bg-white text-gray-800 hover:bg-gray-50 font-semibold text-sm inline-flex items-center justify-center gap-1.5 transition active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_#e3eeff]';
export const textareaCls =
  'w-full px-3.5 py-2.5 rounded-lg border border-gray-300 bg-white text-gray-900 text-sm placeholder:text-gray-500 focus:outline-none focus:border-amber-600 focus:shadow-[0_0_0_3px_#e3eeff] transition';

type Tone = 'good' | 'bad' | 'wait' | 'neutral';
const TONES: Record<Tone, string> = {
  good: 'bg-emerald-100 text-emerald-800',
  bad: 'bg-red-100 text-red-800',
  wait: 'bg-orange-100 text-orange-900',
  neutral: 'bg-gray-100 text-gray-800',
};

export function Badge({ tone, children, className = '' }: { tone: Tone; children: React.ReactNode; className?: string }) {
  return <span className={`inline-flex items-center gap-1 px-2.5 h-6 rounded-md text-xs font-semibold whitespace-nowrap ${TONES[tone]} ${className}`}>{children}</span>;
}

const VERIFICATION: Record<VerificationStatus, { label: string; tone: Tone }> = {
  PENDING: { label: 'Waiting for review', tone: 'wait' },
  APPROVED: { label: 'Approved', tone: 'good' },
  REJECTED: { label: 'Rejected', tone: 'bad' },
};
export function VerificationBadge({ status }: { status: string }) {
  const v = VERIFICATION[status as VerificationStatus] ?? { label: status, tone: 'neutral' as Tone };
  return <Badge tone={v.tone}>{v.label}</Badge>;
}

const REVIEW: Record<ReviewStatus, { label: string; tone: Tone }> = {
  PENDING: { label: 'Not reviewed', tone: 'wait' },
  VALID: { label: 'Valid', tone: 'good' },
  SUSPICIOUS: { label: 'Suspicious', tone: 'bad' },
};
export function ReviewBadge({ status }: { status: string }) {
  const v = REVIEW[status as ReviewStatus] ?? { label: status, tone: 'neutral' as Tone };
  return <Badge tone={v.tone}>{v.label}</Badge>;
}

/** Reads the error text out of a failed API response. */
export async function apiError(res: Response, fallback: string) {
  try {
    const data = await res.json();
    if (data && typeof data.error === 'string') return data.error;
  } catch {}
  return res.status === 403 ? 'You do not have permission to do this.' : fallback;
}

/**
 * An image served by the private media route. Shows a plain placeholder when the photo is missing, deleted after the
 * retention period, or the request is refused, instead of a broken-image icon.
 */
export function SafeImg({ src, alt, className = '', onClick, eager }: { src: string; alt: string; className?: string; onClick?: () => void; eager?: boolean }) {
  const [state, setState] = useState<'loading' | 'ok' | 'error'>('loading');
  const ref = useRef<HTMLImageElement>(null);
  useEffect(() => {
    setState('loading');
    // The image may already be complete (cached) before React attaches onLoad.
    const el = ref.current;
    if (el?.complete) setState(el.naturalWidth > 0 ? 'ok' : 'error');
  }, [src]);

  const img = (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      ref={ref}
      src={src}
      alt={alt}
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
      onLoad={() => setState('ok')}
      onError={() => setState('error')}
      className={`w-full h-full object-contain ${state === 'ok' ? '' : 'invisible'}`}
    />
  );

  return (
    <div className={`relative bg-gray-100 overflow-hidden ${className}`}>
      {state === 'error' ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 p-3 text-center text-xs text-gray-700">
          <ImageOff className="w-5 h-5 text-gray-500" aria-hidden />
          <span>Photo unavailable</span>
        </div>
      ) : (
        <>
          {state === 'loading' && <div className="absolute inset-0 animate-pulse bg-gray-200" aria-hidden />}
          {onClick ? (
            <button type="button" onClick={onClick} aria-label={`Enlarge: ${alt}`} className="block w-full h-full cursor-zoom-in focus-visible:outline-none focus-visible:shadow-[inset_0_0_0_3px_#0056d2]">
              {img}
            </button>
          ) : (
            img
          )}
        </>
      )}
    </div>
  );
}

export interface ViewerItem {
  src: string;
  title: string;
  caption?: string;
}

/** Full size photo viewer: Escape closes, arrow keys move between photos, focus stays inside. */
export function ImageViewer({ items, index, onIndex, onClose }: { items: ViewerItem[]; index: number; onIndex: (i: number) => void; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const item = items[index];

  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    ref.current?.querySelector<HTMLElement>('button')?.focus();
    return () => {
      document.body.style.overflow = overflow;
      prev?.focus?.();
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowLeft' && index > 0) onIndex(index - 1);
      else if (e.key === 'ArrowRight' && index < items.length - 1) onIndex(index + 1);
      else if (e.key === 'Tab') {
        const f = Array.from(ref.current?.querySelectorAll<HTMLElement>('button:not([disabled]), a[href]') || []);
        if (!f.length) return;
        if (e.shiftKey && document.activeElement === f[0]) {
          e.preventDefault();
          f[f.length - 1].focus();
        } else if (!e.shiftKey && document.activeElement === f[f.length - 1]) {
          e.preventDefault();
          f[0].focus();
        }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [index, items.length, onClose, onIndex]);

  if (!item) return null;
  return (
    <div className="fixed inset-0 z-[110] bg-black/85 flex flex-col" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={ref} role="dialog" aria-modal="true" aria-label={item.title} className="flex-1 min-h-0 flex flex-col p-3 sm:p-6 gap-3">
        <div className="flex items-start justify-between gap-3 text-white">
          <div className="min-w-0">
            <p className="font-semibold truncate">{item.title}</p>
            {item.caption && <p className="text-sm text-gray-200">{item.caption}</p>}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {items.length > 1 && (
              <>
                <button type="button" onClick={() => onIndex(index - 1)} disabled={index === 0} className="h-9 px-3 rounded-lg bg-white/10 hover:bg-white/20 text-sm font-semibold disabled:opacity-40 focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_#8fbaf7]">
                  Previous
                </button>
                <span className="text-sm tabular-nums" aria-live="polite">
                  {index + 1} / {items.length}
                </span>
                <button type="button" onClick={() => onIndex(index + 1)} disabled={index === items.length - 1} className="h-9 px-3 rounded-lg bg-white/10 hover:bg-white/20 text-sm font-semibold disabled:opacity-40 focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_#8fbaf7]">
                  Next
                </button>
              </>
            )}
            <button type="button" onClick={onClose} aria-label="Close photo" className="h-9 w-9 inline-flex items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_#8fbaf7]">
              <X className="w-5 h-5" aria-hidden />
            </button>
          </div>
        </div>
        <div className="flex-1 min-h-0 flex items-center justify-center">
          <SafeImg key={item.src} src={item.src} alt={item.title} eager className="max-w-full max-h-full w-full h-full !bg-transparent" />
        </div>
      </div>
    </div>
  );
}

/** Small modal that asks for a reason or note and submits it. The reason is required or optional. */
export function ReasonDialog({
  title,
  intro,
  label,
  placeholder,
  required,
  submitLabel,
  tone = 'default',
  initial = '',
  onSubmit,
  onClose,
}: {
  title: string;
  intro?: React.ReactNode;
  label: string;
  placeholder?: string;
  required?: boolean;
  submitLabel: string;
  tone?: 'default' | 'danger';
  initial?: string;
  /** Resolve to an error message to keep the dialog open, or null when it worked. */
  onSubmit: (reason: string) => Promise<string | null>;
  onClose: () => void;
}) {
  const [reason, setReason] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ref = useRef<HTMLTextAreaElement>(null);
  // Stable identity: the dialog re-runs its focus handling whenever onClose changes.
  const busyRef = useRef(false);
  busyRef.current = busy;
  const close = useCallback(() => {
    if (!busyRef.current) onClose();
  }, [onClose]);

  useEffect(() => {
    ref.current?.focus();
  }, []);

  const submit = async () => {
    if (required && !reason.trim()) {
      setError('Please give a reason.');
      ref.current?.focus();
      return;
    }
    setBusy(true);
    setError(null);
    const problem = await onSubmit(reason.trim());
    setBusy(false);
    if (problem) setError(problem);
  };

  return (
    <Dialog
      title={title}
      tone={tone}
      onClose={close}
      actions={
        <>
          <button type="button" onClick={close} disabled={busy} className={secondaryBtn}>
            Cancel
          </button>
          <button type="button" onClick={submit} disabled={busy} className={tone === 'danger' ? dangerBtn : primaryBtn}>
            {busy && <Loader2 className="w-4 h-4 animate-spin" aria-hidden />} {submitLabel}
          </button>
        </>
      }
    >
      {intro && <div>{intro}</div>}
      <div>
        <label htmlFor="reason-text" className="block text-sm font-semibold text-gray-800 mb-1">
          {label}
          {!required && <span className="font-normal text-gray-600"> (optional)</span>}
        </label>
        <textarea
          id="reason-text"
          ref={ref}
          rows={3}
          maxLength={500}
          value={reason}
          onChange={(e) => {
            setReason(e.target.value);
            if (error) setError(null);
          }}
          placeholder={placeholder}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? 'reason-err' : undefined}
          className={`${textareaCls} ${error ? '!border-red-500' : ''}`}
        />
        {error && (
          <p id="reason-err" role="alert" className="text-sm font-semibold text-red-700 mt-1">
            {error}
          </p>
        )}
      </div>
    </Dialog>
  );
}
