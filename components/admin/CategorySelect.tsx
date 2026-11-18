'use client';

import React, { useState } from 'react';
import { Check, X } from 'lucide-react';
import { fieldCls } from '@/components/admin/AdminTestBuilder';

const ADD = '__add_category__';

/**
 * Category picker with an "Add new category" option. Categories are plain labels on a course, so a new one
 * exists as soon as a course is saved with it, and then shows up here (and in the catalog filters) for everyone.
 */
export function CategorySelect({ id, value, onChange, options }: { id: string; value: string; onChange: (v: string) => void; options: string[] }) {
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState('');
  const [extra, setExtra] = useState<string[]>([]);

  const all = Array.from(new Set([...options, ...extra, ...(value ? [value] : [])]));
  const trimmed = draft.trim();
  const clash = all.some((c) => c.toLowerCase() === trimmed.toLowerCase());
  const problem = !trimmed ? '' : trimmed.length > 60 ? 'Use 60 characters or fewer' : clash ? 'That category already exists' : '';

  const confirm = () => {
    if (!trimmed || problem) return;
    setExtra((e) => [...e, trimmed]);
    onChange(trimmed);
    setDraft('');
    setAdding(false);
  };

  if (adding) {
    return (
      <div>
        <div className="flex gap-2">
          <input
            id={id}
            autoFocus
            value={draft}
            maxLength={61}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                confirm();
              }
              if (e.key === 'Escape') setAdding(false);
            }}
            placeholder="New category name"
            className={fieldCls}
            aria-describedby={problem ? `${id}-err` : undefined}
          />
          <button type="button" onClick={confirm} disabled={!trimmed || !!problem} aria-label="Add category" className="h-[42px] w-11 shrink-0 rounded-lg bg-amber-600 hover:bg-[#0060eb] text-white inline-flex items-center justify-center disabled:opacity-50 transition">
            <Check className="w-4 h-4" />
          </button>
          <button type="button" onClick={() => setAdding(false)} aria-label="Cancel adding a category" className="h-[42px] w-11 shrink-0 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 inline-flex items-center justify-center transition">
            <X className="w-4 h-4" />
          </button>
        </div>
        {problem && (
          <p id={`${id}-err`} role="alert" className="text-xs text-red-700 mt-1">
            {problem}
          </p>
        )}
      </div>
    );
  }

  return (
    <select
      id={id}
      value={value}
      onChange={(e) => (e.target.value === ADD ? setAdding(true) : onChange(e.target.value))}
      className={fieldCls}
    >
      {all.map((c) => (
        <option key={c} value={c}>
          {c}
        </option>
      ))}
      <option value={ADD}>+ Add new category...</option>
    </select>
  );
}

