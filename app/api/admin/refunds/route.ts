import { NextRequest, NextResponse } from 'next/server';
import { forbidden, requireAdmin } from '@/lib/admin-guard';
import { createRefund } from '@/lib/payments/fulfill';

/** Body: { paymentId, amount (rupees), reason }. Refunds through the gateway, then updates the enrollment. */
export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return forbidden();
  const body = await req.json().catch(() => ({}));
  const paymentId = typeof body.paymentId === 'string' ? body.paymentId : '';
  const rupees = Number(body.amount);
  if (!paymentId || !Number.isFinite(rupees)) return NextResponse.json({ error: 'Choose a payment and an amount.' }, { status: 400 });
  const reason = typeof body.reason === 'string' ? body.reason.trim() : '';
  if (!reason) return NextResponse.json({ error: 'Add a short reason for the refund.' }, { status: 400 });

  const out = await createRefund({ paymentId, amount: Math.round(rupees * 100), reason, adminId: admin.id });
  if (!out.ok) return NextResponse.json({ error: out.error }, { status: 400 });
  return NextResponse.json(out, { status: 201 });
}
