/**
 * Minimal Supabase Storage client (REST, no SDK). Server-only: it uses the service-role key, which bypasses
 * RLS, so never import this from a client component and never expose the key to the browser.
 *
 * Profile pictures live in the public "avatars" bucket. Course media (video, slides, audio) is NOT stored
 * here; it goes to Cloudflare or Cloudinary.
 */

const url = () => (process.env.SUPABASE_URL || '').replace(/\/$/, '');
const key = () => process.env.SUPABASE_SERVICE_ROLE_KEY || '';
export const AVATAR_BUCKET = process.env.SUPABASE_AVATAR_BUCKET || 'avatars';

export const isSupabaseStorageConfigured = () => Boolean(url() && key());

const headers = (extra: Record<string, string> = {}) => ({ Authorization: `Bearer ${key()}`, apikey: key(), ...extra });

export function publicUrl(bucket: string, objectPath: string) {
  return `${url()}/storage/v1/object/public/${bucket}/${objectPath}`;
}

export async function uploadObject(bucket: string, objectPath: string, body: Buffer, contentType: string) {
  const res = await fetch(`${url()}/storage/v1/object/${bucket}/${objectPath}`, {
    method: 'POST',
    headers: headers({ 'Content-Type': contentType, 'Cache-Control': 'max-age=31536000', 'x-upsert': 'true' }),
    body: new Uint8Array(body),
  });
  if (!res.ok) throw new Error(`Supabase upload failed (${res.status}): ${await res.text().catch(() => '')}`);
  return publicUrl(bucket, objectPath);
}

export async function deleteObject(bucket: string, objectPath: string) {
  await fetch(`${url()}/storage/v1/object/${bucket}/${objectPath}`, { method: 'DELETE', headers: headers() }).catch(() => {});
}

/** If `fileUrl` points at our bucket, returns the object path inside it. */
export function objectPathFromUrl(fileUrl: string | null | undefined, bucket = AVATAR_BUCKET) {
  if (!fileUrl || !url()) return null;
  const prefix = `${url()}/storage/v1/object/public/${bucket}/`;
  return fileUrl.startsWith(prefix) ? fileUrl.slice(prefix.length) : null;
}
