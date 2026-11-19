'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Camera, CheckCircle2, RefreshCw, RotateCcw, SwitchCamera } from 'lucide-react';
import { primaryBtn, secondaryBtn } from '@/components/mcq/Dialog';
import { ButtonSpinner } from '@/components/ui/Loaders';
import { MAX_VERIFICATION_PHOTO_BYTES } from '@/lib/proctor';
import { apiJson } from './api';
import { encodeStill, frameStats, looksCovered, requestCamera, stopStream, waitForFrame } from './camera';
import { Notice } from './Notice';
import type { ExamVerificationState } from './types';

type Stage = 'selfie' | 'id' | 'review';
interface Photo {
  blob: Blob;
  url: string;
}

const MAX_BYTES = Math.min(1_200_000, MAX_VERIFICATION_PHOTO_BYTES - 100_000);

/**
 * Identity check: a live selfie, then a photo of the front of the ID card, both taken from the camera (no file upload).
 * Shows the waiting / rejected / approved state of the latest verification. The parent polls the status.
 */
export function IdentityCheck({
  testKey,
  consent,
  verification,
  checking,
  onCheckNow,
  onSubmitted,
}: {
  testKey: string;
  consent: boolean;
  verification: ExamVerificationState | null;
  checking: boolean;
  onCheckNow: () => void;
  onSubmitted: (v: ExamVerificationState) => void;
}) {
  const [stage, setStage] = useState<Stage>('selfie');
  const [photos, setPhotos] = useState<{ selfie?: Photo; id?: Photo }>({});
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [facing, setFacing] = useState<'user' | 'environment'>('user');
  const [multipleCameras, setMultipleCameras] = useState(false);
  const [busy, setBusy] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [captureError, setCaptureError] = useState('');
  const [capturing, setCapturing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  streamRef.current = stream;
  const photosRef = useRef(photos);
  photosRef.current = photos;
  const mounted = useRef(false);

  // Release the camera and the preview URLs when leaving (deferred so strict mode's test unmount does not stop it)
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      setTimeout(() => {
        if (mounted.current) return;
        stopStream(streamRef.current);
        if (photosRef.current.selfie) URL.revokeObjectURL(photosRef.current.selfie.url);
        if (photosRef.current.id) URL.revokeObjectURL(photosRef.current.id.url);
      }, 0);
    };
  }, []);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.srcObject = stream;
    if (stream) v.play().catch(() => {});
  }, [stream, stage]);

  const openCamera = useCallback(async (facingMode: 'user' | 'environment') => {
    setBusy(true);
    setCameraError('');
    stopStream(streamRef.current);
    const r = await requestCamera(facingMode);
    if (r.stream) {
      setStream(r.stream);
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        setMultipleCameras(devices.filter((d) => d.kind === 'videoinput').length > 1);
      } catch {}
    } else {
      setStream(null);
      setCameraError(r.error || 'Could not start the camera.');
    }
    setBusy(false);
  }, []);

  const flip = () => {
    const next = facing === 'user' ? 'environment' : 'user';
    setFacing(next);
    void openCamera(next);
  };

  const setPhoto = (which: 'selfie' | 'id', blob: Blob) => {
    setPhotos((p) => {
      if (p[which]) URL.revokeObjectURL(p[which]!.url);
      return { ...p, [which]: { blob, url: URL.createObjectURL(blob) } };
    });
  };

  const capture = async () => {
    const v = videoRef.current;
    if (!v) return;
    setCapturing(true);
    setCaptureError('');
    try {
      if (!(await waitForFrame(v))) {
        setCaptureError('The camera has not produced a picture yet. Wait a second and try again.');
        return;
      }
      if (looksCovered(frameStats(v))) {
        setCaptureError('The picture is black. Uncover the camera, check the lighting and try again.');
        return;
      }
      const enc = await encodeStill(v, { maxWidth: 1280, maxHeight: 1280, quality: 0.82, maxBytes: MAX_BYTES });
      if (!enc) {
        setCaptureError('Could not take the photo. Please try again.');
        return;
      }
      const which = stage === 'selfie' ? 'selfie' : 'id';
      setPhoto(which, enc.blob);
      if (which === 'selfie' && !photosRef.current.id) setStage('id');
      else {
        // Both photos now exist: review them before sending.
        setStage('review');
        stopStream(streamRef.current);
        setStream(null);
      }
    } finally {
      setCapturing(false);
    }
  };

  const retake = (which: 'selfie' | 'id') => {
    setStage(which);
    setUploadError('');
    if (!streamRef.current) void openCamera(facing);
  };

  const submit = async () => {
    if (!photos.selfie || !photos.id) return;
    setUploading(true);
    setUploadError('');
    try {
      const form = new FormData();
      form.append('testKey', testKey);
      if (consent) form.append('consent', 'true');
      form.append('selfie', new File([photos.selfie.blob], 'selfie.jpg', { type: 'image/jpeg' }));
      form.append('idPhoto', new File([photos.id.blob], 'id.jpg', { type: 'image/jpeg' }));
      const data = await apiJson<{ verification: { id: string; status: ExamVerificationState['status'] } }>('/api/exam/verification', { method: 'POST', body: form });
      if (photos.selfie) URL.revokeObjectURL(photos.selfie.url);
      if (photos.id) URL.revokeObjectURL(photos.id.url);
      setPhotos({});
      setStage('selfie');
      onSubmitted({ id: data.verification.id, status: data.verification.status, rejectReason: null });
    } catch (e: any) {
      if (e?.status === 409) onCheckNow(); // already waiting or approved: show the real state
      setUploadError(e?.status === 0 ? 'Could not reach the server. Check your connection and try again. Your photos are kept.' : e?.message || 'Could not send your photos.');
    } finally {
      setUploading(false);
    }
  };

  /* ------------------------------- states ------------------------------- */

  if (verification?.status === 'APPROVED') {
    return (
      <p role="status" className="flex items-center gap-2 text-sm font-semibold text-emerald-800">
        <CheckCircle2 className="w-5 h-5" aria-hidden /> Your identity was approved by your teacher.
      </p>
    );
  }

  if (verification?.status === 'PENDING') {
    return (
      <div className="space-y-3">
        <div role="status" className="flex items-start gap-3 text-sm text-gray-800 max-w-prose">
          <ButtonSpinner label="" />
          <div className="space-y-1">
            <p className="font-semibold text-gray-900">Waiting for your teacher to approve</p>
            <p>Your selfie and ID photo were sent. This page checks again every 10 seconds and unlocks the next step as soon as you are approved. You can keep this tab open.</p>
          </div>
        </div>
        <button type="button" onClick={onCheckNow} disabled={checking} className={secondaryBtn}>
          {checking ? <ButtonSpinner label="Checking..." /> : (<><RefreshCw className="w-4 h-4" aria-hidden /> Check now</>)}
        </button>
      </div>
    );
  }

  const label = stage === 'selfie' ? 'Step 1 of 2: take a selfie' : 'Step 2 of 2: take a photo of the front of your ID card';
  const mirrored = stage === 'selfie' && facing === 'user';

  return (
    <div className="space-y-4">
      {verification?.status === 'REJECTED' && (
        <Notice tone="error">
          <p className="font-semibold">Your identity check was not accepted.</p>
          {verification.rejectReason && <p className="mt-0.5">Reason from your teacher: {verification.rejectReason}</p>}
          <p className="mt-0.5">Take both photos again and send them for a new check.</p>
        </Notice>
      )}
      {!verification && <p className="text-sm text-gray-700 max-w-prose">Your teacher compares a live selfie with a photo of your ID card. Both are taken here with your camera: files cannot be uploaded.</p>}

      {stage !== 'review' && (
        <div className="space-y-3">
          <p className="text-sm font-semibold text-gray-900" aria-live="polite">
            {label}
          </p>
          {stream ? (
            <>
              <div className="relative w-full max-w-lg aspect-[4/3] sm:aspect-video rounded-xl overflow-hidden bg-gray-900">
                <video ref={videoRef} muted playsInline autoPlay aria-label="Live camera preview" className={`absolute inset-0 w-full h-full object-cover ${mirrored ? '-scale-x-100' : ''}`} />
                <div aria-hidden className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  {stage === 'selfie' ? <div className="h-[78%] aspect-[3/4] rounded-[50%] border-2 border-dashed border-white/80" /> : <div className="w-[82%] aspect-[1.586/1] rounded-lg border-2 border-dashed border-white/80" />}
                </div>
              </div>
              <p className="text-sm text-gray-700 max-w-prose">
                {stage === 'selfie' ? 'Face the camera in good light and keep your face inside the oval.' : 'Hold the front of your ID card inside the frame so the photo and the text are sharp and readable. Avoid glare.'}
              </p>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={capture} disabled={capturing} className={primaryBtn}>
                  {capturing ? <ButtonSpinner label="Taking photo..." /> : (<><Camera className="w-4 h-4" aria-hidden /> {stage === 'selfie' ? 'Take selfie' : 'Take ID photo'}</>)}
                </button>
                {multipleCameras && (
                  <button type="button" onClick={flip} disabled={busy} className={secondaryBtn}>
                    <SwitchCamera className="w-4 h-4" aria-hidden /> Switch camera
                  </button>
                )}
              </div>
              {captureError && <Notice tone="error">{captureError}</Notice>}
            </>
          ) : (
            <div className="space-y-3">
              {cameraError && <Notice tone="error">{cameraError}</Notice>}
              <button type="button" onClick={() => openCamera(facing)} disabled={busy} className={primaryBtn}>
                {busy ? <ButtonSpinner label="Waiting for permission..." /> : (<><Camera className="w-4 h-4" aria-hidden /> {cameraError ? 'Try again' : 'Open camera'}</>)}
              </button>
            </div>
          )}
        </div>
      )}

      {(photos.selfie || photos.id) && (
        <div className="space-y-3">
          <ul className="flex flex-wrap gap-4">
            {(['selfie', 'id'] as const).map((k) => {
              const p = photos[k];
              if (!p) return null;
              return (
                <li key={k} className="space-y-1.5">
                  <p className="text-xs font-semibold text-gray-700">{k === 'selfie' ? 'Your selfie' : 'Your ID card'}</p>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.url} alt={k === 'selfie' ? 'The selfie you took' : 'The photo of your ID card you took'} className={`h-28 w-auto max-w-[45vw] rounded-lg border border-gray-200 object-cover ${k === 'selfie' ? '-scale-x-100' : ''}`} />
                  <button type="button" onClick={() => retake(k)} disabled={uploading} className="text-sm font-semibold text-amber-700 hover:underline inline-flex items-center gap-1 rounded focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_#e3eeff] disabled:opacity-60">
                    <RotateCcw className="w-3.5 h-3.5" aria-hidden /> Retake {k === 'selfie' ? 'selfie' : 'ID photo'}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {stage === 'review' && photos.selfie && photos.id && (
        <div className="space-y-3">
          <p className="text-sm text-gray-700 max-w-prose">Check that your face and the text on the ID card are clearly visible. If not, retake the photo before sending.</p>
          {uploadError && <Notice tone="error">{uploadError}</Notice>}
          <button type="button" onClick={submit} disabled={uploading} className={primaryBtn}>
            {uploading ? <ButtonSpinner label="Sending..." /> : 'Send for approval'}
          </button>
        </div>
      )}
    </div>
  );
}
