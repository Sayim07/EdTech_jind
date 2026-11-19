'use client';

import { useEffect, useState } from 'react';
import { useInitialRole } from '@/components/SessionRole';
import { acquireChat, releaseChat } from './client';

/**
 * Number of unread chat messages for the signed-in user (0 when chat is unavailable or the user is signed out).
 *
 * Choice: it connects lazily, not on render. Only a signed-in student, instructor or admin connects, and only once the
 * browser is idle (or after 2.5s), so it never competes with page load. It shares the one Stream connection used by
 * the messenger. Every failure is swallowed and reads as 0, so a page that merely shows the badge can never break.
 */
export function useChatUnreadCount(enabled = true): number {
  const role = useInitialRole();
  const [count, setCount] = useState(0);
  const active = enabled && (role === 'STUDENT' || role === 'INSTRUCTOR' || role === 'ADMIN');

  useEffect(() => {
    if (!active) {
      setCount(0);
      return;
    }
    let cancelled = false;
    let held = false;
    let off: (() => void) | undefined;

    const start = () => {
      acquireChat().then(
        (client) => {
          held = true;
          if (cancelled) return releaseChat();
          setCount((client.user as any)?.total_unread_count ?? 0);
          const sub = client.on((e) => {
            if (typeof e.total_unread_count === 'number') setCount(e.total_unread_count);
          });
          off = () => sub.unsubscribe();
        },
        () => {},
      );
    };

    const w = window as any;
    const handle = w.requestIdleCallback ? w.requestIdleCallback(start, { timeout: 2500 }) : setTimeout(start, 2500);
    return () => {
      cancelled = true;
      if (w.requestIdleCallback) w.cancelIdleCallback?.(handle);
      else clearTimeout(handle);
      off?.();
      if (held) releaseChat();
    };
  }, [active]);

  return active ? count : 0;
}

/** A small amber pill with the unread count; renders nothing at zero. */
export function UnreadBadge({ className = '' }: { className?: string }) {
  const count = useChatUnreadCount();
  if (!count) return null;
  return (
    <span
      className={`inline-flex min-w-[20px] items-center justify-center rounded-full bg-amber-600 px-1.5 text-[11px] font-bold leading-5 text-white tabular-nums ${className}`}
      aria-label={`${count} unread ${count === 1 ? 'message' : 'messages'}`}
    >
      {count > 99 ? '99+' : count}
    </span>
  );
}
