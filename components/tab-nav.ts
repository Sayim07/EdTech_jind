import type React from 'react';

/**
 * The admin dashboard, Courses, Students, Payments and Profile are tabs of ONE page (/admin?tab=...). The page already
 * loaded the data for all of them, so switching tabs should not ask the server to render it all again (that took seconds).
 * Instead the address is updated in place; Next.js notices and the tab changes instantly.
 * Returns true when it handled the click. Opening in a new tab or with a modifier key still behaves as a normal link.
 */
export function softTabNav(e: React.MouseEvent, href: string, pathname: string): boolean {
  const onAdminPage = pathname === '/admin';
  const isTabLink = href === '/admin' || href.startsWith('/admin?');
  if (!onAdminPage || !isTabLink) return false;
  if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return false;
  e.preventDefault();
  window.history.pushState(null, '', href);
  return true;
}
