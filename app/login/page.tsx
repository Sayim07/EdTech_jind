'use client';

import React, { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ThemeToggle } from '@/components/ThemeProvider';
import { ButtonSpinner } from '@/components/ui/Loaders';
import { 
  GraduationCap, 
  AlertCircle, 
  ArrowRight, 
  Mail, 
  User, 
  Lock 
} from 'lucide-react';

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialMode = searchParams.get('mode') === 'register' ? 'register' : 'login';

  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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
        router.push('/dashboard');
        router.refresh();
      } else {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Invalid email or password');

        // Automatically route according to role detected from credentials!
        if (data.user?.role === 'ADMIN') {
          router.push('/admin');
        } else {
          router.push('/dashboard');
        }
        router.refresh();
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-sm space-y-6">
      {/* Brand Header */}
      <div className="text-center space-y-2">
        <div className="w-12 h-12 rounded-2xl bg-amber-600 text-white flex items-center justify-center mx-auto shadow-md">
          <GraduationCap className="w-7 h-7" />
        </div>
        <h1 className="text-2xl font-serif font-bold text-gray-900 dark:text-white tracking-tight">
          {mode === 'register' ? 'Create an Account' : 'Welcome Back'}
        </h1>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {mode === 'register'
            ? 'Sign up to start exploring masterclasses'
            : 'Enter your credentials to access your dashboard'}
        </p>
      </div>

      {/* Clean Card */}
      <div className="bg-white dark:bg-ink-900 p-6 sm:p-7 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-lg space-y-4 transition-colors">
        {error && (
          <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'register' && (
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Full Name
              </label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3.5 top-3 text-gray-400" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Aarav Sharma"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-ink-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3.5 top-3 text-gray-400" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-ink-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3.5 top-3 text-gray-400" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-ink-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold text-sm transition shadow-sm active:scale-95 disabled:opacity-75 flex items-center justify-center gap-2 mt-1"
          >
            {loading ? (
              <ButtonSpinner label="Verifying..." />
            ) : (
              <>
                <span>{mode === 'register' ? 'Create Account' : 'Sign In'}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Minimal Toggle Link */}
        <div className="pt-2 text-center text-xs text-gray-500 dark:text-gray-400">
          {mode === 'login' ? (
            <span>
              New student?{' '}
              <button
                type="button"
                onClick={() => {
                  setMode('register');
                  setError('');
                }}
                className="text-amber-600 dark:text-amber-400 font-semibold hover:underline"
              >
                Create an account
              </button>
            </span>
          ) : (
            <span>
              Already registered?{' '}
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setError('');
                }}
                className="text-amber-600 dark:text-amber-400 font-semibold hover:underline"
              >
                Sign in here
              </button>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-ink-950 flex flex-col transition-colors duration-200">
      {/* Top minimal header with Theme Toggle */}
      <header className="h-16 px-4 sm:px-8 flex items-center justify-between max-w-7xl w-full mx-auto">
        <div className="flex items-center gap-2.5 font-serif font-bold text-gray-900 dark:text-white text-base">
          <div className="w-8 h-8 rounded-xl bg-amber-600 text-white flex items-center justify-center shadow-sm">
            <GraduationCap className="w-4 h-4" />
          </div>
          <span className="font-serif text-lg font-bold tracking-tight text-gray-900 dark:text-white">
            CIM India
          </span>
        </div>
        <ThemeToggle />
      </header>

      {/* Main Login View */}
      <main className="flex-1 flex items-center justify-center px-4 py-8">
        <Suspense fallback={<div className="text-xs text-gray-400">Loading...</div>}>
          <LoginContent />
        </Suspense>
      </main>

      <footer className="py-4 text-center text-xs text-gray-400">
        © 2026 CIM India. All rights reserved.
      </footer>
    </div>
  );
}
