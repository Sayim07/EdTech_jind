import React from 'react';
import { Navbar } from '@/components/Navbar';
import { MobileBottomNav } from '@/components/MobileBottomNav';
import { CoursesCatalogSkeleton } from '@/components/ui/Loaders';

export default function CoursesLoading() {
  return (
    <>
      <Navbar />
      <main className="flex-1 pb-20 md:pb-10 bg-gray-50 dark:bg-ink-950 min-h-screen">
        <CoursesCatalogSkeleton />
      </main>
      <MobileBottomNav role="STUDENT" isLoggedIn={true} />
    </>
  );
}
