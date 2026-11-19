import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getSessionUser } from '@/lib/auth';
import { purgeExpiredMedia } from '@/lib/exam';

/**
 * Deletes ID photos and camera photos whose retention period has passed. Run daily by the scheduled GitHub workflow
 * (Authorization: Bearer CRON_SECRET), or by an admin on demand.
 */
export async function POST(req: NextRequest) {
  const secret = process.env.CRON_SECRET?.trim();
  const given = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  const cronOk = Boolean(secret) && given.length === secret!.length && crypto.timingSafeEqual(Buffer.from(given), Buffer.from(secret!));

  if (!cronOk) {
    const user = await getSessionUser();
    if (!user || user.role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }
  const purged = await purgeExpiredMedia();
  return NextResponse.json({ purged });
}
