import { NextRequest, NextResponse } from 'next/server';

/**
 * Small in-memory rate limiter for the sign-in style endpoints.
 *
 * It counts per server instance. That already stops a single attacker hammering one instance, but on a host that
 * runs many instances (serverless) the limit is per instance. For strict global limits put a shared store
 * (Redis, Upstash) behind this same function. Nothing else in the app needs to change.
 */
interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

export function clientIp(req: NextRequest): string {
  // Behind a proxy the left-most address is the client. Without one, fall back to a shared bucket.
  const fwd = req.headers.get('x-forwarded-for');
  return (fwd ? fwd.split(',')[0].trim() : req.headers.get('x-real-ip')) || 'unknown';
}

/** Returns a 429 response when `key` has used up `limit` hits in the last `windowMs`, otherwise null. */
export function rateLimit(key: string, limit: number, windowMs: number): NextResponse | null {
  const now = Date.now();
  // Keep memory bounded: drop expired buckets once the table gets large.
  if (buckets.size > 5000) for (const [k, b] of buckets) if (b.resetAt <= now) buckets.delete(k);

  const b = buckets.get(key);
  if (!b || b.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return null;
  }
  b.count += 1;
  if (b.count <= limit) return null;

  const retry = Math.max(1, Math.ceil((b.resetAt - now) / 1000));
  return NextResponse.json(
    { error: 'Too many attempts. Please wait a few minutes and try again.' },
    { status: 429, headers: { 'Retry-After': String(retry) } },
  );
}
