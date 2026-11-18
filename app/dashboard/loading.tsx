import React from 'react';
import { Navbar } from '@/components/Navbar';
import { MobileBottomNav } from '@/components/MobileBottomNav';
import { DashboardSkeleton } from '@/components/ui/Loaders';

export default function DashboardLoading() {
  return (
    <>
      <Navbar />
      <main className="flex-1 pb-20 md:pb-10 bg-gray-50 min-h-screen">
        <DashboardSkeleton />
      </main>
      <MobileBottomNav role="STUDENT" isLoggedIn={true} />
    </>
  );
}
