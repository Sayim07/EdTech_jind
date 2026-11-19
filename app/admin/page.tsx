import React, { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { Navbar } from '@/components/Navbar';
import { MobileBottomNav } from '@/components/MobileBottomNav';
import { AdminDashboardSkeleton } from '@/components/ui/Loaders';
import { AdminClient } from './AdminClient';
import type { AdminDashboardData } from '@/components/admin/AdminDashboard';
import type { PaymentRow } from '@/components/admin/PaymentsPanel';

export default async function AdminStudioPage() {
  const user = await getSessionUser();

  if (!user || user.role !== 'ADMIN') {
    redirect('/login?tab=admin&error=AdminAccessOnly');
  }

  // Fetch initial data for admin studio. Every query starts at once: each round trip to the hosted DB is slow.
  // All the dashboard counters in ONE query (they used to be five separate round trips).
  const extrasPromise = Promise.all([
    prisma.$queryRaw<
      {
        lessons: { type: string; count: number }[] | null;
        submissions: { status: string; count: number }[] | null;
        payments: { status: string; count: number }[] | null;
        attempts: number;
        passed: number;
        progress: number;
      }[]
    >`SELECT
        (SELECT json_agg(x) FROM (SELECT "type", COUNT(*)::int AS count FROM "Lesson" GROUP BY "type") x) AS lessons,
        (SELECT json_agg(x) FROM (SELECT "status", COUNT(*)::int AS count FROM "Submission" GROUP BY "status") x) AS submissions,
        (SELECT json_agg(x) FROM (SELECT "status", COUNT(*)::int AS count FROM "Payment" GROUP BY "status") x) AS payments,
        (SELECT COUNT(*)::int FROM "McqAttempt" WHERE "status" = 'SUBMITTED') AS attempts,
        (SELECT COUNT(*)::int FROM "McqAttempt" WHERE "status" = 'SUBMITTED' AND "passed" = true) AS passed,
        (SELECT COUNT(*)::int FROM "LessonProgress") AS progress`,
    prisma.payment.findMany({
      include: { user: { select: { id: true, name: true, email: true } }, course: { select: { id: true, title: true } } },
      orderBy: { createdAt: 'desc' },
      take: 500,
    }),
  ]);
  const [courses, students, enrollments] = await Promise.all([
    prisma.course.findMany({
      include: {
        // The list only shows a module count, so do not pull every lesson row (that was two extra round trips).
        modules: { select: { id: true } },
        _count: { select: { enrollments: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.user.findMany({
      where: { role: 'STUDENT' },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
        enrollments: {
          select: {
            id: true,
            amountPaid: true,
            createdAt: true,
            course: { select: { id: true, title: true } },
          },
        },
        _count: { select: { submissions: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.enrollment.findMany({
      include: {
        user: { select: { id: true, name: true, email: true } },
        course: { select: { id: true, title: true, price: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  const [[counters], paymentRecords] = await extrasPromise;
  const lessonGroups = counters.lessons ?? [];
  const submissionGroups = counters.submissions ?? [];
  const paymentGroups = counters.payments ?? [];
  const lessonsCompleted = Number(counters.progress);
  const attemptTotal = Number(counters.attempts);
  const attemptPassed = Number(counters.passed);

  const totalRevenue = enrollments.reduce((sum, e) => sum + (e.amountPaid || 0), 0);


  const now = new Date();
  const day = 86400000;
  const since = (days: number) => now.getTime() - days * day;
  const months = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (11 - i), 1);
    return { y: d.getFullYear(), m: d.getMonth(), label: d.toLocaleDateString('en-US', { month: 'short' }), enrollments: 0, revenue: 0 };
  });
  for (const e of enrollments) {
    const d = new Date(e.createdAt);
    const slot = months.find((m) => m.y === d.getFullYear() && m.m === d.getMonth());
    if (slot) {
      slot.enrollments += 1;
      slot.revenue += e.amountPaid || 0;
    }
  }
  const countOf = (rows: { status: string; count: number }[], s: string) => rows.find((r) => r.status === s)?.count || 0;
  const perCourse = new Map<string, { enrollments: number; revenue: number }>();
  for (const e of enrollments) {
    const cur = perCourse.get(e.courseId) || { enrollments: 0, revenue: 0 };
    cur.enrollments += 1;
    cur.revenue += e.amountPaid || 0;
    perCourse.set(e.courseId, cur);
  }

  // Every online checkout attempt, plus enrollments that predate online payments so no purchase goes missing.
  const paidKeys = new Set(paymentRecords.filter((p) => p.status === 'PAID' || p.status === 'REFUNDED').map((p) => `${p.userId}:${p.courseId}`));
  const onlineRows: PaymentRow[] = paymentRecords.map((p) => ({
    id: p.id,
    source: 'online',
    status: p.status === 'PAID' ? 'PAID' : p.status === 'REFUNDED' ? 'REFUNDED' : p.status === 'FAILED' ? 'FAILED' : 'PENDING',
    student: p.user,
    course: p.course,
    amount: p.amount / 100,
    listPrice: p.originalAmount !== null ? p.originalAmount / 100 : null,
    discount: p.discountAmount / 100,
    coupon: p.couponCode,
    refunded: p.refundedAmount / 100,
    note: p.note,
    billing: (p.billing as Record<string, string> | null) ?? null,
    currency: p.currency,
    gateway: p.gateway,
    method: p.method,
    methodDetail: p.methodDetail,
    fee: p.gatewayFee !== null ? p.gatewayFee / 100 : null,
    orderId: p.gatewayOrderId,
    paymentId: p.gatewayPaymentId,
    failureReason: p.failureReason,
    initiatedAt: p.createdAt.toISOString(),
    paidAt: p.paidAt ? p.paidAt.toISOString() : null,
    updatedAt: p.updatedAt.toISOString(),
  }));
  const legacyRows: PaymentRow[] = enrollments
    .filter((e) => !paidKeys.has(`${e.userId}:${e.courseId}`))
    .map((e) => ({
      id: `enrollment-${e.id}`,
      source: 'legacy',
      status: 'PAID',
      student: { id: e.user.id, name: e.user.name, email: e.user.email },
      course: { id: e.course.id, title: e.course.title },
      amount: e.amountPaid || 0,
      listPrice: null,
      discount: 0,
      coupon: null,
      refunded: 0,
      note: null,
      billing: null,
      currency: 'INR',
      gateway: 'manual',
      method: 'recorded',
      methodDetail: null,
      fee: null,
      orderId: null,
      paymentId: e.paymentId,
      failureReason: null,
      initiatedAt: e.createdAt.toISOString(),
      paidAt: e.createdAt.toISOString(),
      updatedAt: e.createdAt.toISOString(),
    }));
  const paymentRows = [...onlineRows, ...legacyRows];

  const dashboard: AdminDashboardData = {
    firstName: (user.name || 'Admin').split(' ')[0],
    email: user.email,
    kpis: {
      revenue: totalRevenue,
      revenue30: enrollments.filter((e) => e.createdAt.getTime() >= since(30)).reduce((s, e) => s + (e.amountPaid || 0), 0),
      students: students.length,
      newStudents30: students.filter((s) => s.createdAt.getTime() >= since(30)).length,
      courses: courses.length,
      publishedCourses: courses.filter((c) => c.published).length,
      enrollments: enrollments.length,
      enrollments7: enrollments.filter((e) => e.createdAt.getTime() >= since(7)).length,
    },
    months: months.map(({ label, enrollments: n, revenue }) => ({ label, enrollments: n, revenue })),
    lessonTypes: lessonGroups.map((g) => ({ type: g.type, count: g.count })).sort((a, b) => b.count - a.count),
    topCourses: courses
      .map((c) => ({ id: c.id, title: c.title, ...(perCourse.get(c.id) || { enrollments: 0, revenue: 0 }) }))
      .sort((a, b) => b.revenue - a.revenue || b.enrollments - a.enrollments)
      .slice(0, 5),
    activity: {
      lessonsCompleted,
      toGrade: countOf(submissionGroups, 'SUBMITTED') + countOf(submissionGroups, 'PENDING'),
      graded: countOf(submissionGroups, 'GRADED'),
      testAttempts: attemptTotal,
      testPassRate: attemptTotal ? Math.round((attemptPassed / attemptTotal) * 100) : null,
    },
    payments: { paid: countOf(paymentGroups, 'PAID'), failed: countOf(paymentGroups, 'FAILED'), pending: countOf(paymentGroups, 'CREATED') },
    recent: enrollments.slice(0, 6).map((e) => ({ id: e.id, student: e.user.name, course: e.course.title, amount: e.amountPaid || 0, date: e.createdAt.toISOString() })),
  };

  return (
    <>
      <Navbar />

      <main className="flex-1 pb-24 lg:pb-12 bg-gray-50">
        <Suspense fallback={<AdminDashboardSkeleton />}>
          <AdminClient
            adminUser={user}
            initialCourses={courses}
            initialStudents={students}
            initialEnrollments={enrollments}
            totalRevenue={totalRevenue}
            dashboard={dashboard}
            payments={paymentRows}
          />
        </Suspense>
      </main>

      <MobileBottomNav role="ADMIN" isLoggedIn={true} />
    </>
  );
}
