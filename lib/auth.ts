import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { prisma } from './prisma';

// Sessions are signed with JWT_SECRET. There is deliberately NO fallback in production: a built-in default would be
// public (it lives in the repository) and anyone could forge an admin session with it.
function sessionSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET?.trim();
  if (secret && secret.length >= 32) return new TextEncoder().encode(secret);
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET must be set to a random string of at least 32 characters in production.');
  }
  // Local development only.
  return new TextEncoder().encode('dev-only-insecure-session-secret-do-not-use-in-production');
}

export interface TokenPayload {
  userId: string;
  email: string;
  role: string;
  name: string;
}

export async function signToken(payload: TokenPayload): Promise<string> {
  return await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(sessionSecret());
}

export async function verifyToken(token: string): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, sessionSecret());
    return payload as unknown as TokenPayload;
  } catch (err) {
    return null;
  }
}

// Reading the user from the database on every page view cost one network round trip per click. Keep the answer for a
// few seconds per server instance. A role change or removal therefore takes effect within SESSION_CACHE_MS.
const SESSION_CACHE_MS = 20_000;
type SessionUserRow = { id: string; email: string; name: string; role: string; avatarUrl: string | null; createdAt: Date };
const sessionCache = new Map<string, { user: SessionUserRow | null; expires: number }>();

/** Call after changing a user's own profile (name, avatar, password) so the next request sees it immediately. */
export function invalidateSessionUser(userId: string) {
  sessionCache.delete(userId);
}

export async function getSessionUser() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;
    if (!token) return null;

    const payload = await verifyToken(token);
    if (!payload?.userId) return null;

    const hit = sessionCache.get(payload.userId);
    if (hit && hit.expires > Date.now()) return hit.user;

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        avatarUrl: true,
        createdAt: true,
      },
    });

    if (sessionCache.size > 2000) sessionCache.clear();
    sessionCache.set(payload.userId, { user, expires: Date.now() + SESSION_CACHE_MS });
    return user;
  } catch (err) {
    return null;
  }
}

/** Only allow same-site relative redirects (prevents open redirects after login). */
export function safeRedirectPath(value: string | null | undefined, fallback: string): string {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.includes(String.fromCharCode(92))) return fallback;
  return value;
}

export const AUTH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge: 7 * 24 * 60 * 60,
  path: '/',
};

/**
 * The public address of the site, used in emails and OAuth redirects. In production it MUST come from APP_URL:
 * trusting the request's Host header would let an attacker poison password-reset links.
 */
export function appOrigin(requestUrl: string): string {
  const configured = process.env.APP_URL?.trim().replace(/\/$/, '');
  if (configured) return configured;
  if (process.env.NODE_ENV === 'production') throw new Error('APP_URL must be set in production.');
  return new URL(requestUrl).origin;
}
