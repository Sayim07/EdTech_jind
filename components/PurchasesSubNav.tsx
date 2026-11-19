import React from 'react';
import Link from 'next/link';

const ITEMS = [
  { id: 'purchases', href: '/purchases', label: 'Purchases & Certificates' },
  { id: 'payments', href: '/purchases/payments', label: 'Payment history' },
] as const;

/** Switches between a student's purchases and their payment history. */
export function PurchasesSubNav({ active }: { active: (typeof ITEMS)[number]['id'] }) {
  return (
    <nav aria-label="Purchases sections" className="flex gap-1 overflow-x-auto border-b border-gray-200">
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
