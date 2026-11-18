import { NextRequest, NextResponse } from 'next/server';
import { createHash, randomBytes } from 'crypto';
import { prisma } from '@/lib/prisma';
import { mailConfigured, sendMail } from '@/lib/mailer';

const TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour
const RESEND_COOLDOWN_MS = 60 * 1000;

const sha256 = (v: string) => createHash('sha256').update(v).digest('hex');

export async function POST(req: NextRequest) {
  // The response is identical whether or not the account exists, so emails cannot be enumerated.
  const generic = {
    success: true,
    message: 'If an account exists for that email, a password reset link is on its way.',
  };

  try {
    const { email } = await req.json();
    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Please enter your email address' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
    if (!user) return NextResponse.json(generic);

    const recent = await prisma.passwordResetToken.findFirst({
      where: { userId: user.id, createdAt: { gt: new Date(Date.now() - RESEND_COOLDOWN_MS) } },
    });
    if (recent) return NextResponse.json(generic);

    const token = randomBytes(32).toString('hex');
    await prisma.passwordResetToken.deleteMany({ where: { userId: user.id } });
    await prisma.passwordResetToken.create({
      data: { userId: user.id, tokenHash: sha256(token), expiresAt: new Date(Date.now() + TOKEN_TTL_MS) },
    });

    const origin = process.env.APP_URL || new URL(req.url).origin;
    const link = `${origin}/reset-password?token=${token}`;

    await sendMail({
      to: user.email,
      subject: 'Reset your CIM India password',
      text: `Hi ${user.name},\n\nUse this link to choose a new password. It expires in 1 hour:\n${link}\n\nIf you did not ask for this, you can ignore this email.`,
      html: `<p>Hi ${user.name.replace(/[<>&]/g, '')},</p><p><a href="${link}">Choose a new password</a>. This link expires in 1 hour.</p><p>If you did not ask for this, you can ignore this email.</p>`,
    });

    // Local development without an email provider: hand the link back so the flow can be tested.
    if (process.env.NODE_ENV !== 'production' && !mailConfigured()) {
      return NextResponse.json({ ...generic, devResetLink: link });
    }
    return NextResponse.json(generic);
  } catch (err) {
    console.error('Forgot password error:', err);
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}
