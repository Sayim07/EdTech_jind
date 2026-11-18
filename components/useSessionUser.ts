'use client';

import { useCallback, useEffect, useSyncExternalStore } from 'react';
import { usePathname } from 'next/navigation';

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: string;
  avatarUrl?: string | null;
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

const emit = () => listeners.forEach((l) => l());
const set = (next: Snapshot) => {
  if (next.user === state.user && next.loaded === state.loaded) return;
  state = next;
  emit();
};

function refresh() {
  if (!inflight) {
    inflight = fetch('/api/auth/me', { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        const u: SessionUser | null = data?.user ?? null;
        // Keep the same object when nothing changed so subscribers do not re-render for nothing.
        const same = u && state.user && u.id === state.user.id && u.name === state.user.name && u.role === state.user.role && u.avatarUrl === state.user.avatarUrl;
        set({ user: same ? state.user : u, loaded: true });
      })
      .catch(() => set({ user: state.user, loaded: true }))
      .finally(() => {
        inflight = null;
      });
  }
  return inflight;
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

  // Re-check on every navigation, quietly.
  useEffect(() => {
    refresh();
  }, [pathname]);

  const reload = useCallback(() => refresh(), []);
  return { user: snap.user, loaded: snap.loaded, reload };
}
