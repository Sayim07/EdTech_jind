import React from 'react';

/**
 * Shown the instant a page starts loading, in the same shape as a real page (top bar, heading, stat blocks, a large
 * panel), so clicking around feels immediate and nothing jumps when the content arrives.
 */
export default function RootLoading() {
  const block = 'rounded-2xl bg-gray-200 motion-reduce:animate-none animate-pulse';
  return (
    <div role="status" aria-busy="true" aria-live="polite">
      <div className="sticky top-0 z-40 h-16 bg-white border-b border-gray-200" />
      <div className="w-full px-4 sm:px-6 lg:px-10 py-6 sm:py-8 space-y-6">
        <div className="space-y-3">
          <div className={`${block} h-9 w-64 max-w-full`} />
          <div className={`${block} h-4 w-96 max-w-full`} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className={`${block} h-36`} />
          ))}
        </div>
        <div className={`${block} h-72`} />
        <span className="sr-only">Loading</span>
      </div>
    </div>
  );
}
