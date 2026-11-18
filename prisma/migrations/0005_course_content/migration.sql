-- DropForeignKey
ALTER TABLE "Assignment" DROP CONSTRAINT "Assignment_lessonId_fkey";

-- AlterTable
ALTER TABLE "Assignment" ADD COLUMN     "attachments" TEXT,
ADD COLUMN     "moduleId" TEXT,
ADD COLUMN     "order" INTEGER NOT NULL DEFAULT 1,
ALTER COLUMN "lessonId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "McqTest" ADD COLUMN     "kind" TEXT NOT NULL DEFAULT 'TEST',
ADD COLUMN     "moduleId" TEXT,
ALTER COLUMN "courseId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "Module"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "McqTest" ADD CONSTRAINT "McqTest_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "Module"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Backfill: older assignments hung off a lesson. Move each into that lesson's module (keeping lesson order), then detach it.
UPDATE "Assignment" a
SET "moduleId" = l."moduleId"
FROM "Lesson" l
WHERE a."lessonId" = l."id" AND a."moduleId" IS NULL;

UPDATE "Assignment" a
SET "order" = r.rn
FROM (
  SELECT x."id", ROW_NUMBER() OVER (PARTITION BY x."moduleId" ORDER BY l."order", x."title") AS rn
  FROM "Assignment" x JOIN "Lesson" l ON l."id" = x."lessonId"
) r
WHERE a."id" = r."id";

UPDATE "Assignment" SET "lessonId" = NULL WHERE "lessonId" IS NOT NULL;

-- Content rules enforced by the database itself.
-- A test belongs to a course OR a module, never both and never neither.
ALTER TABLE "McqTest" ADD CONSTRAINT "McqTest_exactly_one_parent" CHECK (("courseId" IS NULL) <> ("moduleId" IS NULL));
-- MCQ assignments must sit inside a module.
ALTER TABLE "McqTest" ADD CONSTRAINT "McqTest_assignment_needs_module" CHECK ("kind" <> 'ASSIGNMENT' OR "moduleId" IS NOT NULL);
-- Assignments always live in a module.
ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_needs_module" CHECK ("moduleId" IS NOT NULL);

CREATE INDEX "McqTest_moduleId_idx" ON "McqTest"("moduleId");
CREATE INDEX "Assignment_moduleId_idx" ON "Assignment"("moduleId");
