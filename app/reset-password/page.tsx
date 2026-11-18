'use client';

import React, { Suspense, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { AuthShell } from '@/components/auth/AuthShell';
import { ButtonSpinner } from '@/components/ui/Loaders';
import { Logo } from '@/components/Logo';

const inputCls =
  'w-full h-11 px-3.5 rounded-lg border border-gray-300 bg-white text-gray-900 text-base placeholder-gray-400 focus:outline-none focus:border-amber-600 focus:shadow-[0_0_0_3px_#e3eeff] transition';

function ResetContent() {
  const token = useSearchParams().get('token') || '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password !== confirm) {
      setError('The passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Something went wrong');
      setDone(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto my-auto flex flex-col gap-4 sm:gap-5">
      <div className="flex items-center justify-center gap-2.5">
        <Logo className="h-14 sm:h-20" />
      </div>

      <div className="text-center">
        <h1 className="text-2xl sm:text-4xl font-semibold text-gray-900 leading-tight">Choose a new password</h1>
        <p className="mt-1 text-sm sm:text-base text-gray-600">Use at least 8 characters.</p>
      </div>

      {done ? (
        <div className="space-y-4">
          <div role="status" className="p-4 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-start gap-2">
            <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
            <span>Your password has been changed. You can now log in.</span>
          </div>
          <Link href="/login" className="w-full h-11 rounded-lg bg-amber-600 hover:bg-[#0060eb] text-white font-semibold flex items-center justify-center transition">
            Go to log in
          </Link>
        </div>
      ) : !token ? (
        <div role="alert" className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
          This reset link is invalid. Please{' '}
          <Link href="/forgot-password" className="font-semibold underline">
            request a new one
          </Link>
          .
        </div>
      ) : (
        <form onSubmit={submit} className="flex flex-col gap-3 sm:gap-4">
          {error && (
            <div role="alert" className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>
                {error}{' '}
                {error.includes('expired') && (
                  <Link href="/forgot-password" className="font-semibold underline">
                    Request a new link
                  </Link>
                )}
              </span>
            </div>
          )}
          <div>
            <label htmlFor="rp-password" className="block text-sm font-semibold text-gray-700 mb-1">
              New password
            </label>
            <input id="rp-password" type="password" required minLength={8} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label htmlFor="rp-confirm" className="block text-sm font-semibold text-gray-700 mb-1">
              Confirm new password
            </label>
            <input id="rp-confirm" type="password" required minLength={8} autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className={inputCls} />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full h-11 rounded-lg bg-amber-600 hover:bg-[#0060eb] text-white font-semibold text-base transition active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {loading ? <ButtonSpinner label="Saving..." /> : 'Change password'}
          </button>
        </form>
      )}
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <AuthShell>
      <Suspense fallback={<div className="text-sm text-gray-500 m-auto">Loading...</div>}>
        <ResetContent />
      </Suspense>
    </AuthShell>
  );
}
