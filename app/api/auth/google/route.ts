import { NextRequest, NextResponse } from 'next/server';
import { createHash, randomBytes } from 'crypto';
import { appOrigin, safeRedirectPath } from '@/lib/auth';

/**
 * Step 1 of Google sign-in, through Supabase Auth. Supabase only proves who the person is (it talks to Google using
 * the credentials saved in its dashboard). The app then signs the person in with its own session, so roles, profiles,
 * payments and chat keep working unchanged. PKCE: the secret verifier stays in a cookie, the browser only sees its hash.
 */
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const origin = appOrigin(req.url);
  const supabaseUrl = process.env.SUPABASE_URL?.replace(/\/$/, '');

  if (!supabaseUrl || !process.env.SUPABASE_ANON_KEY) {
    return NextResponse.redirect(`${origin}/login?error=google_not_configured`);
  }

  const verifier = randomBytes(48).toString('base64url');
  const challenge = createHash('sha256').update(verifier).digest('base64url');
  const redirectTo = safeRedirectPath(url.searchParams.get('redirect'), '');

  const params = new URLSearchParams({
    provider: 'google',
    redirect_to: `${origin}/api/auth/google/callback`,
    code_challenge: challenge,
    code_challenge_method: 's256',
    // Always offer the account chooser, so a shared computer does not silently reuse the last Google account.
    prompt: 'select_account',
  });

  const res = NextResponse.redirect(`${supabaseUrl}/auth/v1/authorize?${params}`);
  const cookie = { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax' as const, maxAge: 600, path: '/' };
  res.cookies.set('g_oauth_verifier', verifier, cookie);
  if (redirectTo) res.cookies.set('g_oauth_redirect', redirectTo, cookie);
  return res;
}
