import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/auth';

export default async function RootPage() {
  const user = await getSessionUser();

  if (!user) {
    redirect('/login');
  }

  if (user.role === 'ADMIN') {
    redirect('/admin?tab=home');
  } else if (user.role === 'INSTRUCTOR') {
    redirect('/messages');
  } else {
    redirect('/dashboard');
  }
}
