import type { ExamBlockCode, ExamWindow, VerificationStatus } from '@/lib/proctor';
import type { AttemptResult, PublicQuestion } from '@/lib/mcq';

/** Response of GET /api/exam/[testKey]/status (see docs/PROCTORING.md). */
export interface ExamSettings {
  title: string;
  courseTitle: string;
  questionCount: number;
  timeLimit: number;
  passingMarks: number;
  allowRetakes: boolean;
  requireCamera: boolean;
  requireIdCheck: boolean;
  requireConsent: boolean;
  needsAccessCode: boolean;
  startsAt: string | null;
  endsAt: string | null;
  maxViolations: number;
  captureEverySeconds: number;
  photoRetentionDays: number;
}

export interface ExamVerificationState {
  id: string;
  status: VerificationStatus;
  rejectReason: string | null;
}

export interface ExamStatus {
  settings: ExamSettings;
  now: string;
  window: ExamWindow;
  verification: ExamVerificationState | null;
  retakeGrant: boolean;
  openAttempt: { id: string; activeElsewhere: boolean } | null;
  blocked: { code: ExamBlockCode; message: string } | null;
}

/** Response of POST /api/mcq/start. */
export interface StartData {
  attemptId: string;
  title: string;
  questions: PublicQuestion[];
  answers: Record<string, number>;
  remainingSeconds: number;
  serverNow: string;
  deadlineAt: string;
  violations: number;
  maxViolations: number;
  captureEverySeconds: number;
  requireCamera: boolean;
  sessionToken: string;
}

export interface ExamEventInput {
  type: string;
  clientAt?: string;
  detail?: string;
}

export type { AttemptResult };

/** Error thrown by the small fetch helpers, carrying the server's machine readable code. */
export class ApiError extends Error {
  status: number;
  code?: string;
  data?: any;
  constructor(message: string, status: number, code?: string, data?: any) {
    super(message);
    this.status = status;
    this.code = code;
    this.data = data;
  }
}
