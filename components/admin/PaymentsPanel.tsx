'use client';

import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, ChevronRight, Clock, CreditCard, Landmark, RefreshCw, Smartphone, Undo2, Wallet, XCircle, HelpCircle } from 'lucide-react';
import { formatPrice } from '@/lib/utils';
import { formatDate, formatDateTime, formatTime, istDay } from '@/lib/format';
import { Dialog, secondaryBtn } from '@/components/mcq/Dialog';
import { Chips, DateRange, FilterBar, Select } from '@/components/admin/FilterBar';
import { RefundDialog } from '@/components/admin/RefundDialog';
import { PaymentsSubNav } from '@/components/admin/PaymentsSubNav';

export interface PaymentRow {
  id: string;
  /** "online" rows come from a checkout; "legacy" rows are enrollments recorded before online payments existed. */
  source: 'online' | 'legacy';
  status: 'PAID' | 'FAILED' | 'PENDING' | 'REFUNDED';
  student: { id: string; name: string; email: string };
  course: { id: string; title: string };
  amount: number; // rupees actually charged, after any coupon
  listPrice: number | null; // rupees before the coupon
  discount: number; // rupees
  coupon: string | null;
  refunded: number; // rupees refunded so far
  note: string | null;
  billing: Record<string, string> | null;
  currency: string;
  gateway: string;
  method: string | null;
  methodDetail: string | null;
  fee: number | null; // rupees
  orderId: string | null;
  paymentId: string | null;
  failureReason: string | null;
  initiatedAt: string; // ISO
  paidAt: string | null; // ISO
  updatedAt: string; // ISO
}

type StatusFilter = 'ALL' | PaymentRow['status'];
type Sort = 'new' | 'old' | 'high' | 'low';

const STATUS = {
  PAID: { label: 'Paid', cls: 'bg-emerald-100 text-emerald-800', icon: CheckCircle2 },
  FAILED: { label: 'Failed', cls: 'bg-red-100 text-red-700', icon: XCircle },
  PENDING: { label: 'Pending', cls: 'bg-amber-100 text-amber-800', icon: Clock },
  REFUNDED: { label: 'Refunded', cls: 'bg-gray-200 text-gray-800', icon: Undo2 },
} as const;

const METHODS: Record<string, { label: string; icon: typeof CreditCard }> = {
  upi: { label: 'UPI', icon: Smartphone },
  card: { label: 'Card', icon: CreditCard },
  netbanking: { label: 'Netbanking', icon: Landmark },
  wallet: { label: 'Wallet', icon: Wallet },
  emi: { label: 'EMI', icon: CreditCard },
  recorded: { label: 'Recorded manually', icon: HelpCircle },
  coupon: { label: '100% coupon', icon: HelpCircle },
};
const methodInfo = (m: string | null) => (m ? METHODS[m] || { label: m.charAt(0).toUpperCase() + m.slice(1), icon: CreditCard } : { label: 'Not reported', icon: HelpCircle });

const eventTime = (p: PaymentRow) => new Date(p.paidAt || p.initiatedAt).getTime();
const PAGE = 25;

function Row({ k, v, mono }: { k: string; v: React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex flex-col sm:flex-row sm:justify-between gap-0.5 sm:gap-4 py-2 border-b border-gray-100 last:border-0">
      <dt className="text-gray-600 shrink-0">{k}</dt>
      <dd className={`text-gray-900 sm:text-right break-all ${mono ? 'font-mono text-xs sm:text-sm' : ''}`}>{v || <span className="text-gray-500">Not available</span>}</dd>
    </div>
  );
}

export function PaymentsPanel({ payments }: { payments: PaymentRow[] }) {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<StatusFilter>('ALL');
  const [method, setMethod] = useState('ALL');
  const [course, setCourse] = useState('ALL');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [sort, setSort] = useState<Sort>('new');
  const [limit, setLimit] = useState(PAGE);
  const [open, setOpen] = useState<PaymentRow | null>(null);
  const [refunding, setRefunding] = useState<PaymentRow | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState('');
  const router = useRouter();

  const syncWithGateway = async (p: PaymentRow) => {
    setSyncing(true);
    setSyncMsg('');
    try {
      const res = await fetch(`/api/admin/payments/${p.id}/sync`, { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      setSyncMsg(!res.ok ? 'Could not reach the gateway.' : data.result === 'paid' ? 'The gateway reports this payment as paid. The student is now enrolled.' : data.result === 'failed' ? 'The gateway reports this payment as failed.' : data.result === 'open' ? 'The gateway has no completed payment for this order yet.' : 'The gateway could not tell us more.');
      if (res.ok && data.result === 'paid') {
        setOpen(null);
        router.refresh();
      }
    } finally {
      setSyncing(false);
    }
  };

  const courses = useMemo(() => Array.from(new Map(payments.map((p) => [p.course.id, p.course.title])).entries()).sort((a, b) => a[1].localeCompare(b[1])), [payments]);
  const methods = useMemo(() => Array.from(new Set(payments.map((p) => p.method || 'none'))), [payments]);

  const counts = useMemo(() => ({ ALL: payments.length, PAID: payments.filter((p) => p.status === 'PAID').length, FAILED: payments.filter((p) => p.status === 'FAILED').length, PENDING: payments.filter((p) => p.status === 'PENDING').length, REFUNDED: payments.filter((p) => p.status === 'REFUNDED').length }), [payments]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = payments.filter((p) => {
      if (status !== 'ALL' && p.status !== status) return false;
      if (method !== 'ALL' && (p.method || 'none') !== method) return false;
      if (course !== 'ALL' && p.course.id !== course) return false;
      const day = istDay(p.paidAt || p.initiatedAt);
      if (from && day < from) return false;
      if (to && day > to) return false;
      if (!q) return true;
      return [p.student.name, p.student.email, p.course.title, p.paymentId, p.orderId, p.methodDetail, p.method, p.id].some((f) => f?.toLowerCase().includes(q));
    });
    const cmp: Record<Sort, (a: PaymentRow, b: PaymentRow) => number> = {
      new: (a, b) => eventTime(b) - eventTime(a),
      old: (a, b) => eventTime(a) - eventTime(b),
      high: (a, b) => b.amount - a.amount || eventTime(b) - eventTime(a),
      low: (a, b) => a.amount - b.amount || eventTime(b) - eventTime(a),
    };
    return [...list].sort(cmp[sort]);
  }, [payments, query, status, method, course, from, to, sort]);

  const collected = filtered.filter((p) => p.status === 'PAID' || p.status === 'REFUNDED').reduce((s, p) => s + p.amount - p.refunded, 0);
  const latest = useMemo(() => [...payments].filter((p) => p.status === 'PAID' || p.status === 'REFUNDED').sort((a, b) => eventTime(b) - eventTime(a))[0], [payments]);
  const active = Boolean(query || status !== 'ALL' || method !== 'ALL' || course !== 'ALL' || from || to || sort !== 'new');
  const clear = () => {
    setQuery('');
    setStatus('ALL');
    setMethod('ALL');
    setCourse('ALL');
    setFrom('');
    setTo('');
    setSort('new');
    setLimit(PAGE);
  };
  const reset = <T,>(set: (v: T) => void) => (v: T) => {
    set(v);
    setLimit(PAGE);
  };

  return (
    <section className="space-y-4" aria-label="Payments">
      <PaymentsSubNav active="transactions" />
      {latest && (
        <button
          type="button"
          onClick={() => setOpen(latest)}
          className="w-full text-left rounded-2xl p-5 sm:p-6 bg-[#5b3df5] text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition hover:brightness-110 focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_#e3eeff]"
        >
          <div className="min-w-0">
            <h2 className="text-xl font-semibold">Latest payment</h2>
            <p className="mt-1 text-white/90 truncate">
              {latest.student.name} bought {latest.course.title}
            </p>
            <p className="text-sm text-white/90 mt-0.5">
              {formatDateTime(latest.paidAt || latest.initiatedAt)} · {methodInfo(latest.method).label}
              {latest.methodDetail ? `, ${latest.methodDetail}` : ''}
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <span className="text-3xl font-semibold tabular-nums">{formatPrice(latest.amount)}</span>
            <ChevronRight className="w-5 h-5" aria-hidden />
          </div>
        </button>
      )}

      <div className="bg-white rounded-2xl border border-gray-200">
        <FilterBar query={query} onQuery={reset(setQuery)} placeholder="Search student, email, course, payment ID or order ID" shown={filtered.length} total={payments.length} noun="payments" active={active} onClear={clear}>
          <Select label="Course" value={course} onChange={reset(setCourse)} options={[{ value: 'ALL', label: 'All courses' }, ...courses.map(([id, title]) => ({ value: id, label: title }))]} />
          <Select
            label="Payment method"
            value={method}
            onChange={reset(setMethod)}
            options={[{ value: 'ALL', label: 'All methods' }, ...methods.map((m) => ({ value: m, label: m === 'none' ? 'Not reported' : methodInfo(m).label }))]}
          />
          <Select
            label="Sort payments"
            value={sort}
            onChange={(v) => setSort(v as Sort)}
            options={[
              { value: 'new', label: 'Newest first' },
              { value: 'old', label: 'Oldest first' },
              { value: 'high', label: 'Highest amount' },
              { value: 'low', label: 'Lowest amount' },
            ]}
          />
        </FilterBar>

        <div className="px-4 sm:px-5 py-3 flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-gray-200">
          <Chips<StatusFilter>
            label="Filter by status"
            value={status}
            onChange={reset(setStatus)}
            options={[
              { value: 'ALL', label: 'All', count: counts.ALL },
              { value: 'PAID', label: 'Paid', count: counts.PAID },
              { value: 'FAILED', label: 'Failed', count: counts.FAILED },
              { value: 'PENDING', label: 'Pending', count: counts.PENDING },
              { value: 'REFUNDED', label: 'Refunded', count: counts.REFUNDED },
            ]}
          />
          <DateRange from={from} to={to} onFrom={reset(setFrom)} onTo={reset(setTo)} />
        </div>

        <p className="px-4 sm:px-5 py-3 text-sm text-gray-700 border-b border-gray-200">
          Net collected in this view: <strong className="text-gray-900 tabular-nums">{formatPrice(collected)}</strong>
        </p>

        {filtered.length === 0 ? (
          <div className="p-10 text-center space-y-1">
            <p className="font-semibold text-gray-900">{payments.length === 0 ? 'No payments yet' : 'No payments match these filters'}</p>
            <p className="text-sm text-gray-600">{payments.length === 0 ? 'Payments appear here as soon as a student starts checkout.' : 'Try a different search or clear the filters.'}</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm min-w-[56rem]">
                <thead className="text-gray-600 border-b border-gray-200">
                  <tr>
                    <th scope="col" className="px-5 py-3 font-semibold">Date and time</th>
                    <th scope="col" className="px-5 py-3 font-semibold">Student</th>
                    <th scope="col" className="px-5 py-3 font-semibold">Course</th>
                    <th scope="col" className="px-5 py-3 font-semibold">Method</th>
                    <th scope="col" className="px-5 py-3 font-semibold text-right">Amount</th>
                    <th scope="col" className="px-5 py-3 font-semibold">Status</th>
                    <th scope="col" className="px-5 py-3"><span className="sr-only">Details</span></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtered.slice(0, limit).map((p) => {
                    const st = STATUS[p.status];
                    const m = methodInfo(p.method);
                    const when = p.paidAt || p.initiatedAt;
                    return (
                      <tr key={p.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => setOpen(p)}>
                        <td className="px-5 py-3 whitespace-nowrap">
                          <time dateTime={when} className="block text-gray-900 tabular-nums">{formatDate(when)}</time>
                          <span className="block text-xs text-gray-600 tabular-nums">{formatTime(when)}</span>
                        </td>
                        <td className="px-5 py-3">
                          <span className="block font-semibold text-gray-900">{p.student.name}</span>
                          <span className="block text-xs text-gray-600">{p.student.email}</span>
                        </td>
                        <td className="px-5 py-3 text-gray-900 max-w-[16rem]">
                          <span className="line-clamp-2">{p.course.title}</span>
                        </td>
                        <td className="px-5 py-3 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1.5 text-gray-900">
                            <m.icon className="w-4 h-4 text-gray-600" aria-hidden /> {m.label}
                          </span>
                          {p.methodDetail && <span className="block text-xs text-gray-600">{p.methodDetail}</span>}
                        </td>
                        <td className="px-5 py-3 text-right font-semibold text-gray-900 tabular-nums whitespace-nowrap">
                          {p.amount > 0 ? formatPrice(p.amount) : 'Free'}
                          {p.refunded > 0 && p.status === 'PAID' && <span className="block text-xs font-normal text-gray-600">{formatPrice(p.refunded)} refunded</span>}
                        </td>
                        <td className="px-5 py-3">
                          <span className={`inline-flex items-center gap-1 px-2.5 h-6 rounded-md text-xs font-semibold ${st.cls}`}>
                            <st.icon className="w-3.5 h-3.5" aria-hidden /> {st.label}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-right">
                          <button type="button" onClick={(e) => { e.stopPropagation(); setOpen(p); }} className="font-semibold text-amber-600 hover:underline focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_#e3eeff] rounded" aria-label={`View details for ${p.student.name}, ${p.course.title}`}>
                            Details
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {filtered.length > limit && (
              <div className="p-4 text-center border-t border-gray-100">
                <button type="button" onClick={() => setLimit((l) => l + PAGE)} className={secondaryBtn}>
                  Show {Math.min(PAGE, filtered.length - limit)} more
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {open && (
        <Dialog
          title="Payment details"
          onClose={() => setOpen(null)}
          actions={
            <>
              {open.source === 'online' && open.status !== 'PAID' && open.status !== 'REFUNDED' && open.gateway !== 'coupon' && (
                <button type="button" className={secondaryBtn} onClick={() => syncWithGateway(open)} disabled={syncing}>
                  <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} aria-hidden /> Check with gateway
                </button>
              )}
              {open.source === 'online' && open.status === 'PAID' && open.amount - open.refunded > 0 && (
                <button type="button" className={secondaryBtn} onClick={() => { setRefunding(open); setOpen(null); }}>
                  <Undo2 className="w-4 h-4" aria-hidden /> Refund
                </button>
              )}
              <button type="button" className={secondaryBtn} onClick={() => setOpen(null)}>
                Close
              </button>
            </>
          }
        >
          <div className="flex items-center justify-between gap-3 pb-2">
            <span className="text-3xl font-semibold text-gray-900 tabular-nums">{open.amount > 0 ? formatPrice(open.amount) : 'Free'}</span>
            <span className={`inline-flex items-center gap-1 px-2.5 h-7 rounded-md text-sm font-semibold ${STATUS[open.status].cls}`}>{STATUS[open.status].label}</span>
          </div>
          <dl className="text-sm">
            <Row k="Student" v={`${open.student.name} (${open.student.email})`} />
            <Row k="Course" v={open.course.title} />
            {open.coupon && <Row k="Coupon" v={`${open.coupon} (took off ${formatPrice(open.discount)} from ${formatPrice(open.listPrice ?? open.amount + open.discount)})`} />}
            <Row k="Method" v={methodInfo(open.method).label} />
            <Row k="Method details" v={open.methodDetail} />
            <Row k="Initiated" v={formatDateTime(open.initiatedAt)} />
            <Row k="Paid" v={open.paidAt ? formatDateTime(open.paidAt) : open.status === 'PAID' ? null : 'Not paid'} />
            <Row k="Last updated" v={formatDateTime(open.updatedAt)} />
            <Row k="Gateway" v={open.source === 'legacy' ? 'Recorded before online payments' : open.gateway} />
            <Row k="Gateway fee" v={open.fee !== null ? formatPrice(open.fee) : null} />
            {open.status === 'PAID' && open.fee !== null && <Row k="You receive" v={formatPrice(open.amount - open.fee)} />}
            <Row k="Payment ID" v={open.paymentId} mono />
            <Row k="Order ID" v={open.orderId} mono />
            <Row k="Reference" v={open.id} mono />
            {open.failureReason && <Row k="Reason" v={open.failureReason} />}
            {open.refunded > 0 && <Row k="Refunded" v={formatPrice(open.refunded)} />}
            {open.note && <Row k="Note" v={open.note} />}
            {open.billing && (
              <Row k="Billing address" v={`${open.billing.name}, ${open.billing.address}, ${open.billing.city}, ${open.billing.state} ${open.billing.pin}, ${open.billing.country}. ${open.billing.phone}, ${open.billing.email}`} />
            )}
          </dl>
          {syncMsg && <p role="status" className="text-sm text-gray-800 bg-gray-100 rounded-lg px-3 py-2">{syncMsg}</p>}
        </Dialog>
      )}

      {refunding && <RefundDialog target={{ id: refunding.id, student: refunding.student.name, course: refunding.course.title, amount: refunding.amount, refunded: refunding.refunded }} onClose={() => setRefunding(null)} />}
    </section>
  );
}
