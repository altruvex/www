-- AlterTable
ALTER TABLE "clients" ADD COLUMN "status" "SubmissionStatus" NOT NULL DEFAULT 'NEW',
ADD COLUMN "priority" "Priority" NOT NULL DEFAULT 'MEDIUM';

-- CreateIndex
CREATE INDEX "clients_status_idx" ON "clients"("status");

-- CreateIndex
CREATE INDEX "clients_priority_idx" ON "clients"("priority");
