import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser, invalidateSessionUser } from '@/lib/auth';
import { completion, toFormData, validateProfile } from '@/lib/profile';

/** Saves the student's profile details. Every filled-in field is validated here, whatever the browser checked. */
export async function PATCH(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Please log in' }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== 'object') return NextResponse.json({ error: 'Invalid request' }, { status: 400 });

  const result = validateProfile(body);
  if (!result.data) return NextResponse.json({ error: 'Please fix the highlighted fields.', fields: result.errors }, { status: 400 });

  const updated = await prisma.user.update({ where: { id: user.id }, data: result.data });
  invalidateSessionUser(user.id);

  return NextResponse.json({ success: true, profile: toFormData(updated), completion: completion(updated) });
}
