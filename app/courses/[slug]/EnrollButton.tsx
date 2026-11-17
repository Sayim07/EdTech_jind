'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { formatPrice } from '@/lib/utils';
import { ShoppingBag, ArrowRight } from 'lucide-react';

interface Props {
  courseId: string;
  courseSlug: string;
  coursePrice: number;
  isLoggedIn: boolean;
}

export function EnrollButton({ courseId, courseSlug, coursePrice, isLoggedIn }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleEnroll = async () => {
    if (!isLoggedIn) {
      router.push(`/login?redirect=/courses/${courseSlug}`);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/enroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseId }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to enroll');
      }

      // Immediately redirect to interactive classroom!
      router.push(`/learn/${courseSlug}`);
      router.refresh();
    } catch (err: any) {
      alert(err.message || 'Error enrolling in course');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleEnroll}
      disabled={loading}
      className="w-full py-3 px-4 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-medium text-sm transition shadow-sm active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
    >
      <ShoppingBag className="w-4 h-4" />
      <span>
        {loading
          ? 'Processing Access...'
          : coursePrice > 0
          ? `Enroll Now (${formatPrice(coursePrice)})`
          : 'Enroll in Course (Free)'}
      </span>
      <ArrowRight className="w-4 h-4" />
    </button>
  );
}
