/**
 * Optional in-browser face count for each camera still, using Google MediaPipe Tasks Vision. Everything here is best
 * effort: if the library, the wasm or the model cannot load (offline, blocked, old browser), `countFaces` just returns
 * null and the exam carries on. The result is only a hint for the reviewer and never counts as a violation.
 */

const MEDIAPIPE_VERSION = '1.2.3';
const WASM_URL = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MEDIAPIPE_VERSION}/wasm`;
const MODEL_URL = 'https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite';

type Detector = { detect: (img: HTMLCanvasElement) => { detections: unknown[] }; close?: () => void };

let detectorPromise: Promise<Detector | null> | null = null;
let failed = false;

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('timeout')), ms);
    p.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      }
    );
  });
}

/** Starts loading the detector in the background. Safe to call many times. */
export function preloadFaceDetector(): Promise<Detector | null> {
  if (failed) return Promise.resolve(null);
  if (!detectorPromise) {
    detectorPromise = withTimeout(
      (async () => {
        const vision = await import('@mediapipe/tasks-vision');
        const fileset = await vision.FilesetResolver.forVisionTasks(WASM_URL);
        const detector = await vision.FaceDetector.createFromOptions(fileset, {
          baseOptions: { modelAssetPath: MODEL_URL },
          runningMode: 'IMAGE',
          minDetectionConfidence: 0.5,
        });
        return detector as unknown as Detector;
      })(),
      25000
    ).catch(() => {
      failed = true;
      return null;
    });
  }
  return detectorPromise;
}

/** Number of faces in the canvas, or null when the detector is not available. */
export async function countFaces(canvas: HTMLCanvasElement): Promise<number | null> {
  try {
    const detector = await preloadFaceDetector();
    if (!detector) return null;
    return detector.detect(canvas).detections.length;
  } catch {
    return null;
  }
}
