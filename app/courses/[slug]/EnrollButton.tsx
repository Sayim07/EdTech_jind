'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { formatPrice } from '@/lib/utils';
import { ShoppingBag, ArrowRight, AlertCircle } from 'lucide-react';

interface Props {
  courseId: string;
  courseSlug: string;
  coursePrice: number;
  isLoggedIn: boolean;
}

export function EnrollButton({ courseId, courseSlug, coursePrice, isLoggedIn }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleEnroll = async () => {
    if (!isLoggedIn) {
      router.push(`/login?redirect=${coursePrice > 0 ? `/checkout/${courseSlug}` : `/courses/${courseSlug}`}`);
      return;
    }

    // Paid courses go through checkout; access is only granted after the payment is verified.
    if (coursePrice > 0) {
      setLoading(true);
      router.push(`/checkout/${courseSlug}`);
      return;
    }

    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/enroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to enroll');
      }
      router.push(`/learn/${courseSlug}`);
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Error enrolling in course');
      setLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      <button
        onClick={handleEnroll}
        disabled={loading}
        className="w-full py-3 px-4 rounded-xl bg-amber-600 hover:bg-[#0060eb] text-white font-medium text-sm transition shadow-sm active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_#e3eeff]"
      >
        <ShoppingBag className="w-4 h-4" />
        <span>{loading ? 'Please wait...' : coursePrice > 0 ? `Buy now (${formatPrice(coursePrice)})` : 'Enroll in Course (Free)'}</span>
        <ArrowRight className="w-4 h-4" />
      </button>
      {error && (
        <p className="flex items-start gap-2 text-sm text-red-700" role="alert">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden />
          {error}
        </p>
      )}
    </div>
  );
}
