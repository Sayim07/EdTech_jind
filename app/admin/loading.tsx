import React from 'react';
import { Navbar } from '@/components/Navbar';
import { MobileBottomNav } from '@/components/MobileBottomNav';
import { AdminDashboardSkeleton } from '@/components/ui/Loaders';

export default function AdminLoading() {
  return (
    <>
      <Navbar />
      <main className="flex-1 pb-24 lg:pb-12 bg-gray-50 min-h-screen">
        <AdminDashboardSkeleton />
      </main>
      <MobileBottomNav role="ADMIN" isLoggedIn={true} />
    </>
  );
}
