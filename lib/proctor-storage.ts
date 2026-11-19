import crypto from 'crypto';
import { presignUrl } from '@/lib/s3';

/**
 * PRIVATE object storage for proctoring photos (ID card, selfie, random camera stills).
 *
 * Unlike course media these files must never be publicly readable. They are written and read only by the server,
 * and the browser sees them only through /api/proctor/media/... after a permission check.
 *
 * Configuration (Cloudflare R2):
 *   R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY            (the same as for course media)
 *   R2_PRIVATE_BUCKET   a SEPARATE bucket with public access switched OFF (recommended).
 * If R2_PRIVATE_BUCKET is not set the normal R2_BUCKET is used under the "proctor-private/" prefix. That still works,
 * and the keys are random 128-bit values, but that bucket is public, so a separate private bucket is strongly advised.
 */
const env = (k: string) => process.env[k]?.trim() || '';

interface Target {
  host: string;
  bucket: string;
  region: string;
  accessKey: string;
  secretKey: string;
  prefix: string;
  /** True when a dedicated private bucket is configured. */
  dedicated: boolean;
}

function target(): Target | null {
  const account = env('R2_ACCOUNT_ID');
  const accessKey = env('R2_ACCESS_KEY_ID');
  const secretKey = env('R2_SECRET_ACCESS_KEY');
  const priv = env('R2_PRIVATE_BUCKET');
  const bucket = priv || env('R2_BUCKET');
  if (!account || !accessKey || !secretKey || !bucket) return null;
  return { host: `${account}.r2.cloudflarestorage.com`, bucket, region: 'auto', accessKey, secretKey, prefix: priv ? '' : 'proctor-private/', dedicated: Boolean(priv) };
}

export const proctorStorageConfigured = () => target() !== null;
/** Whether photos live in a bucket that is not publicly readable. Shown as a warning to admins when false. */
export const proctorStorageIsPrivate = () => target()?.dedicated ?? false;

/** Random, unguessable object key: exam/<kind>/<yyyy-mm>/<128-bit random>.jpg */
export function newProctorKey(kind: 'selfie' | 'id' | 'capture') {
  const month = new Date().toISOString().slice(0, 7);
  return `exam/${kind}/${month}/${crypto.randomBytes(16).toString('hex')}.jpg`;
}

function urlFor(method: 'GET' | 'PUT' | 'DELETE', key: string) {
  const t = target();
  if (!t) throw new Error('Private photo storage is not configured');
  return presignUrl({ method, host: t.host, key: `${t.bucket}/${t.prefix}${key}`, region: t.region, accessKey: t.accessKey, secretKey: t.secretKey, now: new Date(), expiresIn: 60 });
}

export async function putPrivate(key: string, body: Buffer, contentType = 'image/jpeg') {
  const res = await fetch(urlFor('PUT', key), { method: 'PUT', headers: { 'Content-Type': contentType, 'Cache-Control': 'private, no-store' }, body: new Uint8Array(body) });
  if (!res.ok) throw new Error(`Photo storage failed (${res.status})`);
}

export async function getPrivate(key: string): Promise<{ body: ArrayBuffer; contentType: string } | null> {
  const res = await fetch(urlFor('GET', key), { cache: 'no-store' });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Photo storage read failed (${res.status})`);
  return { body: await res.arrayBuffer(), contentType: res.headers.get('content-type') || 'image/jpeg' };
}

export async function deletePrivate(key: string) {
  const res = await fetch(urlFor('DELETE', key), { method: 'DELETE' });
  if (!res.ok && res.status !== 404) throw new Error(`Photo delete failed (${res.status})`);
}

/** True when the bytes really are a JPEG (starts FF D8 FF), so nothing else is stored under an image name. */
export const isJpeg = (b: Buffer) => b.length > 4 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff;
