import { prisma } from '@/lib/prisma';

export interface ReportRange {
  from: string; // YYYY-MM-DD (India time)
  to: string;
}

const IST = '+05:30';
const rupees = (paise: number) => paise / 100;

/** Parses ?from&to. Defaults to the last 30 days. */
export function parseRange(from?: string | null, to?: string | null): ReportRange {
  const ok = (v?: string | null) => (v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null);
  const today = new Date(Date.now() + 5.5 * 3600 * 1000).toISOString().slice(0, 10);
  const monthAgo = new Date(Date.now() + 5.5 * 3600 * 1000 - 29 * 86400 * 1000).toISOString().slice(0, 10);
  let f = ok(from) || monthAgo;
  let t = ok(to) || today;
  if (f > t) [f, t] = [t, f];
  return { from: f, to: t };
}

export interface ReportData {
  range: ReportRange;
  totals: { gross: number; discounts: number; refunded: number; net: number; paid: number; pending: number; failed: number; refundedCount: number; couponOrders: number };
  byCourse: { course: string; orders: number; gross: number; refunded: number; net: number }[];
  byCoupon: { code: string; orders: number; discount: number; revenue: number }[];
  transactions: {
    date: string; id: string; student: string; email: string; course: string; status: string; method: string; gateway: string;
    list: number; discount: number; coupon: string; paid: number; refunded: number; gatewayPaymentId: string; city: string; state: string; pin: string;
  }[];
}

/** Everything the reports page and the CSV download need, in rupees. */
export async function buildReport(range: ReportRange): Promise<ReportData> {
  const rows = await prisma.payment.findMany({
    where: { createdAt: { gte: new Date(`${range.from}T00:00:00${IST}`), lte: new Date(`${range.to}T23:59:59.999${IST}`) } },
    include: { user: { select: { name: true, email: true } }, course: { select: { title: true } } },
    orderBy: { createdAt: 'desc' },
    take: 20000,
  });

  const totals = { gross: 0, discounts: 0, refunded: 0, net: 0, paid: 0, pending: 0, failed: 0, refundedCount: 0, couponOrders: 0 };
  const byCourse = new Map<string, { course: string; orders: number; gross: number; refunded: number; net: number }>();
  const byCoupon = new Map<string, { code: string; orders: number; discount: number; revenue: number }>();

  for (const p of rows) {
    const success = p.status === 'PAID' || p.status === 'REFUNDED';
    if (p.status === 'CREATED') totals.pending++;
    else if (p.status === 'FAILED') totals.failed++;
    else if (success) {
      totals.paid++;
      totals.gross += rupees(p.amount);
      totals.refunded += rupees(p.refundedAmount);
      totals.discounts += rupees(p.discountAmount);
      if (p.status === 'REFUNDED') totals.refundedCount++;
      const c = byCourse.get(p.courseId) || { course: p.course.title, orders: 0, gross: 0, refunded: 0, net: 0 };
      c.orders++;
      c.gross += rupees(p.amount);
      c.refunded += rupees(p.refundedAmount);
      c.net = c.gross - c.refunded;
      byCourse.set(p.courseId, c);
      if (p.couponCode) {
        totals.couponOrders++;
        const k = byCoupon.get(p.couponCode) || { code: p.couponCode, orders: 0, discount: 0, revenue: 0 };
        k.orders++;
        k.discount += rupees(p.discountAmount);
        k.revenue += rupees(p.amount - p.refundedAmount);
        byCoupon.set(p.couponCode, k);
      }
    }
  }
  totals.net = totals.gross - totals.refunded;

  const stamp = new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'medium', hour12: true });
  return {
    range,
    totals,
    byCourse: [...byCourse.values()].sort((a, b) => b.net - a.net),
    byCoupon: [...byCoupon.values()].sort((a, b) => b.orders - a.orders),
    transactions: rows.map((p) => {
      const b = (p.billing || {}) as Record<string, string>;
      return {
        date: stamp.format(p.paidAt || p.createdAt),
        id: p.id,
        student: p.user.name,
        email: p.user.email,
        course: p.course.title,
        status: p.status === 'CREATED' ? 'PENDING' : p.status,
        method: p.method || '',
        gateway: p.gateway,
        list: rupees(p.originalAmount ?? p.amount),
        discount: rupees(p.discountAmount),
        coupon: p.couponCode || '',
        paid: rupees(p.amount),
        refunded: rupees(p.refundedAmount),
        gatewayPaymentId: p.gatewayPaymentId || '',
        city: b.city || '',
        state: b.state || '',
        pin: b.pin || '',
      };
    }),
  };
}

/** CSV text. Text cells that start with = + - @ are prefixed so a spreadsheet never runs them as formulas. */
export function toCsv(headers: string[], rows: (string | number)[][]) {
  const cell = (v: string | number) => {
    let s = String(v ?? '');
    if (typeof v === 'string' && /^[=+\-@\t\r]/.test(s)) s = "'" + s;
    return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  };
  return '﻿' + [headers, ...rows].map((r) => r.map(cell).join(',')).join('\r\n') + '\r\n';
}
