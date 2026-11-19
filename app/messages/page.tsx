import React, { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/auth';
import { Navbar } from '@/components/Navbar';
import { MobileBottomNav } from '@/components/MobileBottomNav';
import { Messenger } from '@/components/chat/Messenger';

export const metadata = { title: 'Messages | CIM India' };

export default async function MessagesPage() {
  const user = await getSessionUser();
  if (!user) redirect('/login?redirect=/messages');

  return (
    <>
      <Navbar wide />
      <main className="flex-1 pb-24 lg:pb-8">
        <div className="w-full px-4 py-4 sm:px-6 sm:py-6 lg:px-10">
          <Suspense fallback={null}>
            <Messenger role={user.role} />
          </Suspense>
        </div>
      </main>
      <MobileBottomNav role={user.role} isLoggedIn />
    </>
  );
}
