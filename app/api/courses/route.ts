import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';

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
    const { title, description, shortDescription, price, originalPrice, level, category, thumbnail, modules } = body;

    if (!title || !description) {
      return NextResponse.json({ error: 'Title and description are required' }, { status: 400 });
    }

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
        category: category || 'History & Food',
        thumbnail: thumbnail && thumbnail.trim() !== '' ? thumbnail.trim() : null,
        published: true,
        modules: modules ? {
          create: modules.map((m: any, mIdx: number) => ({
            title: m.title,
            order: mIdx + 1,
            lessons: m.lessons ? {
              create: m.lessons.map((l: any, lIdx: number) => ({
                title: l.title,
                slug: l.title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
                order: lIdx + 1,
                type: l.type || 'VIDEO',
                videoUrl: l.videoUrl || null,
                fileUrl: l.fileUrl || null,
                duration: l.duration || '10:00',
                content: l.content || '',
              })),
            } : undefined,
          })),
        } : undefined,
      },
      include: {
        modules: {
          include: { lessons: true },
        },
      },
    });

    return NextResponse.json({ success: true, course }, { status: 201 });
  } catch (err: any) {
    console.error('Create course error:', err);
    return NextResponse.json({ error: err.message || 'Failed to create course' }, { status: 500 });
  }
}
