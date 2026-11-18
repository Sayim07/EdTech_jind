'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { formatPrice } from '@/lib/utils';
import { ButtonSpinner } from '@/components/ui/Loaders';
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-8 space-y-6 sm:space-y-8">
      {/* Student Welcome Header */}
      <section className="bg-amber-100 rounded-2xl p-6 sm:p-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 sm:gap-6">
          <div className="space-y-1.5">
            <h1 className="text-3xl sm:text-5xl font-semibold tracking-tight text-amber-800 sm:leading-[56px]">
              Hi, {user.name}
            </h1>
            <p className="text-base text-gray-600">
              Continue learning or discover new courses.
            </p>
          </div>

          {/* Quick Metrics */}
          <div className="flex items-center gap-5 border-t md:border-t-0 md:border-l border-amber-200 pt-3 md:pt-0 md:pl-6 shrink-0">
            <div className="text-center">
              <div className="text-xl sm:text-2xl font-sans font-bold text-amber-600">
                {enrollments.length}
              </div>
              <div className="text-xs text-gray-500 font-semibold">
                Enrolled
              </div>
            </div>
            <div className="h-7 w-px bg-gray-200" />
            <div className="text-center">
              <div className="text-xl sm:text-2xl font-sans font-bold text-gray-800">
                {popularCourses.length}
              </div>
              <div className="text-xs text-gray-500 font-semibold">
                Available
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Primary Navigation Tabs & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Tab Controls */}
        <div className="flex items-center p-1 rounded-xl bg-gray-200/80 text-xs font-semibold shrink-0">
          <button
            onClick={() => setActiveTab('explore')}
            className={`px-3.5 py-2 rounded-lg transition flex items-center gap-1.5 ${
              activeTab === 'explore'
                ? 'bg-white text-amber-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            <span>Explore ({popularCourses.length})</span>
          </button>

          <button
            onClick={handleMyCoursesClick}
            className={`px-3.5 py-2 rounded-lg transition flex items-center gap-1.5 ${
              activeTab === 'my_courses'
                ? 'bg-white text-amber-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>My Courses ({enrollments.length})</span>
          </button>
        </div>

        {/* Course Search Bar */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search courses..."
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-gray-300 bg-white text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-sm"
          />
        </div>
      </div>

      {/* POPUP MODAL: "YOU HAVEN'T PURCHASED ANY COURSE" */}
      {showNoPurchaseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl border border-gray-200 shadow-2xl max-w-md w-full p-6 sm:p-8 text-center space-y-5 relative">
            <button
              onClick={() => setShowNoPurchaseModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-16 h-16 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center mx-auto">
              <ShoppingBag className="w-8 h-8" />
            </div>

            <div className="space-y-1.5">
              <h3 className="font-sans text-lg sm:text-xl font-bold text-gray-900">
                No Courses Yet
              </h3>
              <p className="text-xs text-gray-600">
                You haven&apos;t enrolled in any courses yet. Choose a course to start learning.
              </p>
            </div>

            <div className="pt-2 flex flex-col gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowNoPurchaseModal(false);
                  setActiveTab('explore');
                }}
                className="w-full py-2.5 px-4 rounded-xl bg-amber-600 hover:bg-[#0060eb] text-white font-semibold text-sm shadow-md transition active:scale-95 flex items-center justify-center gap-2"
              >
                <span>Browse Courses</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => setShowNoPurchaseModal(false)}
                className="w-full py-1.5 text-xs text-gray-500 hover:text-gray-700 font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 1: EXPLORE & POPULAR COURSES */}
      {activeTab === 'explore' && (
        <section className="space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg sm:text-xl font-sans font-bold text-gray-900">
              Popular Courses
            </h2>
            <span className="text-xs text-gray-500">
              {filteredPopularCourses.length} courses
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {filteredPopularCourses.map((course) => {
              const isPurchased = enrollments.some((e) => e.courseId === course.id);
              const lessonCount = course.modules?.reduce(
                (sum: number, m: any) => sum + (m.lessons?.length || 0),
                0
              ) || 0;

              return (
                <article
                  key={course.id}
                  className="flex flex-col rounded-2xl sm:rounded-3xl overflow-hidden bg-white border border-gray-200 shadow-sm hover:shadow-md transition group"
                >
                  {/* Thumbnail: only rendered if admin specifically uploaded/provided one */}
                  {course.thumbnail ? (
                    <div className="relative aspect-[16/10] bg-gray-100 overflow-hidden border-b border-gray-100">
                      <img
                        src={course.thumbnail}
                        alt={course.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                      />
                      <div className="absolute inset-0  pointer-events-none" />
                      <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between pointer-events-none">
                        <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-black/60 text-amber-300 border border-white/10">
                          {course.category}
                        </span>
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-black/60 text-gray-200 border border-white/10">
                          {course.level}
                        </span>
                      </div>
                      {isPurchased && (
                        <div className="absolute top-2.5 right-3 bg-emerald-600 text-white text-xs font-bold px-2 py-0.5 rounded-md shadow">
                          Enrolled
                        </div>
                      )}
                    </div>
                  ) : (
                    /* Clean typography header when no thumbnail is set by admin */
                    <div className="p-4 sm:p-5 pb-0 flex items-center justify-between gap-2">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200/60">
                        {course.category}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-gray-100 text-gray-600">
                          {course.level}
                        </span>
                        {isPurchased && (
                          <span className="bg-emerald-600 text-white text-xs font-bold px-2 py-0.5 rounded-md shadow-sm">
                            Enrolled
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Body */}
                  <div className={`p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-3 ${course.thumbnail ? 'pt-4' : 'pt-2'}`}>
                    <div className="space-y-1.5">
                      <h3 className="font-sans text-base sm:text-lg font-bold text-gray-900 group-hover:text-amber-600 transition leading-snug line-clamp-2">
                        {course.title}
                      </h3>
                      <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed">
                        {course.shortDescription || course.description}
                      </p>
                    </div>

                    <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                      <div className="flex items-center gap-2.5">
                        <span className="flex items-center gap-1 font-medium text-xs">
                          <BookOpen className="w-3.5 h-3.5 text-amber-600" />
                          {lessonCount} Lessons
                        </span>
                        <span className="flex items-center gap-1 font-medium text-xs">
                          <FileText className="w-3.5 h-3.5 text-amber-600" />
                          Slides
                        </span>
                      </div>
                      <div className="flex items-baseline gap-1.5">
                        {course.originalPrice && course.originalPrice > course.price && (
                          <span className="text-xs line-through text-gray-400">
                            {formatPrice(course.originalPrice)}
                          </span>
                        )}
                        <span className="text-sm sm:text-base font-bold text-gray-900 font-sans">
                          {course.price > 0 ? formatPrice(course.price) : 'Free'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Action Button */}
                  <div className="px-4 sm:px-5 pb-4 sm:pb-5 pt-0">
                    {isPurchased ? (
                      <Link
                        href={`/learn/${course.slug}`}
                        className="w-full block text-center py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm shadow-sm transition active:scale-95"
                      >
                        Go to Class
                      </Link>
                    ) : (
                      <button
                        onClick={() => handleQuickEnroll(course.id, course.slug)}
                        disabled={enrollingCourseId === course.id}
                        className="w-full py-2.5 rounded-xl bg-amber-600 hover:bg-[#0060eb] text-white font-semibold text-sm shadow-sm transition active:scale-95 disabled:opacity-75 flex items-center justify-center gap-2"
                      >
                        {enrollingCourseId === course.id ? (
                          <ButtonSpinner label="Enrolling..." />
                        ) : (
                          <>
                            <ShoppingBag className="w-3.5 h-3.5" />
                            <span>Enroll • {formatPrice(course.price)}</span>
                          </>
                        )}
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
        <section className="space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg sm:text-xl font-sans font-bold text-gray-900">
              My Courses
            </h2>
            <span className="text-xs text-gray-500">
              {filteredMyCourses.length} enrolled
            </span>
          </div>

          {filteredMyCourses.length === 0 ? (
            /* Empty State when student has no purchases */
            <div className="text-center py-12 px-5 rounded-2xl bg-white border border-dashed border-gray-300 space-y-3">
              <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center mx-auto">
                <BookOpen className="w-6 h-6" />
              </div>
              <h3 className="font-sans text-base sm:text-lg font-bold text-gray-900">
                No Courses Yet
              </h3>
              <p className="text-xs text-gray-500 max-w-xs mx-auto">
                Pick a course to start learning video lessons and presentation slides.
              </p>
              <button
                type="button"
                onClick={() => setActiveTab('explore')}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-600 hover:bg-[#0060eb] text-white text-xs font-semibold shadow transition active:scale-95"
              >
                <span>Browse Courses</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            /* List of purchased courses */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {filteredMyCourses.map(({ course, id, createdAt }) => {
                const lessonCount = course.modules?.reduce(
                  (sum: number, m: any) => sum + (m.lessons?.length || 0),
                  0
                ) || 0;

                return (
                  <article
                    key={id}
                    className="flex flex-col rounded-2xl sm:rounded-3xl overflow-hidden bg-white border border-gray-200 shadow-sm hover:shadow-md transition group"
                  >
                    {course.thumbnail ? (
                      <div className="relative aspect-[16/10] bg-gray-100 overflow-hidden border-b border-gray-100">
                        <img
                          src={course.thumbnail}
                          alt={course.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                        />
                        <div className="absolute inset-0  pointer-events-none" />
                        <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between pointer-events-none">
                          <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-black/60 text-emerald-300 border border-white/10">
                            {course.category}
                          </span>
                        </div>
                        <div className="absolute top-2.5 right-3 bg-emerald-600 text-white text-xs font-bold px-2 py-0.5 rounded-md shadow">
                          Enrolled
                        </div>
                      </div>
                    ) : (
                      <div className="p-4 sm:p-5 pb-0 flex items-center justify-between gap-2">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                          {course.category}
                        </span>
                        <span className="bg-emerald-600 text-white text-xs font-bold px-2 py-0.5 rounded-md shadow-sm">
                          Enrolled
                        </span>
                      </div>
                    )}

                    <div className={`p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-3 ${course.thumbnail ? 'pt-4' : 'pt-2'}`}>
                      <div className="space-y-1">
                        <h3 className="font-sans text-base sm:text-lg font-bold text-gray-900 group-hover:text-amber-600 transition line-clamp-2">
                          {course.title}
                        </h3>
                        <p className="text-xs text-gray-500 line-clamp-2">
                          {course.shortDescription || course.description}
                        </p>
                      </div>

                      <div className="pt-3 border-t border-gray-100 space-y-2.5">
                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <span className="flex items-center gap-1 text-xs">
                            <Layers className="w-3.5 h-3.5 text-amber-600" />
                            {course.modules?.length || 0} Modules
                          </span>
                          <span className="flex items-center gap-1 text-xs">
                            <PlayCircle className="w-3.5 h-3.5 text-amber-600" />
                            {lessonCount} Lessons
                          </span>
                        </div>

                        {/* Progress */}
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs font-semibold text-gray-500">
                            <span>Progress</span>
                            <span>30% Completed</span>
                          </div>
                          <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full bg-amber-600 rounded-full w-[30%]" />
                          </div>
                        </div>

                        <Link
                          href={`/learn/${course.slug}`}
                          className="w-full block text-center py-2.5 rounded-xl bg-amber-600 hover:bg-[#0060eb] text-white font-semibold text-sm shadow-sm transition active:scale-95"
                        >
                          Go to Class
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
