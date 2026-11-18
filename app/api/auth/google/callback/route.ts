import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { AUTH_COOKIE_OPTIONS, safeRedirectPath, signToken } from '@/lib/auth';

// Step 2 of Google sign-in: exchange the code, then sign the user in (creating the account if needed).
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const origin = process.env.APP_URL || url.origin;
  const fail = (code: string) => {
    const res = NextResponse.redirect(`${origin}/login?error=${code}`);
    res.cookies.delete('g_oauth_state');
    res.cookies.delete('g_oauth_redirect');
    return res;
  };

  try {
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const savedState = req.cookies.get('g_oauth_state')?.value;

    if (url.searchParams.get('error')) return fail('google_cancelled');
    if (!code || !state || !savedState || state !== savedState) return fail('google_failed');

    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID || '',
        client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
        redirect_uri: `${origin}/api/auth/google/callback`,
        grant_type: 'authorization_code',
      }),
    });
    if (!tokenRes.ok) return fail('google_failed');
    const { access_token } = await tokenRes.json();

    const infoRes = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
      headers: { Authorization: `Bearer ${access_token}` },
    });
    if (!infoRes.ok) return fail('google_failed');
    const info = await infoRes.json();

    // Only trust Google accounts whose email Google has verified.
    if (!info.sub || !info.email || info.email_verified !== true) return fail('google_unverified');

    const email = String(info.email).toLowerCase();
    let user = await prisma.user.findUnique({ where: { googleId: info.sub } });

    if (!user) {
      const byEmail = await prisma.user.findUnique({ where: { email } });
      if (byEmail) {
        user = await prisma.user.update({
          where: { id: byEmail.id },
          data: { googleId: info.sub, avatarUrl: byEmail.avatarUrl || info.picture || null },
        });
      } else {
        user = await prisma.user.create({
          data: {
            email,
            name: String(info.name || email.split('@')[0]).slice(0, 80),
            avatarUrl: info.picture || null,
            googleId: info.sub,
            role: 'STUDENT',
            // Google accounts have no password; store an unguessable one. They can set one via "Forgot password".
            passwordHash: await bcrypt.hash(randomBytes(32).toString('hex'), 10),
          },
        });
      }
    }

    const token = await signToken({ userId: user.id, email: user.email, name: user.name, role: user.role });
    const fallback = user.role === 'ADMIN' ? '/admin?tab=home' : '/dashboard';
    const target = safeRedirectPath(req.cookies.get('g_oauth_redirect')?.value, fallback);

    const res = NextResponse.redirect(`${origin}${target}`);
    res.cookies.set('auth_token', token, AUTH_COOKIE_OPTIONS);
    res.cookies.delete('g_oauth_state');
    res.cookies.delete('g_oauth_redirect');
    return res;
  } catch (err) {
    console.error('Google sign-in error:', err);
    return fail('google_failed');
  }
}
