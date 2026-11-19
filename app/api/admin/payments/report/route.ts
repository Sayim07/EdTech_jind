import { NextRequest, NextResponse } from 'next/server';
import { forbidden, requireAdmin } from '@/lib/admin-guard';
import { buildReport, parseRange, toCsv } from '@/lib/payment-report';

/** GET ?from=YYYY-MM-DD&to=YYYY-MM-DD&kind=transactions|courses|coupons  returns a CSV download. */
export async function GET(req: NextRequest) {
  if (!(await requireAdmin())) return forbidden();
  const q = req.nextUrl.searchParams;
  const report = await buildReport(parseRange(q.get('from'), q.get('to')));
  const kind = q.get('kind') || 'transactions';

  let csv: string;
  if (kind === 'courses') {
    csv = toCsv(['Course', 'Paid orders', 'Collected (INR)', 'Refunded (INR)', 'Net (INR)'], report.byCourse.map((c) => [c.course, c.orders, c.gross, c.refunded, c.net]));
  } else if (kind === 'coupons') {
    csv = toCsv(['Coupon', 'Paid orders', 'Discount given (INR)', 'Revenue after discount (INR)'], report.byCoupon.map((c) => [c.code, c.orders, c.discount, c.revenue]));
  } else {
    csv = toCsv(
      ['Date (IST)', 'Payment ID', 'Student', 'Email', 'Course', 'Status', 'Method', 'Gateway', 'List price (INR)', 'Discount (INR)', 'Coupon', 'Paid (INR)', 'Refunded (INR)', 'Gateway payment ID', 'City', 'State', 'PIN'],
      report.transactions.map((t) => [t.date, t.id, t.student, t.email, t.course, t.status, t.method, t.gateway, t.list, t.discount, t.coupon, t.paid, t.refunded, t.gatewayPaymentId, t.city, t.state, t.pin]),
    );
  }
  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="cim-${kind}-${report.range.from}-to-${report.range.to}.csv"`,
      'Cache-Control': 'no-store',
    },
  });
}
