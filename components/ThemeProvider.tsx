'use client';

import React from 'react';

/**
 * DESIGN.md publishes a light theme only. The provider and toggle are kept as
 * no-ops so existing imports keep working.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

export function useTheme() {
  return { theme: 'light' as const, toggleTheme: () => {}, setTheme: (_t: 'light') => {} };
}

export function ThemeToggle(_props: { className?: string }) {
  return null;
}
