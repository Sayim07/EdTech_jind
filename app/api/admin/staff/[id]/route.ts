import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { parseStaffInput } from '@/lib/staff';

async function requireAdmin() {
  const user = await getSessionUser();
  return user && user.role === 'ADMIN' ? user : null;
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 403 });
  const { id } = await params;

  const existing = await prisma.staffMember.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: 'Staff member not found' }, { status: 404 });

  const parsed = parseStaffInput(await req.json().catch(() => ({})), true);
  if (parsed.error || !parsed.data) return NextResponse.json({ error: parsed.error }, { status: 400 });

  if (parsed.data.email && parsed.data.email !== existing.email) {
    if (await prisma.staffMember.findUnique({ where: { email: parsed.data.email } })) {
      return NextResponse.json({ error: 'Someone with this email is already on the staff list.' }, { status: 409 });
    }
  }

  const member = await prisma.staffMember.update({ where: { id }, data: parsed.data });
  return NextResponse.json({ staff: member });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 403 });
  const { id } = await params;
  const res = await prisma.staffMember.deleteMany({ where: { id } });
  if (res.count === 0) return NextResponse.json({ error: 'Staff member not found' }, { status: 404 });
  return NextResponse.json({ success: true });
}
