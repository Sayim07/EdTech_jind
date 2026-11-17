'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ThemeToggle } from '@/components/ThemeProvider';
import {
  BookOpen,
  ShieldCheck,
  LogOut,
  Compass,
  GraduationCap
} from 'lucide-react';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.user) setUser(data.user);
        else setUser(null);
      })
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, [pathname]);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setUser(null);
    router.push('/login');
    router.refresh();
  };

  return (
    <header className="sticky top-0 z-40 w-full h-16 min-h-[4rem] bg-white/95 dark:bg-ink-900/95 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 transition-colors shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center justify-between">
        {/* Brand */}
        <Link href={user?.role === 'ADMIN' ? '/admin' : user ? '/dashboard' : '/login'} className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-amber-600 text-white flex items-center justify-center font-bold text-base shadow-sm shrink-0">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div>
            <span className="font-serif text-lg font-bold tracking-tight text-gray-900 dark:text-white block leading-tight">
              CIM India
            </span>
            <span className="text-[10px] tracking-wider uppercase text-amber-700 dark:text-amber-400 font-bold block">
              {user?.role === 'ADMIN' ? 'Admin Portal' : 'Student Learning'}
            </span>
          </div>
        </Link>

        {/* Center Nav (Context-aware based on role) */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
          {user?.role === 'ADMIN' ? (
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-red-100 dark:bg-red-950/60 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 text-xs font-semibold">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Admin Mode</span>
            </div>
          ) : user ? (
            <>
              <Link
                href="/dashboard"
                className={`transition flex items-center gap-1.5 ${pathname === '/dashboard' ? 'text-amber-600 dark:text-amber-400 font-semibold' : 'text-gray-600 dark:text-gray-300 hover:text-amber-600'
                  }`}
              >
                <Compass className="w-4 h-4" />
                <span>Dashboard & Catalog</span>
              </Link>
              <Link
                href="/dashboard?tab=my_courses"
                className={`transition flex items-center gap-1.5 ${pathname.includes('tab=my_courses') ? 'text-amber-600 dark:text-amber-400 font-semibold' : 'text-gray-600 dark:text-gray-300 hover:text-amber-600'
                  }`}
              >
                <BookOpen className="w-4 h-4" />
                <span>My Courses</span>
              </Link>
            </>
          ) : null}
        </nav>

        {/* Right Actions: Theme Toggle & User Info / Logout */}
        <div className="flex items-center gap-3">
          {/* Dark / Light Mode Toggle Button */}
          <ThemeToggle />

          {!loading && user ? (
            <div className="flex items-center gap-2.5">
              <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 text-xs font-medium">
                <div className="w-6 h-6 rounded-lg bg-amber-600 text-white flex items-center justify-center font-bold text-[11px]">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <div className="hidden sm:block text-left">
                  <div className="font-semibold leading-tight">{user.name}</div>
                  <div className="text-[10px] text-gray-400 capitalize">{user.role.toLowerCase()}</div>
                </div>
              </div>

              <button
                onClick={handleLogout}
                className="p-2 rounded-xl text-gray-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
                title="Log Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : !loading && pathname !== '/login' && pathname !== '/' ? (
            <Link
              href="/login"
              className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shadow-sm transition active:scale-95"
            >
              Sign In
            </Link>
          ) : null}
        </div>
      </div>
    </header>
  );
}
