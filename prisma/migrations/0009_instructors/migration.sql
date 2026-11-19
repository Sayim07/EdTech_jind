-- AlterTable
ALTER TABLE "StaffMember" ADD COLUMN "userId" TEXT;
ALTER TABLE "Course" ADD COLUMN "instructorId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "StaffMember_userId_key" ON "StaffMember"("userId");

-- AddForeignKey
ALTER TABLE "StaffMember" ADD CONSTRAINT "StaffMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Course" ADD CONSTRAINT "Course_instructorId_fkey" FOREIGN KEY ("instructorId") REFERENCES "StaffMember"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Courses that already name an instructor on the Staff page keep working: link them by name.
UPDATE "Course" c SET "instructorId" = s."id" FROM "StaffMember" s WHERE s."role" = 'INSTRUCTOR' AND lower(s."name") = lower(c."instructorName");
