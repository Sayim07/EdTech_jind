import React from 'react';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { Navbar } from '@/components/Navbar';
import { MobileBottomNav } from '@/components/MobileBottomNav';
import { StaffClient, type StaffRow } from './StaffClient';

export const metadata = { title: 'Staff | CIM India Admin' };
export const dynamic = 'force-dynamic';

export default async function StaffPage() {
  const user = await getSessionUser();
  if (!user || user.role !== 'ADMIN') redirect('/login?tab=admin&error=AdminAccessOnly');

  const staff = await prisma.staffMember.findMany({ orderBy: [{ active: 'desc' }, { name: 'asc' }] });
  const rows: StaffRow[] = staff.map((s) => ({
    id: s.id,
    name: s.name,
    email: s.email,
    phone: s.phone,
    role: s.role as StaffRow['role'],
    designation: s.designation,
    bio: s.bio,
    active: s.active,
  }));

  return (
    <>
      <Navbar />
      <main className="flex-1 pb-24 lg:pb-12 bg-gray-50 min-h-screen">
        <StaffClient initial={rows} />
      </main>
      <MobileBottomNav role="ADMIN" isLoggedIn />
    </>
  );
}
