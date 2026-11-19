-- AlterTable: exam controls on tests
ALTER TABLE "McqTest" ADD COLUMN "requireCamera" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "requireIdCheck" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "requireConsent" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "accessCode" TEXT,
ADD COLUMN "startsAt" TIMESTAMP(3),
ADD COLUMN "endsAt" TIMESTAMP(3),
ADD COLUMN "questionCount" INTEGER,
ADD COLUMN "randomizeQuestions" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "randomizeOptions" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "maxViolations" INTEGER NOT NULL DEFAULT 3,
ADD COLUMN "captureEverySeconds" INTEGER NOT NULL DEFAULT 120,
ADD COLUMN "photoRetentionDays" INTEGER NOT NULL DEFAULT 30;

-- AlterTable: attempts
ALTER TABLE "McqAttempt" ADD COLUMN "deadlineAt" TIMESTAMP(3),
ADD COLUMN "sessionHash" TEXT,
ADD COLUMN "sessionLastSeenAt" TIMESTAMP(3),
ADD COLUMN "sessionDevice" TEXT,
ADD COLUMN "consentAt" TIMESTAMP(3),
ADD COLUMN "verificationId" TEXT,
ADD COLUMN "reviewStatus" TEXT NOT NULL DEFAULT 'PENDING',
ADD COLUMN "reviewNote" TEXT,
ADD COLUMN "reviewedById" TEXT,
ADD COLUMN "reviewedAt" TIMESTAMP(3),
ADD COLUMN "mediaPurgedAt" TIMESTAMP(3);

-- Attempts already running keep their original timer: deadline = start + limit
UPDATE "McqAttempt" SET "deadlineAt" = "startedAt" + ("timeLimit" * interval '1 minute') WHERE "deadlineAt" IS NULL;

-- CreateTable
CREATE TABLE "ExamVerification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "testKey" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "selfieKey" TEXT,
    "idKey" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "rejectReason" TEXT,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "consentAt" TIMESTAMP(3),
    "purgeAfter" TIMESTAMP(3) NOT NULL,
    "purgedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ExamVerification_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProctorEvent" (
    "id" TEXT NOT NULL,
    "attemptId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "clientAt" TIMESTAMP(3),
    "detail" TEXT,
    "counted" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "ProctorEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProctorCapture" (
    "id" TEXT NOT NULL,
    "attemptId" TEXT NOT NULL,
    "key" TEXT,
    "takenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "faceCount" INTEGER,
    "purgeAfter" TIMESTAMP(3) NOT NULL,
    "purgedAt" TIMESTAMP(3),
    CONSTRAINT "ProctorCapture_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ExamRetakeGrant" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "testKey" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "reason" TEXT,
    "grantedById" TEXT NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ExamRetakeGrant_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ExamVerification_userId_testKey_idx" ON "ExamVerification"("userId", "testKey");
CREATE INDEX "ExamVerification_courseId_status_idx" ON "ExamVerification"("courseId", "status");
CREATE INDEX "ExamVerification_purgeAfter_idx" ON "ExamVerification"("purgeAfter");
CREATE INDEX "ProctorEvent_attemptId_at_idx" ON "ProctorEvent"("attemptId", "at");
CREATE INDEX "ProctorCapture_attemptId_takenAt_idx" ON "ProctorCapture"("attemptId", "takenAt");
CREATE INDEX "ProctorCapture_purgeAfter_idx" ON "ProctorCapture"("purgeAfter");
CREATE INDEX "ExamRetakeGrant_userId_testKey_idx" ON "ExamRetakeGrant"("userId", "testKey");

-- AddForeignKey
ALTER TABLE "ExamVerification" ADD CONSTRAINT "ExamVerification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProctorEvent" ADD CONSTRAINT "ProctorEvent_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "McqAttempt"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProctorCapture" ADD CONSTRAINT "ProctorCapture_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "McqAttempt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Row level security, like every other table
ALTER TABLE "ExamVerification" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ProctorEvent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ProctorCapture" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ExamRetakeGrant" ENABLE ROW LEVEL SECURITY;
