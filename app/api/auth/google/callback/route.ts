import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { AUTH_COOKIE_OPTIONS, appOrigin, safeRedirectPath, signToken } from '@/lib/auth';

// Step 2 of Google sign-in: Supabase sends the browser back with a one-time code. Exchange it (together with the secret
// verifier from step 1) for the verified Google identity, then sign the user in with the app's own session.
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const origin = appOrigin(req.url);
  const fail = (code: string) => {
    const res = NextResponse.redirect(`${origin}/login?error=${code}`);
    res.cookies.delete('g_oauth_verifier');
    res.cookies.delete('g_oauth_redirect');
    return res;
  };

  try {
    const supabaseUrl = process.env.SUPABASE_URL?.replace(/\/$/, '');
    const anonKey = process.env.SUPABASE_ANON_KEY;
    if (!supabaseUrl || !anonKey) return fail('google_not_configured');

    const code = url.searchParams.get('code');
    const verifier = req.cookies.get('g_oauth_verifier')?.value;
    if (url.searchParams.get('error') || url.searchParams.get('error_code')) return fail('google_cancelled');
    if (!code || !verifier) return fail('google_failed');

    const tokenRes = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=pkce`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: anonKey },
      body: JSON.stringify({ auth_code: code, code_verifier: verifier }),
      cache: 'no-store',
    });
    if (!tokenRes.ok) return fail('google_failed');
    const session = await tokenRes.json();
    const su = session?.user;
    if (!su?.email) return fail('google_failed');

    const googleIdentity = (su.identities || []).find((i: any) => i.provider === 'google');
    if (su.app_metadata?.provider !== 'google' && !googleIdentity) return fail('google_failed');

    // Only trust Google accounts whose email Google has verified.
    const verified = su.user_metadata?.email_verified === true || googleIdentity?.identity_data?.email_verified === true || Boolean(su.email_confirmed_at);
    if (!verified) return fail('google_unverified');

    const email = String(su.email).toLowerCase();
    const googleId = String(googleIdentity?.identity_data?.sub || su.user_metadata?.provider_id || su.id);
    const name = String(su.user_metadata?.full_name || su.user_metadata?.name || email.split('@')[0]).slice(0, 80);
    const picture: string | null = su.user_metadata?.avatar_url || su.user_metadata?.picture || null;

    let user = await prisma.user.findUnique({ where: { googleId } });

    if (!user) {
      const byEmail = await prisma.user.findUnique({ where: { email } });
      if (byEmail) {
        // Same verified email: link the Google sign-in to the existing account.
        user = await prisma.user.update({ where: { id: byEmail.id }, data: { googleId, avatarUrl: byEmail.avatarUrl || picture } });
      } else {
        user = await prisma.user.create({
          data: {
            email,
            name,
            avatarUrl: picture,
            googleId,
            role: 'STUDENT',
            // Google accounts have no password; store an unguessable one. They can set one via "Forgot password".
            passwordHash: await bcrypt.hash(randomBytes(32).toString('hex'), 10),
          },
        });
      }
    }

    const token = await signToken({ userId: user.id, email: user.email, name: user.name, role: user.role });
    const fallback = user.role === 'ADMIN' ? '/admin?tab=home' : user.role === 'INSTRUCTOR' ? '/messages' : '/dashboard';
    const target = safeRedirectPath(req.cookies.get('g_oauth_redirect')?.value, fallback);

    const res = NextResponse.redirect(`${origin}${target}`);
    res.cookies.set('auth_token', token, AUTH_COOKIE_OPTIONS);
    res.cookies.delete('g_oauth_verifier');
    res.cookies.delete('g_oauth_redirect');
    return res;
  } catch (err) {
    console.error('Google sign-in error:', err);
    return fail('google_failed');
  }
}
