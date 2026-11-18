import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import fs from 'fs/promises';
import path from 'path';

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 403 });
    }

    // Production stores media in cloud storage (see /api/upload/presign). Writing to this server's disk is for local development only.
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'Cloud storage is not configured. Set the R2 or S3 variables to enable uploads.' }, { status: 503 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Supported extensions: images, presentation slide decks (PPTX, PPT, PDF), videos (MP4, WEBM), and audios (M4A, MP3)
    const ext = path.extname(file.name).toLowerCase();
    const allowedExtensions = [
      // Images
      '.jpg', '.jpeg', '.png', '.webp', '.gif',
      // Slides & Documents
      '.pptx', '.ppt', '.pdf', '.docx', '.doc',
      // Media
      '.mp4', '.webm', '.mov', '.m4a', '.mp3', '.wav'
    ];

    // The extension decides what is stored. The browser-supplied MIME type is never trusted.
    if (!allowedExtensions.includes(ext)) {
      return NextResponse.json(
        { error: `File type "${ext}" is not supported. Please upload PPTX, PPT, PDF, MP4, M4A, or Image files.` },
        { status: 400 }
      );
    }

    // Size limit: up to 250MB
    const MAX_SIZE = 250 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: 'File size exceeds 250MB limit' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const safeBaseName = file.name
      .replace(/\.[^/.]+$/, '')
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, '-')
      .slice(0, 40);

    const prefix = ext === '.pptx' || ext === '.ppt' || ext === '.pdf' 
      ? 'slide' 
      : ext === '.mp4' || ext === '.webm' 
      ? 'video' 
      : 'file';

    const fileName = `${prefix}-${Date.now()}-${safeBaseName}${ext || '.bin'}`;
    const uploadDir = path.join(process.cwd(), 'public', 'uploads');

    await fs.mkdir(uploadDir, { recursive: true });
    const filePath = path.join(uploadDir, fileName);
    await fs.writeFile(filePath, buffer);

    const publicUrl = `/uploads/${fileName}`;

    return NextResponse.json({
      success: true,
      url: publicUrl,
      fileName: file.name,
      storedPath: publicUrl,
      size: file.size,
    });
  } catch (err: any) {
    console.error('Upload error:', err);
    return NextResponse.json({ error: err.message || 'Failed to upload file' }, { status: 500 });
  }
}
