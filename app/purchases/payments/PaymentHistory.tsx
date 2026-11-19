'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CheckCircle2, Clock, RefreshCw, Undo2, XCircle } from 'lucide-react';
import { formatPrice } from '@/lib/utils';
import { formatDateTime } from '@/lib/format';

export interface HistoryRow {
  id: string;
  courseTitle: string;
  courseSlug: string;
  status: 'CREATED' | 'PAID' | 'FAILED' | 'REFUNDED';
  amount: number;
  listPrice: number | null;
  discount: number;
  coupon: string | null;
  refunded: number;
  method: string | null;
  methodDetail: string | null;
  failureReason: string | null;
  createdAt: string;
  paidAt: string | null;
  reference: string | null;
  billing: Record<string, string> | null;
  owned: boolean;
  refunds: { id: string; amount: number; status: 'PENDING' | 'PROCESSED' | 'FAILED'; createdAt: string; processedAt: string | null }[];
}

const STATUS = {
  PAID: { label: 'Paid', cls: 'bg-emerald-100 text-emerald-800', icon: CheckCircle2 },
  CREATED: { label: 'Not completed', cls: 'bg-amber-100 text-amber-800', icon: Clock },
  FAILED: { label: 'Failed', cls: 'bg-red-100 text-red-700', icon: XCircle },
  REFUNDED: { label: 'Refunded', cls: 'bg-gray-200 text-gray-800', icon: Undo2 },
} as const;

const REFUND_LABEL = { PROCESSED: 'Refunded', PENDING: 'Refund in progress', FAILED: 'Refund failed' } as const;

export function PaymentHistory({ rows }: { rows: HistoryRow[] }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [msg, setMsg] = useState<Record<string, string>>({});

  const check = async (id: string) => {
    setBusyId(id);
    try {
      const res = await fetch(`/api/payments/${id}`, { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      const text = !res.ok ? 'Could not check right now. Please try again.' : data.result === 'paid' ? 'Good news: this payment went through. You now have access.' : data.result === 'failed' ? 'The bank did not complete this payment. You can try again.' : data.result === 'open' ? 'We have not received this payment. If money was taken from your account, it is usually returned within 5 to 7 working days.' : 'We could not get an update. Please try again in a few minutes.';
      setMsg((m) => ({ ...m, [id]: text }));
      if (res.ok && data.result === 'paid') router.refresh();
    } finally {
      setBusyId(null);
    }
  };

  if (rows.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-10 text-center space-y-1">
        <p className="font-semibold text-gray-900">No payments yet</p>
        <p className="text-sm text-gray-600">When you buy a course, the payment appears here.</p>
        <Link href="/courses" className="inline-block mt-3 text-sm font-semibold text-amber-600 hover:underline">
          Browse courses
        </Link>
      </div>
    );
  }

  return (
    <ul className="space-y-3">
      {rows.map((p) => {
        const st = STATUS[p.status];
        const canRetry = (p.status === 'FAILED' || p.status === 'CREATED') && !p.owned;
        return (
          <li key={p.id} className="bg-white rounded-2xl border border-gray-200 p-5 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-semibold text-gray-900">{p.courseTitle}</p>
                <p className="text-sm text-gray-600">
                  <time dateTime={p.paidAt || p.createdAt}>{formatDateTime(p.paidAt || p.createdAt)}</time>
                  {p.method && p.method !== 'coupon' ? ` · ${p.methodDetail || p.method}` : ''}
                </p>
              </div>
              <div className="flex items-center gap-3 sm:flex-col sm:items-end sm:gap-1">
                <span className="text-xl font-semibold text-gray-900 tabular-nums">{p.amount > 0 ? formatPrice(p.amount) : 'Free'}</span>
                <span className={`inline-flex items-center gap-1 px-2.5 h-6 rounded-md text-xs font-semibold ${st.cls}`}>
                  <st.icon className="w-3.5 h-3.5" aria-hidden /> {st.label}
                </span>
              </div>
            </div>

            {p.coupon && (
              <p className="text-sm text-gray-700">
                Coupon <strong className="text-gray-900 tracking-wide">{p.coupon}</strong> saved you {formatPrice(p.discount)}
                {p.listPrice ? ` on ${formatPrice(p.listPrice)}` : ''}.
              </p>
            )}
            {p.status === 'FAILED' && p.failureReason && <p className="text-sm text-red-700">{p.failureReason}</p>}
            {p.reference && <p className="text-xs text-gray-600">Reference: <span className="font-mono">{p.reference}</span></p>}
            {p.billing && (
              <p className="text-xs text-gray-600">
                Billed to {p.billing.name}, {p.billing.address}, {p.billing.city}, {p.billing.state} {p.billing.pin}, {p.billing.country}
              </p>
            )}

            {p.refunds.length > 0 && (
              <ul className="rounded-lg bg-gray-50 px-3 py-2 space-y-1 text-sm text-gray-800" aria-label="Refunds">
                {p.refunds.map((r) => (
                  <li key={r.id} className="flex justify-between gap-3">
                    <span>
                      {REFUND_LABEL[r.status]} on {formatDateTime(r.processedAt || r.createdAt)}
                    </span>
                    <span className="tabular-nums font-semibold">{formatPrice(r.amount)}</span>
                  </li>
                ))}
                <li className="text-xs text-gray-600">Refunds reach your original payment method in 5 to 7 working days.</li>
              </ul>
            )}

            {(canRetry || p.status === 'CREATED' || p.status === 'FAILED') && (
              <div className="flex flex-wrap items-center gap-2 pt-1">
                {canRetry && (
                  <Link href={`/checkout/${p.courseSlug}`} className="h-10 px-5 rounded-lg bg-amber-600 hover:bg-[#0060eb] text-white font-semibold text-sm inline-flex items-center transition active:scale-[0.98] focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_#e3eeff]">
                    Try the payment again
                  </Link>
                )}
                <button type="button" onClick={() => check(p.id)} disabled={busyId === p.id} className="h-10 px-4 rounded-lg border border-gray-300 text-gray-900 hover:bg-gray-50 font-semibold text-sm inline-flex items-center gap-2 disabled:opacity-60 focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_#e3eeff]">
                  <RefreshCw className={`w-4 h-4 ${busyId === p.id ? 'animate-spin' : ''}`} aria-hidden /> Check payment status
                </button>
              </div>
            )}
            {msg[p.id] && (
              <p role="status" className="text-sm text-gray-800 bg-gray-100 rounded-lg px-3 py-2">
                {msg[p.id]}
              </p>
            )}
          </li>
        );
      })}
    </ul>
  );
}
