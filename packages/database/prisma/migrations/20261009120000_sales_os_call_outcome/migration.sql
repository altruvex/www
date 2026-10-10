-- Sales OS (2026-10-09, docs/sales-os.md R7/R8). Additive and nullable only:
-- a call outcome recorded by a person after the call, and a reason for parking a
-- lead in NURTURE (its review date stays Client.nextActionAt).

-- CreateEnum
CREATE TYPE "CallOutcome" AS ENUM ('PROPOSAL_REQUIRED', 'FOLLOW_UP', 'NURTURE', 'LOST', 'NO_FURTHER_ACTION');

-- AlterTable
ALTER TABLE "meetings" ADD COLUMN "outcome" "CallOutcome",
ADD COLUMN "outcomeAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "clients" ADD COLUMN "nurtureReason" "LostReason";
