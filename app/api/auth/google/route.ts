import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { appOrigin, safeRedirectPath } from '@/lib/auth';

// Step 1 of Google sign-in: send the browser to Google's consent screen.
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const origin = appOrigin(req.url);
  const clientId = process.env.GOOGLE_CLIENT_ID;

  if (!clientId || !process.env.GOOGLE_CLIENT_SECRET) {
    return NextResponse.redirect(`${origin}/login?error=google_not_configured`);
  }

  const state = randomBytes(24).toString('hex');
  const redirectTo = safeRedirectPath(url.searchParams.get('redirect'), '');

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: `${origin}/api/auth/google/callback`,
    response_type: 'code',
    scope: 'openid email profile',
    state,
    prompt: 'select_account',
  });

  const res = NextResponse.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
  const cookie = { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax' as const, maxAge: 600, path: '/' };
  res.cookies.set('g_oauth_state', state, cookie);
  if (redirectTo) res.cookies.set('g_oauth_redirect', redirectTo, cookie);
  return res;
}
