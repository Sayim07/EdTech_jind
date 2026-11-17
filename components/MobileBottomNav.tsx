'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Compass, BookOpen, User, ShieldCheck } from 'lucide-react';

interface Props {
  role?: string;
  isLoggedIn?: boolean;
}

export function MobileBottomNav({ role, isLoggedIn }: Props) {
  const pathname = usePathname();

  // Hide on deep classroom player view to give max screen space to the video
  if (pathname.startsWith('/learn/')) {
    return null;
  }

  const items = [
    { label: 'Home', href: '/', icon: Home, active: pathname === '/' },
    { label: 'Courses', href: '/courses', icon: Compass, active: pathname.startsWith('/courses') },
    { label: 'My Learning', href: '/dashboard', icon: BookOpen, active: pathname.startsWith('/dashboard') },
    role === 'ADMIN'
      ? { label: 'Admin', href: '/admin', icon: ShieldCheck, active: pathname.startsWith('/admin') }
      : { label: isLoggedIn ? 'Profile' : 'Login', href: '/login', icon: User, active: pathname === '/login' },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-ink-950/95 backdrop-blur-md border-t border-gray-200 dark:border-gray-800 pb-safe">
      <div className="grid grid-cols-4 h-16">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.label}
              href={item.href}
              className={`flex flex-col items-center justify-center gap-1 transition ${
                item.active
                  ? 'text-amber-600 dark:text-amber-500 font-semibold'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              <Icon className={`w-5 h-5 ${item.active ? 'stroke-[2.5]' : 'stroke-2'}`} />
              <span className="text-[11px] leading-tight">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
