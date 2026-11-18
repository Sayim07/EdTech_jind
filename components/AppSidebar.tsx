'use client';

import React, { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { LogOut, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { Logo } from '@/components/Logo';
import { linksFor } from '@/components/nav-links';
import { clearSessionUser, useSessionUser } from '@/components/useSessionUser';
import { useInitialRole } from '@/components/SessionRole';

/** Pages that use the app shell. Everything else (login, classroom, certificates, home) has no sidebar. */
const SHELL_PREFIXES = ['/admin', '/assignments', '/checkout', '/courses', '/dashboard', '/profile', '/purchases'];
export const usesShell = (pathname: string) => SHELL_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));

function Links({ role, pathname, tab }: { role?: string; pathname: string; tab: string }) {
  return (
    <>
      {linksFor(role).map((l) => {
        const active = l.match(pathname, tab);
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
    </>
  );
}

/** ?tab= highlights the right admin link. Isolated so only this part waits on search params. */
function LiveLinks({ role, pathname }: { role?: string; pathname: string }) {
  const tab = useSearchParams().get('tab') || '';
  return <Links role={role} pathname={pathname} tab={tab} />;
}

/**
 * The sidebar lives in the root layout, so it is never torn down while you move between pages.
 * (It used to be rendered by every page, which made it vanish and reappear on each click.)
 */
export function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const initialRole = useInitialRole();
  const { user, loaded } = useSessionUser();
  const [collapsed, setCollapsed] = useState(false);

  const role = user?.role ?? (loaded ? undefined : initialRole);

  useEffect(() => {
    setCollapsed(document.body.classList.contains('sidebar-collapsed'));
  }, []);

  // Keep the layout class right after a client-side sign in or out. Never remove it while still loading.
  useEffect(() => {
    if (!loaded) return;
    document.body.classList.toggle('role-sidebar', user?.role === 'STUDENT' || user?.role === 'ADMIN');
  }, [user, loaded]);

  const toggleSidebar = () => {
    const next = !document.body.classList.contains('sidebar-collapsed');
    document.body.classList.toggle('sidebar-collapsed', next);
    document.cookie = `sidebar=${next ? 'collapsed' : 'open'}; path=/; max-age=31536000; samesite=lax`;
    setCollapsed(next);
  };

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    clearSessionUser();
    router.push('/login');
    router.refresh();
  };

  if (!usesShell(pathname) || (role !== 'STUDENT' && role !== 'ADMIN')) return null;

  return (
    <aside className="app-sidebar fixed inset-y-0 left-0 z-50 flex-col overflow-hidden bg-white border-r border-gray-200" aria-label="Main navigation">
      <Link href={role === 'ADMIN' ? '/admin?tab=home' : '/dashboard'} className="sidebar-head flex items-center gap-2.5 px-6 h-16 shrink-0" aria-label="CIM India home">
        <Logo className="h-11" />
        <span className="sidebar-label text-lg font-bold tracking-tight text-gray-900 whitespace-nowrap">CIM India</span>
      </Link>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        <Suspense fallback={<Links role={role} pathname={pathname} tab="" />}>
          <LiveLinks role={role} pathname={pathname} />
        </Suspense>
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
              <button onClick={logout} className="text-xs text-gray-600 hover:text-red-600 hover:underline transition">
                Log out
              </button>
            </div>
            <button onClick={logout} aria-label="Log out" title="Log out" className="sidebar-collapsed-only w-9 h-9 items-center justify-center rounded-lg text-gray-600 hover:text-red-600 hover:bg-gray-100 transition">
              <LogOut className="w-4 h-4" aria-hidden />
            </button>
          </>
        ) : (
          <div className="w-full h-10 rounded-lg bg-gray-100 animate-pulse" aria-hidden />
        )}
      </div>
    </aside>
  );
}
