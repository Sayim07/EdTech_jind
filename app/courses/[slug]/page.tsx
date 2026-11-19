import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { Navbar } from '@/components/Navbar';
import { MobileBottomNav } from '@/components/MobileBottomNav';
import { formatPrice } from '@/lib/utils';
import { getSessionUser } from '@/lib/auth';
import { courseTotalHours, durationToMinutes, formatHours, parseFaqs } from '@/lib/course';
import { EnrollButton } from './EnrollButton';
import {
  PlayCircle,
  FileText,
  Award,
  Clock,
  Layers,
  BarChart3,
  CheckCircle2,
  ArrowLeft,
  ChevronDown,
  BookOpen,
  Headphones,
} from 'lucide-react';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const course = await prisma.course.findUnique({ where: { slug }, select: { title: true, shortDescription: true } });
  return { title: course ? `${course.title} | CIM India` : 'Course | CIM India', description: course?.shortDescription || undefined };
}

function formatModuleTime(minutes: number) {
  if (!minutes) return null;
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return h ? `${h}h ${m ? `${m}m` : ''}`.trim() : `${m}m`;
}

export default async function CourseDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const user = await getSessionUser();

  const [course, enrollment] = await Promise.all([
  prisma.course.findUnique({
    where: { slug },
    include: {
      modules: {
        orderBy: { order: 'asc' },
        include: {
          lessons: { orderBy: { order: 'asc' } },
          assignments: { select: { id: true } },
          tests: { select: { id: true, kind: true } },
        },
      },
      mcqTests: { select: { id: true } },
      instructor: { select: { name: true, designation: true, bio: true, active: true, user: { select: { avatarUrl: true } } } },
      _count: { select: { enrollments: true } },
    },
  }),
  user ? prisma.enrollment.findFirst({ where: { userId: user.id, course: { slug } }, select: { id: true } }) : Promise.resolve(null),
  ]);

  // Details are public, but unpublished courses stay hidden from everyone except admins.
  if (!course || (!course.published && user?.role !== 'ADMIN')) notFound();

  const isEnrolled = !!enrollment;

  const allLessons = course.modules.flatMap((m) => m.lessons);
  const totalLessons = allLessons.length;
  const totalAssignments = course.modules.reduce((sum, m) => sum + m.assignments.length + m.tests.filter((t) => t.kind === 'ASSIGNMENT').length, 0);
  const totalTests = course.modules.reduce((sum, m) => sum + m.tests.filter((t) => t.kind !== 'ASSIGNMENT').length, 0) + course.mcqTests.length;
  const hours = courseTotalHours(course.totalHours, allLessons);
  const faqs = parseFaqs(course.faqs);
  const hasSlides = allLessons.some((l) => l.fileUrl);
  const hasAudio = allLessons.some((l) => l.audioUrl);

  const stats = [
    { icon: Clock, label: 'Total duration', value: formatHours(hours) },
    { icon: Layers, label: 'Modules', value: String(course.modules.length) },
    { icon: PlayCircle, label: 'Lessons', value: String(totalLessons) },
    { icon: BarChart3, label: 'Difficulty', value: course.level },
  ];

  const includes = [
    'Lifetime access on mobile and desktop',
    hasSlides ? 'Downloadable slide decks for every lesson' : null,
    hasAudio ? 'Audio podcast version of each lecture' : null,
    totalAssignments > 0 ? `${totalAssignments} graded assignment${totalAssignments === 1 ? '' : 's'}` : null,
    totalTests > 0 ? `${totalTests} proctored MCQ test${totalTests === 1 ? '' : 's'}` : null,
    'Certificate of completion',
  ].filter(Boolean) as string[];

  return (
    <>
      <Navbar />

      <main className="flex-1 pb-28 lg:pb-16">
        {/* Hero */}
        <section className="bg-amber-100">
          <div className="w-full px-4 sm:px-6 lg:px-10 py-8 sm:py-12 space-y-6">
            <Link
              href="/courses"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-amber-600 hover:underline"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>All courses</span>
            </Link>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
              <div className="lg:col-span-7 space-y-5">
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="px-2.5 py-1 rounded-md bg-white text-amber-800 font-semibold">{course.category}</span>
                  {!course.published && (
                    <span className="px-2.5 py-1 rounded-md bg-warm text-gray-900 font-semibold">Unpublished (admin preview)</span>
                  )}
                </div>
                <h1 className="text-3xl sm:text-5xl font-semibold text-amber-800 leading-tight sm:leading-[56px]">
                  {course.title}
                </h1>
                <p className="text-lg text-gray-700 max-w-3xl">{course.shortDescription || course.description}</p>
                <p className="text-sm text-gray-600">
                  Taught by <span className="font-semibold text-gray-900">{course.instructorName}</span>
                  {course._count.enrollments > 0 && <> · {course._count.enrollments} enrolled</>}
                </p>

                <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                  {stats.map((s) => (
                    <div key={s.label} className="bg-white rounded-xl p-4 flex items-center gap-3">
                      <s.icon className="w-5 h-5 text-amber-600 shrink-0" aria-hidden="true" />
                      <div className="min-w-0">
                        <dd className="text-base font-semibold text-gray-900 truncate">{s.value}</dd>
                        <dt className="text-xs text-gray-600">{s.label}</dt>
                      </div>
                    </div>
                  ))}
                </dl>

                {course.instructor?.active && (
                  <section aria-labelledby="instructor-heading" className="space-y-3 pt-4 border-t border-amber-200">
                    <h2 id="instructor-heading" className="text-2xl font-semibold text-gray-900">
                      Your instructor
                    </h2>
                    <div className="flex items-start gap-4 max-w-3xl">
                      {course.instructor.user?.avatarUrl ? (
                        <img src={course.instructor.user.avatarUrl} alt="" referrerPolicy="no-referrer" className="w-14 h-14 rounded-full object-cover shrink-0" />
                      ) : (
                        <span className="w-14 h-14 rounded-full bg-amber-600 text-white flex items-center justify-center text-xl font-semibold shrink-0" aria-hidden="true">
                          {course.instructor.name.charAt(0).toUpperCase()}
                        </span>
                      )}
                      <div className="min-w-0">
                        <p className="text-base font-semibold text-gray-900">{course.instructor.name}</p>
                        {course.instructor.designation && <p className="text-sm text-gray-600">{course.instructor.designation}</p>}
                        {course.instructor.bio && <p className="text-base text-gray-800 leading-relaxed mt-2 whitespace-pre-line">{course.instructor.bio}</p>}
                      </div>
                    </div>
                  </section>
                )}

                <section aria-labelledby="about-heading" className="space-y-3 pt-4 border-t border-amber-200">
                  <h2 id="about-heading" className="text-2xl font-semibold text-gray-900">
                    About this course
                  </h2>
                  <p className="text-base text-gray-800 leading-relaxed max-w-3xl whitespace-pre-line">{course.description}</p>
                  <div className="flex flex-wrap gap-4 pt-1 text-sm text-gray-800">
                    {hasSlides && (
                      <span className="flex items-center gap-1.5">
                        <FileText className="w-4 h-4 text-amber-600" /> Slide decks
                      </span>
                    )}
                    {hasAudio && (
                      <span className="flex items-center gap-1.5">
                        <Headphones className="w-4 h-4 text-amber-600" /> Audio lectures
                      </span>
                    )}
                    {totalAssignments > 0 && (
                      <span className="flex items-center gap-1.5">
                        <Award className="w-4 h-4 text-amber-600" /> Assignments
                      </span>
                    )}
                  </div>
                </section>
              </div>

              {/* Cover + purchase card */}
              <aside className="lg:col-span-5 lg:sticky lg:top-24">
                <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-md">
                  <div className="relative aspect-video bg-amber-50">
                    {course.thumbnail ? (
                      <img src={course.thumbnail} alt={`Cover image for ${course.title}`} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-amber-600">
                        <BookOpen className="w-12 h-12" />
                      </div>
                    )}
                  </div>
                  <div className="p-6 space-y-5">
                    <div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-semibold text-gray-900">
                          {course.price > 0 ? formatPrice(course.price) : 'Free'}
                        </span>
                        {course.originalPrice && course.originalPrice > course.price && (
                          <span className="text-sm text-gray-500 line-through">{formatPrice(course.originalPrice)}</span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mt-1">One-time payment. Lifetime access.</p>
                    </div>

                    {isEnrolled ? (
                      <Link
                        href={`/learn/${course.slug}`}
                        className="w-full h-11 rounded-lg bg-amber-600 hover:bg-[#0060eb] text-white font-semibold flex items-center justify-center transition active:scale-[0.98]"
                      >
                        Go to class
                      </Link>
                    ) : (
                      <EnrollButton
                        courseId={course.id}
                        courseSlug={course.slug}
                        coursePrice={course.price}
                        isLoggedIn={!!user}
                      />
                    )}

                    <ul className="text-sm text-gray-700 space-y-2 border-t border-gray-200 pt-4">
                      {includes.map((item) => (
                        <li key={item} className="flex items-start gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </aside>
            </div>
          </div>
        </section>

        <div className="w-full px-4 sm:px-6 lg:px-10 py-10 sm:py-14 grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12">
          <div className="lg:col-span-7 space-y-12">
            {/* Syllabus / roadmap */}
            <section aria-labelledby="syllabus-heading" className="space-y-4">
              <div>
                <h2 id="syllabus-heading" className="text-2xl sm:text-3xl font-semibold text-gray-900">
                  Syllabus &amp; roadmap
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  {course.modules.length} modules · {totalLessons} lessons · {formatHours(hours)}
                </p>
              </div>

              {course.modules.length === 0 ? (
                <p className="text-gray-600">The syllabus for this course will be published soon.</p>
              ) : (
                <div className="space-y-3">
                  {course.modules.map((mod, i) => {
                    const minutes = mod.lessons.reduce((sum, l) => sum + durationToMinutes(l.duration), 0);
                    const time = formatModuleTime(minutes);
                    return (
                      <details
                        key={mod.id}
                        open={i === 0}
                        className="group bg-white rounded-xl border border-gray-200 overflow-hidden"
                      >
                        <summary className="cursor-pointer list-none p-5 flex items-center justify-between gap-4 hover:bg-gray-50 transition">
                          <div className="min-w-0">
                            <h3 className="text-base font-semibold text-gray-900">{mod.title}</h3>
                            <p className="text-sm text-gray-600">
                              {mod.lessons.length} {mod.lessons.length === 1 ? 'lesson' : 'lessons'}
                              {time && ` · ${time}`}
                            </p>
                          </div>
                          <ChevronDown className="w-5 h-5 text-gray-500 shrink-0 transition-transform group-open:rotate-180" />
                        </summary>
                        <ol className="border-t border-gray-200 divide-y divide-gray-100">
                          {mod.lessons.map((lesson) => (
                            <li key={lesson.id} className="px-5 py-3.5 flex items-start justify-between gap-4">
                              <div className="flex items-start gap-3 min-w-0">
                                {lesson.type === 'PPT' || lesson.type === 'PDF' ? (
                                  <FileText className="w-4 h-4 text-amber-600 shrink-0 mt-1" />
                                ) : lesson.type === 'ASSIGNMENT' ? (
                                  <Award className="w-4 h-4 text-amber-600 shrink-0 mt-1" />
                                ) : (
                                  <PlayCircle className="w-4 h-4 text-amber-600 shrink-0 mt-1" />
                                )}
                                <div className="min-w-0">
                                  <div className="text-sm font-semibold text-gray-900">{lesson.title}</div>
                                  <div className="text-xs text-gray-600">
                                    {lesson.type === 'AUDIO' ? 'Audio lesson' : lesson.type === 'PPT' ? 'Presentation' : lesson.type === 'PDF' ? 'PDF' : 'Video class'}
                                  </div>
                                </div>
                              </div>
                              <span className="text-xs text-gray-600 shrink-0 tabular-nums">{lesson.duration || ''}</span>
                            </li>
                          ))}
                        </ol>
                      </details>
                    );
                  })}
                </div>
              )}
            </section>
          </div>

          {/* FAQ */}
          <section aria-labelledby="faq-heading" className="lg:col-span-5 space-y-4">
            <h2 id="faq-heading" className="text-2xl sm:text-3xl font-semibold text-gray-900">
              Frequently asked questions
            </h2>
            {faqs.length === 0 ? (
              <p className="text-gray-600">No questions yet. Reach out to the CIM India team if you need help deciding.</p>
            ) : (
              <div className="space-y-3">
                {faqs.map((f, i) => (
                  <details key={i} className="group bg-white rounded-xl border border-gray-200 overflow-hidden">
                    <summary className="cursor-pointer list-none p-5 flex items-center justify-between gap-4 hover:bg-gray-50 transition">
                      <h3 className="text-base font-semibold text-gray-900">{f.q}</h3>
                      <ChevronDown className="w-5 h-5 text-gray-500 shrink-0 transition-transform group-open:rotate-180" />
                    </summary>
                    <p className="px-5 pb-5 text-sm text-gray-700 leading-relaxed whitespace-pre-line">{f.a}</p>
                  </details>
                ))}
              </div>
            )}
          </section>
        </div>
      </main>

      <MobileBottomNav role={user?.role} isLoggedIn={!!user} />
    </>
  );
}
