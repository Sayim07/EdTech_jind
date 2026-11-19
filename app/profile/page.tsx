import React from 'react';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getSessionUser, safeRedirectPath } from '@/lib/auth';
import { toFormData } from '@/lib/profile';
import { Navbar } from '@/components/Navbar';
import { MobileBottomNav } from '@/components/MobileBottomNav';
import { ProfileClient } from './ProfileClient';

export const metadata = { title: 'My Profile | CIM India' };

export default async function ProfilePage({ searchParams }: { searchParams: Promise<{ required?: string; next?: string }> }) {
  const user = await getSessionUser();
  if (!user) redirect('/login?redirect=/profile');
  const sp = await searchParams;
  const returnTo = safeRedirectPath(sp.next, '') || null;

  const enrollments = await prisma.enrollment.findMany({
    where: { userId: user.id },
    select: { status: true, certificateCode: true },
  });

  return (
    <>
      <Navbar wide />
      <main className="flex-1 pb-24 lg:pb-12">
        <ProfileClient
          user={{ name: user.name, email: user.email, role: user.role, avatarUrl: user.avatarUrl, createdAt: user.createdAt.toISOString() }}
          details={user.role === 'STUDENT' ? { initial: toFormData(user), returnTo, required: sp.required === '1' } : undefined}
          stats={{
            enrolled: enrollments.length,
            completed: enrollments.filter((e) => e.status === 'COMPLETED').length,
            certificates: enrollments.filter((e) => e.certificateCode).length,
          }}
        />
      </main>
      <MobileBottomNav role={user.role} isLoggedIn />
    </>
  );
}
