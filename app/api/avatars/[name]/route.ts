import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

const TYPES: Record<string, string> = { jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };

// Serves uploaded profile pictures from the private storage folder (outside /public).
export async function GET(_req: NextRequest, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  const match = name.match(/^[a-f0-9-]{36}-\d+\.(jpg|png|webp)$/);
  if (!match) return new NextResponse('Not found', { status: 404 });

  try {
    const data = await fs.readFile(path.join(process.cwd(), 'storage', 'avatars', name));
    return new NextResponse(new Uint8Array(data), {
      headers: {
        'Content-Type': TYPES[match[1]],
        'Cache-Control': 'public, max-age=31536000, immutable', // filenames are unique per upload
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch {
    return new NextResponse('Not found', { status: 404 });
  }
}
