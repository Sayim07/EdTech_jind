import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { parseCategoryInput } from '@/lib/categories';

async function requireAdmin() {
  const user = await getSessionUser();
  return user && user.role === 'ADMIN' ? user : null;
}

export async function POST(req: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 403 });
  const p = parseCategoryInput(await req.json().catch(() => ({})));
  if (p.error) return NextResponse.json({ error: p.error }, { status: 400 });
  const clash = await prisma.category.findFirst({ where: { name: { equals: p.name!, mode: 'insensitive' } } });
  if (clash) return NextResponse.json({ error: 'That category already exists.' }, { status: 409 });
  const category = await prisma.category.create({ data: { name: p.name!, description: p.description } });
  return NextResponse.json({ category }, { status: 201 });
}
