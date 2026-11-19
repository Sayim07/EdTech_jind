/** Browser helpers for the camera, stills and full screen. Client only. */

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

export function stopStream(stream: MediaStream | null | undefined) {
  stream?.getTracks().forEach((t) => t.stop());
}

/** True while the stream still has a live video track. */
export function streamIsLive(stream: MediaStream | null | undefined) {
  const t = stream?.getVideoTracks()[0];
  return Boolean(t && t.readyState === 'live');
}

/** Asks for the webcam; the error string is safe to show to the student. */
export async function requestCamera(facing: 'user' | 'environment' = 'user'): Promise<{ stream?: MediaStream; error?: string }> {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
    return { error: 'This browser cannot access a camera. Use a recent version of Chrome, Edge, Firefox or Safari over a secure (https) connection.' };
  }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: { ideal: facing } },
      audio: false,
    });
    return { stream };
  } catch (err: any) {
    const name = err?.name;
    if (name === 'NotAllowedError' || name === 'SecurityError' || name === 'PermissionDeniedError') {
      return { error: 'Camera access was blocked. Click the camera icon in your browser address bar, allow access for this site, then press Try again.' };
    }
    if (name === 'NotFoundError' || name === 'OverconstrainedError' || name === 'DevicesNotFoundError') return { error: 'No camera was found. Connect a webcam and press Try again.' };
    if (name === 'NotReadableError' || name === 'TrackStartError') return { error: 'Your camera is being used by another application. Close it and press Try again.' };
    return { error: 'Could not start the camera. Please try again.' };
  }
}

/** Waits until the video has a decoded frame (or gives up after a few seconds). */
export async function waitForFrame(video: HTMLVideoElement, timeoutMs = 4000): Promise<boolean> {
  const start = performance.now();
  while (performance.now() - start < timeoutMs) {
    if (video.videoWidth > 0 && video.readyState >= 2) return true;
    await new Promise((r) => setTimeout(r, 100));
  }
  return video.videoWidth > 0;
}

/** Average brightness (0..255) and spread of a tiny copy of the frame. A covered or dead camera is near black and flat. */
export function frameStats(video: HTMLVideoElement): { mean: number; spread: number } | null {
  if (!video.videoWidth) return null;
  try {
    const c = document.createElement('canvas');
    c.width = 24;
    c.height = 18;
    const ctx = c.getContext('2d', { willReadFrequently: true });
    if (!ctx) return null;
    ctx.drawImage(video, 0, 0, c.width, c.height);
    const d = ctx.getImageData(0, 0, c.width, c.height).data;
    let sum = 0;
    let sumSq = 0;
    const n = d.length / 4;
    for (let i = 0; i < d.length; i += 4) {
      const l = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
      sum += l;
      sumSq += l * l;
    }
    const mean = sum / n;
    return { mean, spread: Math.sqrt(Math.max(0, sumSq / n - mean * mean)) };
  } catch {
    return null;
  }
}

export const looksCovered = (s: { mean: number; spread: number } | null) => Boolean(s && s.mean < 12 && s.spread < 6);

export function canvasToBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), 'image/jpeg', quality));
}

/**
 * Draws the current frame onto a canvas no wider than maxWidth and encodes it as JPEG under maxBytes, lowering the
 * quality and then the size until it fits. The canvas is returned too (for the face check). Never attached to the page.
 */
export async function encodeStill(
  video: HTMLVideoElement,
  opts: { maxWidth: number; quality: number; maxBytes: number; maxHeight?: number }
): Promise<{ blob: Blob; canvas: HTMLCanvasElement } | null> {
  if (!video.videoWidth || !video.videoHeight) return null;
  const canvas = document.createElement('canvas');
  const fit = Math.min(1, opts.maxWidth / video.videoWidth, (opts.maxHeight ?? opts.maxWidth) / video.videoHeight);
  let w = Math.max(1, Math.round(video.videoWidth * fit));
  let h = Math.max(1, Math.round(video.videoHeight * fit));
  let quality = opts.quality;
  for (let attempt = 0; attempt < 8; attempt++) {
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(video, 0, 0, w, h);
    const blob = await canvasToBlob(canvas, quality);
    if (!blob) return null;
    if (blob.size <= opts.maxBytes) return { blob, canvas };
    if (quality > 0.45) quality -= 0.1;
    else {
      w = Math.round(w * 0.8);
      h = Math.round(h * 0.8);
    }
  }
  return null;
}

/** Unpredictable number in [0, 1), from the crypto generator where it exists. */
export function randomUnit(): number {
  try {
    const a = new Uint32Array(1);
    crypto.getRandomValues(a);
    return a[0] / 4294967296;
  } catch {
    return Math.random();
  }
}
