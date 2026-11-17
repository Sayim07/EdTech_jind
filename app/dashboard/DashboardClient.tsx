'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { formatPrice } from '@/lib/utils';
import { 
  BookOpen, 
  PlayCircle, 
  Compass, 
  Search, 
  ShoppingBag, 
  AlertCircle, 
  X, 
  ArrowRight,
  Clock,
  Sparkles,
  Award,
  Layers,
  CheckCircle2,
  FileText
} from 'lucide-react';

interface Props {
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
  enrollments: any[];
  popularCourses: any[];
}

export function DashboardClient({ user, enrollments, popularCourses }: Props) {
  const router = useRouter();
  // Default to 'explore' so fresh students see the catalog & popular courses first!
  const [activeTab, setActiveTab] = useState<'explore' | 'my_courses'>('explore');
  const [showNoPurchaseModal, setShowNoPurchaseModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [enrollingCourseId, setEnrollingCourseId] = useState<string | null>(null);

  const handleMyCoursesClick = () => {
    setActiveTab('my_courses');
    if (enrollments.length === 0) {
      setShowNoPurchaseModal(true);
    }
  };

  const handleQuickEnroll = async (courseId: string, slug: string) => {
    setEnrollingCourseId(courseId);
    try {
      const res = await fetch('/api/enroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseId }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to enroll');
      }
      router.push(`/learn/${slug}`);
      router.refresh();
    } catch (err: any) {
      alert(err.message || 'Error enrolling in course');
    } finally {
      setEnrollingCourseId(null);
    }
  };

  // Filter courses based on user search
  const filteredPopularCourses = popularCourses.filter((c) =>
    c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.category?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredMyCourses = enrollments.filter((e) =>
    e.course.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Student Welcome Header */}
      <section className="bg-white dark:bg-ink-900 rounded-3xl border border-gray-200 dark:border-gray-800 p-6 sm:p-8 shadow-sm transition-colors">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 dark:bg-amber-950/70 border border-amber-200 dark:border-amber-900 text-amber-800 dark:text-amber-300 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              <span>Student Learning Dashboard</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-serif font-bold text-gray-900 dark:text-white">
              Welcome, {user.name}
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
              Browse popular masterclasses or access your purchased courses, videos, PPT slides, and assignments.
            </p>
          </div>

          {/* Quick Metrics */}
          <div className="flex items-center gap-6 border-t md:border-t-0 md:border-l border-gray-200 dark:border-gray-800 pt-4 md:pt-0 md:pl-6 shrink-0">
            <div className="text-center">
              <div className="text-2xl sm:text-3xl font-serif font-bold text-amber-600">
                {enrollments.length}
              </div>
              <div className="text-[11px] uppercase tracking-wider text-gray-500 font-semibold">
                Purchased
              </div>
            </div>
            <div className="h-8 w-px bg-gray-200 dark:bg-gray-800" />
            <div className="text-center">
              <div className="text-2xl sm:text-3xl font-serif font-bold text-gray-800 dark:text-gray-200">
                {popularCourses.length}
              </div>
              <div className="text-[11px] uppercase tracking-wider text-gray-500 font-semibold">
                Available
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Primary Navigation Tabs & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Tab Controls */}
        <div className="flex items-center p-1 rounded-2xl bg-gray-200/80 dark:bg-ink-800 text-xs font-semibold shrink-0">
          <button
            onClick={() => setActiveTab('explore')}
            className={`px-4 py-2.5 rounded-xl transition flex items-center gap-2 ${
              activeTab === 'explore'
                ? 'bg-white dark:bg-ink-900 text-amber-600 dark:text-amber-400 shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            <Compass className="w-4 h-4" />
            <span>Popular Courses ({popularCourses.length})</span>
          </button>

          <button
            onClick={handleMyCoursesClick}
            className={`px-4 py-2.5 rounded-xl transition flex items-center gap-2 ${
              activeTab === 'my_courses'
                ? 'bg-white dark:bg-ink-900 text-amber-600 dark:text-amber-400 shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>My Courses ({enrollments.length})</span>
          </button>
        </div>

        {/* Course Search Bar */}
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search courses, history, topics..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-ink-900 text-xs text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-sm"
          />
        </div>
      </div>

      {/* POPUP MODAL: "YOU HAVEN'T PURCHASED ANY COURSE" */}
      {showNoPurchaseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-ink-900 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-2xl max-w-md w-full p-6 sm:p-8 text-center space-y-5 relative">
            <button
              onClick={() => setShowNoPurchaseModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-16 h-16 rounded-2xl bg-amber-100 dark:bg-amber-950/70 text-amber-600 flex items-center justify-center mx-auto shadow-inner">
              <ShoppingBag className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h3 className="font-serif text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                You Haven't Purchased Any Course
              </h3>
              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                You have not enrolled in any masterclasses yet. Please purchase a course to unlock full access to lecture videos, downloadable PPT presentation decks, and assignment submissions.
              </p>
            </div>

            <div className="pt-2 flex flex-col gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setShowNoPurchaseModal(false);
                  setActiveTab('explore');
                }}
                className="w-full py-3 px-4 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs tracking-wide shadow-md transition active:scale-95 flex items-center justify-center gap-2"
              >
                <span>Browse Popular Courses</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => setShowNoPurchaseModal(false)}
                className="w-full py-2 text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 font-medium"
              >
                Close Window
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 1: EXPLORE & POPULAR COURSES */}
      {activeTab === 'explore' && (
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-600">
                Curriculum Catalog
              </span>
              <h2 className="text-xl sm:text-2xl font-serif font-bold text-gray-900 dark:text-white">
                Popular Masterclasses
              </h2>
            </div>
            <span className="text-xs text-gray-500">
              Showing {filteredPopularCourses.length} courses
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPopularCourses.map((course) => {
              const isPurchased = enrollments.some((e) => e.courseId === course.id);
              const lessonCount = course.modules?.reduce(
                (sum: number, m: any) => sum + (m.lessons?.length || 0),
                0
              ) || 0;

              return (
                <article
                  key={course.id}
                  className="flex flex-col rounded-3xl overflow-hidden bg-white dark:bg-ink-900 border border-gray-200 dark:border-gray-800 shadow-sm hover:shadow-md transition group"
                >
                  {/* Thumbnail: only rendered if admin specifically uploaded/provided one */}
                  {course.thumbnail ? (
                    <div className="relative aspect-[16/10] bg-gray-100 dark:bg-gray-800 overflow-hidden border-b border-gray-100 dark:border-gray-800">
                      <img
                        src={course.thumbnail}
                        alt={course.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
                      <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between pointer-events-none">
                        <span className="text-[10px] font-bold tracking-wide uppercase px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-md text-amber-300 border border-white/10">
                          {course.category}
                        </span>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-md text-gray-200 border border-white/10">
                          {course.level}
                        </span>
                      </div>
                      {isPurchased && (
                        <div className="absolute top-2.5 right-3 bg-emerald-600 text-white text-[10px] font-bold px-2.5 py-1 rounded-lg shadow">
                          PURCHASED
                        </div>
                      )}
                    </div>
                  ) : (
                    /* Clean typography header when no thumbnail is set by admin */
                    <div className="p-6 pb-0 flex items-center justify-between gap-2">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-bold tracking-wide uppercase bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-200/60 dark:border-amber-900/60">
                        {course.category}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">
                          {course.level}
                        </span>
                        {isPurchased && (
                          <span className="bg-emerald-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-md shadow-sm">
                            PURCHASED
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Body */}
                  <div className={`p-6 flex-1 flex flex-col justify-between space-y-4 ${course.thumbnail ? 'pt-5' : 'pt-3'}`}>
                    <div className="space-y-2.5">
                      <h3 className="font-serif text-xl font-bold text-gray-900 dark:text-white group-hover:text-amber-600 transition leading-snug">
                        {course.title}
                      </h3>
                      <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 line-clamp-3 leading-relaxed">
                        {course.shortDescription || course.description}
                      </p>
                    </div>

                    <div className="pt-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between text-xs text-gray-500">
                      <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1.5 font-medium">
                          <BookOpen className="w-3.5 h-3.5 text-amber-600" />
                          {lessonCount} Lectures
                        </span>
                        <span className="flex items-center gap-1.5 font-medium">
                          <FileText className="w-3.5 h-3.5 text-amber-600" />
                          PPT Included
                        </span>
                      </div>
                      <div className="flex items-baseline gap-1.5">
                        {course.originalPrice && course.originalPrice > course.price && (
                          <span className="text-xs line-through text-gray-400">
                            {formatPrice(course.originalPrice)}
                          </span>
                        )}
                        <span className="text-base font-bold text-gray-900 dark:text-white font-serif">
                          {course.price > 0 ? formatPrice(course.price) : 'Free'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Action Button */}
                  <div className="px-6 pb-6 pt-0">
                    {isPurchased ? (
                      <Link
                        href={`/learn/${course.slug}`}
                        className="w-full block text-center py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs tracking-wide shadow-sm transition active:scale-95"
                      >
                        Open Classroom Player
                      </Link>
                    ) : (
                      <button
                        onClick={() => handleQuickEnroll(course.id, course.slug)}
                        disabled={enrollingCourseId === course.id}
                        className="w-full py-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs tracking-wide shadow-sm transition active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        <ShoppingBag className="w-4 h-4" />
                        <span>
                          {enrollingCourseId === course.id
                            ? 'Unlocking Access...'
                            : `Enroll Now (${formatPrice(course.price)})`}
                        </span>
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      )}

      {/* TAB 2: MY PURCHASED COURSES */}
      {activeTab === 'my_courses' && (
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl sm:text-2xl font-serif font-bold text-gray-900 dark:text-white">
              My Purchased Courses
            </h2>
            <span className="text-xs text-gray-500">
              {filteredMyCourses.length} active enrollments
            </span>
          </div>

          {filteredMyCourses.length === 0 ? (
            /* Empty State when student has no purchases */
            <div className="text-center py-16 px-6 rounded-3xl bg-white dark:bg-ink-900 border border-dashed border-gray-300 dark:border-gray-800 space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-amber-100 dark:bg-amber-950 text-amber-600 flex items-center justify-center mx-auto">
                <BookOpen className="w-7 h-7" />
              </div>
              <h3 className="font-serif text-lg font-bold text-gray-900 dark:text-white">
                You Haven't Purchased Any Course Yet
              </h3>
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 max-w-sm mx-auto leading-relaxed">
                Please purchase a course from the catalog to unlock video archives, downloadable PPT presentations, and research assignments.
              </p>
              <button
                type="button"
                onClick={() => setActiveTab('explore')}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shadow transition active:scale-95"
              >
                <span>Browse Popular Courses</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          ) : (
            /* List of purchased courses */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredMyCourses.map(({ course, id, createdAt }) => {
                const lessonCount = course.modules?.reduce(
                  (sum: number, m: any) => sum + (m.lessons?.length || 0),
                  0
                ) || 0;

                return (
                  <article
                    key={id}
                    className="flex flex-col rounded-3xl overflow-hidden bg-white dark:bg-ink-900 border border-gray-200 dark:border-gray-800 shadow-sm hover:shadow-md transition group"
                  >
                    {course.thumbnail ? (
                      <div className="relative aspect-[16/10] bg-gray-100 dark:bg-gray-800 overflow-hidden border-b border-gray-100 dark:border-gray-800">
                        <img
                          src={course.thumbnail}
                          alt={course.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
                        <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between pointer-events-none">
                          <span className="text-[10px] font-bold tracking-wide uppercase px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-md text-emerald-300 border border-white/10">
                            {course.category}
                          </span>
                        </div>
                        <div className="absolute top-2.5 right-3 bg-emerald-600 text-white text-[10px] font-bold px-2.5 py-1 rounded-lg shadow">
                          PURCHASED
                        </div>
                      </div>
                    ) : (
                      <div className="p-6 pb-0 flex items-center justify-between gap-2">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-bold tracking-wide uppercase bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-900/60">
                          {course.category}
                        </span>
                        <span className="bg-emerald-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-md shadow-sm">
                          PURCHASED
                        </span>
                      </div>
                    )}

                    <div className={`p-6 flex-1 flex flex-col justify-between space-y-4 ${course.thumbnail ? 'pt-5' : 'pt-3'}`}>
                      <div className="space-y-1.5">
                        <h3 className="font-serif text-lg font-bold text-gray-900 dark:text-white group-hover:text-amber-600 transition">
                          {course.title}
                        </h3>
                        <p className="text-xs text-gray-500 line-clamp-2">
                          {course.shortDescription || course.description}
                        </p>
                      </div>

                      <div className="pt-3 border-t border-gray-100 dark:border-gray-800 space-y-3">
                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <Layers className="w-3.5 h-3.5 text-amber-600" />
                            {course.modules?.length || 0} Modules
                          </span>
                          <span className="flex items-center gap-1">
                            <PlayCircle className="w-3.5 h-3.5 text-amber-600" />
                            {lessonCount} Lectures
                          </span>
                        </div>

                        {/* Progress */}
                        <div className="space-y-1">
                          <div className="flex justify-between text-[10px] font-semibold text-gray-500">
                            <span>Syllabus Progress</span>
                            <span>30% Completed</span>
                          </div>
                          <div className="h-1.5 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                            <div className="h-full bg-amber-600 rounded-full w-[30%]" />
                          </div>
                        </div>

                        <Link
                          href={`/learn/${course.slug}`}
                          className="w-full block text-center py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs tracking-wide shadow-sm transition active:scale-95"
                        >
                          Open Classroom (Videos & PPTs)
                        </Link>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
