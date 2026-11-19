'use client';

import { Logo } from '@/components/Logo';
import { resetChat } from '@/components/chat/client';
import React, { Suspense } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { LogOut } from 'lucide-react';
import { linksFor } from '@/components/nav-links';
import { clearSessionUser, useSessionUser } from '@/components/useSessionUser';
import { useInitialRole } from '@/components/SessionRole';

function LivePageTitle({ role, pathname }: { role?: string; pathname: string }) {
  const tab = useSearchParams().get('tab') || '';
  return <PageTitleText role={role} pathname={pathname} tab={tab} />;
}

function PageTitleText({ role, pathname, tab }: { role?: string; pathname: string; tab: string }) {
  const hit = linksFor(role).find((l) => l.match(pathname, tab));
  return <>{hit ? hit.title || hit.label : 'CIM India'}</>;
}

/**
 * Top bar. The desktop sidebar is not rendered here any more: it lives in the root layout (AppSidebar)
 * so it stays put while pages change. Pages still render <Navbar /> for the header.
 * All pages use the full-width layout; `wide` is accepted for backwards compatibility.
 */
export function Navbar(_props: { wide?: boolean }) {
  const pathname = usePathname();
  const router = useRouter();
  const initialRole = useInitialRole();
  const { user, loaded } = useSessionUser();
  const loading = !loaded && !user;
  const role = user?.role ?? (loaded ? undefined : initialRole);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    resetChat();
    clearSessionUser();
    router.push('/login');
    router.refresh();
  };

  return (
    <header className="sticky top-0 z-40 w-full h-16 min-h-[4rem] bg-white border-b border-gray-200">
      <div className="w-full px-4 sm:px-6 lg:px-10 h-full flex items-center justify-between">
        <h2 className="nav-title text-lg font-semibold text-gray-900"><Suspense fallback={<PageTitleText role={role} pathname={pathname} tab="" />}>
            <LivePageTitle role={role} pathname={pathname} />
          </Suspense></h2>
        {/* Brand */}
        <Link href={role === 'ADMIN' ? '/admin?tab=home' : role === 'INSTRUCTOR' ? '/messages' : user ? '/dashboard' : '/login'} className="nav-brand flex items-center gap-2.5">
          <Logo className="h-11" />
          <div>
            <span className="font-sans text-lg font-bold tracking-tight text-gray-900 block leading-tight">
              CIM India
            </span>
            <span className="text-xs text-amber-700 font-bold block">
              {role === 'ADMIN' ? 'Admin Portal' : role === 'INSTRUCTOR' ? 'Instructor Portal' : 'Student Learning'}
            </span>
          </div>
        </Link>


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
  );
}
