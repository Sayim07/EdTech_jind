'use client';

import React from 'react';
import { Flag } from 'lucide-react';

interface Props {
  ids: string[];
  answers: Record<string, number>;
  flagged: Set<string>;
  current: number;
  onSelect: (index: number) => void;
}

/** Grid of question numbers showing answered / unanswered / flagged / current. */
export function QuestionPalette({ ids, answers, flagged, current, onSelect }: Props) {
  return (
    <div className="space-y-4">
      <ol className="grid grid-cols-5 sm:grid-cols-8 lg:grid-cols-5 gap-2" aria-label="Question palette">
        {ids.map((id, i) => {
          const answered = answers[id] !== undefined;
          const isFlagged = flagged.has(id);
          const isCurrent = i === current;
          const state = [isCurrent && 'current', answered ? 'answered' : 'unanswered', isFlagged && 'flagged for review'].filter(Boolean).join(', ');
          return (
            <li key={id}>
              <button
                type="button"
                onClick={() => onSelect(i)}
                aria-label={`Question ${i + 1}, ${state}`}
                aria-current={isCurrent ? 'true' : undefined}
                className={[
                  'relative w-full aspect-square min-h-10 rounded-lg text-sm font-semibold border transition focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_#e3eeff]',
                  answered ? 'bg-amber-600 border-amber-600 text-white hover:bg-[#0060eb]' : 'bg-white border-gray-300 text-gray-800 hover:bg-gray-50',
                  isCurrent ? 'ring-2 ring-offset-2 ring-[#002457]' : '',
                ].join(' ')}
              >
                {i + 1}
                {isFlagged && <Flag className="absolute -top-1.5 -right-1.5 w-4 h-4 p-0.5 rounded-full bg-orange-500 text-white" aria-hidden />}
              </button>
            </li>
          );
        })}
      </ol>
      <ul className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs text-gray-700">
        <li className="flex items-center gap-2"><span className="w-3.5 h-3.5 rounded bg-amber-600" /> Answered</li>
        <li className="flex items-center gap-2"><span className="w-3.5 h-3.5 rounded border border-gray-300 bg-white" /> Unanswered</li>
        <li className="flex items-center gap-2"><Flag className="w-3.5 h-3.5 p-px rounded-full bg-orange-500 text-white" aria-hidden /> Flagged</li>
        <li className="flex items-center gap-2"><span className="w-3.5 h-3.5 rounded bg-white ring-2 ring-[#002457]" /> Current</li>
      </ul>
    </div>
  );
}
