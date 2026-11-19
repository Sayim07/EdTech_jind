import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { prisma } from '@/lib/prisma';
import { getSessionUser, invalidateSessionUser } from '@/lib/auth';
import { AVATAR_BUCKET, deleteObject, isSupabaseStorageConfigured, objectPathFromUrl, uploadObject } from '@/lib/supabase-storage';
import { deleteStoredObject, isS3Configured, keyFromPublicUrl, putObject } from '@/lib/s3';

const MAX_SIZE = 2 * 1024 * 1024; // 2 MB
const AVATAR_DIR = path.join(process.cwd(), 'storage', 'avatars');

// Identify the real image type from the file's first bytes instead of trusting the filename or MIME header.
function sniffImage(buf: Buffer): 'jpg' | 'png' | 'webp' | null {
  if (buf.length > 12 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpg';
  if (buf.length > 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'png';
  if (buf.length > 12 && buf.subarray(0, 4).toString() === 'RIFF' && buf.subarray(8, 12).toString() === 'WEBP') return 'webp';
  return null;
}

async function removeOldAvatar(url: string | null | undefined) {
  const remote = objectPathFromUrl(url);
  if (remote) return deleteObject(AVATAR_BUCKET, remote);
  const stored = keyFromPublicUrl(url);
  if (stored) return deleteStoredObject(stored);
  if (!url || !url.startsWith('/api/avatars/')) return;
  const name = path.basename(url);
  await fs.unlink(path.join(AVATAR_DIR, name)).catch(() => {});
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: 'Please log in' }, { status: 401 });

    const form = await req.formData();
    const file = form.get('file');
    if (!(file instanceof File)) return NextResponse.json({ error: 'No image provided' }, { status: 400 });
    if (file.size > MAX_SIZE) return NextResponse.json({ error: 'Image must be 2 MB or smaller' }, { status: 400 });

    const buffer = Buffer.from(await file.arrayBuffer());
    const ext = sniffImage(buffer);
    if (!ext) return NextResponse.json({ error: 'Please upload a JPG, PNG or WebP image' }, { status: 400 });

    const name = `${user.id}-${Date.now()}.${ext}`;
    const mime = { jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp' }[ext];
    let avatarUrl: string;
    if (isSupabaseStorageConfigured()) {
      // Supabase Storage (public "avatars" bucket), objects namespaced by user id.
      avatarUrl = await uploadObject(AVATAR_BUCKET, `${user.id}/${name}`, buffer, mime);
    } else if (isS3Configured()) {
      // Same cloud bucket as course media (Cloudflare R2 or AWS S3), under avatars/.
      avatarUrl = await putObject(`avatars/${user.id}/${name}`, buffer, mime);
    } else if (process.env.NODE_ENV === 'production') {
      // A production server's disk is read-only or thrown away on every deploy, so a file written there would be lost.
      console.error('Avatar upload: no cloud storage configured (set SUPABASE_SERVICE_ROLE_KEY or the R2_* variables).');
      return NextResponse.json({ error: 'Profile pictures are not available right now. Please try again later.' }, { status: 503 });
    } else {
      // Local development with no cloud keys: keep the file on disk.
      await fs.mkdir(AVATAR_DIR, { recursive: true });
      await fs.writeFile(path.join(AVATAR_DIR, name), buffer);
      avatarUrl = `/api/avatars/${name}`;
    }

    await removeOldAvatar(user.avatarUrl);
    await prisma.user.update({ where: { id: user.id }, data: { avatarUrl } });
    invalidateSessionUser(user.id);

    return NextResponse.json({ success: true, avatarUrl });
  } catch (err) {
    console.error('Avatar upload error:', err);
    return NextResponse.json({ error: 'Failed to upload image' }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: 'Please log in' }, { status: 401 });
    await removeOldAvatar(user.avatarUrl);
    await prisma.user.update({ where: { id: user.id }, data: { avatarUrl: null } });
    invalidateSessionUser(user.id);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Avatar delete error:', err);
    return NextResponse.json({ error: 'Failed to remove image' }, { status: 500 });
  }
}
