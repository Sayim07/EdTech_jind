import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { forbidden, requireAdmin } from '@/lib/admin-guard';
import { parseCouponInput } from '@/lib/coupons';

export async function POST(req: NextRequest) {
  if (!(await requireAdmin())) return forbidden();
  const p = parseCouponInput(await req.json().catch(() => ({})));
  if (!p.data) return NextResponse.json({ error: p.error }, { status: 400 });
  if (await prisma.coupon.findUnique({ where: { code: p.data.code } })) return NextResponse.json({ error: 'A coupon with this code already exists.' }, { status: 409 });
  const coupon = await prisma.coupon.create({ data: p.data as any });
  return NextResponse.json({ coupon }, { status: 201 });
}
