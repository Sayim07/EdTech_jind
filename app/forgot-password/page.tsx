'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { AlertCircle, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { AuthShell } from '@/components/auth/AuthShell';
import { ButtonSpinner } from '@/components/ui/Loaders';
import { Logo } from '@/components/Logo';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const [devLink, setDevLink] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Something went wrong');
      setSent(true);
      if (data.devResetLink) setDevLink(data.devResetLink);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell>
      <div className="w-full max-w-md mx-auto my-auto flex flex-col gap-4 sm:gap-5">
        <div className="flex items-center justify-center gap-2.5">
          <Logo className="h-14 sm:h-20" />
        </div>

        <div className="text-center">
          <h1 className="text-2xl sm:text-4xl font-semibold text-gray-900 leading-tight">Forgot your password?</h1>
          <p className="mt-1 text-sm sm:text-base text-gray-600">
            Enter the email you signed up with and we will send you a link to choose a new one.
          </p>
        </div>

        {sent ? (
          <div className="space-y-4">
            <div role="status" className="p-4 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-start gap-2">
              <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
              <span>If an account exists for that email, a password reset link is on its way. The link expires in 1 hour.</span>
            </div>
            {devLink && (
              <div className="p-3 rounded-lg bg-warm text-gray-900 text-sm break-all">
                <p className="font-semibold mb-1">Local development only: email is not configured.</p>
                <a href={devLink} className="underline text-amber-700">
                  Open the reset link
                </a>
              </div>
            )}
          </div>
        ) : (
          <form onSubmit={submit} className="flex flex-col gap-3 sm:gap-4">
            {error && (
              <div role="alert" className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}
            <div>
              <label htmlFor="fp-email" className="block text-sm font-semibold text-gray-700 mb-1">
                Email
              </label>
              <input
                id="fp-email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full h-11 px-3.5 rounded-lg border border-gray-300 bg-white text-gray-900 text-base placeholder-gray-400 focus:outline-none focus:border-amber-600 focus:shadow-[0_0_0_3px_#e3eeff] transition"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 rounded-lg bg-amber-600 hover:bg-[#0060eb] text-white font-semibold text-base transition active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {loading ? <ButtonSpinner label="Sending..." /> : 'Send reset link'}
            </button>
          </form>
        )}

        <Link href="/login" className="text-sm font-semibold text-amber-600 hover:underline flex items-center justify-center gap-1.5">
          <ArrowLeft className="w-4 h-4" /> Back to log in
        </Link>
      </div>
    </AuthShell>
  );
}
