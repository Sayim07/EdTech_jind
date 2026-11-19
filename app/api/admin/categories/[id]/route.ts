import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { parseCategoryInput } from '@/lib/categories';

async function requireAdmin() {
  const user = await getSessionUser();
  return user && user.role === 'ADMIN' ? user : null;
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 403 });
  const { id } = await params;
  const p = parseCategoryInput(await req.json().catch(() => ({})));
  if (p.error) return NextResponse.json({ error: p.error }, { status: 400 });
  const current = await prisma.category.findUnique({ where: { id } });
  if (!current) return NextResponse.json({ error: 'Category not found.' }, { status: 404 });
  const clash = await prisma.category.findFirst({ where: { id: { not: id }, name: { equals: p.name!, mode: 'insensitive' } } });
  if (clash) return NextResponse.json({ error: 'That category already exists.' }, { status: 409 });
  // Renaming also moves the category's courses, so they do not end up under a name that no longer exists.
  const [category] = await prisma.$transaction([
    prisma.category.update({ where: { id }, data: { name: p.name!, description: p.description } }),
    prisma.course.updateMany({ where: { category: current.name }, data: { category: p.name! } }),
  ]);
  return NextResponse.json({ category });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 403 });
  const { id } = await params;
  const current = await prisma.category.findUnique({ where: { id } });
  if (!current) return NextResponse.json({ error: 'Category not found.' }, { status: 404 });
  const used = await prisma.course.count({ where: { category: current.name } });
  if (used > 0) return NextResponse.json({ error: `${used} course${used === 1 ? '' : 's'} still use this category. Move them to another category first.` }, { status: 409 });
  await prisma.category.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
