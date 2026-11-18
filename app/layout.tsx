import type { Metadata, Viewport } from 'next';
import { Source_Sans_3 } from 'next/font/google';
import './globals.css';
import { AgentationDev } from '@/AgentationDev';
import { ThemeProvider } from '@/components/ThemeProvider';

const sourceSans = Source_Sans_3({
  subsets: ['latin'],
  weight: ['400', '600', '700'],
  variable: '--font-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'CIM India | Masterclasses in Food History & Gastronomy',
  description: 'Premier mobile-first educational platform with lecture archives, PPT decks, and assignments.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={sourceSans.variable} suppressHydrationWarning>
      <body className="antialiased min-h-screen bg-gray-100 text-gray-900">
        <ThemeProvider>
          {children}
        </ThemeProvider>
        {/* Agentation Toolbar: strictly active on localhost/development only */}
        <AgentationDev />
      </body>
    </html>
  );
}
