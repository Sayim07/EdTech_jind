import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { serializeFaqs } from '@/lib/course';
import { loadCourseContent, syncCourseContent } from '@/lib/course-content';
import { CourseContentDraft, validateContent } from '@/lib/course-content-shared';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const viewer = await getSessionUser();
    const isAdmin = viewer?.role === 'ADMIN';
    const course = await prisma.course.findFirst({
      where: {
        OR: [{ id }, { slug: id }],
        ...(isAdmin ? {} : { published: true }),
      },
      include: {
        modules: {
          orderBy: { order: 'asc' },
          include: {
            // Public callers only get the outline. Video, audio and file addresses are for enrolled students (the classroom page) and admins.
            lessons: {
              orderBy: { order: 'asc' },
              select: isAdmin
                ? undefined
                : { id: true, title: true, type: true, duration: true, order: true },
            },
          },
        },
        _count: { select: { enrollments: true } },
      },
    });

    if (!course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }

    return NextResponse.json({ course });
  } catch (err: any) {
    return NextResponse.json({ error: 'Failed to fetch course' }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser();
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();

    const content: CourseContentDraft | null = body.content && Array.isArray(body.content.modules) && Array.isArray(body.content.tests) ? body.content : null;
    if (content) {
      const problem = validateContent(content);
      if (problem) return NextResponse.json({ error: problem }, { status: 400 });
    }
    if (body.category !== undefined && (!String(body.category).trim() || String(body.category).trim().length > 60)) {
      return NextResponse.json({ error: 'Category must be 1 to 60 characters' }, { status: 400 });
    }

    const data: any = {};
    if (body.title !== undefined) data.title = body.title.trim();
    if (body.description !== undefined) data.description = body.description.trim();
    if (body.shortDescription !== undefined) data.shortDescription = body.shortDescription ? body.shortDescription.trim() : null;
    if (body.price !== undefined) data.price = parseFloat(body.price) || 0;
    if (body.originalPrice !== undefined) data.originalPrice = body.originalPrice ? parseFloat(body.originalPrice) : null;
    if (body.category !== undefined) data.category = body.category.trim();
    if (body.level !== undefined) data.level = body.level.trim();
    if (body.instructorName !== undefined) data.instructorName = body.instructorName.trim();
    if (body.thumbnail !== undefined) data.thumbnail = body.thumbnail ? body.thumbnail.trim() : null;
    if (body.published !== undefined) data.published = Boolean(body.published);
    if (body.featured !== undefined) data.featured = Boolean(body.featured);
    if (body.totalHours !== undefined) data.totalHours = body.totalHours ? parseFloat(body.totalHours) || null : null;
    if (body.faqs !== undefined) data.faqs = serializeFaqs(body.faqs);

    const updatedCourse = await prisma.course.update({
      where: { id },
      data,
      include: {
        modules: {
          include: {
            lessons: true,
          },
        },
        _count: { select: { enrollments: true } },
      },
    });

    if (content) {
      const problem = await syncCourseContent(id, content);
      if (problem) return NextResponse.json({ error: problem }, { status: 400 });
    }

    // Hand back the saved tree so the editor picks up the real ids of anything created in this save.
    const savedContent = content ? await loadCourseContent(id) : undefined;
    return NextResponse.json({ success: true, course: updatedCourse, content: savedContent });
  } catch (err: any) {
    console.error('Update course error:', err);
    return NextResponse.json({ error: 'Failed to update course' }, { status: 500 });
  }
}

export const PUT = PATCH;

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser();
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { id } = await params;
    await prisma.course.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: 'Failed to delete course' }, { status: 500 });
  }
}
