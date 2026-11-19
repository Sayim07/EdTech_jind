-- AlterTable
ALTER TABLE "User" ADD COLUMN "dob" TIMESTAMP(3),
ADD COLUMN "gender" TEXT,
ADD COLUMN "phone" TEXT,
ADD COLUMN "education" TEXT,
ADD COLUMN "institution" TEXT,
ADD COLUMN "qualification" TEXT,
ADD COLUMN "skills" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "interests" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "occupation" TEXT,
ADD COLUMN "address" TEXT,
ADD COLUMN "city" TEXT,
ADD COLUMN "state" TEXT,
ADD COLUMN "pin" TEXT,
ADD COLUMN "country" TEXT,
ADD COLUMN "onboardingSeenAt" TIMESTAMP(3);

-- People who already have an account should not get the "welcome" popup meant for new sign-ups.
UPDATE "User" SET "onboardingSeenAt" = CURRENT_TIMESTAMP;
