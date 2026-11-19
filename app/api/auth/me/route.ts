import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { completion } from '@/lib/profile';

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ user: null }, { status: 401 });
    }
    const c = completion(user);
    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        avatarUrl: user.avatarUrl,
        createdAt: user.createdAt,
        // Drives the welcome popup and reminders. The raw profile details are not sent here.
        profile: { percent: c.percent, complete: c.complete },
        showOnboarding: user.role === 'STUDENT' && !c.complete && !user.onboardingSeenAt,
      },
    });
  } catch (err) {
    return NextResponse.json({ user: null }, { status: 500 });
  }
}
