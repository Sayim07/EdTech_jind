-- One running attempt per student and exam. This is the database-level half of "single active session": two tabs that
-- press Start at the same instant cannot both create an attempt.
-- (Older duplicate running attempts, if any, are closed first so the index can be created.)
UPDATE "McqAttempt" a SET "status" = 'SUBMITTED', "submittedAt" = COALESCE(a."submittedAt", CURRENT_TIMESTAMP), "autoSubmitted" = true, "autoReason" = 'TIME_UP'
WHERE a."status" = 'IN_PROGRESS' AND EXISTS (
  SELECT 1 FROM "McqAttempt" b WHERE b."userId" = a."userId" AND b."testKey" = a."testKey" AND b."status" = 'IN_PROGRESS' AND b."startedAt" > a."startedAt"
);

CREATE UNIQUE INDEX "McqAttempt_one_running_per_exam" ON "McqAttempt" ("userId", "testKey") WHERE "status" = 'IN_PROGRESS';
