'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { BookOpen, ChevronLeft, ChevronRight, ClipboardCheck, ClipboardList, Flame } from 'lucide-react';

export interface ActivityItem {
  t: string; // ISO timestamp of a completed lesson or submitted test
  minutes: number;
}

export interface TodoItem {
  kind: 'assignment' | 'test';
  title: string;
  course: string;
  href: string;
}

const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;

/** Current date, set after mount so server and client markup never disagree about the time zone. */
export function useNow() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => setNow(new Date()), []);
  return now;
}

const card = 'bg-white rounded-2xl border border-gray-200 p-5 sm:p-6';

/* ------------------------------ Calendar ------------------------------ */

export function ActivityCalendar({ activity }: { activity: ActivityItem[] }) {
  const now = useNow();
  const [offset, setOffset] = useState(0); // months from the current month
  const active = useMemo(() => new Set(activity.map((a) => dayKey(new Date(a.t)))), [activity]);

  const base = now ?? new Date(2000, 0, 1);
  const first = new Date(base.getFullYear(), base.getMonth() + offset, 1);
  const label = now ? first.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : '';
  const lead = (first.getDay() + 6) % 7; // Monday first
  const daysInMonth = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
  const cells: (number | null)[] = [...Array(lead).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];

  const monthActiveDays = now ? Array.from({ length: daysInMonth }, (_, i) => i + 1).filter((d) => active.has(`${first.getFullYear()}-${first.getMonth()}-${d}`)).length : 0;

  const navBtn =
    'w-8 h-8 inline-flex items-center justify-center rounded-lg text-gray-600 hover:bg-gray-100 transition focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_#e3eeff]';

  return (
    <section className={card} aria-labelledby="cal-title">
      <div className="flex items-center justify-between mb-4">
        <h2 id="cal-title" className="text-base font-semibold text-gray-900 min-h-6">
          {label}
        </h2>
        <div className="flex items-center gap-1">
          <button type="button" className={navBtn} onClick={() => setOffset((o) => o - 1)} aria-label="Previous month">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button type="button" className={navBtn} onClick={() => setOffset((o) => o + 1)} aria-label="Next month">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 text-center text-xs font-semibold text-gray-500 mb-1" aria-hidden>
        {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map((d) => (
          <div key={d} className="py-1">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-y-1 text-center text-sm">
        {cells.map((d, i) => {
          if (d === null) return <div key={`e${i}`} />;
          const isToday = now && dayKey(now) === `${first.getFullYear()}-${first.getMonth()}-${d}`;
          const hasActivity = active.has(`${first.getFullYear()}-${first.getMonth()}-${d}`);
          return (
            <div key={d} className="flex justify-center">
              <span
                aria-label={`${d}${isToday ? ', today' : ''}${hasActivity ? ', you studied this day' : ''}`}
                className={`relative w-8 h-8 inline-flex items-center justify-center rounded-full ${isToday ? 'bg-amber-600 text-white font-semibold' : 'text-gray-800'}`}
              >
                {d}
                {hasActivity && <span className={`absolute bottom-0.5 w-1 h-1 rounded-full ${isToday ? 'bg-white' : 'bg-amber-600'}`} aria-hidden />}
              </span>
            </div>
          );
        })}
      </div>
      <p className="mt-4 flex items-center gap-2 text-xs text-gray-600">
        <Flame className="w-4 h-4 text-amber-600" aria-hidden />
        {monthActiveDays > 0 ? `You studied on ${monthActiveDays} day${monthActiveDays === 1 ? '' : 's'} this month.` : 'Dots mark the days you complete lessons or tests.'}
      </p>
    </section>
  );
}

/* ------------------------------ To do ------------------------------ */

export function TodoWidget({ items }: { items: TodoItem[] }) {
  return (
    <section className={card} aria-labelledby="todo-title">
      <div className="flex items-center justify-between mb-3">
        <h2 id="todo-title" className="text-base font-semibold text-gray-900">
          Up next for you
        </h2>
        <Link href="/assignments" className="text-xs font-semibold text-amber-600 hover:underline">
          See all
        </Link>
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-gray-600">You are all caught up. New assignments and tests will show up here.</p>
      ) : (
        <ul className="space-y-2">
          {items.map((t, i) => (
            <li key={i}>
              <Link href={t.href} className="flex items-center gap-3 rounded-xl bg-gray-50 hover:bg-amber-50 px-3 py-2.5 transition focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_#e3eeff]">
                <span className="w-9 h-9 shrink-0 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
                  {t.kind === 'test' ? <ClipboardCheck className="w-4 h-4" aria-hidden /> : <ClipboardList className="w-4 h-4" aria-hidden />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-gray-900">{t.title}</span>
                  <span className="block truncate text-xs text-gray-600">
                    {t.kind === 'test' ? 'MCQ test' : 'Assignment'} · {t.course}
                  </span>
                </span>
                <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/* ------------------------------ Statistics ------------------------------ */

function Donut({ percent }: { percent: number }) {
  const r = 42;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative w-28 h-28 shrink-0" role="img" aria-label={`${percent}% of your lessons completed`}>
      <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
        <circle cx="50" cy="50" r={r} fill="none" stroke="#e3eeff" strokeWidth="10" />
        <circle cx="50" cy="50" r={r} fill="none" stroke="#0056d2" strokeWidth="10" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c - (c * percent) / 100} style={{ transition: 'stroke-dashoffset 600ms ease-out' }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-semibold text-gray-900 leading-none">{percent}%</span>
        <span className="text-[11px] text-gray-600 mt-1">completed</span>
      </div>
    </div>
  );
}

export function StatsWidget({ activity, overall, inProgress }: { activity: ActivityItem[]; overall: { totalLessons: number; doneLessons: number; certificates: number }; inProgress: number }) {
  const now = useNow();

  const { monthMinutes, week } = useMemo(() => {
    const n = now ?? new Date(2000, 0, 3);
    const monday = new Date(n.getFullYear(), n.getMonth(), n.getDate() - ((n.getDay() + 6) % 7));
    const bars = Array(7).fill(0) as number[];
    let month = 0;
    for (const a of activity) {
      const d = new Date(a.t);
      if (d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth()) month += a.minutes;
      const idx = Math.floor((new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() - monday.getTime()) / 86400000);
      if (idx >= 0 && idx < 7) bars[idx] += a.minutes;
    }
    return { monthMinutes: month, week: bars };
  }, [activity, now]);

  const percent = overall.totalLessons ? Math.round((overall.doneLessons / overall.totalLessons) * 100) : 0;
  const hours = monthMinutes >= 60 ? `${(monthMinutes / 60).toFixed(1)} hrs` : `${monthMinutes} min`;
  const max = Math.max(...week, 1);
  const days = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

  return (
    <section className={card} aria-labelledby="stats-title">
      <h2 id="stats-title" className="text-base font-semibold text-gray-900 mb-4">
        Recent statistics
      </h2>
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs text-gray-600">Study time this month</p>
          <p className="text-3xl font-semibold text-gray-900 leading-tight tabular-nums">{hours}</p>
          <p className="text-xs text-gray-600 mt-1">
            {overall.doneLessons} of {overall.totalLessons} lessons done
          </p>
        </div>
        <Donut percent={percent} />
      </div>

      <div className="mt-5">
        <p className="text-xs text-gray-600 mb-2">This week</p>
        <ul className="flex items-end justify-between gap-2 h-20" aria-label="Study minutes per day this week">
          {week.map((m, i) => (
            <li key={i} className="flex-1 flex flex-col items-center justify-end gap-1 h-full" aria-label={`${days[i]}: ${m} minutes`}>
              <span className={`w-full max-w-6 rounded-t-md ${m > 0 ? 'bg-amber-600' : 'bg-amber-100'}`} style={{ height: `${m > 0 ? Math.max(12, (m / max) * 100) : 8}%` }} />
            </li>
          ))}
        </ul>
        <ul className="flex justify-between gap-2 mt-1 text-[11px] text-gray-500" aria-hidden>
          {days.map((d) => (
            <li key={d} className="flex-1 text-center">
              {d}
            </li>
          ))}
        </ul>
      </div>

      <p className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between text-sm text-gray-700">
        <span className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-amber-600" aria-hidden />
          {inProgress} course{inProgress === 1 ? '' : 's'} in progress
        </span>
        <span className="text-gray-600">{overall.certificates} certificate{overall.certificates === 1 ? '' : 's'}</span>
      </p>
    </section>
  );
}
