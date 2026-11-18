'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Compass, LayoutDashboard, Award, User, ShieldCheck, ClipboardList } from 'lucide-react';

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

  const items =
    role === 'ADMIN'
      ? [
          { label: 'Courses', href: '/courses', icon: Compass, active: pathname.startsWith('/courses') },
          { label: 'Admin', href: '/admin', icon: ShieldCheck, active: pathname.startsWith('/admin') },
        ]
      : isLoggedIn
      ? [
          { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, active: pathname.startsWith('/dashboard') },
          { label: 'Courses', href: '/courses', icon: Compass, active: pathname.startsWith('/courses') },
          { label: 'Assignments', href: '/assignments', icon: ClipboardList, active: pathname.startsWith('/assignments') },
          { label: 'Purchases', href: '/purchases', icon: Award, active: pathname.startsWith('/purchases') || pathname.startsWith('/certificates') },
          { label: 'Profile', href: '/profile', icon: User, active: pathname === '/profile' },
        ]
      : [
          { label: 'Courses', href: '/courses', icon: Compass, active: pathname.startsWith('/courses') },
          { label: 'Login', href: '/login', icon: User, active: pathname === '/login' },
        ];

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 border-t border-gray-200 pb-safe">
      <div className="grid h-16" style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}>
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.label}
              href={item.href}
              className={`flex flex-col items-center justify-center gap-1 transition ${
                item.active
                  ? 'text-amber-600 font-semibold'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              <Icon className={`w-5 h-5 ${item.active ? 'stroke-[2.5]' : 'stroke-2'}`} />
              <span className="text-xs leading-tight">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
