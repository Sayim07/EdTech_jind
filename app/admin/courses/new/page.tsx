import React from 'react';
import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/auth';
import { Navbar } from '@/components/Navbar';
import { MobileBottomNav } from '@/components/MobileBottomNav';
import { CreateCourseClient } from './CreateCourseClient';

export const metadata = {
  title: 'Publish New Masterclass | CIM India Admin',
  description: 'Create and publish authentic academic masterclasses, lecture videos, and slide decks.',
};

export default async function NewCoursePage() {
  const user = await getSessionUser();

  if (!user || user.role !== 'ADMIN') {
    redirect('/login?tab=admin&error=AdminAccessOnly');
  }

  return (
    <>
      <Navbar />

      <main className="flex-1 pb-24 md:pb-12 bg-gray-50 min-h-screen">
        <CreateCourseClient adminUser={user} />
      </main>

      <MobileBottomNav role="ADMIN" isLoggedIn={true} />
    </>
  );
}
