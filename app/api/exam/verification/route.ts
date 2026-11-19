import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { findTestByKey } from '@/lib/mcq-server';
import { latestVerification, retentionDate } from '@/lib/exam';
import { MAX_VERIFICATION_PHOTO_BYTES } from '@/lib/proctor';
import { deletePrivate, isJpeg, newProctorKey, proctorStorageConfigured, putPrivate } from '@/lib/proctor-storage';
import { rateLimit } from '@/lib/rate-limit';

/**
 * Identity check: a live selfie and a photo of the front of the ID card. Stored in PRIVATE storage and shown only to
 * the teachers/admins who may review that course. A teacher compares the two photos and approves or rejects.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: 'Please log in' }, { status: 401 });
    if (user.role !== 'STUDENT') return NextResponse.json({ error: 'Only students verify their identity.' }, { status: 403 });

    const limited = rateLimit(`exam-verify:${user.id}`, 8, 60 * 60_000);
    if (limited) return limited;

    const form = await req.formData().catch(() => null);
    if (!form) return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    const testKey = String(form.get('testKey') || '');
    const selfie = form.get('selfie');
    const idPhoto = form.get('idPhoto');
    if (!testKey || !(selfie instanceof File) || !(idPhoto instanceof File)) return NextResponse.json({ error: 'Take both photos: your selfie and your ID card.' }, { status: 400 });

    const test = await findTestByKey(user.id, testKey);
    if (!test) return NextResponse.json({ error: 'Test not found' }, { status: 404 });
    if (!test.settings.requireIdCheck || test.kind === 'ASSIGNMENT') return NextResponse.json({ error: 'This exam does not need an identity check.' }, { status: 400 });
    if (test.settings.requireConsent && form.get('consent') !== 'true') return NextResponse.json({ error: 'Please accept the notice first.' }, { status: 400 });
    if (!proctorStorageConfigured()) return NextResponse.json({ error: 'Identity photos cannot be stored right now. Please contact your teacher.' }, { status: 503 });

    const current = await latestVerification(user.id, testKey);
    if (current && (current.status === 'PENDING' || current.status === 'APPROVED')) {
      return NextResponse.json({ error: current.status === 'APPROVED' ? 'Your identity is already approved.' : 'Your identity check is already waiting for approval.', status: current.status }, { status: 409 });
    }

    const read = async (f: File) => {
      if (f.size > MAX_VERIFICATION_PHOTO_BYTES) throw new Error('A photo is too large. Retake it.');
      const bytes = Buffer.from(await f.arrayBuffer());
      if (!isJpeg(bytes)) throw new Error('Photos must be taken with the camera (JPEG).');
      return bytes;
    };
    let selfieBytes: Buffer;
    let idBytes: Buffer;
    try {
      [selfieBytes, idBytes] = await Promise.all([read(selfie), read(idPhoto)]);
    } catch (err: any) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }

    const selfieKey = newProctorKey('selfie');
    const idKey = newProctorKey('id');
    try {
      await Promise.all([putPrivate(selfieKey, selfieBytes), putPrivate(idKey, idBytes)]);
    } catch (err) {
      console.error('Verification upload failed:', err);
      await Promise.all([deletePrivate(selfieKey).catch(() => {}), deletePrivate(idKey).catch(() => {})]);
      return NextResponse.json({ error: 'Could not save your photos. Please try again.' }, { status: 502 });
    }

    const v = await prisma.examVerification.create({
      data: { userId: user.id, testKey, courseId: test.courseId, selfieKey, idKey, consentAt: test.settings.requireConsent ? new Date() : null, purgeAfter: retentionDate(test.settings.photoRetentionDays) },
    });
    return NextResponse.json({ verification: { id: v.id, status: v.status } }, { status: 201 });
  } catch (err) {
    console.error('Verification error:', err);
    return NextResponse.json({ error: 'Could not submit your identity check' }, { status: 500 });
  }
}
