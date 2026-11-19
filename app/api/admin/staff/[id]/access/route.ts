import { NextRequest, NextResponse } from 'next/server';
import { createHash, randomBytes } from 'crypto';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { appOrigin, invalidateSessionUser } from '@/lib/auth';
import { forbidden, requireAdmin } from '@/lib/admin-guard';
import { mailConfigured, sendMail } from '@/lib/mailer';
import { staffChanged } from '@/lib/chat/sync';

const INVITE_TTL_MS = 3 * 24 * 60 * 60 * 1000; // 3 days
const sha256 = (v: string) => createHash('sha256').update(v).digest('hex');
const esc = (v: string) => v.replace(/[<>&"']/g, '');

/** Give an instructor a login: creates the account and emails a link to choose a password. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAdmin())) return forbidden();
  const { id } = await params;

  const staff = await prisma.staffMember.findUnique({ where: { id } });
  if (!staff) return NextResponse.json({ error: 'Staff member not found' }, { status: 404 });
  if (staff.role !== 'INSTRUCTOR') return NextResponse.json({ error: 'Only instructors can have a login.' }, { status: 400 });
  if (!staff.active) return NextResponse.json({ error: 'Make this instructor active before giving them a login.' }, { status: 400 });

  let userId = staff.userId;
  if (!userId) {
    const clash = await prisma.user.findUnique({ where: { email: staff.email }, select: { id: true } });
    if (clash) {
      return NextResponse.json({ error: 'An account with this email already exists (for example a student). Use a different email for the instructor.' }, { status: 409 });
    }
    const user = await prisma.user.create({
      data: {
        email: staff.email,
        name: staff.name,
        role: 'INSTRUCTOR',
        phone: staff.phone,
        // Unusable until the instructor chooses a password from the emailed link.
        passwordHash: await bcrypt.hash(randomBytes(32).toString('hex'), 10),
      },
    });
    userId = user.id;
    await prisma.staffMember.update({ where: { id }, data: { userId } });
  }

  const token = randomBytes(32).toString('hex');
  await prisma.passwordResetToken.deleteMany({ where: { userId } });
  await prisma.passwordResetToken.create({ data: { userId, tokenHash: sha256(token), expiresAt: new Date(Date.now() + INVITE_TTL_MS) } });

  const link = `${appOrigin(req.url)}/reset-password?token=${token}`;
  let emailed = true;
  try {
    await sendMail({
      to: staff.email,
      subject: 'Your CIM India instructor account',
      text: `Hi ${staff.name},\n\nAn instructor account has been created for you on CIM India. Use this link to choose your password. It expires in 3 days:\n${link}\n\nAfter that, sign in to message your students.`,
      html: `<p>Hi ${esc(staff.name)},</p><p>An instructor account has been created for you on CIM India. <a href="${link}">Choose your password</a>. This link expires in 3 days.</p><p>After that, sign in to message your students.</p>`,
    });
  } catch (err) {
    console.error('Instructor invite email failed:', err);
    emailed = false;
  }

  await staffChanged(id);

  const devMode = process.env.NODE_ENV !== 'production' && !mailConfigured();
  return NextResponse.json({
    success: true,
    emailed: emailed && !devMode,
    message: emailed ? `A link to choose a password was sent to ${staff.email}.` : 'The account was created but the email could not be sent. Use "Resend invite" to try again.',
    ...(devMode ? { devInviteLink: link } : {}),
    staff: { id, hasLogin: true },
  });
}

/** Take a login away. Only possible while the account has no learning data of its own. */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAdmin())) return forbidden();
  const { id } = await params;

  const staff = await prisma.staffMember.findUnique({ where: { id }, select: { id: true, userId: true } });
  if (!staff) return NextResponse.json({ error: 'Staff member not found' }, { status: 404 });
  if (!staff.userId) return NextResponse.json({ success: true, staff: { id, hasLogin: false } });

  const uid = staff.userId;
  const [enrollments, payments, attempts] = await Promise.all([
    prisma.enrollment.count({ where: { userId: uid } }),
    prisma.payment.count({ where: { userId: uid } }),
    prisma.mcqAttempt.count({ where: { userId: uid } }),
  ]);
  if (enrollments || payments || attempts) {
    return NextResponse.json({ error: 'This login has course or payment records, so it cannot be removed. Mark the instructor inactive instead.' }, { status: 409 });
  }

  // Unlink first so the course team switches back to the admins, then delete the account.
  await prisma.staffMember.update({ where: { id }, data: { userId: null } });
  await staffChanged(id);
  await prisma.user.delete({ where: { id: uid } }).catch((err) => console.error('Instructor user delete failed:', err));
  invalidateSessionUser(uid);
  return NextResponse.json({ success: true, staff: { id, hasLogin: false } });
}
