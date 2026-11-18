import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Please log in' }, { status: 401 });
  const { id } = await params;
  const p = await prisma.payment.findUnique({ where: { id }, include: { course: { select: { slug: true, title: true } } } });
  if (!p || p.userId !== user.id) return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
  return NextResponse.json({ status: p.status, failureReason: p.failureReason, slug: p.course.slug, title: p.course.title });
}
