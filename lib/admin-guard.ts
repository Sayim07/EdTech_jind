import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';

/** Returns the signed-in admin, or null. API routes answer 403 when it is null. */
export async function requireAdmin() {
  const user = await getSessionUser();
  return user && user.role === 'ADMIN' ? user : null;
}

export const forbidden = () => NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 403 });
