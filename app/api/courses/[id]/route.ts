import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const course = await prisma.course.findFirst({
      where: {
        OR: [{ id }, { slug: id }],
      },
      include: {
        modules: {
          orderBy: { order: 'asc' },
          include: {
            lessons: {
              orderBy: { order: 'asc' },
              include: { assignments: true },
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

    // If lecture media attachments or module titles were updated
    if (
      body.videoUrl !== undefined ||
      body.fileUrl !== undefined ||
      body.moduleTitle !== undefined ||
      body.lectureTitle !== undefined ||
      body.lectureType !== undefined ||
      body.duration !== undefined
    ) {
      let firstModule = await prisma.module.findFirst({
        where: { courseId: id },
        orderBy: { order: 'asc' },
        include: { lessons: { orderBy: { order: 'asc' } } },
      });

      if (!firstModule) {
        firstModule = await prisma.module.create({
          data: {
            title: body.moduleTitle?.trim() || 'Module 1: Foundations',
            order: 1,
            courseId: id,
          },
          include: { lessons: true },
        });
      } else if (body.moduleTitle) {
        await prisma.module.update({
          where: { id: firstModule.id },
          data: { title: body.moduleTitle.trim() },
        });
      }

      if (firstModule.lessons && firstModule.lessons.length > 0) {
        const lessonData: any = {};
        if (body.lectureTitle !== undefined) lessonData.title = body.lectureTitle.trim();
        if (body.videoUrl !== undefined) lessonData.videoUrl = body.videoUrl ? body.videoUrl.trim() : null;
        if (body.fileUrl !== undefined) lessonData.fileUrl = body.fileUrl ? body.fileUrl.trim() : null;
        if (body.lectureType !== undefined) lessonData.type = body.lectureType;
        if (body.duration !== undefined) lessonData.duration = body.duration.trim();
        await prisma.lesson.update({
          where: { id: firstModule.lessons[0].id },
          data: lessonData,
        });
      } else if (body.videoUrl || body.fileUrl || body.lectureTitle) {
        await prisma.lesson.create({
          data: {
            title: body.lectureTitle?.trim() || '1.1 Foundations & Overview',
            slug: (body.lectureTitle?.trim() || '1-1-foundations-overview').toLowerCase().replace(/[^a-z0-9]+/g, '-'),
            order: 1,
            type: body.lectureType || 'VIDEO',
            videoUrl: body.videoUrl ? body.videoUrl.trim() : null,
            fileUrl: body.fileUrl ? body.fileUrl.trim() : null,
            duration: body.duration?.trim() || '30 mins',
            moduleId: firstModule.id,
          },
        });
      }
    }

    return NextResponse.json({ success: true, course: updatedCourse });
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
