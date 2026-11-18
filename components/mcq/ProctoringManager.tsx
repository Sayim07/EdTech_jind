'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Camera, Maximize } from 'lucide-react';
import { Dialog, primaryBtn } from './Dialog';
import { MAX_VIOLATIONS, SNAPSHOT_WINDOW_SECONDS } from '@/lib/mcq';

export interface Snapshot {
  t: string; // ISO timestamp
  img: string; // JPEG data URL
}

export const fullscreenSupported = () => typeof document !== 'undefined' && Boolean(document.documentElement.requestFullscreen);

export async function enterFullscreen(): Promise<boolean> {
  try {
    if (!document.fullscreenElement) {
      // Some embedded browsers never settle the promise, so do not wait forever.
      await Promise.race([document.documentElement.requestFullscreen(), new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 4000))]);
    }
    return Boolean(document.fullscreenElement);
  } catch {
    return false;
  }
}

export async function leaveFullscreen() {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
  } catch {}
}

export function stopStream(stream: MediaStream | null) {
  stream?.getTracks().forEach((t) => t.stop());
}

/** Asks for the webcam; the error string is safe to show to the student. */
export async function requestCamera(): Promise<{ stream?: MediaStream; error?: string }> {
  if (!navigator.mediaDevices?.getUserMedia) {
    return { error: 'This browser cannot access a camera. Use a recent version of Chrome, Edge, Firefox or Safari over a secure (https) connection.' };
  }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' }, audio: false });
    return { stream };
  } catch (err: any) {
    const name = err?.name;
    if (name === 'NotAllowedError' || name === 'SecurityError') {
      return { error: 'Camera access was blocked. Click the camera icon in your browser address bar, allow access for this site, then try again.' };
    }
    if (name === 'NotFoundError' || name === 'OverconstrainedError') return { error: 'No camera was found. Connect a webcam and try again.' };
    if (name === 'NotReadableError') return { error: 'Your camera is being used by another application. Close it and try again.' };
    return { error: 'Could not start the camera. Please try again.' };
  }
}

interface Options {
  active: boolean;
  stream: MediaStream | null;
  /** Seconds already elapsed when proctoring starts (for resumed attempts). */
  elapsedSeconds: number;
  initialViolations: number;
  onViolation: (count: number) => void;
  /** Called once when the third exit happens. */
  onLimit: (count: number) => void;
}

/**
 * Lightweight proctoring: counts full-screen exits and captures one random webcam
 * snapshot in every 2-minute window using an off-screen canvas.
 */
export function useProctoring({ active, stream, elapsedSeconds, initialViolations, onViolation, onLimit }: Options) {
  const [violations, setViolations] = useState(initialViolations);
  const [warningOpen, setWarningOpen] = useState(false);
  const violationsRef = useRef(initialViolations);
  const snapshotsRef = useRef<Snapshot[]>([]);
  const videoRef = useRef<HTMLVideoElement>(null);
  const cbRef = useRef({ onViolation, onLimit });
  cbRef.current = { onViolation, onLimit };

  // Full-screen exits
  useEffect(() => {
    if (!active || !fullscreenSupported()) return;
    const onChange = () => {
      if (document.fullscreenElement) return;
      const n = violationsRef.current + 1;
      violationsRef.current = n;
      setViolations(n);
      cbRef.current.onViolation(n);
      if (n >= MAX_VIOLATIONS) {
        setWarningOpen(false);
        cbRef.current.onLimit(n);
      } else {
        setWarningOpen(true);
      }
    };
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, [active]);

  // Show the camera preview and keep the stream playing
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.srcObject = active ? stream : null;
    if (active && stream) v.play().catch(() => {});
  }, [active, stream]);

  // Random snapshot inside each 2-minute window
  useEffect(() => {
    if (!active || !stream) return;
    let timer: ReturnType<typeof setTimeout>;
    const t0 = Date.now() - elapsedSeconds * 1000;
    const canvas = document.createElement('canvas'); // never attached to the page

    const capture = () => {
      const v = videoRef.current;
      if (!v || !v.videoWidth) return;
      const w = 320;
      canvas.width = w;
      canvas.height = Math.round((v.videoHeight / v.videoWidth) * w) || 240;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
      snapshotsRef.current.push({ t: new Date().toISOString(), img: canvas.toDataURL('image/jpeg', 0.6) });
    };

    const schedule = (windowIndex: number) => {
      const w = SNAPSHOT_WINDOW_SECONDS;
      const elapsed = (Date.now() - t0) / 1000;
      let k = Math.max(windowIndex, Math.floor(elapsed / w));
      let target = k * w + Math.random() * w;
      if (target <= elapsed) {
        k += 1;
        target = k * w + Math.random() * w;
      }
      timer = setTimeout(() => {
        capture();
        schedule(k + 1);
      }, Math.max(500, (target - elapsed) * 1000));
    };
    schedule(0);
    return () => clearTimeout(timer);
  }, [active, stream, elapsedSeconds]);

  const reenter = useCallback(async () => {
    const ok = await enterFullscreen();
    if (ok) setWarningOpen(false);
  }, []);

  const getSnapshots = useCallback(() => snapshotsRef.current.slice(), []);

  return { violations, warningOpen, reenter, getSnapshots, videoRef };
}

export function CameraPreview({ videoRef }: { videoRef: React.RefObject<HTMLVideoElement | null> }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white p-1.5 pr-3" title="Your camera is on while the test is running">
      <video ref={videoRef} muted playsInline aria-hidden className="w-12 h-9 sm:w-16 sm:h-12 rounded-md bg-gray-900 object-cover -scale-x-100" />
      <span className="hidden sm:flex items-center gap-1.5 text-xs font-semibold text-gray-700">
        <Camera className="w-3.5 h-3.5 text-red-600" aria-hidden /> Camera on
      </span>
    </div>
  );
}

export function FullscreenWarning({ violations, onReenter }: { violations: number; onReenter: () => void }) {
  const left = MAX_VIOLATIONS - violations;
  return (
    <Dialog
      title={`Warning ${violations} of ${MAX_VIOLATIONS}`}
      tone="danger"
      actions={
        <button type="button" onClick={onReenter} className={primaryBtn}>
          <Maximize className="w-4 h-4" /> Return to full screen
        </button>
      }
    >
      <p>You left full-screen mode. This test must be taken in full screen.</p>
      <p className="font-semibold text-gray-900">
        {left === 1 ? 'One more exit and your test will be submitted automatically.' : `${left} more exits and your test will be submitted automatically.`}
      </p>
      <p>Your timer is still running.</p>
    </Dialog>
  );
}
