-- AlterEnum
ALTER TYPE "PaymentMilestone" ADD VALUE 'RETAINER_RENEWAL';

-- AlterTable
ALTER TABLE "payments" ADD COLUMN     "subscriptionId" TEXT,
ALTER COLUMN "projectId" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "payments_subscriptionId_idx" ON "payments"("subscriptionId");

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "maintenance_subscriptions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

