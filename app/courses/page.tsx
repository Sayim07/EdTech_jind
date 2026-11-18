import React from 'react';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { Navbar } from '@/components/Navbar';
import { MobileBottomNav } from '@/components/MobileBottomNav';
import { formatPrice } from '@/lib/utils';
import { getSessionUser } from '@/lib/auth';
import { BookOpen, Clock, Compass, Search, Filter } from 'lucide-react';

export default async function CoursesCatalogPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string; level?: string }>;
}) {
  const { q = '', category = 'All', level = 'All' } = await searchParams;
  const user = await getSessionUser();

  const where: any = { published: true };

  if (q) {
    where.OR = [
      { title: { contains: q } },
      { description: { contains: q } },
      { category: { contains: q } },
    ];
  }

  if (category && category !== 'All') {
    where.category = { contains: category };
  }

  if (level && level !== 'All') {
    where.level = level;
  }

  const courses = await prisma.course.findMany({
    where,
    include: {
      modules: {
        include: {
          lessons: { select: { id: true, duration: true } },
        },
      },
      _count: { select: { enrollments: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  const categories = [
    'All',
    'Anthropology & Gastronomy',
    'World History',
    'Global Economics & Culture',
  ];

  return (
    <>
      <Navbar />

      <main className="flex-1 w-full px-4 sm:px-6 lg:px-10 py-5 md:py-8 pb-20 lg:pb-10 space-y-5 sm:space-y-6">
        {/* Header */}
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-sans font-bold text-gray-900">
            Courses
          </h1>
          <p className="text-xs sm:text-sm text-gray-600">
            Video lessons, presentation slides, and notes on food history.
          </p>
        </div>

        {/* Filter & Search Controls */}
        <div className="space-y-3 bg-white p-3.5 sm:p-4 rounded-2xl border border-gray-200 shadow-sm">
          <form method="GET" action="/courses" className="flex flex-col sm:flex-row gap-2.5">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
              <input
                type="text"
                name="q"
                defaultValue={q}
                placeholder="Search courses..."
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-gray-300 bg-gray-50 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-[#0060eb] text-white font-medium text-xs sm:text-sm transition active:scale-95 shrink-0"
            >
              Search
            </button>
          </form>

          {/* Category Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-0.5">
            <span className="text-xs font-semibold text-gray-500 shrink-0 pr-1">Category:</span>
            {categories.map((cat) => {
              const active = category === cat || (cat === 'All' && !category);
              return (
                <Link
                  key={cat}
                  href={`/courses?category=${encodeURIComponent(cat)}&q=${encodeURIComponent(q)}`}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap transition ${
                    active
                      ? 'bg-amber-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {cat}
                </Link>
              );
            })}
          </div>
        </div>

        {/* Course Grid */}
        {courses.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl border border-gray-200 p-6 space-y-3">
            <Compass className="w-10 h-10 text-gray-400 mx-auto" />
            <h3 className="text-base font-sans font-bold text-gray-800">
              No matching courses found
            </h3>
            <p className="text-xs text-gray-500 max-w-xs mx-auto">
              Try a different search word or clear the filter.
            </p>
            <Link
              href="/courses"
              className="inline-block px-3.5 py-1.5 rounded-lg bg-amber-600 text-white text-xs font-medium"
            >
              Reset Filters
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {courses.map((course) => {
              const lessonCount = course.modules.reduce((sum, m) => sum + m.lessons.length, 0);

              return (
                <article
                  key={course.id}
                  className="flex flex-col rounded-2xl overflow-hidden bg-white border border-gray-200 shadow-sm hover:shadow-md transition group"
                >
                  {/* Thumbnail (if set by admin) */}
                  {course.thumbnail ? (
                    <Link href={`/courses/${course.slug}`} className="relative aspect-[16/10] bg-gray-100 overflow-hidden block">
                      <img
                        src={course.thumbnail}
                        alt={course.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                      />
                      <div className="absolute top-2.5 left-2.5 bg-ink-950/80 text-amber-300 text-xs font-bold px-2 py-0.5 rounded-md">
                        {course.level}
                      </div>
                    </Link>
                  ) : (
                    <div className="p-4 pb-0 flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-amber-700">
                        {course.category}
                      </span>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-gray-100 text-gray-600">
                        {course.level}
                      </span>
                    </div>
                  )}

                  {/* Details */}
                  <div className={`p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-3 ${course.thumbnail ? 'pt-4' : 'pt-2'}`}>
                    <div className="space-y-1.5">
                      {course.thumbnail && (
                        <div className="text-xs font-semibold text-amber-700">
                          {course.category}
                        </div>
                      )}
                      <h3 className="font-sans text-base sm:text-lg font-bold text-gray-900 group-hover:text-amber-600 transition leading-snug">
                        <Link href={`/courses/${course.slug}`}>{course.title}</Link>
                      </h3>
                      <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed">
                        {course.shortDescription || course.description}
                      </p>
                    </div>

                    <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
                      <div className="flex items-center gap-2.5 text-xs text-gray-500">
                        <span className="flex items-center gap-1 text-xs">
                          <BookOpen className="w-3.5 h-3.5" />
                          {lessonCount} lessons
                        </span>
                        <span className="flex items-center gap-1 text-xs">
                          <Clock className="w-3.5 h-3.5" />
                          {course.modules.length} modules
                        </span>
                      </div>

                      <div className="text-right">
                        <div className="text-sm sm:text-base font-bold text-gray-900">
                          {course.price > 0 ? formatPrice(course.price) : 'Free'}
                        </div>
                        {course.originalPrice && (
                          <div className="text-xs text-gray-400 line-through">
                            {formatPrice(course.originalPrice)}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="px-5 pb-5 pt-0">
                    <Link
                      href={`/courses/${course.slug}`}
                      className="w-full block text-center py-2.5 rounded-xl bg-amber-600 hover:bg-[#0060eb] text-white font-medium text-xs transition shadow-sm active:scale-95"
                    >
                      View Syllabus & Enroll
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </main>

      <MobileBottomNav role={user?.role} isLoggedIn={!!user} />
    </>
  );
}
