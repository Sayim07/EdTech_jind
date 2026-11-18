'use client';

import { Logo } from '@/components/Logo';
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Award,
  LogOut,
  Compass,
  LayoutDashboard,
  ClipboardList,
  UserRound,
  PlusCircle,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  avatarUrl?: string | null;
}

const STUDENT_LINKS = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, match: (p: string) => p === '/dashboard' },
  { href: '/courses', label: 'Courses', icon: Compass, match: (p: string) => p.startsWith('/courses') },
  { href: '/assignments', label: 'Assignments', icon: ClipboardList, match: (p: string) => p.startsWith('/assignments') },
  { href: '/purchases', label: 'Purchases & Certificates', icon: Award, match: (p: string) => p.startsWith('/purchases') || p.startsWith('/certificates') },
  { href: '/profile', label: 'Profile', icon: UserRound, match: (p: string) => p === '/profile' },
];

function pageTitle(pathname: string) {
  return STUDENT_LINKS.find((l) => l.match(pathname))?.label === 'Dashboard' ? 'My Dashboard' : STUDENT_LINKS.find((l) => l.match(pathname))?.label || 'CIM India';
}

// All pages use the full-width layout; `wide` is accepted for backwards compatibility.
export function Navbar(_props: { wide?: boolean }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [collapsed, setCollapsed] = useState(false);

  // The server renders the collapsed class from a cookie; mirror it into state for the toggle's label.
  useEffect(() => {
    setCollapsed(document.body.classList.contains('sidebar-collapsed'));
  }, []);

  const toggleSidebar = () => {
    const next = !document.body.classList.contains('sidebar-collapsed');
    document.body.classList.toggle('sidebar-collapsed', next);
    document.cookie = `sidebar=${next ? 'collapsed' : 'open'}; path=/; max-age=31536000; samesite=lax`;
    setCollapsed(next);
  };

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

  // Students get the desktop sidebar layout; keep the body class correct after client-side sign in / out.
  useEffect(() => {
    document.body.classList.toggle('role-student', user?.role === 'STUDENT');
  }, [user]);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setUser(null);
    router.push('/login');
    router.refresh();
  };

  const sidebar = (
    <aside className="app-sidebar fixed inset-y-0 left-0 z-50 flex-col overflow-hidden bg-white border-r border-gray-200" aria-label="Main navigation">
      <Link href="/dashboard" className="sidebar-head flex items-center gap-2.5 px-6 h-16 shrink-0" aria-label="CIM India dashboard">
        <Logo className="h-11" />
        <span className="sidebar-label text-lg font-bold tracking-tight text-gray-900 whitespace-nowrap">CIM India</span>
      </Link>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {STUDENT_LINKS.map((l) => {
          const active = l.match(pathname);
          return (
            <Link
              key={l.href}
              href={l.href}
              aria-current={active ? 'page' : undefined}
              title={l.label}
              className={`sidebar-link flex items-center gap-3 px-3.5 h-11 rounded-lg text-sm font-semibold transition focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_#e3eeff] ${
                active ? 'bg-amber-100 text-amber-700' : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              <l.icon className="w-[18px] h-[18px] shrink-0" aria-hidden />
              <span className="sidebar-label truncate">{l.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="px-3 pb-3">
        <button
          type="button"
          onClick={toggleSidebar}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="sidebar-link w-full flex items-center gap-3 px-3.5 h-11 rounded-lg text-sm font-semibold text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_#e3eeff]"
        >
          {collapsed ? <PanelLeftOpen className="w-[18px] h-[18px] shrink-0" aria-hidden /> : <PanelLeftClose className="w-[18px] h-[18px] shrink-0" aria-hidden />}
          <span className="sidebar-label">Collapse</span>
        </button>
      </div>

      <div className="sidebar-user border-t border-gray-200 p-4 flex items-center gap-3 min-h-[4.5rem]">
        {user ? (
          <>
            {user.avatarUrl ? (
              <img src={user.avatarUrl} alt="" referrerPolicy="no-referrer" className="w-10 h-10 rounded-full object-cover shrink-0" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-amber-600 text-white flex items-center justify-center font-semibold shrink-0" aria-hidden>
                {user.name.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="sidebar-label min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-gray-900">{user.name}</p>
              <button onClick={handleLogout} className="text-xs text-gray-600 hover:text-red-600 hover:underline transition">
                Log out
              </button>
            </div>
            <button onClick={handleLogout} aria-label="Log out" title="Log out" className="sidebar-collapsed-only w-9 h-9 items-center justify-center rounded-lg text-gray-600 hover:text-red-600 hover:bg-gray-100 transition">
              <LogOut className="w-4 h-4" aria-hidden />
            </button>
          </>
        ) : (
          <div className="w-full h-10 rounded-lg bg-gray-100 animate-pulse" aria-hidden />
        )}
      </div>
    </aside>
  );

  return (
    <>
    {sidebar}
    <header className="sticky top-0 z-40 w-full h-16 min-h-[4rem] bg-white border-b border-gray-200">
      <div className="w-full px-4 sm:px-6 lg:px-10 h-full flex items-center justify-between">
        <h2 className="nav-title text-lg font-semibold text-gray-900">{pageTitle(pathname)}</h2>
        {/* Brand */}
        <Link href={user?.role === 'ADMIN' ? '/admin' : user ? '/dashboard' : '/login'} className="nav-brand flex items-center gap-2.5">
          <Logo className="h-11" />
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
        <nav className="nav-center hidden lg:flex items-center gap-5 xl:gap-7 text-sm font-medium">
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
                <div className="nav-user-text hidden sm:block text-left">
                  <div className="font-semibold leading-tight">{user.name}</div>
                  <div className="text-xs text-gray-500 capitalize">{user.role.toLowerCase()}</div>
                </div>
              </Link>

              <button
                onClick={handleLogout}
                className="nav-logout p-2 rounded-xl text-gray-500 hover:text-red-600 hover:bg-gray-100 transition"
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
    </>
  );
}
