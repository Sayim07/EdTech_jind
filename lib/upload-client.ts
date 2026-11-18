/**
 * Browser-side upload helper used by the course builder.
 * Uses S3 (direct, presigned) when the server has it configured, otherwise the local /api/upload fallback.
 */
export interface UploadedFile {
  url: string;
  name: string;
}

export async function uploadMedia(file: File, onProgress?: (percent: number) => void): Promise<UploadedFile> {
  const presign = await fetch('/api/upload/presign', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: file.name, size: file.size }),
  });
  const info = await presign.json().catch(() => ({}));
  if (!presign.ok) throw new Error(info.error || 'Could not prepare the upload');

  if (info.s3) {
    await new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('PUT', info.uploadUrl);
      if (file.type) xhr.setRequestHeader('Content-Type', file.type);
      xhr.upload.onprogress = (e) => e.lengthComputable && onProgress?.(Math.round((e.loaded / e.total) * 100));
      xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`Upload to storage failed (${xhr.status}). Check the bucket CORS settings.`)));
      xhr.onerror = () => reject(new Error('Upload to storage failed. Check your connection and the bucket CORS settings.'));
      xhr.send(file);
    });
    return { url: info.publicUrl, name: file.name };
  }

  // Local development fallback: through this server.
  const body = new FormData();
  body.append('file', file);
  const res = await fetch('/api/upload', { method: 'POST', body });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Upload failed');
  onProgress?.(100);
  return { url: data.url, name: file.name };
}
