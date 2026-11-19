import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { parseStaffInput } from '@/lib/staff';
import { staffChanged, syncCourseChat } from '@/lib/chat/sync';
import { invalidateSessionUser } from '@/lib/auth';

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

  if (existing.userId && parsed.data.role && parsed.data.role !== 'INSTRUCTOR') {
    return NextResponse.json({ error: 'Remove the login access before changing the role.' }, { status: 409 });
  }
  if (existing.userId && parsed.data.email && parsed.data.email !== existing.email) {
    if (await prisma.user.findUnique({ where: { email: parsed.data.email } })) {
      return NextResponse.json({ error: 'An account with this email already exists.' }, { status: 409 });
    }
  }

  const member = await prisma.staffMember.update({ where: { id }, data: parsed.data });
  // Keep the login's name and email in step with the staff record.
  if (member.userId && (parsed.data.name || parsed.data.email)) {
    await prisma.user.update({ where: { id: member.userId }, data: { ...(parsed.data.name && { name: member.name }), ...(parsed.data.email && { email: member.email }) } });
    invalidateSessionUser(member.userId);
  }
  // Their courses' message team depends on whether they are active.
  if (parsed.data.active !== undefined && parsed.data.active !== existing.active) {
    await staffChanged(id);
    // Names shown on courses follow the staff record.
  }
  if (parsed.data.name && parsed.data.name !== existing.name) {
    await prisma.course.updateMany({ where: { instructorId: id }, data: { instructorName: member.name } });
  }
  return NextResponse.json({ staff: { ...member, hasLogin: !!member.userId } });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 403 });
  const { id } = await params;
  const existing = await prisma.staffMember.findUnique({ where: { id }, select: { userId: true, courses: { select: { id: true } } } });
  if (!existing) return NextResponse.json({ error: 'Staff member not found' }, { status: 404 });
  if (existing.userId) {
    return NextResponse.json({ error: 'Remove the login access first, then remove this person from the list.' }, { status: 409 });
  }
  await prisma.staffMember.deleteMany({ where: { id } });
  // Their courses fall back to the default name and to admin messaging.
  if (existing.courses.length) {
    await prisma.course.updateMany({ where: { id: { in: existing.courses.map((c) => c.id) } }, data: { instructorName: 'CIM India Faculty' } });
    await Promise.all(existing.courses.map((c) => syncCourseChat(c.id)));
  }
  return NextResponse.json({ success: true });
}
