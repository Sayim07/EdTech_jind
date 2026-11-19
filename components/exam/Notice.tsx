import React from 'react';
import { AlertCircle, CheckCircle2, Info, TriangleAlert } from 'lucide-react';

const TONES = {
  error: { cls: 'text-red-800 bg-red-50 border-red-200', Icon: AlertCircle, role: 'alert' as const },
  warn: { cls: 'text-amber-900 bg-amber-50 border-amber-200', Icon: TriangleAlert, role: 'status' as const },
  info: { cls: 'text-gray-800 bg-gray-50 border-gray-200', Icon: Info, role: 'status' as const },
  success: { cls: 'text-emerald-800 bg-emerald-50 border-emerald-200', Icon: CheckCircle2, role: 'status' as const },
};

/** Inline message: errors are announced at once (role=alert), the rest politely. */
export function Notice({ tone = 'info', children, className = '' }: { tone?: keyof typeof TONES; children: React.ReactNode; className?: string }) {
  const { cls, Icon, role } = TONES[tone];
  return (
    <div role={role} className={`flex items-start gap-2 text-sm rounded-lg border px-3 py-2 max-w-prose ${cls} ${className}`}>
      <Icon className="w-4 h-4 shrink-0 mt-0.5" aria-hidden />
      <div className="min-w-0">{children}</div>
    </div>
  );
}
