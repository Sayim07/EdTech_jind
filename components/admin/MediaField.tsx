'use client';

import React, { useRef, useState } from 'react';
import { AlertCircle, CheckCircle2, ExternalLink, Loader2, Trash2, UploadCloud } from 'lucide-react';
import { uploadMedia } from '@/lib/upload-client';

const ACCEPT = {
  video: '.mp4,.webm,.mov,video/*',
  audio: '.mp3,.m4a,.wav,audio/*',
  slides: '.pptx,.ppt',
  pdf: '.pdf,application/pdf',
  image: '.jpg,.jpeg,.png,.webp,.gif,image/*',
  document: '.pdf,.doc,.docx,.pptx,.ppt,.jpg,.jpeg,.png',
} as const;

export type MediaKind = keyof typeof ACCEPT;

const fileNameOf = (url: string) => {
  try {
    return decodeURIComponent(url.split('?')[0].split('/').pop() || url);
  } catch {
    return url;
  }
};

/** One uploaded file: shows what is stored, lets the admin replace or remove it. Large files go straight to S3. */
export function MediaField({
  label,
  kind,
  value,
  onChange,
  hint,
}: {
  label: string;
  kind: MediaKind;
  value: string;
  onChange: (url: string) => void;
  hint?: string;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [percent, setPercent] = useState(0);
  const [error, setError] = useState('');
  const id = useRef(`media-${Math.random().toString(36).slice(2, 8)}`).current;

  const pick = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    setPercent(0);
    setError('');
    try {
      const up = await uploadMedia(file, setPercent);
      onChange(up.url);
    } catch (e: any) {
      setError(e.message || 'Upload failed');
    } finally {
      setBusy(false);
      if (input.current) input.current.value = '';
    }
  };

  return (
    <div>
      <span id={`${id}-l`} className="block text-sm font-semibold text-gray-700 mb-1">
        {label}
      </span>
      {value ? (
        <div className="flex items-center gap-3 rounded-lg border border-gray-300 bg-white px-3 py-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" aria-hidden />
          <a href={value} target="_blank" rel="noreferrer" className="min-w-0 flex-1 truncate text-sm text-gray-900 hover:underline" title={value}>
            {fileNameOf(value)}
          </a>
          <a href={value} target="_blank" rel="noreferrer" aria-label="Open file" className="text-gray-600 hover:text-gray-900">
            <ExternalLink className="w-4 h-4" />
          </a>
          <button type="button" onClick={() => input.current?.click()} disabled={busy} className="text-sm font-semibold text-amber-600 hover:underline disabled:opacity-50">
            Replace
          </button>
          <button type="button" onClick={() => onChange('')} disabled={busy} aria-label={`Remove ${label}`} className="text-gray-600 hover:text-red-600 disabled:opacity-50">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => input.current?.click()}
          disabled={busy}
          aria-labelledby={`${id}-l`}
          className="w-full h-11 rounded-lg border border-dashed border-gray-400 text-sm font-semibold text-gray-700 hover:border-amber-600 hover:text-amber-700 hover:bg-amber-50 inline-flex items-center justify-center gap-2 transition disabled:opacity-60 focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_#e3eeff]"
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden /> : <UploadCloud className="w-4 h-4" aria-hidden />}
          {busy ? `Uploading ${percent}%` : 'Choose a file to upload'}
        </button>
      )}
      {busy && value && <p className="text-xs text-gray-600 mt-1">Uploading {percent}%...</p>}
      {hint && !error && <p className="text-xs text-gray-600 mt-1">{hint}</p>}
      {error && (
        <p role="alert" className="mt-1 flex items-start gap-1.5 text-xs text-red-700">
          <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" aria-hidden /> {error}
        </p>
      )}
      <input ref={input} type="file" accept={ACCEPT[kind]} className="sr-only" tabIndex={-1} onChange={(e) => pick(e.target.files?.[0])} />
    </div>
  );
}
