import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { randomBytes } from 'crypto';

function newCertificateCode() {
  return 'CIM-' + randomBytes(5).toString('hex').toUpperCase();
}

// Marks a lesson complete / incomplete for the signed-in student. Once every lesson of the
// course is complete the enrollment is marked COMPLETED and a certificate code is issued.
export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: 'Please log in' }, { status: 401 });

    const { lessonId, completed } = await req.json();
    if (!lessonId || typeof completed !== 'boolean') {
      return NextResponse.json({ error: 'lessonId and completed are required' }, { status: 400 });
    }

    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      select: { id: true, module: { select: { courseId: true } } },
    });
    if (!lesson) return NextResponse.json({ error: 'Lesson not found' }, { status: 404 });

    const courseId = lesson.module.courseId;
    const enrollment = await prisma.enrollment.findUnique({
      where: { userId_courseId: { userId: user.id, courseId } },
    });
    if (!enrollment) {
      // Admins can preview any course but have no progress to record.
      return NextResponse.json({ error: 'You are not enrolled in this course' }, { status: 403 });
    }

    if (completed) {
      await prisma.lessonProgress.upsert({
        where: { userId_lessonId: { userId: user.id, lessonId } },
        update: {},
        create: { userId: user.id, lessonId },
      });
    } else {
      await prisma.lessonProgress.deleteMany({ where: { userId: user.id, lessonId } });
    }

    const lessons = await prisma.lesson.findMany({
      where: { module: { courseId } },
      select: { id: true },
    });
    const done = await prisma.lessonProgress.findMany({
      where: { userId: user.id, lessonId: { in: lessons.map((l) => l.id) } },
      select: { lessonId: true },
    });

    const total = lessons.length;
    const allDone = total > 0 && done.length === total;
    let certificateCode = enrollment.certificateCode;

    if (allDone && !enrollment.completedAt) {
      const updated = await prisma.enrollment.update({
        where: { id: enrollment.id },
        data: { status: 'COMPLETED', completedAt: new Date(), certificateCode: certificateCode || newCertificateCode() },
      });
      certificateCode = updated.certificateCode;
    }
    // An issued certificate is never revoked if a lesson is later un-ticked.

    return NextResponse.json({
      success: true,
      completedLessonIds: done.map((d) => d.lessonId),
      percent: total ? Math.round((done.length / total) * 100) : 0,
      certificateCode,
    });
  } catch (err) {
    console.error('Progress error:', err);
    return NextResponse.json({ error: 'Failed to save progress' }, { status: 500 });
  }
}
