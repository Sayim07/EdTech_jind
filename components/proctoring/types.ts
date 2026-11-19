// Plain, serialisable shapes passed from the proctoring server pages to their client components.

export interface VerificationRow {
  id: string;
  userId: string;
  student: string;
  email: string;
  courseId: string;
  course: string;
  testKey: string;
  test: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  rejectReason: string | null;
  reviewer: string | null;
  reviewedAt: string | null;
  createdAt: string;
  purgedAt: string | null;
}

export interface AttemptRow {
  id: string;
  userId: string;
  student: string;
  email: string;
  courseId: string;
  course: string;
  testKey: string;
  test: string;
  status: string; // IN_PROGRESS | SUBMITTED
  score: number | null;
  total: number | null;
  percentage: number | null;
  passed: boolean | null;
  violations: number;
  maxViolations: number | null;
  autoSubmitted: boolean;
  autoReason: string | null;
  reviewStatus: string; // PENDING | VALID | SUSPICIOUS
  reviewer: string | null;
  captures: number;
  startedAt: string;
  submittedAt: string | null;
}

export interface GrantRow {
  id: string;
  userId: string;
  student: string;
  email: string;
  courseId: string;
  course: string;
  testKey: string;
  test: string;
  reason: string | null;
  grantedBy: string | null;
  createdAt: string;
  usedAt: string | null;
}

export interface CourseOption {
  id: string;
  title: string;
}

export interface TimelineItem {
  id: string;
  kind: 'event' | 'capture';
  at: string; // ISO server time
  offsetSeconds: number; // seconds since the attempt started
  // events
  label?: string;
  type?: string;
  counted?: boolean;
  detail?: string | null;
  // captures
  captureId?: string;
  faceCount?: number | null;
  purged?: boolean;
}

export interface CaptureItem {
  id: string;
  at: string;
  offsetSeconds: number;
  faceCount: number | null;
  purged: boolean;
}

export interface LegacySnapshot {
  at: string;
  img: string;
}
