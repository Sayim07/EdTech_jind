import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { getSessionUser, signToken } from '@/lib/auth';

export async function PATCH(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: 'Please log in' }, { status: 401 });

    const { name, currentPassword, newPassword } = await req.json();
    const data: { name?: string; passwordHash?: string } = {};

    if (name !== undefined) {
      const clean = String(name).trim();
      if (clean.length < 2 || clean.length > 80) {
        return NextResponse.json({ error: 'Name must be between 2 and 80 characters' }, { status: 400 });
      }
      data.name = clean;
    }

    if (newPassword !== undefined && newPassword !== '') {
      if (typeof newPassword !== 'string' || newPassword.length < 8) {
        return NextResponse.json({ error: 'New password must be at least 8 characters' }, { status: 400 });
      }
      const record = await prisma.user.findUnique({ where: { id: user.id } });
      const ok = record && currentPassword && (await bcrypt.compare(String(currentPassword), record.passwordHash));
      if (!ok) return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 });
      data.passwordHash = await bcrypt.hash(newPassword, 10);
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
    }

    const updated = await prisma.user.update({ where: { id: user.id }, data });

    const res = NextResponse.json({
      success: true,
      user: { id: updated.id, email: updated.email, name: updated.name, role: updated.role },
    });
    // Keep the name inside the session token in sync.
    const token = await signToken({ userId: updated.id, email: updated.email, name: updated.name, role: updated.role });
    res.cookies.set('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60,
      path: '/',
    });
    return res;
  } catch (err) {
    console.error('Profile error:', err);
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
  }
}
