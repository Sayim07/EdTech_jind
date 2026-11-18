import React from 'react';
import Link from 'next/link';
import { BookOpen, ClipboardCheck, GraduationCap, IndianRupee, PlusCircle, TrendingUp, Users, FileQuestion, Layers, ArrowUpRight } from 'lucide-react';
import { formatPrice } from '@/lib/utils';

export interface AdminDashboardData {
  firstName: string;
  email: string;
  kpis: {
    revenue: number;
    revenue30: number;
    students: number;
    newStudents30: number;
    courses: number;
    publishedCourses: number;
    enrollments: number;
    enrollments7: number;
  };
  months: { label: string; enrollments: number; revenue: number }[];
  lessonTypes: { type: string; count: number }[];
  topCourses: { id: string; title: string; enrollments: number; revenue: number }[];
  activity: { lessonsCompleted: number; toGrade: number; graded: number; testAttempts: number; testPassRate: number | null };
  payments: { paid: number; failed: number; pending: number };
  recent: { id: string; student: string; course: string; amount: number; date: string }[];
}

// Palette for data colour. Each hue has a saturated shade (marks) and a pastel shade (surfaces behind dark text).
const C = {
  violet: { solid: '#5b3df5', soft: '#ece8ff' },
  sky: { solid: '#0ea5e9', soft: '#dff2fd' },
  amber: { solid: '#f59e0b', soft: '#fff0d1' },
  green: { solid: '#16a34a', soft: '#dbf5e5' },
  pink: { solid: '#db2777', soft: '#fde3ef' },
};

const card = 'bg-white rounded-2xl border border-gray-200 p-5 sm:p-6';
const hatch = (color: string) => ({
  backgroundImage: `repeating-linear-gradient(135deg, ${color}33 0 2px, transparent 2px 6px)`,
});

/** Row of thin bars like the reference: `filled` of `total` are solid. */
function Strip({ ratio, color, onDark = false }: { ratio: number; color: string; onDark?: boolean }) {
  const total = 28;
  const filled = Math.max(0, Math.min(total, Math.round(ratio * total)));
  return (
    <div className="flex gap-[3px] h-5" aria-hidden>
      {Array.from({ length: total }).map((_, i) => (
        <span key={i} className="flex-1 rounded-[2px]" style={{ background: i < filled ? color : onDark ? 'rgba(255,255,255,0.28)' : `${color}33` }} />
      ))}
    </div>
  );
}

function Kpi({
  label,
  value,
  note,
  icon: Icon,
  tone,
  ratio,
  dark,
}: {
  label: string;
  value: string;
  note: string;
  icon: typeof Users;
  tone: { solid: string; soft: string };
  ratio: number;
  dark?: boolean;
}) {
  return (
    <section
      className="rounded-2xl p-5 flex flex-col justify-between gap-5 min-h-44"
      style={{ background: dark ? tone.solid : tone.soft, color: dark ? '#fff' : '#1b1f3b' }}
      aria-label={label}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-4xl font-semibold leading-none tabular-nums">{value}</p>
          <p className={`text-sm mt-2 ${dark ? 'text-white/90' : 'text-gray-700'}`}>{label}</p>
        </div>
        <span className="w-11 h-11 rounded-full flex items-center justify-center shrink-0" style={{ background: dark ? 'rgba(255,255,255,0.18)' : '#ffffffb3', color: dark ? '#fff' : tone.solid }}>
          <Icon className="w-5 h-5" aria-hidden />
        </span>
      </div>
      <div className="space-y-2">
        <Strip ratio={ratio} color={dark ? '#fff' : tone.solid} onDark={dark} />
        <p className={`text-xs ${dark ? 'text-white/90' : 'text-gray-700'}`}>{note}</p>
      </div>
    </section>
  );
}

function MonthlyChart({ months }: { months: AdminDashboardData['months'] }) {
  const max = Math.max(...months.map((m) => m.enrollments), 1);
  const total = months.reduce((s, m) => s + m.enrollments, 0);
  const last = months.length - 1;
  return (
    <section className={`${card} lg:col-span-2`} aria-labelledby="enr-title">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-6">
        <h2 id="enr-title" className="text-xl font-semibold text-gray-900">
          Enrollments
        </h2>
        <div className="flex items-center gap-4 text-xs text-gray-700">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: C.violet.solid }} aria-hidden /> Enrolled
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: C.violet.soft, outline: `1px solid ${C.violet.solid}55` }} aria-hidden /> Last 12 months
          </span>
        </div>
      </div>

      <ul className="flex items-stretch justify-between gap-1.5 sm:gap-3 h-60" aria-label={`Enrollments per month, ${total} in the last 12 months`}>
        {months.map((m, i) => {
          const h = m.enrollments > 0 ? Math.max(8, (m.enrollments / max) * 100) : 0;
          return (
            <li key={`${m.label}-${i}`} tabIndex={0} className="group relative flex-1 flex flex-col items-center gap-2 outline-none" aria-label={`${m.label}: ${m.enrollments} enrollments, ${formatPrice(m.revenue)}`}>
              <div className="relative w-full flex-1 rounded-xl overflow-hidden transition group-hover:brightness-95 group-focus-visible:ring-2 group-focus-visible:ring-[#5b3df5]" style={hatch(C.violet.solid)}>
                <span
                  className="absolute bottom-0 inset-x-0 rounded-xl transition-[height] duration-500 ease-out"
                  style={{ height: `${h}%`, background: i === last ? C.violet.solid : '#8e78fb' }}
                />
              </div>
              <span className={`text-xs ${i === last ? 'font-semibold text-gray-900' : 'text-gray-600'}`}>{m.label}</span>
              <div role="tooltip" className="pointer-events-none absolute -top-2 left-1/2 -translate-x-1/2 -translate-y-full z-10 hidden group-hover:block group-focus-visible:block whitespace-nowrap rounded-xl bg-white border border-gray-200 shadow-lg px-3 py-2 text-xs text-gray-800">
                <p className="font-semibold text-gray-900">{m.label}</p>
                <p className="flex items-center gap-1.5 mt-0.5">
                  <span className="w-2 h-2 rounded-full" style={{ background: C.violet.solid }} aria-hidden />
                  {m.enrollments} enrolled
                </p>
                <p className="text-gray-600">{formatPrice(m.revenue)} collected</p>
              </div>
            </li>
          );
        })}
      </ul>
      {total === 0 && <p className="text-sm text-gray-600 mt-4">No enrollments yet. Bars appear as students buy courses.</p>}
    </section>
  );
}

const TYPE_META: Record<string, { label: string; color: string }> = {
  VIDEO: { label: 'Video', color: C.violet.solid },
  YOUTUBE: { label: 'YouTube', color: C.pink.solid },
  PPT: { label: 'Slide decks', color: C.sky.solid },
  PDF: { label: 'PDF notes', color: C.amber.solid },
  ASSIGNMENT: { label: 'Assignments', color: C.green.solid },
};

function ContentMix({ items, publishedCourses }: { items: AdminDashboardData['lessonTypes']; publishedCourses: number }) {
  const total = items.reduce((s, i) => s + i.count, 0);
  const r = 40;
  const circ = 2 * Math.PI * r;
  let offset = 0;
  return (
    <section className={card} aria-labelledby="mix-title">
      <h2 id="mix-title" className="text-xl font-semibold text-gray-900 mb-4">
        Course content
      </h2>
      <div className="relative w-44 h-44 mx-auto" role="img" aria-label={`${total} lessons across ${publishedCourses} courses`}>
        <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
          <circle cx="50" cy="50" r={r} fill="none" stroke="#f1f2f6" strokeWidth="13" />
          {total > 0 &&
            items.map((it) => {
              const len = (it.count / total) * circ;
              const el = (
                <circle key={it.type} cx="50" cy="50" r={r} fill="none" stroke={(TYPE_META[it.type] || { color: '#94a3b8' }).color} strokeWidth="13" strokeDasharray={`${Math.max(len - 1.5, 0)} ${circ}`} strokeDashoffset={-offset} />
              );
              offset += len;
              return el;
            })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-4xl font-semibold text-gray-900 leading-none tabular-nums">{total}</span>
          <span className="text-xs text-gray-600 mt-1">total lessons</span>
        </div>
      </div>
      <ul className="mt-5 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
        {items.map((it) => {
          const m = TYPE_META[it.type] || { label: it.type, color: '#94a3b8' };
          return (
            <li key={it.type} className="flex items-center gap-2 text-gray-800">
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: m.color }} aria-hidden />
              <span className="truncate">{m.label}</span>
              <span className="ml-auto font-semibold tabular-nums">{it.count}</span>
            </li>
          );
        })}
        {items.length === 0 && <li className="col-span-2 text-gray-600">Add lessons to a course to see the mix.</li>}
      </ul>
    </section>
  );
}

function TopCourses({ courses }: { courses: AdminDashboardData['topCourses'] }) {
  const max = Math.max(...courses.map((c) => c.revenue), 1);
  const tones = [C.violet, C.sky, C.amber, C.green, C.pink];
  return (
    <section className={card} aria-labelledby="top-title">
      <div className="flex items-center justify-between mb-4">
        <h2 id="top-title" className="text-xl font-semibold text-gray-900">
          Top courses
        </h2>
        <Link href="/admin?tab=courses" className="text-xs font-semibold text-amber-600 hover:underline inline-flex items-center gap-0.5">
          Manage <ArrowUpRight className="w-3.5 h-3.5" aria-hidden />
        </Link>
      </div>
      {courses.length === 0 ? (
        <p className="text-sm text-gray-600">No courses yet.</p>
      ) : (
        <ol className="space-y-4">
          {courses.map((c, i) => (
            <li key={c.id}>
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <span className="font-semibold text-gray-900 truncate">{c.title}</span>
                <span className="tabular-nums text-gray-800 shrink-0">{formatPrice(c.revenue)}</span>
              </div>
              <div className="mt-1.5 h-2.5 rounded-full overflow-hidden" style={{ background: tones[i % tones.length].soft }}>
                <div className="h-full rounded-full transition-[width] duration-500 ease-out" style={{ width: `${c.revenue > 0 ? Math.max(4, (c.revenue / max) * 100) : 0}%`, background: tones[i % tones.length].solid }} />
              </div>
              <p className="text-xs text-gray-600 mt-1">
                {c.enrollments} enrollment{c.enrollments === 1 ? '' : 's'}
              </p>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

function Activity({ a, p }: { a: AdminDashboardData['activity']; p: AdminDashboardData['payments'] }) {
  const blocks = [
    { label: 'Lessons completed', value: a.lessonsCompleted, tone: C.green, icon: GraduationCap },
    { label: 'Assignments to grade', value: a.toGrade, tone: C.amber, icon: ClipboardCheck },
    { label: 'MCQ attempts', value: a.testAttempts, tone: C.violet, icon: FileQuestion },
    { label: 'Test pass rate', value: a.testPassRate === null ? 'None yet' : `${a.testPassRate}%`, tone: C.sky, icon: TrendingUp },
  ];
  return (
    <section className={card} aria-labelledby="act-title">
      <h2 id="act-title" className="text-xl font-semibold text-gray-900 mb-4">
        Learning activity
      </h2>
      <dl className="grid grid-cols-2 gap-3">
        {blocks.map((b) => (
          <div key={b.label} className="rounded-xl p-3.5" style={{ background: b.tone.soft }}>
            <span className="w-8 h-8 rounded-full bg-white/80 flex items-center justify-center mb-2" style={{ color: b.tone.solid }}>
              <b.icon className="w-4 h-4" aria-hidden />
            </span>
            <dd className="text-2xl font-semibold text-gray-900 tabular-nums leading-tight">{b.value}</dd>
            <dt className="text-xs text-gray-700 mt-0.5">{b.label}</dt>
          </div>
        ))}
      </dl>
      <p className="mt-4 pt-4 border-t border-gray-100 text-sm text-gray-700 flex flex-wrap gap-x-4 gap-y-1">
        <span>
          <strong className="text-gray-900 tabular-nums">{p.paid}</strong> paid
        </span>
        <span>
          <strong className="text-gray-900 tabular-nums">{p.pending}</strong> pending
        </span>
        <span>
          <strong className="text-gray-900 tabular-nums">{p.failed}</strong> failed
        </span>
        <span className="text-gray-600">online payments</span>
      </p>
    </section>
  );
}

function RecentPayments({ items }: { items: AdminDashboardData['recent'] }) {
  const tones = [C.violet, C.sky, C.amber, C.green, C.pink];
  return (
    <section className={card} aria-labelledby="rec-title">
      <div className="flex items-center justify-between mb-4">
        <h2 id="rec-title" className="text-xl font-semibold text-gray-900">
          Recent enrollments
        </h2>
        <Link href="/admin?tab=payments" className="text-xs font-semibold text-amber-600 hover:underline inline-flex items-center gap-0.5">
          All payments <ArrowUpRight className="w-3.5 h-3.5" aria-hidden />
        </Link>
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-gray-600">Purchases show up here the moment a payment is verified.</p>
      ) : (
        <ul className="space-y-3">
          {items.map((r, i) => (
            <li key={r.id} className="flex items-center gap-3">
              <span className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold shrink-0" style={{ background: tones[i % tones.length].soft, color: '#1b1f3b' }} aria-hidden>
                {r.student.charAt(0).toUpperCase()}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-gray-900 truncate">{r.student}</span>
                <span className="block text-xs text-gray-600 truncate">{r.course}</span>
              </span>
              <span className="text-right shrink-0">
                <span className="block text-sm font-semibold text-gray-900 tabular-nums">{r.amount > 0 ? formatPrice(r.amount) : 'Free'}</span>
                <time dateTime={r.date} className="block text-xs text-gray-600">
                  {new Date(r.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                </time>
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function AdminDashboard({ data }: { data: AdminDashboardData }) {
  const k = data.kpis;
  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-semibold text-gray-900 leading-tight">
            Welcome back, <span className="font-normal">{data.firstName}</span>
          </h1>
          <p className="text-sm text-gray-600 mt-1">Here is how CIM India is doing today.</p>
        </div>
        <Link
          href="/admin/courses/new"
          className="h-11 px-5 rounded-full bg-gray-900 hover:bg-black text-white font-semibold text-sm inline-flex items-center justify-center gap-2 self-start sm:self-auto transition active:scale-[0.98] focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_#e3eeff]"
        >
          <PlusCircle className="w-4 h-4" aria-hidden /> Create course
        </Link>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <Kpi dark tone={C.violet} icon={IndianRupee} label="Revenue collected" value={formatPrice(k.revenue)} note={`${formatPrice(k.revenue30)} in the last 30 days`} ratio={k.revenue > 0 ? k.revenue30 / k.revenue : 0} />
        <Kpi tone={C.sky} icon={Users} label="Registered students" value={String(k.students)} note={`${k.newStudents30} joined in the last 30 days`} ratio={k.students > 0 ? k.newStudents30 / k.students : 0} />
        <Kpi tone={C.amber} icon={BookOpen} label="Courses live" value={String(k.publishedCourses)} note={`${k.courses} in total, ${k.courses - k.publishedCourses} hidden`} ratio={k.courses > 0 ? k.publishedCourses / k.courses : 0} />
        <Kpi tone={C.green} icon={Layers} label="Enrollments" value={String(k.enrollments)} note={`${k.enrollments7} in the last 7 days`} ratio={k.enrollments > 0 ? k.enrollments7 / k.enrollments : 0} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <MonthlyChart months={data.months} />
        <ContentMix items={data.lessonTypes} publishedCourses={k.publishedCourses} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <TopCourses courses={data.topCourses} />
        <Activity a={data.activity} p={data.payments} />
        <RecentPayments items={data.recent} />
      </div>
    </div>
  );
}
