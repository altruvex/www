-- Sales machine (2026-10-07). Additive only: new enums, new enum values,
-- nullable columns, indexes and one SET NULL foreign key. No existing row is
-- rewritten. The new enum values are not used by any statement in this
-- migration, so ADD VALUE is safe inside the migration transaction (PG 12+).

-- CreateEnum
CREATE TYPE "ProjectSituation" AS ENUM ('NEW_BUILD', 'REPLACE_EXISTING', 'IMPROVE_EXISTING');

-- CreateEnum
CREATE TYPE "DecisionRole" AS ENUM ('DECIDES', 'SHARED', 'ADVISES');

-- CreateEnum
CREATE TYPE "LostReason" AS ENUM ('BUDGET', 'TIMING', 'FIT', 'COMPETITOR', 'NO_RESPONSE', 'OTHER');

-- AlterEnum
ALTER TYPE "SubmissionStatus" ADD VALUE 'QUALIFYING';
ALTER TYPE "SubmissionStatus" ADD VALUE 'NURTURE';

-- AlterEnum (legacy UNDER_10K / B_10K_25K / B_25K_50K / OVER_50K stay, deprecated)
ALTER TYPE "BudgetRange" ADD VALUE 'FLOOR_TO_2X';
ALTER TYPE "BudgetRange" ADD VALUE 'X2_TO_5X';
ALTER TYPE "BudgetRange" ADD VALUE 'X5_TO_10X';
ALTER TYPE "BudgetRange" ADD VALUE 'OVER_10X';
ALTER TYPE "BudgetRange" ADD VALUE 'UNSURE';

-- AlterTable
ALTER TABLE "contact_submissions" ADD COLUMN     "decisionRole" "DecisionRole",
ADD COLUMN     "landingPath" TEXT,
ADD COLUMN     "qualifiedAt" TIMESTAMP(3),
ADD COLUMN     "situation" "ProjectSituation",
ADD COLUMN     "stepTokenExpiresAt" TIMESTAMP(3),
ADD COLUMN     "stepTokenHash" TEXT;

-- AlterTable
ALTER TABLE "meetings" ADD COLUMN     "preCallBrief" JSONB,
ADD COLUMN     "preCallBriefAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "transparency_leads" ADD COLUMN     "landingPath" TEXT;

-- AlterTable
ALTER TABLE "clients" ADD COLUMN     "lostNote" TEXT,
ADD COLUMN     "lostReason" "LostReason",
ADD COLUMN     "nextActionAt" TIMESTAMP(3),
ADD COLUMN     "nextActionNote" TEXT,
ADD COLUMN     "ownerId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "contact_submissions_stepTokenHash_key" ON "contact_submissions"("stepTokenHash");

-- CreateIndex
CREATE INDEX "clients_ownerId_idx" ON "clients"("ownerId");

-- CreateIndex
CREATE INDEX "clients_nextActionAt_idx" ON "clients"("nextActionAt");

-- AddForeignKey
ALTER TABLE "clients" ADD CONSTRAINT "clients_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
