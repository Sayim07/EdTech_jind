import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { chatConfigured } from '@/lib/chat/stream';
import { CHANNEL_TYPE, courseTeam, openAskChannel } from '@/lib/chat/sync';

/**
 * Opens (creating if needed) the private chat between one student and a course's team.
 * Body: { courseId } for a student, or { courseId, studentId } for an instructor or admin starting from their side.
 * Returns { type, id } for the browser to open.
 */
export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Please log in' }, { status: 401 });
  if (!chatConfigured()) return NextResponse.json({ error: 'Messaging is not available right now.' }, { status: 503 });

  const body = await req.json().catch(() => ({}));
  const courseId = typeof body.courseId === 'string' ? body.courseId : '';
  if (!courseId) return NextResponse.json({ error: 'Course is required' }, { status: 400 });

  let studentId = '';
  if (user.role === 'STUDENT') {
    studentId = user.id;
  } else {
    studentId = typeof body.studentId === 'string' ? body.studentId : '';
    if (!studentId) return NextResponse.json({ error: 'Student is required' }, { status: 400 });
    // An instructor may only message students of their own courses. Admins may message anyone enrolled.
    if (user.role !== 'ADMIN') {
      const team = await courseTeam(courseId);
      if (!team.hasInstructor || !team.users.some((u) => u.id === user.id)) return NextResponse.json({ error: 'Not allowed' }, { status: 403 });
    }
  }

  // Only enrolled students can be messaged or can message.
  const enrolled = await prisma.enrollment.findUnique({ where: { userId_courseId: { userId: studentId, courseId } }, select: { id: true } });
  if (!enrolled) return NextResponse.json({ error: user.role === 'STUDENT' ? 'Enroll in this course to message its team.' : 'That student is not enrolled.' }, { status: 403 });

  const id = await openAskChannel(courseId, studentId);
  if (!id) return NextResponse.json({ error: 'Could not open the chat. Please try again.' }, { status: 502 });
  return NextResponse.json({ type: CHANNEL_TYPE, id });
}
