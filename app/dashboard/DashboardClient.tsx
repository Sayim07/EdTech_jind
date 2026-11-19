'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { formatPrice } from '@/lib/utils';
import { ButtonSpinner } from '@/components/ui/Loaders';
import { ActivityCalendar, ActivityItem, StatsWidget, TodoItem, TodoWidget, useNow } from '@/components/dashboard/Widgets';
import { Award, BookOpen, Compass, FileText, PlayCircle, ShoppingBag } from 'lucide-react';
import { CompletionRing } from '@/components/profile/CompletionRing';

interface NextLesson {
  id: string;
  title: string;
  type: string;
  duration: string | null;
}

interface Props {
  user: { id: string; name: string; email: string; role: string; avatarUrl?: string | null };
  enrollments: any[];
  popularCourses: any[];
  progress: Record<string, number>;
  nextLesson: Record<string, NextLesson | null>;
  todo: TodoItem[];
  activity: ActivityItem[];
  overall: { totalLessons: number; doneLessons: number; certificates: number };
  /** Students only. null for admins. */
  profile: { percent: number; complete: boolean; missing: string[] } | null;
}

function Thumb({ course, className }: { course: any; className: string }) {
  return (
    <div className={`relative bg-amber-100 overflow-hidden shrink-0 ${className}`}>
      {course.thumbnail ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={course.thumbnail} alt="" loading="lazy" className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-amber-700">
          <BookOpen className="w-6 h-6" aria-hidden />
        </div>
      )}
    </div>
  );
}

const outlineBtn =
  'h-10 px-5 rounded-lg border border-amber-600 text-amber-600 hover:bg-amber-50 font-semibold text-sm inline-flex items-center justify-center gap-2 transition active:scale-[0.98] focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_#e3eeff]';
const solidBtn =
  'h-10 px-5 rounded-lg bg-amber-600 hover:bg-[#0060eb] text-white font-semibold text-sm inline-flex items-center justify-center gap-2 transition active:scale-[0.98] focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_#e3eeff]';

type Filter = 'all' | 'progress' | 'completed';

export function DashboardClient({ user, enrollments, popularCourses, progress, nextLesson, todo, activity, overall, profile }: Props) {
  const router = useRouter();
  const now = useNow();
  const [filter, setFilter] = useState<Filter>('all');
  const [enrollingCourseId, setEnrollingCourseId] = useState<string | null>(null);
  const [enrollError, setEnrollError] = useState<{ id: string; text: string } | null>(null);

  // Free courses are joined right here. Paid courses never come through this function: their button opens checkout.
  const handleFreeEnroll = async (courseId: string, slug: string) => {
    setEnrollingCourseId(courseId);
    setEnrollError(null);
    try {
      const res = await fetch('/api/enroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if (data.requiresPayment) return router.push(`/checkout/${slug}`);
        throw new Error(data.error || 'Could not enroll in this course.');
      }
      router.push(`/learn/${slug}`);
      router.refresh();
    } catch (err: any) {
      setEnrollError({ id: courseId, text: err.message || 'Could not enroll in this course.' });
    } finally {
      setEnrollingCourseId(null);
    }
  };

  const isDone = (e: any) => (progress[e.courseId] ?? 0) === 100;
  const counts = {
    all: enrollments.length,
    progress: enrollments.filter((e) => !isDone(e)).length,
    completed: enrollments.filter(isDone).length,
  };
  const visible = enrollments.filter((e) => (filter === 'all' ? true : filter === 'completed' ? isDone(e) : !isDone(e)));
  const enrolledIds = new Set(enrollments.map((e) => e.courseId));
  const recommended = popularCourses.filter((c) => !enrolledIds.has(c.id));
  const startedCount = enrollments.filter((e) => (progress[e.courseId] ?? 0) > 0 && !isDone(e)).length;

  const tabs: { id: Filter; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'progress', label: 'In Progress' },
    { id: 'completed', label: 'Completed' },
  ];

  return (
    <div className="w-full px-4 sm:px-6 lg:px-10 py-5 sm:py-8 grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_360px] gap-6 xl:gap-8 items-start">
      <div className="space-y-8 min-w-0">
        {/* Welcome */}
        <header className="flex items-center gap-4">
          {user.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user.avatarUrl} alt="" referrerPolicy="no-referrer" className="w-14 h-14 sm:w-16 sm:h-16 rounded-full object-cover" />
          ) : (
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-amber-600 text-white flex items-center justify-center text-2xl font-semibold" aria-hidden>
              {user.name.charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <h1 className="text-2xl sm:text-3xl font-semibold text-gray-900 leading-tight">Welcome, {user.name.split(' ')[0]}!</h1>
            <p className="text-sm text-gray-600 min-h-5">{now ? `Today: ${now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}` : ''}</p>
          </div>
        </header>

        {/* Profile reminder: quiet, and gone once the required details are saved */}
        {profile && !profile.complete && (
          <section aria-label="Profile reminder" className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-4">
            <CompletionRing percent={profile.percent} size={56} />
            <div className="min-w-0 flex-1">
              <h2 className="text-base font-semibold text-gray-900">Your profile is {profile.percent}% complete</h2>
              <p className="text-sm text-gray-600">
                You need to add {profile.missing.slice(0, 3).join(', ').toLowerCase()}
                {profile.missing.length > 3 ? ` and ${profile.missing.length - 3} more` : ''} before you can buy a course.
              </p>
            </div>
            <Link href="/profile?required=1#profile-details" className={`${outlineBtn} shrink-0 self-start sm:self-auto`}>
              Complete profile
            </Link>
          </section>
        )}

        {/* My courses */}
        <section className="space-y-4" aria-labelledby="my-courses">
          <h2 id="my-courses" className="sr-only">
            My courses
          </h2>
          <div role="tablist" aria-label="Filter courses" className="flex gap-6 border-b border-gray-200">
            {tabs.map((t) => (
              <button
                key={t.id}
                role="tab"
                type="button"
                aria-selected={filter === t.id}
                onClick={() => setFilter(t.id)}
                className={`pb-2.5 -mb-px text-sm font-semibold border-b-2 transition focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_#e3eeff] rounded-t ${
                  filter === t.id ? 'border-amber-600 text-amber-600' : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                {t.label} <span className="font-normal text-gray-500">({counts[t.id]})</span>
              </button>
            ))}
          </div>

          {visible.length === 0 ? (
            <div className="bg-white rounded-2xl border border-dashed border-gray-300 p-10 text-center space-y-3">
              <BookOpen className="w-8 h-8 text-amber-600 mx-auto" aria-hidden />
              <p className="text-gray-600">
                {enrollments.length === 0 ? 'You have not enrolled in any course yet. Pick one below to begin.' : filter === 'completed' ? 'No completed courses yet. Keep going.' : 'Nothing in progress right now.'}
              </p>
              {enrollments.length === 0 && (
                <Link href="/courses" className={solidBtn}>
                  <Compass className="w-4 h-4" /> Browse courses
                </Link>
              )}
            </div>
          ) : (
            <ul className="space-y-4">
              {visible.map((e, idx) => {
                const { course } = e;
                const pct = progress[e.courseId] ?? 0;
                const next = nextLesson[e.courseId];
                const lessonCount = course.modules?.reduce((n: number, m: any) => n + (m.lessons?.length || 0), 0) || 0;
                const featured = idx === 0 && pct < 100;
                return (
                  <li key={e.id} className={`relative rounded-2xl border p-4 sm:p-5 transition hover:shadow-md ${featured ? 'bg-amber-50 border-amber-200' : 'bg-white border-gray-200'}`}>
                    <Link href={`/courses/${course.slug}`} aria-label={`Course details: ${course.title}`} className="absolute inset-0 z-[1] rounded-2xl focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_#e3eeff]" />
                    <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-5">
                      <div className="flex items-center gap-4 min-w-0 flex-1">
                        <Thumb course={course} className="w-20 h-16 sm:w-28 sm:h-20 rounded-lg" />
                        <div className="min-w-0 flex-1 space-y-1">
                          <span className="inline-flex text-xs font-semibold px-2 py-0.5 rounded-md bg-white text-amber-800 border border-amber-200">{course.category}</span>
                          <h3 className="text-base sm:text-lg font-semibold text-gray-900 leading-snug line-clamp-2">{course.title}</h3>
                          <p className="text-xs text-gray-600">
                            {course.modules?.length || 0} modules · {lessonCount} lessons
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-col sm:items-end gap-2 sm:w-64 shrink-0">
                        {pct < 100 && next ? (
                          <p className="text-xs text-gray-700 sm:text-right">
                            <span className="text-gray-500">Next: </span>
                            <span className="font-semibold">{next.title}</span>
                            <span className="flex sm:justify-end items-center gap-1 text-gray-500 mt-0.5">
                              <PlayCircle className="w-3.5 h-3.5" aria-hidden /> {next.type === 'YOUTUBE' ? 'Video' : next.type === 'PPT' || next.type === 'PDF' ? 'Slides' : next.type === 'ASSIGNMENT' ? 'Assignment' : 'Video'}
                              {next.duration ? ` · ${next.duration}` : ''}
                            </span>
                          </p>
                        ) : (
                          <p className="text-xs text-emerald-700 font-semibold sm:text-right">{e.certificateCode ? 'Certificate earned' : 'Course completed'}</p>
                        )}
                        <div className="relative z-10 flex flex-wrap sm:justify-end gap-2">
                          {pct === 100 && e.certificateCode ? (
                            <Link href={`/certificates/${e.certificateCode}`} className={outlineBtn}>
                              <Award className="w-4 h-4" aria-hidden /> Certificate
                            </Link>
                          ) : (
                            <Link href={next ? `/learn/${course.slug}?lesson=${next.id}` : `/learn/${course.slug}`} className={pct > 0 ? (featured ? solidBtn : outlineBtn) : outlineBtn}>
                              {pct === 100 ? 'Review' : pct > 0 ? 'Continue' : 'Start'}
                            </Link>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 flex items-center gap-3">
                      <div className="h-2 flex-1 rounded-full bg-white border border-gray-200 overflow-hidden" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={`${course.title} progress`}>
                        <div className="h-full bg-amber-600 rounded-full transition-all duration-500 ease-out" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-xs font-semibold text-gray-700 tabular-nums w-20 text-right">{pct === 0 ? 'Not started' : `${pct}%`}</span>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* Recommended */}
        {recommended.length > 0 && (
          <section className="space-y-4" aria-labelledby="recommended">
            <div className="flex items-center justify-between">
              <h2 id="recommended" className="text-xl font-semibold text-gray-900">
                Discover more courses
              </h2>
              <Link href="/courses" className="text-sm font-semibold text-amber-600 hover:underline">
                Browse all
              </Link>
            </div>
            <ul className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-4">
              {recommended.map((course) => {
                const lessonCount = course.modules?.reduce((n: number, m: any) => n + (m.lessons?.length || 0), 0) || 0;
                return (
                  <li key={course.id} className="relative flex flex-col rounded-2xl overflow-hidden bg-white border border-gray-200 hover:shadow-md transition group">
                    <Link href={`/courses/${course.slug}`} aria-label={`Course details: ${course.title}`} className="absolute inset-0 z-[1] rounded-2xl focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_#e3eeff]" />
                    <Thumb course={course} className="aspect-video w-full" />
                    <div className="p-4 flex-1 flex flex-col gap-3">
                      <div className="space-y-1">
                        <p className="text-xs font-semibold text-amber-700">{course.category}</p>
                        <h3 className="text-base font-semibold text-gray-900 leading-snug line-clamp-2 group-hover:text-amber-600 transition">{course.title}</h3>
                        <p className="text-xs text-gray-600 line-clamp-2">{course.shortDescription || course.description}</p>
                      </div>
                      <div className="mt-auto flex items-center justify-between text-xs text-gray-600">
                        <span className="flex items-center gap-1">
                          <FileText className="w-3.5 h-3.5 text-amber-600" aria-hidden /> {lessonCount} lessons
                        </span>
                        <span className="text-sm font-semibold text-gray-900">{course.price > 0 ? formatPrice(course.price) : 'Free'}</span>
                      </div>
                      {course.price > 0 ? (
                        <Link href={`/checkout/${course.slug}`} className={`relative z-10 w-full ${solidBtn}`}>
                          <ShoppingBag className="w-4 h-4" aria-hidden /> Buy now
                        </Link>
                      ) : (
                        <button type="button" onClick={() => handleFreeEnroll(course.id, course.slug)} disabled={enrollingCourseId === course.id} className={`relative z-10 w-full ${solidBtn} disabled:opacity-70`}>
                          {enrollingCourseId === course.id ? <ButtonSpinner label="Enrolling..." /> : (<><ShoppingBag className="w-4 h-4" aria-hidden /> Enroll for free</>)}
                        </button>
                      )}
                      {enrollError && enrollError.id === course.id && (
                        <p role="alert" className="relative z-10 text-xs text-red-700">
                          {enrollError.text}
                        </p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        )}
      </div>

      {/* Widgets */}
      <aside className="space-y-6 min-w-0 xl:sticky xl:top-24" aria-label="Dashboard widgets">
        <ActivityCalendar activity={activity} />
        <TodoWidget items={todo} />
        <StatsWidget activity={activity} overall={overall} inProgress={startedCount || counts.progress} />
      </aside>
    </div>
  );
}
