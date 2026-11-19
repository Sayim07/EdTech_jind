import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { studentJoined } from '@/lib/chat/sync';

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

    if (user.role === 'INSTRUCTOR') {
      return NextResponse.json({ error: 'Instructor accounts cannot enroll in courses.' }, { status: 403 });
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

    // Paid courses are only unlocked by a verified payment (see /api/payments). This route is for free courses.
    if (course.price > 0) {
      return NextResponse.json({ error: 'This course requires payment', requiresPayment: true }, { status: 402 });
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
        paymentId: 'FREE',
        status: 'ACTIVE',
      },
      include: {
        course: true,
      },
    });

    await studentJoined(course.id, user.id);
    return NextResponse.json({ success: true, enrollment });
  } catch (err: any) {
    console.error('Enroll error:', err);
    return NextResponse.json({ error: 'Failed to complete enrollment' }, { status: 500 });
  }
}
