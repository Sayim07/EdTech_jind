import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { forbidden, requireAdmin } from '@/lib/admin-guard';
import { parseCouponInput } from '@/lib/coupons';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAdmin())) return forbidden();
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const current = await prisma.coupon.findUnique({ where: { id } });
  if (!current) return NextResponse.json({ error: 'Coupon not found.' }, { status: 404 });

  // Switching a coupon on or off sends only { active }.
  if (Object.keys(body).length === 1 && typeof body.active === 'boolean') {
    const coupon = await prisma.coupon.update({ where: { id }, data: { active: body.active } });
    return NextResponse.json({ coupon });
  }

  const p = parseCouponInput(body);
  if (!p.data) return NextResponse.json({ error: p.error }, { status: 400 });
  const clash = await prisma.coupon.findFirst({ where: { code: p.data.code, id: { not: id } } });
  if (clash) return NextResponse.json({ error: 'A coupon with this code already exists.' }, { status: 409 });
  const coupon = await prisma.coupon.update({ where: { id }, data: p.data as any });
  return NextResponse.json({ coupon });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAdmin())) return forbidden();
  const { id } = await params;
  const used = await prisma.couponRedemption.count({ where: { couponId: id } });
  if (used > 0) return NextResponse.json({ error: 'This coupon has been used, so it is kept for your records. Turn it off instead.' }, { status: 409 });
  await prisma.coupon.deleteMany({ where: { id } });
  return NextResponse.json({ ok: true });
}
