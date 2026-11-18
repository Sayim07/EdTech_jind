import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Please log in to submit assignment' }, { status: 401 });
    }

    const { assignmentId, content, fileUrl } = await req.json();

    if (!assignmentId || (!content && !fileUrl)) {
      return NextResponse.json(
        { error: 'Assignment ID and answer content are required' },
        { status: 400 }
      );
    }

    // Only students enrolled in the assignment's course can submit.
    const target = await prisma.assignment.findUnique({ where: { id: assignmentId }, select: { module: { select: { courseId: true } } } });
    if (!target?.module) return NextResponse.json({ error: 'Assignment not found' }, { status: 404 });
    const enrolled = await prisma.enrollment.findUnique({ where: { userId_courseId: { userId: user.id, courseId: target.module.courseId } } });
    if (!enrolled) return NextResponse.json({ error: 'Enroll in this course to submit assignments' }, { status: 403 });

    // Check if submission already exists for this student and assignment
    const existing = await prisma.submission.findFirst({
      where: {
        userId: user.id,
        assignmentId,
      },
    });

    let submission;
    if (existing) {
      submission = await prisma.submission.update({
        where: { id: existing.id },
        data: {
          content,
          fileUrl,
          status: 'SUBMITTED',
          submittedAt: new Date(),
        },
      });
    } else {
      submission = await prisma.submission.create({
        data: {
          userId: user.id,
          assignmentId,
          content,
          fileUrl,
          status: 'SUBMITTED',
        },
      });
    }

    return NextResponse.json({ success: true, submission });
  } catch (err: any) {
    console.error('Submit assignment error:', err);
    return NextResponse.json({ error: 'Failed to submit assignment' }, { status: 500 });
  }
}
