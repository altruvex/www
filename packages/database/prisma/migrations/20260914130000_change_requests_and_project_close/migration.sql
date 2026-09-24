-- Change requests and project closure.
--
-- A client with no maintenance retainer can still ask for a one-off change to
-- a delivered project. Until now the only path was a new proposal, contract
-- and project; a change request hangs off the existing project instead, is
-- quoted from the published revision rate, and bills through a Payment row.
--
-- `projects.completedAt` records when an engagement was closed. Existing
-- COMPLETED rows are deliberately NOT backfilled: nobody recorded when they
-- closed, and inventing a date would read as evidence.
-- CreateEnum
CREATE TYPE "ChangeRequestStatus" AS ENUM ('REQUESTED', 'QUOTED', 'APPROVED', 'IN_PROGRESS', 'DELIVERED', 'DECLINED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ChangeRequestPricing" AS ENUM ('HOURLY', 'FIXED', 'WARRANTY');

-- AlterEnum
ALTER TYPE "PaymentMilestone" ADD VALUE 'CHANGE_REQUEST';

-- AlterTable
ALTER TABLE "projects" ADD COLUMN     "completedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "change_requests" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "detail" TEXT,
    "status" "ChangeRequestStatus" NOT NULL DEFAULT 'REQUESTED',
    "pricing" "ChangeRequestPricing",
    "estimatedMinutes" INTEGER,
    "actualMinutes" INTEGER,
    "hourlyRate" INTEGER,
    "quotedAmount" INTEGER,
    "billedAmount" INTEGER,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "quotedAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "paymentId" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "change_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "change_requests_paymentId_key" ON "change_requests"("paymentId");

-- CreateIndex
CREATE INDEX "change_requests_projectId_idx" ON "change_requests"("projectId");

-- CreateIndex
CREATE INDEX "change_requests_status_idx" ON "change_requests"("status");

-- AddForeignKey
ALTER TABLE "change_requests" ADD CONSTRAINT "change_requests_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "change_requests" ADD CONSTRAINT "change_requests_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "payments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

