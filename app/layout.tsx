import type { Metadata, Viewport } from 'next';
import { Source_Sans_3 } from 'next/font/google';
import './globals.css';
import { AgentationDev } from '@/AgentationDev';
import { ThemeProvider } from '@/components/ThemeProvider';
import { AppSidebar } from '@/components/AppSidebar';
import { OnboardingModal } from '@/components/OnboardingModal';
import { SessionRoleProvider } from '@/components/SessionRole';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';

const sourceSans = Source_Sans_3({
  subsets: ['latin'],
  weight: ['400', '600', '700'],
  variable: '--font-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'CIM India | Masterclasses in Food History & Gastronomy',
  icons: { icon: '/logo.webp' },
  description: 'Premier mobile-first educational platform with lecture archives, PPT decks, and assignments.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Role hint so students get the sidebar layout on first paint (no layout shift).
  const jar = await cookies();
  const collapsed = jar.get('sidebar')?.value === 'collapsed';
  const token = jar.get('auth_token')?.value;
  const role = token ? (await verifyToken(token))?.role : undefined;

  return (
    <html lang="en" className={sourceSans.variable} suppressHydrationWarning>
      <body className={`antialiased min-h-screen bg-gray-100 text-gray-900${role === 'STUDENT' || role === 'ADMIN' || role === 'INSTRUCTOR' ? ' role-sidebar' : ''}${collapsed ? ' sidebar-collapsed' : ''}`}>
        <ThemeProvider>
          <SessionRoleProvider role={role}>
            <AppSidebar />
            <OnboardingModal />
            {children}
          </SessionRoleProvider>
        </ThemeProvider>
        {/* Agentation Toolbar: strictly active on localhost/development only */}
        <AgentationDev />
      </body>
    </html>
  );
}
