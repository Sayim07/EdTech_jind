import React from 'react';

/** Circular 0 to 100 indicator. The number is real text, so screen readers get it too. */
export function CompletionRing({ percent, size = 72, label = 'Profile completion' }: { percent: number; size?: number; label?: string }) {
  const stroke = Math.max(6, Math.round(size / 10));
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const done = percent >= 100;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }} role="img" aria-label={`${label}: ${percent} percent`}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeWidth={stroke} className="text-gray-200" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c - (c * Math.min(100, Math.max(0, percent))) / 100}
          className={`${done ? 'text-emerald-600' : 'text-amber-600'} transition-[stroke-dashoffset] duration-700 ease-out motion-reduce:transition-none`}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center font-semibold text-gray-900 tabular-nums" style={{ fontSize: Math.round(size / 4.2) }}>
        {percent}%
      </span>
    </div>
  );
}
