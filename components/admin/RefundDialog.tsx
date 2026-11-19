'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle } from 'lucide-react';
import { Dialog, primaryBtn, secondaryBtn } from '@/components/mcq/Dialog';
import { formatPrice } from '@/lib/utils';

const field =
  'w-full h-10 px-3 rounded-lg border border-gray-300 bg-white text-sm text-gray-900 placeholder:text-gray-500 focus:outline-none focus:border-amber-600 focus:shadow-[0_0_0_3px_#e3eeff] disabled:opacity-60';

export interface RefundTarget {
  id: string;
  student: string;
  course: string;
  /** Rupees paid. */
  amount: number;
  /** Rupees already refunded. */
  refunded: number;
}

/** Full or partial refund for one payment. The gateway does the refund; the server then updates the enrollment. */
export function RefundDialog({ target, onClose }: { target: RefundTarget; onClose: () => void }) {
  const router = useRouter();
  const left = Math.round((target.amount - target.refunded) * 100) / 100;
  const [mode, setMode] = useState<'full' | 'partial'>('full');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const value = mode === 'full' ? left : Number(amount);
  const invalid = !reason.trim() || !Number.isFinite(value) || value <= 0 || value > left;
  const fullyRefunds = Math.abs(value - left) < 0.005;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (invalid) return;
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/admin/refunds', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ paymentId: target.id, amount: value, reason }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'The refund could not be processed.');
      router.refresh();
      onClose();
    } catch (err: any) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <Dialog
      title="Refund payment"
      onClose={() => !busy && onClose()}
      actions={
        <>
          <button type="button" className={secondaryBtn} onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button type="submit" form="refund-form" className={primaryBtn} disabled={busy || invalid}>
            {busy ? 'Refunding...' : `Refund ${Number.isFinite(value) && value > 0 ? formatPrice(value) : ''}`.trim()}
          </button>
        </>
      }
    >
      <p>
        {target.student} paid <strong className="text-gray-900">{formatPrice(target.amount)}</strong> for {target.course}.
        {target.refunded > 0 && <> {formatPrice(target.refunded)} has already been refunded.</>}
      </p>
      <form id="refund-form" onSubmit={submit} className="space-y-3">
        <fieldset className="grid grid-cols-2 gap-2" disabled={busy}>
          <legend className="sr-only">Refund type</legend>
          {(['full', 'partial'] as const).map((m) => (
            <label key={m} className={`h-10 rounded-lg border text-sm font-semibold inline-flex items-center justify-center cursor-pointer transition has-[:focus-visible]:shadow-[0_0_0_3px_#e3eeff] ${mode === m ? 'border-amber-600 bg-amber-50 text-amber-800' : 'border-gray-300 text-gray-800 hover:bg-gray-50'}`}>
              <input type="radio" name="refund-mode" className="sr-only" checked={mode === m} onChange={() => setMode(m)} />
              {m === 'full' ? `Full (${formatPrice(left)})` : 'Partial'}
            </label>
          ))}
        </fieldset>
        {mode === 'partial' && (
          <label className="block">
            <span className="text-sm font-semibold text-gray-900">Amount in rupees (up to {formatPrice(left)})</span>
            <input type="number" inputMode="decimal" min="1" max={left} step="0.01" autoFocus value={amount} onChange={(e) => setAmount(e.target.value)} className={`${field} mt-1 tabular-nums`} disabled={busy} />
          </label>
        )}
        <label className="block">
          <span className="text-sm font-semibold text-gray-900">Reason</span>
          <input required maxLength={200} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="For example: duplicate payment" className={`${field} mt-1`} disabled={busy} />
        </label>
        <p className="text-xs text-gray-600">
          {fullyRefunds ? 'This refunds the whole payment and removes the student\'s access to the course.' : 'The student keeps access to the course after a partial refund.'} The money returns to their original payment method, usually within 5 to 7 working days.
        </p>
        {error && (
          <p role="alert" className="text-sm text-red-700 flex items-start gap-1.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden /> {error}
          </p>
        )}
      </form>
    </Dialog>
  );
}
