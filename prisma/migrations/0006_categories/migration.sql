-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Category_name_key" ON "Category"("name");

-- Keep categories that courses already use.
INSERT INTO "Category" ("id", "name")
SELECT gen_random_uuid()::text, c."category" FROM (SELECT DISTINCT "category" FROM "Course" WHERE "category" <> '') c;

ALTER TABLE "Category" ENABLE ROW LEVEL SECURITY;
