import React from 'react';
import { Navbar } from '@/components/Navbar';
import { MobileBottomNav } from '@/components/MobileBottomNav';
import { Skeleton, PageSpinner } from '@/components/ui/Loaders';

export default function AdminCourseNewLoading() {
  return (
    <>
      <Navbar />
      <main className="flex-1 pb-24 md:pb-12 bg-gray-50 dark:bg-ink-950 min-h-screen">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
          <div className="flex items-center justify-between bg-white dark:bg-ink-900 p-5 rounded-2xl border border-gray-200 dark:border-gray-800">
            <div className="space-y-1.5">
              <Skeleton className="h-3.5 w-32 rounded" />
              <Skeleton className="h-6 w-56 rounded-md" />
            </div>
            <Skeleton className="h-9 w-28 rounded-xl" />
          </div>

          <PageSpinner message="Loading course publisher..." />
        </div>
      </main>
      <MobileBottomNav role="ADMIN" isLoggedIn={true} />
    </>
  );
}
