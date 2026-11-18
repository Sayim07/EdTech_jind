'use client';

import React from 'react';
import { Plus, Trash2, HelpCircle } from 'lucide-react';

export interface FaqDraft {
  q: string;
  a: string;
}

interface Props {
  totalHours: string;
  setTotalHours: (v: string) => void;
  faqs: FaqDraft[];
  setFaqs: (v: FaqDraft[]) => void;
}

const fieldCls =
  'w-full px-3.5 py-2.5 rounded-lg border border-gray-300 bg-white text-gray-900 text-sm placeholder-gray-400 focus:outline-none focus:border-amber-600 focus:shadow-[0_0_0_3px_#e3eeff] transition';

/** Admin fields for the public course details page: total hours override and FAQs. */
export function CourseDetailsFields({ totalHours, setTotalHours, faqs, setFaqs }: Props) {
  const update = (i: number, patch: Partial<FaqDraft>) =>
    setFaqs(faqs.map((f, idx) => (idx === i ? { ...f, ...patch } : f)));

  return (
    <div className="bg-white p-5 sm:p-6 rounded-2xl border border-gray-200 shadow-sm space-y-5">
      <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
        <HelpCircle className="w-4 h-4 text-amber-600" />
        <h2 className="text-sm sm:text-base font-semibold text-gray-900">Course details page: hours &amp; FAQs</h2>
      </div>

      <div>
        <label htmlFor="total-hours" className="block text-sm font-semibold text-gray-700 mb-1">
          Total hours (optional)
        </label>
        <input
          id="total-hours"
          type="number"
          min="0"
          step="0.5"
          value={totalHours}
          onChange={(e) => setTotalHours(e.target.value)}
          placeholder="Leave empty to calculate from lesson durations"
          className={fieldCls}
        />
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-gray-700">Frequently asked questions</span>
          <button
            type="button"
            onClick={() => setFaqs([...faqs, { q: '', a: '' }])}
            className="h-9 px-3 rounded-lg border border-amber-600 text-amber-600 hover:bg-amber-50 text-sm font-semibold flex items-center gap-1.5 transition"
          >
            <Plus className="w-4 h-4" /> Add question
          </button>
        </div>

        {faqs.length === 0 && <p className="text-sm text-gray-600">No FAQs yet. They appear at the bottom of the course page.</p>}

        {faqs.map((f, i) => (
          <div key={i} className="rounded-xl border border-gray-200 bg-gray-50 p-4 space-y-2.5">
            <div className="flex items-start gap-2">
              <input
                type="text"
                value={f.q}
                onChange={(e) => update(i, { q: e.target.value })}
                placeholder="Question"
                aria-label={`Question ${i + 1}`}
                maxLength={200}
                className={fieldCls}
              />
              <button
                type="button"
                onClick={() => setFaqs(faqs.filter((_, idx) => idx !== i))}
                aria-label={`Remove question ${i + 1}`}
                className="w-10 h-10 shrink-0 rounded-lg text-red-600 hover:bg-red-50 flex items-center justify-center transition"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            <textarea
              value={f.a}
              onChange={(e) => update(i, { a: e.target.value })}
              placeholder="Answer"
              aria-label={`Answer ${i + 1}`}
              rows={3}
              maxLength={2000}
              className={fieldCls}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
