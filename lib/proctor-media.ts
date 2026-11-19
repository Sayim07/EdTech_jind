import { NextResponse } from 'next/server';

/** Sends a private image: never cached, never indexed, shown inline only. */
export function imageResponse(file: { body: ArrayBuffer; contentType: string } | null) {
  if (!file) return NextResponse.json({ error: 'Photo not found' }, { status: 404 });
  return new NextResponse(file.body, {
    headers: {
      'Content-Type': file.contentType.startsWith('image/') ? file.contentType : 'image/jpeg',
      'Cache-Control': 'private, no-store, max-age=0',
      'X-Content-Type-Options': 'nosniff',
      'X-Robots-Tag': 'noindex',
      'Content-Disposition': 'inline',
    },
  });
}
