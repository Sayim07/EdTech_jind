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

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12 pb-24 md:pb-12 space-y-8">
        {/* Header */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-500">
            <Compass className="w-4 h-4" />
            <span>Academic Curriculum</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-serif font-bold text-gray-900 dark:text-white">
            All Masterclasses & Archival Studies
          </h1>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 max-w-2xl">
            Explore comprehensive video series, interactive presentation decks, and evaluation assignments on human food evolution and civilization.
          </p>
        </div>

        {/* Filter & Search Controls */}
        <div className="space-y-4 bg-white dark:bg-ink-900 p-4 sm:p-5 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm">
          <form method="GET" action="/courses" className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-gray-400" />
              <input
                type="text"
                name="q"
                defaultValue={q}
                placeholder="Search courses, empires, culinary eras..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-ink-800 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-medium text-sm transition active:scale-95 shrink-0"
            >
              Filter Catalog
            </button>
          </form>

          {/* Category Chips */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pt-1">
            <span className="text-xs font-semibold text-gray-500 shrink-0 pr-1">Category:</span>
            {categories.map((cat) => {
              const active = category === cat || (cat === 'All' && !category);
              return (
                <Link
                  key={cat}
                  href={`/courses?category=${encodeURIComponent(cat)}&q=${encodeURIComponent(q)}`}
                  className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition ${
                    active
                      ? 'bg-amber-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200'
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
          <div className="text-center py-16 bg-white dark:bg-ink-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-8 space-y-4">
            <Compass className="w-12 h-12 text-gray-400 mx-auto" />
            <h3 className="text-lg font-serif font-bold text-gray-800 dark:text-gray-200">
              No matching courses found
            </h3>
            <p className="text-sm text-gray-500 max-w-sm mx-auto">
              Try adjusting your search query or clear the active category filters to view all available tracks.
            </p>
            <Link
              href="/courses"
              className="inline-block px-4 py-2 rounded-lg bg-amber-600 text-white text-xs font-medium"
            >
              Reset Filters
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {courses.map((course) => {
              const lessonCount = course.modules.reduce((sum, m) => sum + m.lessons.length, 0);

              return (
                <article
                  key={course.id}
                  className="flex flex-col rounded-2xl overflow-hidden bg-white dark:bg-ink-900 border border-gray-200 dark:border-gray-800 shadow-sm hover:shadow-md transition group"
                >
                  {/* Thumbnail (if set by admin) */}
                  {course.thumbnail ? (
                    <Link href={`/courses/${course.slug}`} className="relative aspect-[16/10] bg-gray-100 dark:bg-gray-800 overflow-hidden block">
                      <img
                        src={course.thumbnail}
                        alt={course.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                      />
                      <div className="absolute top-3 left-3 bg-ink-950/80 backdrop-blur-sm text-amber-300 text-[11px] font-bold px-2.5 py-1 rounded-md">
                        {course.level}
                      </div>
                    </Link>
                  ) : (
                    <div className="p-6 pb-0 flex items-center justify-between gap-2">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                        {course.category}
                      </span>
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">
                        {course.level}
                      </span>
                    </div>
                  )}

                  {/* Details */}
                  <div className={`p-5 sm:p-6 flex-1 flex flex-col justify-between space-y-4 ${course.thumbnail ? 'pt-5' : 'pt-3'}`}>
                    <div className="space-y-2">
                      {course.thumbnail && (
                        <div className="text-xs font-semibold text-amber-700 dark:text-amber-400">
                          {course.category}
                        </div>
                      )}
                      <h3 className="font-serif text-lg font-bold text-gray-900 dark:text-white group-hover:text-amber-600 transition leading-snug">
                        <Link href={`/courses/${course.slug}`}>{course.title}</Link>
                      </h3>
                      <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 line-clamp-2 leading-relaxed">
                        {course.shortDescription || course.description}
                      </p>
                    </div>

                    <div className="pt-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
                      <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                        <span className="flex items-center gap-1">
                          <BookOpen className="w-3.5 h-3.5" />
                          {lessonCount} lessons
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {course.modules.length} modules
                        </span>
                      </div>

                      <div className="text-right">
                        <div className="text-base font-bold text-gray-900 dark:text-white">
                          {course.price > 0 ? formatPrice(course.price) : 'Free Access'}
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
                      className="w-full block text-center py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-medium text-xs tracking-wide transition shadow-sm active:scale-95"
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
