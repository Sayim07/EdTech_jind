'use client';

import React, { useEffect, useRef } from 'react';

interface Props {
  title: string;
  children: React.ReactNode;
  actions: React.ReactNode;
  /** Escape / backdrop closing; omit for modals that must be answered. */
  onClose?: () => void;
  tone?: 'default' | 'danger';
}

const FOCUSABLE = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

/** Minimal accessible modal: focus moves into it, Tab stays inside, Escape closes when allowed. */
export function Dialog({ title, children, actions, onClose, tone = 'default' }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    const focusables = () => Array.from(ref.current?.querySelectorAll<HTMLElement>(FOCUSABLE) || []).filter((el) => !el.hasAttribute('disabled'));
    focusables().pop()?.focus(); // the last action is the primary one
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && onClose) onClose();
      if (e.key === 'Tab') {
        const items = focusables();
        if (!items.length) return;
        const first = items[0];
        const last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      prev?.focus?.();
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50" onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}>
      <div ref={ref} role="dialog" aria-modal="true" aria-label={title} className="w-full max-w-md max-h-[90dvh] overflow-y-auto bg-white rounded-2xl shadow-xl p-6 space-y-4">
        <h2 className={`text-xl font-semibold ${tone === 'danger' ? 'text-red-700' : 'text-gray-900'}`}>{title}</h2>
        <div className="text-sm text-gray-700 space-y-3">{children}</div>
        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-1">{actions}</div>
      </div>
    </div>
  );
}

export const primaryBtn =
  'h-10 px-5 rounded-lg bg-amber-600 hover:bg-[#0060eb] text-white font-semibold text-sm inline-flex items-center justify-center gap-2 transition active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_#e3eeff]';
export const secondaryBtn =
  'h-10 px-5 rounded-lg border border-gray-300 bg-white text-gray-800 hover:bg-gray-50 font-semibold text-sm inline-flex items-center justify-center gap-2 transition active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_#e3eeff]';
