'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Award,
  LogOut,
  Compass,
  GraduationCap,
  LayoutDashboard,
  ClipboardList,
  UserRound,
  PlusCircle,
} from 'lucide-react';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  avatarUrl?: string | null;
}

// All pages use the full-width layout; `wide` is accepted for backwards compatibility.
export function Navbar(_props: { wide?: boolean }) {
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
    <header className="sticky top-0 z-40 w-full h-16 min-h-[4rem] bg-white border-b border-gray-200">
      <div className="w-full px-4 sm:px-6 lg:px-10 h-full flex items-center justify-between">
        {/* Brand */}
        <Link href={user?.role === 'ADMIN' ? '/admin' : user ? '/dashboard' : '/login'} className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-amber-600 text-white flex items-center justify-center shrink-0">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div>
            <span className="font-sans text-lg font-bold tracking-tight text-gray-900 block leading-tight">
              CIM India
            </span>
            <span className="text-xs text-amber-700 font-bold block">
              {user?.role === 'ADMIN' ? 'Admin Portal' : 'Student Learning'}
            </span>
          </div>
        </Link>

        {/* Center Nav (Context-aware based on role: students have learning links, admin navigation is on the page tabs) */}
        <nav className="hidden lg:flex items-center gap-5 xl:gap-7 text-sm font-medium">
          {user && user.role !== 'ADMIN' ? (
            <>
              {[
                { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, active: pathname === '/dashboard' },
                { href: '/courses', label: 'Courses', icon: Compass, active: pathname.startsWith('/courses') },
                { href: '/assignments', label: 'Assignments', icon: ClipboardList, active: pathname.startsWith('/assignments') },
                { href: '/purchases', label: 'Purchases & Certificates', icon: Award, active: pathname.startsWith('/purchases') || pathname.startsWith('/certificates') },
                { href: '/profile', label: 'Profile', icon: UserRound, active: pathname === '/profile' },
              ].map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  aria-current={l.active ? 'page' : undefined}
                  className={`transition flex items-center gap-1.5 whitespace-nowrap ${l.active ? 'text-amber-600 font-semibold' : 'text-gray-600 hover:text-amber-600'}`}
                >
                  <l.icon className="w-4 h-4" />
                  <span>{l.label}</span>
                </Link>
              ))}
            </>
          ) : null}
        </nav>

        {/* Right Actions: User Info / Logout */}
        <div className="flex items-center gap-3">
          {!loading && user ? (
            <div className="flex items-center gap-2.5">
              <Link
                href={user.role === 'ADMIN' ? '/admin?tab=profile' : '/profile'}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-medium transition cursor-pointer"
                title="View Profile"
              >
                {user.avatarUrl ? (
                  <img src={user.avatarUrl} alt="" referrerPolicy="no-referrer" className="w-7 h-7 rounded-full object-cover" />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-amber-600 text-white flex items-center justify-center font-bold text-xs">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="hidden sm:block text-left">
                  <div className="font-semibold leading-tight">{user.name}</div>
                  <div className="text-xs text-gray-500 capitalize">{user.role.toLowerCase()}</div>
                </div>
              </Link>

              <button
                onClick={handleLogout}
                className="p-2 rounded-xl text-gray-500 hover:text-red-600 hover:bg-gray-100 transition"
                title="Log Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : !loading && pathname !== '/login' && pathname !== '/' ? (
            <Link
              href="/login"
              className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-[#0060eb] text-white text-xs font-semibold shadow-sm transition active:scale-95"
            >
              Sign In
            </Link>
          ) : null}
        </div>
      </div>
    </header>
  );
}
