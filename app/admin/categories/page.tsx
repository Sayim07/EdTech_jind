import React from 'react';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { Navbar } from '@/components/Navbar';
import { MobileBottomNav } from '@/components/MobileBottomNav';
import { CategoriesClient, type CategoryRow } from './CategoriesClient';

export const metadata = { title: 'Categories | CIM India Admin' };
export const dynamic = 'force-dynamic';

export default async function CategoriesPage() {
  const user = await getSessionUser();
  if (!user || user.role !== 'ADMIN') redirect('/login?tab=admin&error=AdminAccessOnly');

  const [categories, counts] = await Promise.all([
    prisma.category.findMany({ orderBy: { name: 'asc' } }),
    prisma.course.groupBy({ by: ['category'], _count: { _all: true } }),
  ]);
  const used = new Map(counts.map((c) => [c.category, c._count._all]));
  const rows: CategoryRow[] = categories.map((c) => ({ id: c.id, name: c.name, description: c.description, courses: used.get(c.name) ?? 0 }));

  return (
    <>
      <Navbar />
      <main className="flex-1 pb-24 lg:pb-12 bg-gray-50 min-h-screen">
        <CategoriesClient initial={rows} />
      </main>
      <MobileBottomNav role="ADMIN" isLoggedIn />
    </>
  );
}
