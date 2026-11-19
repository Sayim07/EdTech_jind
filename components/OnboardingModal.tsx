'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { usePathname, useRouter } from 'next/navigation';
import { ArrowRight, CalendarDays, GraduationCap, MapPin } from 'lucide-react';
import { CompletionRing } from '@/components/profile/CompletionRing';
import { markOnboardingSeen, useSessionUser } from '@/components/useSessionUser';
import { usesShell } from '@/components/AppSidebar';

// The animation library is only downloaded when the popup actually opens.
const Lottie = dynamic(() => import('lottie-react').then((m) => m.Lottie), { ssr: false });

/** Pages where the popup would only be in the way. */
const QUIET = ['/profile', '/checkout'];

/**
 * Welcome popup for a brand-new student. It opens once: whichever button is pressed (or Escape), the account is marked
 * as "seen", so it never returns on a later login. Until the profile is complete a quiet reminder stays on the dashboard.
 *
 * Confetti animation: "Confetti Celebration" by Bryan GR on LottieFiles (Lottie Simple License), stored in /public/lottie.
 */
export function OnboardingModal() {
  const { user } = useSessionUser();
  const pathname = usePathname();
  const router = useRouter();
  const [animate, setAnimate] = useState(false);
  const [shown, setShown] = useState(false);
  const primaryRef = useRef<HTMLButtonElement>(null);

  const open = Boolean(user?.showOnboarding) && usesShell(pathname) && !QUIET.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  // Fade and scale in one frame after mounting, so the transition actually plays.
  useEffect(() => {
    if (!open) return setShown(false);
    const t = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(t);
  }, [open]);

  // Confetti only for people who have not asked their device for less motion.
  useEffect(() => {
    if (open) setAnimate(!window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }, [open]);

  const answer = useCallback(() => {
    markOnboardingSeen();
    fetch('/api/profile/onboarding', { method: 'POST' }).catch(() => {});
  }, []);

  const later = useCallback(() => answer(), [answer]);
  const start = () => {
    answer();
    router.push('/profile?required=1#profile-details');
  };

  useEffect(() => {
    if (!open) return;
    primaryRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') later();
      if (e.key === 'Tab') {
        // Keep keyboard focus inside the popup.
        const items = Array.from(document.querySelectorAll<HTMLElement>('[data-onboarding] button'));
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
    return () => document.removeEventListener('keydown', onKey);
  }, [open, later]);

  if (!open || !user) return null;
  const first = user.name.split(' ')[0];
  const percent = user.profile?.percent ?? 0;

  return (
    <div className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50" onMouseDown={(e) => e.target === e.currentTarget && later()}>
      <div
        data-onboarding
        role="dialog"
        aria-modal="true"
        aria-labelledby="onb-title"
        aria-describedby="onb-desc"
        className={`relative w-full sm:max-w-md max-h-[92dvh] overflow-y-auto bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl transition duration-300 ease-out motion-reduce:transition-none ${shown ? 'opacity-100 translate-y-0 sm:scale-100' : 'opacity-0 translate-y-6 sm:translate-y-0 sm:scale-95'}`}
      >
        {animate && (
          <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]" aria-hidden>
            <Lottie src="/lottie/confetti.json" autoplay loop={false} rendererSettings={{ preserveAspectRatio: 'xMidYMid slice' }} className="w-full h-full" />
          </div>
        )}

        <div className="relative px-6 pt-8 pb-6 sm:px-8 text-center space-y-5">
          <div className="flex justify-center">
            <div className="rounded-full bg-amber-50 p-3">
              <CompletionRing percent={percent} size={96} />
            </div>
          </div>

          <div className="space-y-2">
            <h2 id="onb-title" className="text-2xl sm:text-3xl font-semibold text-gray-900 leading-tight">
              Welcome to CIM India, {first}!
            </h2>
            <p id="onb-desc" className="text-base text-gray-700 max-w-prose mx-auto">
              Your account is ready. Take two minutes to finish your profile. It is needed to buy a course, and it puts your name and details on your certificates.
            </p>
          </div>

          <ul className="text-left space-y-2.5 rounded-2xl bg-gray-50 p-4 text-sm text-gray-800">
            <li className="flex items-center gap-3">
              <CalendarDays className="w-5 h-5 text-amber-600 shrink-0" aria-hidden /> Your date of birth and phone number
            </li>
            <li className="flex items-center gap-3">
              <GraduationCap className="w-5 h-5 text-amber-600 shrink-0" aria-hidden /> Your education and what you do
            </li>
            <li className="flex items-center gap-3">
              <MapPin className="w-5 h-5 text-amber-600 shrink-0" aria-hidden /> Your address, for receipts
            </li>
          </ul>

          <div className="flex flex-col gap-2 pt-1">
            <button
              ref={primaryRef}
              type="button"
              onClick={start}
              className="h-12 rounded-xl bg-amber-600 hover:bg-[#0060eb] text-white font-semibold text-base inline-flex items-center justify-center gap-2 transition active:scale-[0.98] focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_#e3eeff]"
            >
              Complete my profile <ArrowRight className="w-4 h-4" aria-hidden />
            </button>
            <button type="button" onClick={later} className="h-11 rounded-xl text-gray-700 hover:bg-gray-100 font-semibold text-sm transition focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_#e3eeff]">
              Maybe later
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
