-- Website conversion intelligence (2026-10-08). Additive only: two enum values
-- and three nullable/defaulted columns on transparency_leads. No statement here
-- uses the new enum values, so ADD VALUE is safe inside the transaction (PG 12+).

-- AlterEnum
ALTER TYPE "ProjectSituation" ADD VALUE IF NOT EXISTS 'UNSURE';

-- AlterEnum
ALTER TYPE "ClientSource" ADD VALUE IF NOT EXISTS 'EXIT_INTENT';

-- AlterTable
ALTER TABLE "transparency_leads" ADD COLUMN "situation" "ProjectSituation",
ADD COLUMN "nextStep" TEXT,
ADD COLUMN "drivers" TEXT[] DEFAULT ARRAY[]::TEXT[];
