import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import path from 'path';
import { getSessionUser } from '@/lib/auth';
import { isS3Configured, presignPut, publicUrlFor } from '@/lib/s3';

// extension -> [folder in the bucket, content type]
const TYPES: Record<string, [string, string]> = {
  '.mp4': ['video', 'video/mp4'],
  '.webm': ['video', 'video/webm'],
  '.mov': ['video', 'video/quicktime'],
  '.mp3': ['audio', 'audio/mpeg'],
  '.m4a': ['audio', 'audio/mp4'],
  '.wav': ['audio', 'audio/wav'],
  '.pptx': ['slides', 'application/vnd.openxmlformats-officedocument.presentationml.presentation'],
  '.ppt': ['slides', 'application/vnd.ms-powerpoint'],
  '.pdf': ['documents', 'application/pdf'],
  '.docx': ['documents', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  '.doc': ['documents', 'application/msword'],
  '.jpg': ['images', 'image/jpeg'],
  '.jpeg': ['images', 'image/jpeg'],
  '.png': ['images', 'image/png'],
  '.webp': ['images', 'image/webp'],
  '.gif': ['images', 'image/gif'],
};
const MAX_BYTES = 2 * 1024 * 1024 * 1024; // 2 GB

/**
 * Admin-only. Tells the browser whether direct-to-S3 upload is available and, if so, gives it a one-time URL.
 * When S3 is not configured the browser falls back to POST /api/upload (local disk, for development).
 */
export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user || user.role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 403 });

  if (!isS3Configured()) return NextResponse.json({ s3: false });

  const body = await req.json().catch(() => ({}));
  const name = typeof body.name === 'string' ? body.name : '';
  const size = Number(body.size) || 0;
  const ext = path.extname(name).toLowerCase();
  const type = TYPES[ext];
  if (!type) return NextResponse.json({ error: `File type "${ext || name}" is not supported.` }, { status: 400 });
  if (size <= 0 || size > MAX_BYTES) return NextResponse.json({ error: 'File must be smaller than 2 GB.' }, { status: 400 });

  const safe = path.basename(name, ext).toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/(^-|-$)+/g, '').slice(0, 48) || 'file';
  const key = `course-media/${type[0]}/${new Date().getUTCFullYear()}/${crypto.randomBytes(6).toString('hex')}-${safe}${ext}`;

  return NextResponse.json({
    s3: true,
    uploadUrl: presignPut(key),
    publicUrl: publicUrlFor(key),
    key,
    fileName: name,
  });
}
