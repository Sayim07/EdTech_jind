import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import bcrypt from 'bcryptjs';

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 403 });
    }

    const students = await prisma.user.findMany({
      where: { role: 'STUDENT' },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        enrollments: {
          select: {
            id: true,
            amountPaid: true,
            createdAt: true,
            course: { select: { id: true, title: true } },
          },
        },
        _count: { select: { submissions: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ students });
  } catch (err: any) {
    console.error('Fetch students error:', err);
    return NextResponse.json({ error: 'Failed to fetch students' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 403 });
    }

    const { action, studentId, newPassword } = await req.json();

    if (action === 'reset_password') {
      if (!studentId || !newPassword) {
        return NextResponse.json({ error: 'Student ID and new password are required' }, { status: 400 });
      }

      const passwordHash = await bcrypt.hash(newPassword, 10);
      await prisma.user.update({
        where: { id: studentId },
        data: { passwordHash },
      });

      return NextResponse.json({ success: true, message: 'Password updated successfully' });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (err: any) {
    console.error('Admin student action error:', err);
    return NextResponse.json({ error: 'Failed to perform student action' }, { status: 500 });
  }
}
