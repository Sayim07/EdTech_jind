import React from 'react';
import { Navbar } from '@/components/Navbar';
import { MobileBottomNav } from '@/components/MobileBottomNav';
import { Skeleton, PageSpinner } from '@/components/ui/Loaders';

export default function AdminCourseEditLoading() {
  return (
    <>
      <Navbar />
      <main className="flex-1 pb-24 lg:pb-12 bg-gray-50 min-h-screen">
        <div className="w-full px-4 sm:px-6 lg:px-10 py-6 sm:py-8 space-y-6">
          <div className="flex items-center justify-between bg-white p-5 rounded-2xl border border-gray-200">
            <div className="space-y-1.5">
              <Skeleton className="h-3.5 w-32 rounded" />
              <Skeleton className="h-6 w-56 rounded-md" />
            </div>
            <Skeleton className="h-9 w-28 rounded-xl" />
          </div>

          <PageSpinner message="Loading course editor..." />
        </div>
      </main>
      <MobileBottomNav role="ADMIN" isLoggedIn={true} />
    </>
  );
}
