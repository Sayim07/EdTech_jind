import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { Navbar } from '@/components/Navbar';
import { MobileBottomNav } from '@/components/MobileBottomNav';
import { formatPrice } from '@/lib/utils';
import { getSessionUser } from '@/lib/auth';
import { EnrollButton } from './EnrollButton';
import { 
  PlayCircle, 
  FileText, 
  Award, 
  Clock, 
  BookOpen, 
  CheckCircle2, 
  ArrowLeft,
  GraduationCap
} from 'lucide-react';

export default async function CourseDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const user = await getSessionUser();

  const course = await prisma.course.findUnique({
    where: { slug },
    include: {
      modules: {
        orderBy: { order: 'asc' },
        include: {
          lessons: {
            orderBy: { order: 'asc' },
            include: { assignments: true },
          },
        },
      },
    },
  });

  if (!course) notFound();

  // Check if current user is enrolled
  let isEnrolled = false;
  if (user) {
    const enrollment = await prisma.enrollment.findUnique({
      where: {
        userId_courseId: {
          userId: user.id,
          courseId: course.id,
        },
      },
    });
    isEnrolled = !!enrollment;
  }

  const totalLessons = course.modules.reduce((sum, m) => sum + m.lessons.length, 0);
  const totalAssignments = course.modules.reduce(
    (sum, m) => sum + m.lessons.reduce((lSum, l) => lSum + l.assignments.length, 0),
    0
  );

  return (
    <>
      <Navbar />

      <main className="flex-1 pb-28 md:pb-16 bg-parchment-50">
        {/* Course Banner */}
        <section className="bg-ink-950 text-white border-b border-gray-800 py-10 md:py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
            <Link
              href="/courses"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-400 hover:text-amber-300 transition"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to all courses</span>
            </Link>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              <div className="lg:col-span-8 space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold">
                    {course.category}
                  </span>
                  <span className="px-2.5 py-0.5 rounded bg-gray-800 text-gray-300 text-xs font-medium">
                    {course.level}
                  </span>
                  <span className="text-xs text-gray-400">
                    Taught by {course.instructorName}
                  </span>
                </div>

                <h1 className="text-2xl sm:text-3xl md:text-4xl font-sans font-bold text-white tracking-tight leading-tight">
                  {course.title}
                </h1>

                <p className="text-sm sm:text-base text-gray-300 max-w-3xl leading-relaxed">
                  {course.description}
                </p>

                <div className="flex flex-wrap items-center gap-5 text-xs sm:text-sm text-gray-400 pt-2">
                  <div className="flex items-center gap-1.5">
                    <BookOpen className="w-4 h-4 text-amber-400" />
                    <span>{course.modules.length} Modules</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <PlayCircle className="w-4 h-4 text-amber-400" />
                    <span>{totalLessons} Lessons</span>
                  </div>
                  {totalAssignments > 0 && (
                    <div className="flex items-center gap-1.5">
                      <Award className="w-4 h-4 text-amber-400" />
                      <span>{totalAssignments} Assignments</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Action / Pricing Box */}
              <div className="lg:col-span-4 bg-white text-gray-900 p-6 rounded-2xl border border-gray-200 shadow-xl space-y-5">
                {course.thumbnail ? (
                  <div className="aspect-video relative rounded-xl overflow-hidden bg-gray-100">
                    <img
                      src={course.thumbnail}
                      alt={course.title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                      <div className="w-12 h-12 rounded-full bg-amber-600 text-white flex items-center justify-center shadow-lg">
                        <PlayCircle className="w-6 h-6 ml-0.5" />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="aspect-video relative rounded-xl overflow-hidden bg-amber-50 border border-amber-500/20 flex flex-col items-center justify-center p-6 text-center">
                    <div className="w-12 h-12 rounded-full bg-amber-600 text-white flex items-center justify-center shadow-md mb-2">
                      <PlayCircle className="w-6 h-6 ml-0.5" />
                    </div>
                    <span className="text-xs font-bold text-amber-700">
                      Video & Slide Lessons
                    </span>
                  </div>
                )}

                <div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl sm:text-3xl font-sans font-bold text-gray-900">
                      {course.price > 0 ? formatPrice(course.price) : 'Free Enrollment'}
                    </span>
                    {course.originalPrice && (
                      <span className="text-sm text-gray-400 line-through">
                        {formatPrice(course.originalPrice)}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Lifetime access to all video lessons and slides.
                  </p>
                </div>

                {isEnrolled ? (
                  <Link
                    href={`/learn/${course.slug}`}
                    className="w-full block text-center py-2.5 rounded-xl bg-amber-600 hover:bg-[#0060eb] text-white font-medium text-xs sm:text-sm transition shadow-sm active:scale-95"
                  >
                    Go to Class
                  </Link>
                ) : (
                  <EnrollButton
                    courseId={course.id}
                    courseSlug={course.slug}
                    coursePrice={course.price}
                    isLoggedIn={!!user}
                  />
                )}

                <div className="text-xs sm:text-xs text-gray-500 space-y-1 border-t border-gray-100 pt-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span>Mobile & desktop access</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span>Downloadable slides</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span>Course certificate</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Syllabus / Curriculum Section */}
        <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-4">
          <div className="space-y-0.5">
            <h2 className="text-xl sm:text-2xl font-sans font-bold text-gray-900">
              Course Content
            </h2>
            <p className="text-xs text-gray-500">
              {course.modules.length} modules • {totalLessons} lessons
            </p>
          </div>

          <div className="space-y-4">
            {course.modules.map((mod, mIdx) => (
              <div
                key={mod.id}
                className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm"
              >
                <div className="p-4 sm:p-5 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                  <h3 className="font-sans font-bold text-sm sm:text-base text-gray-900">
                    {mod.title}
                  </h3>
                  <span className="text-xs font-medium text-gray-500">
                    {mod.lessons.length} lessons
                  </span>
                </div>

                <div className="divide-y divide-gray-100">
                  {mod.lessons.map((lesson) => (
                    <div
                      key={lesson.id}
                      className="p-4 flex items-start sm:items-center justify-between gap-3 text-xs sm:text-sm"
                    >
                      <div className="flex items-start sm:items-center gap-3">
                        {lesson.type === 'VIDEO' || lesson.type === 'YOUTUBE' ? (
                          <PlayCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5 sm:mt-0" />
                        ) : lesson.type === 'PPT' ? (
                          <FileText className="w-4 h-4 text-amber-600 shrink-0 mt-0.5 sm:mt-0" />
                        ) : (
                          <Award className="w-4 h-4 text-amber-600 shrink-0 mt-0.5 sm:mt-0" />
                        )}
                        <div>
                          <span className="font-medium text-gray-800 block">
                            {lesson.title}
                          </span>
                          <span className="text-xs text-gray-400 capitalize">
                            {lesson.type.toLowerCase()} format
                            {lesson.fileUrl && ' • Includes PPT Deck'}
                            {lesson.assignments.length > 0 && ' • Includes Assignment'}
                          </span>
                        </div>
                      </div>

                      <div className="text-xs text-gray-400 shrink-0">
                        {lesson.duration || '15 min'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      <MobileBottomNav role={user?.role} isLoggedIn={!!user} />
    </>
  );
}
