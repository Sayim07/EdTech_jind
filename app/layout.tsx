import type { Metadata, Viewport } from 'next';
import './globals.css';
import { AgentationDev } from '@/AgentationDev';
import { ThemeProvider } from '@/components/ThemeProvider';

export const metadata: Metadata = {
  title: 'Jindal EdTech | Masterclasses in Food History & Gastronomy',
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
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased min-h-screen bg-gray-50 dark:bg-ink-950 text-gray-900 dark:text-gray-100 transition-colors duration-200">
        <ThemeProvider>
          {children}
        </ThemeProvider>
        {/* Agentation Toolbar: strictly active on localhost/development only */}
        <AgentationDev />
      </body>
    </html>
  );
}
