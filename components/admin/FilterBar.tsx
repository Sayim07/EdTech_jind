'use client';

import React from 'react';
import { Search, X } from 'lucide-react';

export const controlClass =
  'h-10 px-3 rounded-lg border border-gray-300 bg-white text-sm text-gray-900 placeholder:text-gray-500 focus:outline-none focus:border-amber-600 focus:shadow-[0_0_0_3px_#e3eeff]';

/** Search box plus any number of filter controls, with a result count and a one-click reset. */
export function FilterBar({
  query,
  onQuery,
  placeholder,
  shown,
  total,
  noun,
  active,
  onClear,
  children,
}: {
  query: string;
  onQuery: (v: string) => void;
  placeholder: string;
  shown: number;
  total: number;
  noun: string;
  /** True when any filter or search is applied. */
  active: boolean;
  onClear: () => void;
  children?: React.ReactNode;
}) {
  return (
    <div className="p-4 sm:p-5 space-y-3 border-b border-gray-200">
      <div className="flex flex-col lg:flex-row lg:items-center gap-3">
        <label className="relative flex-1 min-w-0">
          <span className="sr-only">Search {noun}</span>
          <Search className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" aria-hidden />
          <input type="search" value={query} onChange={(e) => onQuery(e.target.value)} placeholder={placeholder} className={`${controlClass} w-full pl-9`} />
        </label>
        <div className="flex flex-wrap items-center gap-2">{children}</div>
      </div>
      <div className="flex items-center justify-between gap-3 text-sm text-gray-700" role="status" aria-live="polite">
        <span>
          Showing <strong className="text-gray-900 tabular-nums">{shown}</strong> of <span className="tabular-nums">{total}</span> {noun}
        </span>
        {active && (
          <button type="button" onClick={onClear} className="inline-flex items-center gap-1 font-semibold text-amber-600 hover:underline focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_#e3eeff] rounded">
            <X className="w-3.5 h-3.5" aria-hidden /> Clear filters
          </button>
        )}
      </div>
    </div>
  );
}

export function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <label className="inline-flex">
      <span className="sr-only">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className={`${controlClass} pr-8`} aria-label={label}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

/** Pill group for a small, fixed set of choices (status, role...). */
export function Chips<T extends string>({ label, value, onChange, options }: { label: string; value: T; onChange: (v: T) => void; options: { value: T; label: string; count?: number }[] }) {
  return (
    <div role="group" aria-label={label} className="inline-flex p-1 rounded-full bg-gray-100 flex-wrap">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={value === o.value}
          onClick={() => onChange(o.value)}
          className={`h-8 px-3.5 rounded-full text-sm font-semibold transition focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_#e3eeff] ${value === o.value ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-700 hover:text-gray-900'}`}
        >
          {o.label}
          {o.count !== undefined && <span className="ml-1.5 text-xs tabular-nums text-gray-600">{o.count}</span>}
        </button>
      ))}
    </div>
  );
}

export function DateRange({ from, to, onFrom, onTo }: { from: string; to: string; onFrom: (v: string) => void; onTo: (v: string) => void }) {
  return (
    <div className="inline-flex items-center gap-2">
      <label className="inline-flex items-center gap-1.5 text-sm text-gray-700">
        From
        <input type="date" value={from} max={to || undefined} onChange={(e) => onFrom(e.target.value)} className={controlClass} />
      </label>
      <label className="inline-flex items-center gap-1.5 text-sm text-gray-700">
        To
        <input type="date" value={to} min={from || undefined} onChange={(e) => onTo(e.target.value)} className={controlClass} />
      </label>
    </div>
  );
}
