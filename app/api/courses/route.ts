import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { serializeFaqs } from '@/lib/course';
import { syncCourseContent } from '@/lib/course-content';
import { CourseContentDraft, validateContent } from '@/lib/course-content-shared';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('q') || '';
    const category = searchParams.get('category') || '';
    const level = searchParams.get('level') || '';

    const where: any = { published: true };

    if (search) {
      where.OR = [
        { title: { contains: search } },
        { description: { contains: search } },
        { category: { contains: search } },
      ];
    }

    if (category && category !== 'All') {
      where.category = category;
    }

    if (level && level !== 'All') {
      where.level = level;
    }

    const courses = await prisma.course.findMany({
      where,
      include: {
        modules: {
          include: {
            lessons: {
              select: {
                id: true,
                title: true,
                type: true,
                duration: true,
              },
            },
          },
        },
        _count: {
          select: { enrollments: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ courses });
  } catch (err: any) {
    console.error('Fetch courses error:', err);
    return NextResponse.json({ error: 'Failed to fetch courses' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 403 });
    }

    const body = await req.json();
    const { title, description, shortDescription, price, originalPrice, level, category, thumbnail } = body;

    if (!title || !description) {
      return NextResponse.json({ error: 'Title and description are required' }, { status: 400 });
    }

    if (category !== undefined && (!String(category).trim() || String(category).trim().length > 60)) {
      return NextResponse.json({ error: 'Category must be 1 to 60 characters' }, { status: 400 });
    }

    const content: CourseContentDraft = body.content && Array.isArray(body.content.modules) && Array.isArray(body.content.tests) ? body.content : { modules: [], tests: [] };
    const contentProblem = validateContent(content);
    if (contentProblem) return NextResponse.json({ error: contentProblem }, { status: 400 });

    const slug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '') + '-' + Math.floor(Math.random() * 1000);

    const course = await prisma.course.create({
      data: {
        title,
        slug,
        description,
        shortDescription: shortDescription || '',
        price: parseFloat(price) || 0,
        originalPrice: originalPrice ? parseFloat(originalPrice) : null,
        level: level || 'All Levels',
        category: category ? String(category).trim() : 'History & Food',
        thumbnail: thumbnail && thumbnail.trim() !== '' ? thumbnail.trim() : null,
        published: true,
        totalHours: body.totalHours ? parseFloat(body.totalHours) || null : null,
        faqs: serializeFaqs(body.faqs),
      },
      include: {
        modules: {
          include: { lessons: true },
        },
      },
    });

    if (content.modules.length || content.tests.length) {
      const problem = await syncCourseContent(course.id, content);
      if (problem) return NextResponse.json({ error: problem }, { status: 400 });
    }

    return NextResponse.json({ success: true, course }, { status: 201 });
  } catch (err: any) {
    console.error('Create course error:', err);
    return NextResponse.json({ error: err.message || 'Failed to create course' }, { status: 500 });
  }
}
