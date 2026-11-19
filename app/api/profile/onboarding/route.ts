import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser, invalidateSessionUser } from '@/lib/auth';

/** The welcome popup has been shown (or answered). Remembered on the account, so it never comes back on a new login. */
export async function POST() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Please log in' }, { status: 401 });
  if (!user.onboardingSeenAt) {
    await prisma.user.update({ where: { id: user.id }, data: { onboardingSeenAt: new Date() } });
    invalidateSessionUser(user.id);
  }
  return NextResponse.json({ ok: true });
}
