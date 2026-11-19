'use client';

import React, { useState } from 'react';
import { AlertTriangle, Check, CheckCircle2, XCircle, X } from 'lucide-react';
import { AttemptResult, OPTION_LABELS } from '@/lib/mcq';

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="text-center">
      <dd className="text-2xl font-semibold text-gray-900">{value}</dd>
      <dt className="text-xs text-gray-600">{label}</dt>
    </div>
  );
}

/** Score summary plus question-by-question review. Used right after submitting and for past attempts. */
export function ResultsView({ result }: { result: AttemptResult }) {
  const [onlyWrong, setOnlyWrong] = useState(false);
  const items = result.review.map((r, i) => ({ ...r, n: i + 1 })).filter((r) => !onlyWrong || r.selectedIndex !== r.correctIndex);

  return (
    <div className="space-y-6">
      <section aria-labelledby="result-heading" className={`rounded-2xl p-6 sm:p-8 ${result.passed ? 'bg-emerald-50' : 'bg-red-50'}`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
          <div className="space-y-1">
            <p className={`inline-flex items-center gap-2 text-sm font-semibold ${result.passed ? 'text-emerald-800' : 'text-red-700'}`}>
              {result.passed ? <CheckCircle2 className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
              {result.passed ? 'Passed' : 'Not passed'}
            </p>
            <h2 id="result-heading" className="text-3xl sm:text-4xl font-semibold text-gray-900 leading-tight">
              {result.score} / {result.total} <span className="text-gray-600 text-2xl">({result.percentage}%)</span>
            </h2>
            <p className="text-sm text-gray-700">
              {result.testTitle}. Passing mark is {result.passingMarks}%.
            </p>
          </div>
          <dl className="grid grid-cols-3 gap-6 shrink-0">
            <Stat label="Correct" value={result.correct} />
            <Stat label="Incorrect" value={result.incorrect} />
            <Stat label="Unanswered" value={result.unanswered} />
          </dl>
        </div>
        {result.autoSubmitted && (
          <p role="status" className="mt-4 flex items-start gap-2 text-sm text-gray-800 bg-white/70 rounded-lg px-3 py-2">
            <AlertTriangle className="w-4 h-4 text-orange-600 shrink-0 mt-0.5" />
            {result.autoReason === 'PROCTORING'
              ? `This exam was submitted automatically because the limit of rule violations was reached (${result.violations} recorded). Your answers up to that moment were graded, and your teacher can review what happened.`
              : 'This test was submitted automatically when the time ran out.'}
          </p>
        )}
      </section>

      <section aria-labelledby="review-heading" className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="review-heading" className="text-2xl font-semibold text-gray-900">
            Review your answers
          </h2>
          <label className="inline-flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <input type="checkbox" checked={onlyWrong} onChange={(e) => setOnlyWrong(e.target.checked)} className="w-4 h-4 accent-[#0056d2]" />
            Show only questions I missed
          </label>
        </div>

        {items.length === 0 && <p className="text-sm text-gray-600 bg-white border border-gray-200 rounded-2xl p-6">Nothing missed. Every question was answered correctly.</p>}

        <ol className="space-y-4">
          {items.map((r) => {
            const right = r.selectedIndex === r.correctIndex;
            return (
              <li key={r.id} className="bg-white rounded-2xl border border-gray-200 p-5 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-base font-semibold text-gray-900 max-w-prose">
                    {r.n}. {r.text}
                  </h3>
                  <span className={`shrink-0 text-xs font-semibold px-2.5 py-0.5 rounded-md ${right ? 'bg-emerald-100 text-emerald-800' : r.selectedIndex === null ? 'bg-gray-100 text-gray-700' : 'bg-red-100 text-red-700'}`}>
                    {right ? 'Correct' : r.selectedIndex === null ? 'Unanswered' : 'Incorrect'}
                  </span>
                </div>
                <ul className="space-y-2">
                  {r.options.map((opt, i) => {
                    const isCorrect = i === r.correctIndex;
                    const isPicked = i === r.selectedIndex;
                    const cls = isCorrect ? 'border-emerald-500 bg-emerald-50' : isPicked ? 'border-red-400 bg-red-50' : 'border-gray-200 bg-white';
                    return (
                      <li key={i} className={`flex items-start gap-3 rounded-lg border px-3.5 py-2.5 text-sm ${cls}`}>
                        <span className="w-6 shrink-0 font-semibold text-gray-700">{OPTION_LABELS[i]}</span>
                        <span className="flex-1 text-gray-900">{opt}</span>
                        {isCorrect && (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-800 shrink-0">
                            <Check className="w-4 h-4" /> Correct answer
                          </span>
                        )}
                        {isPicked && !isCorrect && (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-700 shrink-0">
                            <X className="w-4 h-4" /> Your answer
                          </span>
                        )}
                        {isPicked && isCorrect && <span className="text-xs font-semibold text-emerald-800 shrink-0">Your answer</span>}
                      </li>
                    );
                  })}
                </ul>
                {r.explanation && (
                  <p className="text-sm text-gray-700 bg-gray-50 rounded-lg px-3.5 py-2.5 max-w-prose">
                    <span className="font-semibold">Explanation: </span>
                    {r.explanation}
                  </p>
                )}
              </li>
            );
          })}
        </ol>
      </section>
    </div>
  );
}
