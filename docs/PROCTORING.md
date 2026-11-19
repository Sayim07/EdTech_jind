# Exam proctoring: design and API contract

Built on the existing MCQ test system (`McqTest`, `McqAttempt`, `/api/mcq/*`, `components/mcq/*`). Shared constants live in
`lib/proctor.ts`. Server-only logic lives in `lib/exam.ts`, `lib/proctor-storage.ts` and `lib/proctor-access.ts`.

## Principles
- The browser is not trusted. The **server** owns: the timer (`McqAttempt.deadlineAt`), the question and answer order
  (drawn and shuffled when the attempt is created, then frozen in `McqAttempt.questions`), the single active session
  (`sessionHash`), the violation count and the auto-submit. Changing the device clock, reloading or opening a second tab
  gains nothing.
- Photos: live camera stills only. No video is streamed or recorded. The ID card and selfie are captured with the camera
  (no file upload). All images go to PRIVATE object storage (Cloudflare R2) and are only ever served through
  `/api/proctor/media/...` after a permission check. They are deleted after `McqTest.photoRetentionDays`.
- A teacher/admin decides. The in-browser face check (optional) only adds a `faceCount` hint to a capture.

## Roles
- STUDENT: takes exams, submits verification, sends events/captures for their own attempt.
- ADMIN: reviews everything.
- INSTRUCTOR: reviews only courses they teach (`lib/proctor-access.ts`: `canReviewCourse(user, courseId)`).

## Exam settings (columns on `McqTest`, edited in the test builder)
`requireCamera`, `requireIdCheck`, `requireConsent`, `accessCode` (plain text, shown to staff only, never sent to students),
`startsAt`, `endsAt`, `questionCount` (null = all), `randomizeQuestions`, `randomizeOptions`, `maxViolations` (1 to 20),
`captureEverySeconds` (30 to 600), `photoRetentionDays` (1 to 365). Existing: `timeLimit`, `passingMarks`, `allowRetakes`.
Retakes: when `allowRetakes` is false a student needs an unused `ExamRetakeGrant` from a teacher/admin.

## Session token
`POST /api/mcq/start` returns `sessionToken`. The browser keeps it in `sessionStorage` (per tab) and sends it on every call
for that attempt in the header `x-exam-session`. A missing or wrong token gives `409 { code: "SESSION_REPLACED" }`: the tab
must stop the exam and tell the student another tab or device took over. To resume in the same tab after a refresh, send
`tabToken` (the stored sessionToken) in the start body. A different tab or device is refused with
`409 { code: "ACTIVE_ELSEWHERE" }` while the owner has sent a heartbeat in the last `SESSION_STALE_SECONDS`; after that it may
take over (crash / lost network recovery) and the old tab is cut off.

## Student endpoints
| Method and path | Body | Success | Errors |
|---|---|---|---|
| `GET /api/exam/[testKey]/status` | none | `{ settings, now, window, verification, retakeGrant, openAttempt, blocked }` (see below) | 401, 404 |
| `POST /api/exam/verification` | multipart: `testKey`, `selfie` (jpeg), `idPhoto` (jpeg), `consent="true"` | `201 { verification: { id, status: "PENDING" } }` | 400, 401, 403, 409 |
| `POST /api/mcq/start` | `{ testKey, accessCode?, consent?, tabToken? }` | `{ attemptId, title, questions: PublicQuestion[], answers, remainingSeconds, serverNow, deadlineAt, violations, maxViolations, captureEverySeconds, requireCamera, sessionToken }` | 401, 403 `{ code, error }` (an `ExamBlockCode`), 404, 409 `ACTIVE_ELSEWHERE` |
| `PATCH /api/mcq/attempts/[id]` | `{ answers }` (header `x-exam-session`) | `{ ok, status: "IN_PROGRESS", remainingSeconds, serverNow, violations }` or, once the server deadline has passed, `{ ok, status: "SUBMITTED", result }` | 401, 404, 409 `SESSION_REPLACED` |
| `POST /api/mcq/attempts/[id]/events` | `{ events: [{ type, clientAt?, detail? }] }` (max 20) | `{ violations, maxViolations, autoSubmitted, result? }` | 401, 404, 409 |
| `POST /api/mcq/attempts/[id]/captures` | multipart: `image` (jpeg, at most 250 KB), `faceCount?` | `201 { id }` | 400, 401, 404, 409 |
| `POST /api/mcq/attempts/[id]/submit` | `{ answers? }` | `{ result }` | 401, 404 |

`GET /api/exam/[testKey]/status` returns:
```
settings: { title, courseTitle, questionCount (how many the student will get), timeLimit, passingMarks, allowRetakes,
            requireCamera, requireIdCheck, requireConsent, needsAccessCode (boolean, never the code), startsAt, endsAt,
            maxViolations, captureEverySeconds, photoRetentionDays }
now: ISO server time          window: "before" | "open" | "closed"
verification: null | { id, status: "PENDING"|"APPROVED"|"REJECTED", rejectReason }   // latest one for this student and exam
retakeGrant: boolean          openAttempt: null | { id, activeElsewhere: boolean }
blocked: null | { code: ExamBlockCode, message }   // why Start would be refused right now (retakes, window)
```
The client never needs the correct answers: `questions` are `PublicQuestion` (id, text, options) already in the student's
own random order, with options in the student's own random order.

## Staff endpoints (ADMIN, or INSTRUCTOR of the course; 403 otherwise)
| Method and path | Body | Success |
|---|---|---|
| `PATCH /api/proctor/verifications/[id]` | `{ action: "APPROVE" \| "REJECT", reason? }` (reason required for REJECT) | `{ verification }` |
| `PATCH /api/proctor/attempts/[id]/review` | `{ status: "VALID" \| "SUSPICIOUS" \| "PENDING", note? }` | `{ ok: true }` |
| `POST /api/proctor/retakes` | `{ userId, testKey, reason? }` | `201 { grant }` |
| `GET /api/proctor/media/capture/[id]` | | `image/jpeg` (private, no-store) |
| `GET /api/proctor/media/verification/[id]/selfie` and `/id` | | `image/jpeg` (private, no-store) |
| `POST /api/proctor/purge` | none (admin, or `Authorization: Bearer $CRON_SECRET`) | `{ purged }` deletes expired photos |

The review pages are server components that read Prisma directly (`McqAttempt`, `ProctorEvent`, `ProctorCapture`,
`ExamVerification`) and show images through the media URLs above.

## Event rules (enforced on the server in `POST .../events`)
Types and which count are in `lib/proctor.ts` (`COUNTED_TYPES`, `FOCUS_FAMILY` counted once per `FOCUS_DEDUPE_SECONDS`).
When counted violations reach `McqTest.maxViolations` the server submits the attempt itself (`autoReason: "PROCTORING"`)
and returns `autoSubmitted: true` with the `result`.
