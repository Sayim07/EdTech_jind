import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { loadOwnedAttempt, retentionDate, settingsForTestKey } from '@/lib/exam';
import { MAX_CAPTURE_BYTES } from '@/lib/proctor';
import { isJpeg, newProctorKey, proctorStorageConfigured, putPrivate } from '@/lib/proctor-storage';

const MAX_CAPTURES_PER_ATTEMPT = 300;

/** A still photo taken from the camera at a random moment. Stored privately; never video. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: 'Please log in' }, { status: 401 });
    const { id } = await params;

    const loaded = await loadOwnedAttempt(req, user.id, id);
    if ('error' in loaded) return loaded.error;
    const attempt = loaded.attempt;
    if (attempt.status !== 'IN_PROGRESS') return NextResponse.json({ error: 'Already submitted' }, { status: 409 });
    if (!proctorStorageConfigured()) return NextResponse.json({ error: 'Photo storage is not set up.' }, { status: 503 });

    const form = await req.formData().catch(() => null);
    const file = form?.get('image');
    if (!(file instanceof File)) return NextResponse.json({ error: 'No image' }, { status: 400 });
    if (file.size > MAX_CAPTURE_BYTES) return NextResponse.json({ error: 'Image is too large' }, { status: 400 });
    const bytes = Buffer.from(await file.arrayBuffer());
    if (!isJpeg(bytes)) return NextResponse.json({ error: 'Image must be a JPEG' }, { status: 400 });

    if ((await prisma.proctorCapture.count({ where: { attemptId: id } })) >= MAX_CAPTURES_PER_ATTEMPT) return NextResponse.json({ error: 'Too many photos' }, { status: 429 });

    const faceRaw = Number(form?.get('faceCount'));
    const faceCount = Number.isInteger(faceRaw) && faceRaw >= 0 && faceRaw <= 20 ? faceRaw : null;
    const settings = await settingsForTestKey(attempt.testKey);

    const key = newProctorKey('capture');
    await putPrivate(key, bytes);
    const capture = await prisma.proctorCapture.create({ data: { attemptId: id, key, faceCount, purgeAfter: retentionDate(settings.photoRetentionDays) } });
    await prisma.mcqAttempt.update({ where: { id }, data: { sessionLastSeenAt: new Date() } });
    return NextResponse.json({ id: capture.id }, { status: 201 });
  } catch (err) {
    console.error('Capture upload error:', err);
    return NextResponse.json({ error: 'Could not save the photo' }, { status: 500 });
  }
}
