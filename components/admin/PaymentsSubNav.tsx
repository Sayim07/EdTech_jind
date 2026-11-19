import React from 'react';
import Link from 'next/link';

const ITEMS = [
  { id: 'transactions', href: '/admin?tab=payments', label: 'Transactions' },
  { id: 'coupons', href: '/admin/payments/coupons', label: 'Coupons' },
  { id: 'refunds', href: '/admin/payments/refunds', label: 'Refunds' },
  { id: 'reports', href: '/admin/payments/reports', label: 'Reports' },
] as const;

/** Links between the payment pages. Plain server markup, so it can sit on any of them. */
export function PaymentsSubNav({ active }: { active: (typeof ITEMS)[number]['id'] }) {
  return (
    <nav aria-label="Payment sections" className="flex gap-1 overflow-x-auto border-b border-gray-200">
      {ITEMS.map((i) => (
        <Link
          key={i.id}
          href={i.href}
          aria-current={active === i.id ? 'page' : undefined}
          className={`px-4 h-11 inline-flex items-center text-sm font-semibold whitespace-nowrap border-b-2 -mb-px transition focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_#e3eeff] rounded-t ${
            active === i.id ? 'border-amber-600 text-amber-700' : 'border-transparent text-gray-700 hover:text-gray-900 hover:border-gray-300'
          }`}
        >
          {i.label}
        </Link>
      ))}
    </nav>
  );
}
