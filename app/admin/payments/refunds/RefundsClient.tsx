'use client';

import React, { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { RefundDialog, type RefundTarget } from '@/components/admin/RefundDialog';
import { formatPrice } from '@/lib/utils';
import { formatDateTime } from '@/lib/format';

export interface RefundRow {
  id: string;
  amount: number;
  status: 'PENDING' | 'PROCESSED' | 'FAILED';
  reason: string | null;
  failureReason: string | null;
  createdAt: string;
  processedAt: string | null;
  gatewayRefundId: string | null;
  student: string;
  email: string;
  course: string;
  paymentAmount: number;
}

export interface RefundablePayment {
  id: string;
  student: string;
  email: string;
  course: string;
  amount: number;
  refunded: number;
  paidAt: string | null;
  note: string | null;
}

const field =
  'w-full h-10 px-3 rounded-lg border border-gray-300 bg-white text-sm text-gray-900 placeholder:text-gray-500 focus:outline-none focus:border-amber-600 focus:shadow-[0_0_0_3px_#e3eeff]';

const STATUS = {
  PROCESSED: { label: 'Refunded', cls: 'bg-emerald-100 text-emerald-800' },
  PENDING: { label: 'In progress', cls: 'bg-amber-100 text-amber-800' },
  FAILED: { label: 'Failed', cls: 'bg-red-100 text-red-700' },
} as const;

export function RefundsClient({ history, refundable }: { history: RefundRow[]; refundable: RefundablePayment[] }) {
  const [view, setView] = useState<'history' | 'new'>('history');
  const [query, setQuery] = useState('');
  const [target, setTarget] = useState<RefundTarget | null>(null);

  const q = query.trim().toLowerCase();
  const hist = useMemo(() => history.filter((r) => !q || `${r.student} ${r.email} ${r.course} ${r.reason || ''}`.toLowerCase().includes(q)), [history, q]);
  const pay = useMemo(() => refundable.filter((p) => !q || `${p.student} ${p.email} ${p.course}`.toLowerCase().includes(q)), [refundable, q]);
  const total = history.filter((r) => r.status !== 'FAILED').reduce((s, r) => s + r.amount, 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div role="group" aria-label="Refund view" className="inline-flex rounded-lg border border-gray-300 bg-white p-0.5 self-start">
          {([['history', `Refund history (${history.length})`], ['new', 'Issue a refund']] as const).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setView(id)}
              aria-pressed={view === id}
              className={`h-9 px-4 rounded-md text-sm font-semibold transition focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_#e3eeff] ${view === id ? 'bg-amber-600 text-white' : 'text-gray-800 hover:bg-gray-100'}`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="relative sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-3 text-gray-500" aria-hidden />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search student, email or course" aria-label="Search refunds" className={`${field} pl-9`} />
        </div>
      </div>

      {view === 'history' ? (
        <>
          <p className="text-sm text-gray-700">
            Refunded in total: <strong className="text-gray-900 tabular-nums">{formatPrice(total)}</strong>
          </p>
          {hist.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-200 p-10 text-center">
              <p className="font-semibold text-gray-900">{history.length === 0 ? 'No refunds yet' : 'No refunds match your search'}</p>
              <p className="text-sm text-gray-600 mt-1">{history.length === 0 ? 'Refunds you issue, and any made from the Razorpay dashboard, are listed here.' : 'Try a different search.'}</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-200 overflow-x-auto">
              <table className="w-full text-left text-sm min-w-[56rem]">
                <thead className="text-gray-600 border-b border-gray-200">
                  <tr>
                    <th scope="col" className="px-5 py-3 font-semibold">Date and time</th>
                    <th scope="col" className="px-5 py-3 font-semibold">Student</th>
                    <th scope="col" className="px-5 py-3 font-semibold">Course</th>
                    <th scope="col" className="px-5 py-3 font-semibold text-right">Refunded</th>
                    <th scope="col" className="px-5 py-3 font-semibold">Reason</th>
                    <th scope="col" className="px-5 py-3 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {hist.map((r) => (
                    <tr key={r.id}>
                      <td className="px-5 py-3 whitespace-nowrap text-gray-900 tabular-nums">{formatDateTime(r.createdAt)}</td>
                      <td className="px-5 py-3">
                        <span className="block font-semibold text-gray-900">{r.student}</span>
                        <span className="block text-xs text-gray-600">{r.email}</span>
                      </td>
                      <td className="px-5 py-3 text-gray-900 max-w-[14rem]"><span className="line-clamp-2">{r.course}</span></td>
                      <td className="px-5 py-3 text-right whitespace-nowrap text-gray-900 tabular-nums">
                        <span className="font-semibold">{formatPrice(r.amount)}</span>
                        <span className="block text-xs text-gray-600">of {formatPrice(r.paymentAmount)}{r.amount >= r.paymentAmount ? ' (full)' : ' (partial)'}</span>
                      </td>
                      <td className="px-5 py-3 text-gray-900 max-w-[16rem]">
                        <span className="line-clamp-2">{r.reason || 'Not given'}</span>
                        {r.failureReason && <span className="block text-xs text-red-700">{r.failureReason}</span>}
                      </td>
                      <td className="px-5 py-3">
                        <span className={`inline-flex items-center px-2.5 h-6 rounded-md text-xs font-semibold ${STATUS[r.status].cls}`}>{STATUS[r.status].label}</span>
                        {r.processedAt && <span className="block text-xs text-gray-600 mt-1">{formatDateTime(r.processedAt)}</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      ) : pay.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-10 text-center">
          <p className="font-semibold text-gray-900">{refundable.length === 0 ? 'Nothing to refund' : 'No payments match your search'}</p>
          <p className="text-sm text-gray-600 mt-1">Successful online payments that still have money left to refund appear here.</p>
        </div>
      ) : (
        <ul className="bg-white rounded-2xl border border-gray-200 divide-y divide-gray-100 overflow-hidden">
          {pay.map((p) => (
            <li key={p.id} className="flex flex-col sm:flex-row sm:items-center gap-3 px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-gray-900 truncate">
                  {p.student} <span className="font-normal text-gray-600">· {p.email}</span>
                </p>
                <p className="text-sm text-gray-700 truncate">{p.course}</p>
                <p className="text-xs text-gray-600">
                  {p.paidAt ? formatDateTime(p.paidAt) : ''}
                  {p.refunded > 0 ? ` · ${formatPrice(p.refunded)} already refunded` : ''}
                </p>
                {p.note && <p className="text-xs text-red-700 mt-0.5">{p.note}</p>}
              </div>
              <span className="font-semibold text-gray-900 tabular-nums">{formatPrice(p.amount)}</span>
              <button
                type="button"
                onClick={() => setTarget({ id: p.id, student: p.student, course: p.course, amount: p.amount, refunded: p.refunded })}
                className="h-9 px-4 rounded-lg border border-gray-300 text-gray-900 hover:bg-gray-50 text-sm font-semibold focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_#e3eeff]"
              >
                Refund
              </button>
            </li>
          ))}
        </ul>
      )}

      {target && <RefundDialog target={target} onClose={() => setTarget(null)} />}
    </div>
  );
}
