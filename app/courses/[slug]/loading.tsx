import React from 'react';
import { Navbar } from '@/components/Navbar';
import { MobileBottomNav } from '@/components/MobileBottomNav';
import { CourseDetailsSkeleton } from '@/components/ui/Loaders';

export default function CourseDetailLoading() {
  return (
    <>
      <Navbar />
      <main className="flex-1 min-h-screen bg-parchment-50">
        <CourseDetailsSkeleton />
      </main>
      <MobileBottomNav role="STUDENT" isLoggedIn={true} />
    </>
  );
}
