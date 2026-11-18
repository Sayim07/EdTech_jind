import crypto from 'crypto';

/**
 * Minimal S3-compatible object storage helper (no SDK): creates short-lived presigned PUT URLs so the browser
 * uploads big files (videos, slide decks) straight to the bucket instead of through this server.
 *
 * Two providers, chosen by which variables are set (Cloudflare R2 wins if both are):
 *   Cloudflare R2:  R2_ACCOUNT_ID, R2_BUCKET, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_PUBLIC_URL
 *   AWS S3:         AWS_REGION, AWS_S3_BUCKET, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, S3_PUBLIC_BASE_URL (optional)
 *
 * The bucket must allow browser PUTs (CORS) from your site and serve the uploaded objects publicly,
 * because students load videos and files by URL.
 */

type Provider = { kind: 'r2' | 's3'; host: string; region: string; bucket: string; accessKey: string; secretKey: string; publicBase: string };

const env = (k: string) => process.env[k]?.trim() || '';

function provider(): Provider | null {
  const account = env('R2_ACCOUNT_ID');
  if (account && env('R2_BUCKET') && env('R2_ACCESS_KEY_ID') && env('R2_SECRET_ACCESS_KEY') && env('R2_PUBLIC_URL')) {
    return {
      kind: 'r2',
      host: `${account}.r2.cloudflarestorage.com`, // path-style: /<bucket>/<key>
      region: 'auto',
      bucket: env('R2_BUCKET'),
      accessKey: env('R2_ACCESS_KEY_ID'),
      secretKey: env('R2_SECRET_ACCESS_KEY'),
      publicBase: env('R2_PUBLIC_URL').replace(/\/$/, ''),
    };
  }
  if (env('AWS_REGION') && env('AWS_S3_BUCKET') && env('AWS_ACCESS_KEY_ID') && env('AWS_SECRET_ACCESS_KEY')) {
    const region = env('AWS_REGION');
    const bucket = env('AWS_S3_BUCKET');
    return {
      kind: 's3',
      host: `${bucket}.s3.${region}.amazonaws.com`,
      region,
      bucket,
      accessKey: env('AWS_ACCESS_KEY_ID'),
      secretKey: env('AWS_SECRET_ACCESS_KEY'),
      publicBase: (env('S3_PUBLIC_BASE_URL') || `https://${bucket}.s3.${region}.amazonaws.com`).replace(/\/$/, ''),
    };
  }
  return null;
}

export const isS3Configured = () => provider() !== null;
/** Which storage is active, for messages. */
export const storageName = () => (provider()?.kind === 'r2' ? 'Cloudflare R2' : provider()?.kind === 's3' ? 'AWS S3' : null);

const NL = String.fromCharCode(10);
const sha256 = (data: string) => crypto.createHash('sha256').update(data).digest('hex');
const hmac = (key: Buffer | string, data: string) => crypto.createHmac('sha256', key).update(data).digest();
// RFC 3986 encoding, which is what SigV4 requires (encodeURIComponent leaves ! ' ( ) * alone).
const enc = (s: string) => encodeURIComponent(s).replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);

export function publicUrlFor(key: string) {
  const p = provider();
  if (!p) throw new Error('Object storage is not configured');
  return `${p.publicBase}/${key.split('/').map(enc).join('/')}`;
}

/** Generic SigV4 query-string signing for one object (exported so it can be checked against AWS's published example). */
export function presignUrl(o: { method: 'GET' | 'PUT' | 'DELETE'; host: string; key: string; region: string; accessKey: string; secretKey: string; now: Date; expiresIn: number }) {
  const { method, host, key, region, accessKey, secretKey, now, expiresIn } = o;
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, ''); // 20261119T101500Z
  const day = amzDate.slice(0, 8);
  const scope = `${day}/${region}/s3/aws4_request`;

  const query: Record<string, string> = {
    'X-Amz-Algorithm': 'AWS4-HMAC-SHA256',
    'X-Amz-Credential': `${accessKey}/${scope}`,
    'X-Amz-Date': amzDate,
    'X-Amz-Expires': String(expiresIn),
    'X-Amz-SignedHeaders': 'host',
  };
  const canonicalQuery = Object.keys(query)
    .sort()
    .map((k) => `${enc(k)}=${enc(query[k])}`)
    .join('&');
  const canonicalUri = '/' + key.split('/').map(enc).join('/');
  const canonicalRequest = [method, canonicalUri, canonicalQuery, `host:${host}${NL}`, 'host', 'UNSIGNED-PAYLOAD'].join(NL);
  const stringToSign = ['AWS4-HMAC-SHA256', amzDate, scope, sha256(canonicalRequest)].join(NL);

  const kDate = hmac(`AWS4${secretKey}`, day);
  const kSigning = hmac(hmac(hmac(kDate, region), 's3'), 'aws4_request');
  const signature = crypto.createHmac('sha256', kSigning).update(stringToSign).digest('hex');

  return `https://${host}${canonicalUri}?${canonicalQuery}&X-Amz-Signature=${signature}`;
}

/** URL the browser can PUT the file to for the next `expiresIn` seconds. */
export function presignPut(key: string, expiresIn = 900) {
  const p = provider();
  if (!p) throw new Error('Object storage is not configured');
  // R2 uses path-style addressing, so the bucket is the first path segment.
  const objectPath = p.kind === 'r2' ? `${p.bucket}/${key}` : key;
  return presignUrl({ method: 'PUT', host: p.host, key: objectPath, region: p.region, accessKey: p.accessKey, secretKey: p.secretKey, now: new Date(), expiresIn });
}

function objectUrl(method: 'PUT' | 'DELETE', key: string) {
  const p = provider();
  if (!p) throw new Error('Object storage is not configured');
  const objectPath = p.kind === 'r2' ? `${p.bucket}/${key}` : key;
  return presignUrl({ method, host: p.host, key: objectPath, region: p.region, accessKey: p.accessKey, secretKey: p.secretKey, now: new Date(), expiresIn: 120 });
}

/** Server-side upload of a small file (profile pictures). Browsers use presignPut for big files instead. */
export async function putObject(key: string, body: Buffer, contentType: string): Promise<string> {
  const res = await fetch(objectUrl('PUT', key), { method: 'PUT', headers: { 'Content-Type': contentType, 'Cache-Control': 'public, max-age=31536000, immutable' }, body: new Uint8Array(body) });
  if (!res.ok) throw new Error(`Storage upload failed (${res.status}): ${(await res.text().catch(() => '')).slice(0, 200)}`);
  return publicUrlFor(key);
}

export async function deleteStoredObject(key: string): Promise<void> {
  await fetch(objectUrl('DELETE', key), { method: 'DELETE' }).catch(() => {});
}

/** If `url` points into our bucket, returns the object key (so an old file can be removed). */
export function keyFromPublicUrl(url: string | null | undefined): string | null {
  const p = provider();
  if (!url || !p) return null;
  const prefix = `${p.publicBase}/`;
  if (!url.startsWith(prefix)) return null;
  try {
    return url.slice(prefix.length).split('/').map(decodeURIComponent).join('/');
  } catch {
    return null;
  }
}
