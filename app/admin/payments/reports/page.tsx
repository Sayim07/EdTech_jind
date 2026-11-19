import React from 'react';
import { redirect } from 'next/navigation';
import { Download } from 'lucide-react';
import { getSessionUser } from '@/lib/auth';
import { formatPrice } from '@/lib/utils';
import { Navbar } from '@/components/Navbar';
import { MobileBottomNav } from '@/components/MobileBottomNav';
import { PaymentsSubNav } from '@/components/admin/PaymentsSubNav';
import { buildReport, parseRange } from '@/lib/payment-report';

export const metadata = { title: 'Payment reports | CIM India Admin' };
export const dynamic = 'force-dynamic';

const field =
  'h-10 px-3 rounded-lg border border-gray-300 bg-white text-sm text-gray-900 focus:outline-none focus:border-amber-600 focus:shadow-[0_0_0_3px_#e3eeff]';
const dl =
  'h-9 px-3 rounded-lg border border-gray-300 text-gray-900 hover:bg-gray-50 text-sm font-semibold inline-flex items-center gap-1.5 focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_#e3eeff]';

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ from?: string; to?: string }> }) {
  const user = await getSessionUser();
  if (!user || user.role !== 'ADMIN') redirect('/login?tab=admin&error=AdminAccessOnly');

  const sp = await searchParams;
  const range = parseRange(sp.from, sp.to);
  const r = await buildReport(range);
  const qs = `from=${range.from}&to=${range.to}`;
  const t = r.totals;

  const stats: [string, string, string?][] = [
    ['Collected', formatPrice(t.gross), `${t.paid} successful payment${t.paid === 1 ? '' : 's'}`],
    ['Refunded', formatPrice(t.refunded), `${t.refundedCount} fully refunded`],
    ['Net revenue', formatPrice(t.net)],
    ['Discounts given', formatPrice(t.discounts), `${t.couponOrders} order${t.couponOrders === 1 ? '' : 's'} with a coupon`],
    ['Pending', String(t.pending), 'Started, not completed'],
    ['Failed', String(t.failed)],
  ];

  return (
    <>
      <Navbar />
      <main className="flex-1 pb-24 lg:pb-12 bg-gray-50 min-h-screen">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">
          <div>
            <h1 className="text-3xl font-semibold text-gray-900">Payments</h1>
            <p className="text-sm text-gray-600 mt-1">Coupon codes, refunds and revenue reports.</p>
          </div>
          <PaymentsSubNav active="reports" />

          <form method="GET" className="flex flex-wrap items-end gap-3">
            <label className="block">
              <span className="block text-sm font-semibold text-gray-900 mb-1">From</span>
              <input type="date" name="from" defaultValue={range.from} className={field} />
            </label>
            <label className="block">
              <span className="block text-sm font-semibold text-gray-900 mb-1">To</span>
              <input type="date" name="to" defaultValue={range.to} className={field} />
            </label>
            <button type="submit" className="h-10 px-5 rounded-lg bg-amber-600 hover:bg-[#0060eb] text-white text-sm font-semibold transition active:scale-[0.98] focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_#e3eeff]">
              Show report
            </button>
            <p className="text-xs text-gray-600 w-full">Dates are in India time. Payments are counted by the day the checkout started.</p>
          </form>

          <dl className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            {stats.map(([k, v, note]) => (
              <div key={k} className="bg-white rounded-2xl border border-gray-200 p-4">
                <dt className="text-sm text-gray-600">{k}</dt>
                <dd className="text-2xl font-semibold text-gray-900 tabular-nums mt-0.5">{v}</dd>
                {note && <p className="text-xs text-gray-600 mt-0.5">{note}</p>}
              </div>
            ))}
          </dl>

          <section className="bg-white rounded-2xl border border-gray-200" aria-labelledby="by-course">
            <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-gray-200">
              <h2 id="by-course" className="text-lg font-semibold text-gray-900">Revenue by course</h2>
              <a href={`/api/admin/payments/report?kind=courses&${qs}`} className={dl}><Download className="w-4 h-4" aria-hidden /> CSV</a>
            </div>
            {r.byCourse.length === 0 ? (
              <p className="p-6 text-sm text-gray-600">No successful payments in this period.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm min-w-[32rem]">
                  <thead className="text-gray-600 border-b border-gray-200">
                    <tr>
                      <th scope="col" className="px-5 py-3 font-semibold">Course</th>
                      <th scope="col" className="px-5 py-3 font-semibold text-right">Orders</th>
                      <th scope="col" className="px-5 py-3 font-semibold text-right">Collected</th>
                      <th scope="col" className="px-5 py-3 font-semibold text-right">Refunded</th>
                      <th scope="col" className="px-5 py-3 font-semibold text-right">Net</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 tabular-nums">
                    {r.byCourse.map((c) => (
                      <tr key={c.course}>
                        <td className="px-5 py-3 text-gray-900">{c.course}</td>
                        <td className="px-5 py-3 text-right text-gray-900">{c.orders}</td>
                        <td className="px-5 py-3 text-right text-gray-900">{formatPrice(c.gross)}</td>
                        <td className="px-5 py-3 text-right text-gray-900">{formatPrice(c.refunded)}</td>
                        <td className="px-5 py-3 text-right font-semibold text-gray-900">{formatPrice(c.net)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="bg-white rounded-2xl border border-gray-200" aria-labelledby="by-coupon">
            <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-gray-200">
              <h2 id="by-coupon" className="text-lg font-semibold text-gray-900">Coupon usage</h2>
              <a href={`/api/admin/payments/report?kind=coupons&${qs}`} className={dl}><Download className="w-4 h-4" aria-hidden /> CSV</a>
            </div>
            {r.byCoupon.length === 0 ? (
              <p className="p-6 text-sm text-gray-600">No coupons were used in this period.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm min-w-[28rem]">
                  <thead className="text-gray-600 border-b border-gray-200">
                    <tr>
                      <th scope="col" className="px-5 py-3 font-semibold">Coupon</th>
                      <th scope="col" className="px-5 py-3 font-semibold text-right">Orders</th>
                      <th scope="col" className="px-5 py-3 font-semibold text-right">Discount given</th>
                      <th scope="col" className="px-5 py-3 font-semibold text-right">Revenue after discount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 tabular-nums">
                    {r.byCoupon.map((c) => (
                      <tr key={c.code}>
                        <td className="px-5 py-3 font-semibold text-gray-900 tracking-wide">{c.code}</td>
                        <td className="px-5 py-3 text-right text-gray-900">{c.orders}</td>
                        <td className="px-5 py-3 text-right text-gray-900">{formatPrice(c.discount)}</td>
                        <td className="px-5 py-3 text-right text-gray-900">{formatPrice(c.revenue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="bg-white rounded-2xl border border-gray-200 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3" aria-labelledby="all-tx">
            <div>
              <h2 id="all-tx" className="text-lg font-semibold text-gray-900">All transactions</h2>
              <p className="text-sm text-gray-600">{r.transactions.length} payment{r.transactions.length === 1 ? '' : 's'} in this period, with status, method, coupon, refund and billing city.</p>
            </div>
            <a href={`/api/admin/payments/report?kind=transactions&${qs}`} className={dl}><Download className="w-4 h-4" aria-hidden /> Download CSV</a>
          </section>
        </div>
      </main>
      <MobileBottomNav role="ADMIN" isLoggedIn />
    </>
  );
}
