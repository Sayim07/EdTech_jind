import { NextRequest, NextResponse } from 'next/server';
import { forbidden, requireAdmin } from '@/lib/admin-guard';
import { reconcilePayment } from '@/lib/payments/fulfill';

/** Asks the gateway what happened to a pending or failed payment and fixes our record. */
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAdmin())) return forbidden();
  const { id } = await params;
  return NextResponse.json({ result: await reconcilePayment(id) });
}
