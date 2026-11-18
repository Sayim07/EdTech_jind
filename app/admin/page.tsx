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
  const extrasPromise = Promise.all([
    prisma.lesson.groupBy({ by: ['type'], _count: { _all: true } }),
    prisma.submission.groupBy({ by: ['status'], _count: { _all: true } }),
    prisma.mcqAttempt.findMany({ where: { status: 'SUBMITTED' }, select: { passed: true } }),
    prisma.payment.groupBy({ by: ['status'], _count: { _all: true } }),
    prisma.lessonProgress.count(),
    prisma.payment.findMany({
      include: { user: { select: { id: true, name: true, email: true } }, course: { select: { id: true, title: true } } },
      orderBy: { createdAt: 'desc' },
      take: 1000,
    }),
  ]);
  const [courses, students, enrollments] = await Promise.all([
    prisma.course.findMany({
      include: {
        modules: {
          include: {
            lessons: true,
          },
        },
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

  const [lessonGroups, submissionGroups, attemptRows, paymentGroups, lessonsCompleted, paymentRecords] = await extrasPromise;

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
  const countOf = (rows: { status: string; _count: { _all: number } }[], s: string) => rows.find((r) => r.status === s)?._count._all || 0;
  const perCourse = new Map<string, { enrollments: number; revenue: number }>();
  for (const e of enrollments) {
    const cur = perCourse.get(e.courseId) || { enrollments: 0, revenue: 0 };
    cur.enrollments += 1;
    cur.revenue += e.amountPaid || 0;
    perCourse.set(e.courseId, cur);
  }

  // Every online checkout attempt, plus enrollments that predate online payments so no purchase goes missing.
  const paidKeys = new Set(paymentRecords.filter((p) => p.status === 'PAID').map((p) => `${p.userId}:${p.courseId}`));
  const onlineRows: PaymentRow[] = paymentRecords.map((p) => ({
    id: p.id,
    source: 'online',
    status: p.status === 'PAID' ? 'PAID' : p.status === 'FAILED' ? 'FAILED' : 'PENDING',
    student: p.user,
    course: p.course,
    amount: p.amount / 100,
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
    lessonTypes: lessonGroups.map((g) => ({ type: g.type, count: g._count._all })).sort((a, b) => b.count - a.count),
    topCourses: courses
      .map((c) => ({ id: c.id, title: c.title, ...(perCourse.get(c.id) || { enrollments: 0, revenue: 0 }) }))
      .sort((a, b) => b.revenue - a.revenue || b.enrollments - a.enrollments)
      .slice(0, 5),
    activity: {
      lessonsCompleted,
      toGrade: countOf(submissionGroups, 'SUBMITTED') + countOf(submissionGroups, 'PENDING'),
      graded: countOf(submissionGroups, 'GRADED'),
      testAttempts: attemptRows.length,
      testPassRate: attemptRows.length ? Math.round((attemptRows.filter((a) => a.passed).length / attemptRows.length) * 100) : null,
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
