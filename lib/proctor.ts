/**
 * Proctoring constants shared by the exam player, the review pages and the API routes. Client safe (no server imports).
 *
 * Honest limits: everything the browser reports (tab switches, fullscreen exits, copy and paste) can be bypassed by a
 * determined person, for example by using a second device. So the system does not rely on the browser alone: the
 * server owns the timer, the question order, the single-session rule and the violation count, and a teacher reviews the
 * evidence (ID photo, random camera stills, timeline) before an attempt is trusted.
 */

export const EVENT_TYPES = [
  'TAB_HIDDEN',
  'WINDOW_BLUR',
  'FULLSCREEN_EXIT',
  'COPY',
  'PASTE',
  'CUT',
  'CONTEXT_MENU',
  'PRINT',
  'SHORTCUT',
  'CAMERA_LOST',
  'FACE_MISSING',
  'MULTIPLE_FACES',
  'SESSION_CONFLICT',
  'OFFLINE',
  'AUTO_SUBMIT',
  'NOTE',
] as const;
export type ProctorEventType = (typeof EVENT_TYPES)[number];

/** What the browser may report. The server adds SESSION_CONFLICT and AUTO_SUBMIT itself. */
export const CLIENT_EVENT_TYPES: ProctorEventType[] = ['TAB_HIDDEN', 'WINDOW_BLUR', 'FULLSCREEN_EXIT', 'COPY', 'PASTE', 'CUT', 'CONTEXT_MENU', 'PRINT', 'SHORTCUT', 'CAMERA_LOST', 'FACE_MISSING', 'MULTIPLE_FACES', 'OFFLINE'];

/**
 * Event types that count towards the exam's violation limit. FACE_MISSING / MULTIPLE_FACES come from an automatic
 * check that can be wrong, and OFFLINE is usually just a bad connection, so those are logged for the reviewer but do not
 * count. TAB_HIDDEN, WINDOW_BLUR and FULLSCREEN_EXIT usually fire together for one action, so the server counts them
 * once per FOCUS_DEDUPE_SECONDS.
 */
export const COUNTED_TYPES: ProctorEventType[] = ['TAB_HIDDEN', 'WINDOW_BLUR', 'FULLSCREEN_EXIT', 'COPY', 'PASTE', 'CUT', 'PRINT', 'CAMERA_LOST'];
export const FOCUS_FAMILY: ProctorEventType[] = ['TAB_HIDDEN', 'WINDOW_BLUR', 'FULLSCREEN_EXIT'];
export const FOCUS_DEDUPE_SECONDS = 3;

export const EVENT_LABELS: Record<ProctorEventType, string> = {
  TAB_HIDDEN: 'Switched tab or minimised the window',
  WINDOW_BLUR: 'Window lost focus',
  FULLSCREEN_EXIT: 'Left full screen',
  COPY: 'Copied text',
  PASTE: 'Pasted text',
  CUT: 'Cut text',
  CONTEXT_MENU: 'Right-click attempt',
  PRINT: 'Print or save attempt',
  SHORTCUT: 'Blocked keyboard shortcut',
  CAMERA_LOST: 'Camera stopped or was covered',
  FACE_MISSING: 'No face seen in a camera photo',
  MULTIPLE_FACES: 'More than one face in a camera photo',
  SESSION_CONFLICT: 'Another tab or device tried to open this exam',
  OFFLINE: 'Lost internet connection',
  AUTO_SUBMIT: 'Exam submitted automatically',
  NOTE: 'Note',
};

/** Seconds without a heartbeat before another tab or device may take over an attempt (crash or lost network recovery). */
export const SESSION_STALE_SECONDS = 45;
/** How often the exam tab tells the server it is alive and saves answers. */
export const HEARTBEAT_SECONDS = 5;
/** A submission this long after the server deadline is graded on the last autosave only. */
export const SUBMIT_GRACE_SECONDS = 15;

export const MAX_CAPTURE_BYTES = 250_000;
export const MAX_VERIFICATION_PHOTO_BYTES = 1_500_000;

export type ExamWindow = 'before' | 'open' | 'closed';

/** Machine readable reasons the server may refuse to start an exam. The message is always safe to show. */
export type ExamBlockCode =
  | 'VERIFICATION_REQUIRED'
  | 'VERIFICATION_PENDING'
  | 'VERIFICATION_REJECTED'
  | 'ACCESS_CODE_REQUIRED'
  | 'ACCESS_CODE_INVALID'
  | 'CONSENT_REQUIRED'
  | 'NOT_STARTED'
  | 'ENDED'
  | 'RETAKE_NOT_ALLOWED'
  | 'ACTIVE_ELSEWHERE'
  | 'SESSION_REPLACED';

export type ReviewStatus = 'PENDING' | 'VALID' | 'SUSPICIOUS';
export type VerificationStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

/** Request header carrying the exam session token on every call made while an attempt is running. */
export const SESSION_HEADER = 'x-exam-session';

/** Per-exam proctoring controls (the McqTest columns of the same names). Never include accessCode when sending to students. */
export interface ExamSettings {
  requireCamera: boolean;
  requireIdCheck: boolean;
  requireConsent: boolean;
  accessCode: string | null;
  startsAt: Date | null;
  endsAt: Date | null;
  questionCount: number | null;
  randomizeQuestions: boolean;
  randomizeOptions: boolean;
  maxViolations: number;
  captureEverySeconds: number;
  photoRetentionDays: number;
}

export const DEFAULT_EXAM_SETTINGS: ExamSettings = {
  requireCamera: true,
  requireIdCheck: false,
  requireConsent: true,
  accessCode: null,
  startsAt: null,
  endsAt: null,
  questionCount: null,
  randomizeQuestions: true,
  randomizeOptions: true,
  maxViolations: 3,
  captureEverySeconds: 120,
  photoRetentionDays: 30,
};
