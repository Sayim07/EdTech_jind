import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { parseStaffInput } from '@/lib/staff';

async function requireAdmin() {
  const user = await getSessionUser();
  return user && user.role === 'ADMIN' ? user : null;
}

export async function GET() {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 403 });
  const staff = await prisma.staffMember.findMany({ orderBy: [{ active: 'desc' }, { name: 'asc' }] });
  return NextResponse.json({ staff });
}

export async function POST(req: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 403 });

  const parsed = parseStaffInput(await req.json().catch(() => ({})));
  if (parsed.error || !parsed.data) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const d = parsed.data;

  if (await prisma.staffMember.findUnique({ where: { email: d.email! } })) {
    return NextResponse.json({ error: 'Someone with this email is already on the staff list.' }, { status: 409 });
  }

  const member = await prisma.staffMember.create({
    data: {
      name: d.name!,
      email: d.email!,
      role: d.role!,
      phone: d.phone ?? null,
      designation: d.designation ?? null,
      bio: d.bio ?? null,
      active: d.active ?? true,
    },
  });
  return NextResponse.json({ staff: member }, { status: 201 });
}
