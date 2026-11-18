'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CheckCircle2, Loader2, XCircle } from 'lucide-react';

type Status = 'CREATED' | 'PAID' | 'FAILED';

interface Props {
  paymentId: string;
  initialStatus: Status;
  failureReason: string | null;
  courseTitle: string;
  courseSlug: string;
  amount: string;
  reference: string | null;
}

const REDIRECT_SECONDS = 5;
const POLL_MS = 2000;
const POLL_LIMIT = 15; // ~30s, then stop and explain

export function ResultClient({ paymentId, initialStatus, failureReason, courseTitle, courseSlug, amount, reference }: Props) {
  const router = useRouter();
  const [status, setStatus] = useState<Status>(initialStatus);
  const [reason, setReason] = useState(failureReason);
  const [timedOut, setTimedOut] = useState(false);
  const [left, setLeft] = useState(REDIRECT_SECONDS);

  // A webhook can confirm a payment a moment after the browser lands here, so keep checking while it is pending.
  useEffect(() => {
    if (status !== 'CREATED') return;
    let tries = 0;
    const t = setInterval(async () => {
      tries += 1;
      try {
        const res = await fetch(`/api/payments/${paymentId}`, { cache: 'no-store' });
        if (res.ok) {
          const d = await res.json();
          if (d.status !== 'CREATED') {
            setStatus(d.status);
            setReason(d.failureReason);
            router.refresh();
            return clearInterval(t);
          }
        }
      } catch {}
      if (tries >= POLL_LIMIT) {
        setTimedOut(true);
        clearInterval(t);
      }
    }, POLL_MS);
    return () => clearInterval(t);
  }, [status, paymentId, router]);

  // After success, take the student into the classroom.
  useEffect(() => {
    if (status !== 'PAID') return;
    if (left <= 0) return router.push(`/learn/${courseSlug}`);
    const t = setTimeout(() => setLeft((n) => n - 1), 1000);
    return () => clearTimeout(t);
  }, [status, left, courseSlug, router]);

  const btn =
    'h-11 px-5 rounded-lg font-semibold text-sm inline-flex items-center justify-center transition active:scale-[0.98] focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_#e3eeff]';

  return (
    <section className="max-w-xl mx-auto bg-white rounded-2xl border border-gray-200 p-8 sm:p-10 text-center space-y-5" aria-live="polite">
      {status === 'PAID' && (
        <>
          <CheckCircle2 className="w-14 h-14 text-emerald-600 mx-auto" aria-hidden />
          <h1 className="text-3xl font-semibold text-gray-900">Payment successful</h1>
          <p className="text-gray-600">
            You are now enrolled in <span className="font-semibold text-gray-900">{courseTitle}</span>.
          </p>
          <dl className="text-sm text-gray-700 bg-gray-50 rounded-xl p-4 space-y-1.5 text-left">
            <div className="flex justify-between gap-4">
              <dt className="text-gray-600">Amount paid</dt>
              <dd className="font-semibold tabular-nums">{amount}</dd>
            </div>
            {reference && (
              <div className="flex justify-between gap-4">
                <dt className="text-gray-600">Payment ID</dt>
                <dd className="font-semibold tabular-nums break-all text-right">{reference}</dd>
              </div>
            )}
          </dl>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href={`/learn/${courseSlug}`} className={`${btn} bg-amber-600 hover:bg-[#0060eb] text-white`}>
              Start learning
            </Link>
            <Link href="/purchases" className={`${btn} border border-gray-300 text-gray-800 hover:bg-gray-50`}>
              View receipt
            </Link>
          </div>
          <p className="text-xs text-gray-600">Taking you to the classroom in {left}s</p>
        </>
      )}

      {status === 'FAILED' && (
        <>
          <XCircle className="w-14 h-14 text-red-600 mx-auto" aria-hidden />
          <h1 className="text-3xl font-semibold text-gray-900">Payment failed</h1>
          <p className="text-gray-600">{reason || 'The payment did not go through.'} If money was deducted, it is refunded by your bank automatically.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href={`/checkout/${courseSlug}`} className={`${btn} bg-amber-600 hover:bg-[#0060eb] text-white`}>
              Try again
            </Link>
            <Link href={`/courses/${courseSlug}`} className={`${btn} border border-gray-300 text-gray-800 hover:bg-gray-50`}>
              Back to course
            </Link>
          </div>
        </>
      )}

      {status === 'CREATED' && (
        <>
          {timedOut ? (
            <>
              <h1 className="text-3xl font-semibold text-gray-900">Still confirming</h1>
              <p className="text-gray-600">
                We have not received confirmation yet. If money was deducted, your access will be unlocked automatically within a few minutes. Check Purchases to see it.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link href="/purchases" className={`${btn} bg-amber-600 hover:bg-[#0060eb] text-white`}>
                  Go to Purchases
                </Link>
                <Link href={`/checkout/${courseSlug}`} className={`${btn} border border-gray-300 text-gray-800 hover:bg-gray-50`}>
                  Back to checkout
                </Link>
              </div>
            </>
          ) : (
            <>
              <Loader2 className="w-12 h-12 text-amber-600 mx-auto animate-spin" aria-hidden />
              <h1 className="text-3xl font-semibold text-gray-900">Confirming your payment</h1>
              <p className="text-gray-600">This takes a few seconds. Please do not close this page.</p>
            </>
          )}
        </>
      )}
    </section>
  );
}
