import React from 'react';
import { Navbar } from '@/components/Navbar';
import { MobileBottomNav } from '@/components/MobileBottomNav';
import { ProctoringClient } from '@/components/proctoring/ProctoringClient';
import { loadProctoringLists, requireReviewer } from './data';

export const metadata = { title: 'Proctoring | CIM India' };
export const dynamic = 'force-dynamic';

export default async function ProctoringPage({ searchParams }: { searchParams: Promise<{ tab?: string; course?: string }> }) {
  const user = await requireReviewer();
  const sp = await searchParams;
  const data = await loadProctoringLists(user);
  const initialTab = sp.tab === 'attempts' || sp.tab === 'retakes' ? sp.tab : sp.course ? 'attempts' : 'identity';

  return (
    <>
      <Navbar />
      <main className="flex-1 pb-24 lg:pb-12 bg-gray-50 min-h-screen">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
          <div>
            <h1 className="text-3xl font-semibold text-gray-900">Proctoring</h1>
            <p className="text-sm text-gray-600 mt-1 max-w-prose">
              Approve student identity checks, review exam attempts with their camera photos and activity timeline, and allow retakes.
              {user.role === 'INSTRUCTOR' ? ' You see the courses you teach.' : ''}
            </p>
          </div>
          <ProctoringClient courses={data.courseOptions} verifications={data.verifications} attempts={data.attempts} grants={data.grants} initialTab={initialTab} initialCourse={sp.course ?? ''} />
        </div>
      </main>
      <MobileBottomNav role={user.role} isLoggedIn />
    </>
  );
}
