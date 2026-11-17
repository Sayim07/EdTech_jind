import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Please log in to view your courses' }, { status: 401 });
    }

    const enrollments = await prisma.enrollment.findMany({
      where: { userId: user.id },
      include: {
        course: {
          include: {
            modules: {
              include: {
                lessons: {
                  select: { id: true, title: true, type: true, duration: true },
                },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ enrollments });
  } catch (err: any) {
    console.error('Fetch enrollments error:', err);
    return NextResponse.json({ error: 'Failed to fetch enrollments' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Please log in to purchase this course' }, { status: 401 });
    }

    const { courseId } = await req.json();
    if (!courseId) {
      return NextResponse.json({ error: 'Course ID is required' }, { status: 400 });
    }

    const course = await prisma.course.findUnique({
      where: { id: courseId },
    });

    if (!course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }

    // Check if already enrolled
    const existing = await prisma.enrollment.findUnique({
      where: {
        userId_courseId: {
          userId: user.id,
          courseId: course.id,
        },
      },
    });

    if (existing) {
      return NextResponse.json({ success: true, message: 'Already enrolled', enrollment: existing });
    }

    // Create enrollment record
    const enrollment = await prisma.enrollment.create({
      data: {
        userId: user.id,
        courseId: course.id,
        amountPaid: course.price,
        paymentId: 'TXN-' + Math.random().toString(36).substring(2, 10).toUpperCase(),
        status: 'ACTIVE',
      },
      include: {
        course: true,
      },
    });

    return NextResponse.json({ success: true, enrollment });
  } catch (err: any) {
    console.error('Enroll error:', err);
    return NextResponse.json({ error: 'Failed to complete enrollment' }, { status: 500 });
  }
}
