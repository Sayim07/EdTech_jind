import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 403 });
    }

    const [totalStudents, totalCourses, totalEnrollments, enrollments] = await Promise.all([
      prisma.user.count({ where: { role: 'STUDENT' } }),
      prisma.course.count(),
      prisma.enrollment.count(),
      prisma.enrollment.findMany({
        include: {
          user: { select: { id: true, name: true, email: true } },
          course: { select: { id: true, title: true, price: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
    ]);

    const totalRevenue = enrollments.reduce((sum, e) => sum + (e.amountPaid || 0), 0);

    return NextResponse.json({
      stats: {
        totalStudents,
        totalCourses,
        totalEnrollments,
        totalRevenue,
      },
      recentTransactions: enrollments,
    });
  } catch (err: any) {
    console.error('Admin stats error:', err);
    return NextResponse.json({ error: 'Failed to fetch admin stats' }, { status: 500 });
  }
}
