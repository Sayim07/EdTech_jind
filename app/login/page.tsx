'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { AuthShell } from '@/components/auth/AuthShell';
import { useRouter, useSearchParams } from 'next/navigation';
import { ButtonSpinner } from '@/components/ui/Loaders';
import {
  GraduationCap,
  AlertCircle,
  ArrowRight,
  Eye,
  EyeOff,
} from 'lucide-react';

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialMode = searchParams.get('mode') === 'register' ? 'register' : 'login';
  const rawRedirect = searchParams.get('redirect');
  // Only same-site paths are honoured after login.
  const redirectTo = rawRedirect && rawRedirect.startsWith('/') && !rawRedirect.startsWith('//') && !rawRedirect.includes(String.fromCharCode(92)) ? rawRedirect : '';
  const GOOGLE_ERRORS: Record<string, string> = {
    google_not_configured: 'Google sign-in is not set up yet. Please use your email and password.',
    google_cancelled: 'Google sign-in was cancelled.',
    google_unverified: 'Your Google email address is not verified.',
    google_failed: 'Google sign-in failed. Please try again.',
  };
  const urlError = searchParams.get('error');

  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState(urlError ? GOOGLE_ERRORS[urlError] || '' : '');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (mode === 'register') {
        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, email, password }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to create account');
        router.push(redirectTo || '/dashboard');
        router.refresh();
      } else {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Invalid email or password');

        // Route according to the role detected from the credentials.
        if (data.user?.role === 'ADMIN') {
          router.push('/admin');
        } else {
          router.push(redirectTo || '/dashboard');
        }
        router.refresh();
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (m: 'login' | 'register') => {
    setMode(m);
    setError('');
  };

  const inputCls =
    'w-full h-10 sm:h-11 px-3.5 rounded-lg border border-gray-300 bg-white text-gray-900 text-base placeholder-gray-400 focus:outline-none focus:border-amber-600 focus:shadow-[0_0_0_3px_#e3eeff] transition';

  return (
    <div className="w-full max-w-md mx-auto my-auto flex flex-col gap-2.5 sm:gap-5">
      <div className="hidden [@media(min-height:760px)]:flex lg:flex items-center justify-center gap-2.5">
        <div className="w-9 h-9 rounded-lg bg-amber-600 text-white flex items-center justify-center shrink-0">
          <GraduationCap className="w-5 h-5" />
        </div>
        <span className="text-xl font-semibold text-gray-900">CIM India</span>
      </div>

      <div role="tablist" aria-label="Account" className="grid grid-cols-2 gap-1 p-1 rounded-lg bg-gray-100">
        {(['register', 'login'] as const).map((m) => (
          <button
            key={m}
            type="button"
            role="tab"
            aria-selected={mode === m}
            onClick={() => switchMode(m)}
            className={`h-9 rounded-md text-sm font-semibold transition active:scale-[0.98] ${
              mode === m ? 'bg-amber-600 text-white' : 'text-gray-700 hover:bg-white'
            }`}
          >
            {m === 'register' ? 'Sign Up' : 'Log In'}
          </button>
        ))}
      </div>

      <div className="text-center">
        <h1 className="text-2xl sm:text-4xl font-semibold text-gray-900 leading-tight">
          {mode === 'register' ? 'Start learning today' : 'Welcome back'}
        </h1>
        <p className="mt-1 text-sm sm:text-base text-gray-600 hidden [@media(min-height:700px)]:block">
          {mode === 'register'
            ? 'Create an account to explore our masterclasses.'
            : 'Log in to continue your courses.'}
        </p>
      </div>

      {error && (
        <div role="alert" className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-2.5 sm:gap-4">
        {mode === 'register' && (
          <div>
            <label htmlFor="name" className="block text-sm font-semibold text-gray-700 mb-1">
              Full name
            </label>
            <input
              id="name"
              type="text"
              required
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Aarav Sharma"
              className={inputCls}
            />
          </div>
        )}
        <div>
          <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-1">
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@example.com"
            className={inputCls}
          />
        </div>
        <div>
          <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-1">
            Password
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              required
              autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              className={`${inputCls} pr-11`}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              className="absolute right-1 top-1 w-9 h-9 rounded-md flex items-center justify-center text-gray-500 hover:text-amber-700 hover:bg-gray-100 transition"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {mode === 'login' && (
            <div className="mt-1.5 text-right">
              <Link href="/forgot-password" className="text-sm font-semibold text-amber-600 hover:underline">
                Forgot password?
              </Link>
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full h-10 sm:h-11 rounded-lg bg-amber-600 hover:bg-[#0060eb] text-white font-semibold text-base transition active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-1"
        >
          {loading ? (
            <ButtonSpinner label="Verifying..." />
          ) : (
            <>
              <span>{mode === 'register' ? 'Create account' : 'Log in'}</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>

      <div className="flex items-center gap-3 text-xs text-gray-600" role="separator">
        <span className="h-px flex-1 bg-gray-200" />
        <span>or</span>
        <span className="h-px flex-1 bg-gray-200" />
      </div>

      <a
        href={`/api/auth/google${redirectTo ? `?redirect=${encodeURIComponent(redirectTo)}` : ''}`}
        className="h-10 sm:h-11 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 text-gray-900 font-semibold text-sm sm:text-base flex items-center justify-center gap-3 transition active:scale-[0.98]"
      >
        <svg className="w-5 h-5" viewBox="0 0 48 48" aria-hidden="true">
          <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z" />
          <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4.1 7.1-10.1 7.1-17.5z" />
          <path fill="#FBBC05" d="M10.5 28.7c-.5-1.5-.8-3-.8-4.7s.3-3.2.8-4.7l-7.9-6.1C.9 16.4 0 20.100 0 24s.9 7.600 2.600 10.800l7.900-6.100z" />
          <path fill="#34A853" d="M24 48c6.500 0 12-2.100 16-5.800l-7.500-5.800c-2.100 1.400-4.800 2.300-8.500 2.300-6.300 0-11.600-4.100-13.500-9.800l-7.900 6.100C6.500 42.600 14.600 48 24 48z" />
        </svg>
        <span>Continue with Google</span>
      </a>

      <p className="text-sm text-gray-600 text-center">
        {mode === 'login' ? 'New student? ' : 'Already registered? '}
        <button
          type="button"
          onClick={() => switchMode(mode === 'login' ? 'register' : 'login')}
          className="text-amber-600 font-semibold hover:underline"
        >
          {mode === 'login' ? 'Create an account' : 'Log in'}
        </button>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <AuthShell>
      <Suspense fallback={<div className="text-sm text-gray-500 m-auto">Loading...</div>}>
        <LoginContent />
      </Suspense>
    </AuthShell>
  );
}
