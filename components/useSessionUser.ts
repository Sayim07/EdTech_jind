'use client';

import { useCallback, useEffect, useSyncExternalStore } from 'react';
import { usePathname } from 'next/navigation';

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: string;
  avatarUrl?: string | null;
  /** Students only: how complete the profile is, and whether to show the welcome popup. */
  profile?: { percent: number; complete: boolean };
  showOnboarding?: boolean;
}

/**
 * The signed-in user, shared by the sidebar and every page header.
 *
 * It lives in module scope, so it survives client-side navigation: a page change re-checks the session in the
 * background but keeps showing the last known user, instead of flashing a skeleton and resetting the layout.
 */
interface Snapshot {
  user: SessionUser | null;
  loaded: boolean;
}

let state: Snapshot = { user: null, loaded: false };
const listeners = new Set<() => void>();
let inflight: Promise<void> | null = null;
let lastCheck = 0;
const RECHECK_MS = 5 * 60_000;

const emit = () => listeners.forEach((l) => l());
const set = (next: Snapshot) => {
  if (next.user === state.user && next.loaded === state.loaded) return;
  state = next;
  emit();
};

function refresh() {
  if (!inflight) {
    lastCheck = Date.now();
    inflight = fetch('/api/auth/me', { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        const u: SessionUser | null = data?.user ?? null;
        // Keep the same object when nothing changed so subscribers do not re-render for nothing.
        const same = u && state.user && u.id === state.user.id && u.name === state.user.name && u.role === state.user.role && u.avatarUrl === state.user.avatarUrl && u.showOnboarding === state.user.showOnboarding && u.profile?.percent === state.user.profile?.percent;
        set({ user: same ? state.user : u, loaded: true });
      })
      .catch(() => set({ user: state.user, loaded: true }))
      .finally(() => {
        inflight = null;
      });
  }
  return inflight;
}

/** Call right after a successful sign in or sign up so the sidebar and header pick up the new account. */
export function refreshSessionUser() {
  return refresh();
}

/** The welcome popup was answered: hide it everywhere right away (the server is told separately). */
export function markOnboardingSeen() {
  if (state.user) set({ user: { ...state.user, showOnboarding: false }, loaded: true });
}

export function clearSessionUser() {
  set({ user: null, loaded: true });
}

export function useSessionUser() {
  const pathname = usePathname();
  const snap = useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => state,
    () => state,
  );

  // While nobody is known to be signed in, look again on each page change (this is how a fresh sign in is noticed;
  // with no cookie the server answers without touching the database). Once a user is known, stop: re-checking on
  // every click cost a database round trip per navigation for no benefit.
  useEffect(() => {
    if (!state.user) refresh();
  }, [pathname]);

  // Otherwise only re-check when the tab regains focus after a few minutes.
  useEffect(() => {
    const onFocus = () => {
      if (Date.now() - lastCheck > RECHECK_MS) refresh();
    };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, []);

  const reload = useCallback(() => refresh(), []);
  return { user: snap.user, loaded: snap.loaded, reload };
}
