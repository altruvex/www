-- AlterEnum
ALTER TYPE "PaymentMilestone" ADD VALUE 'SERVICE_RENEWAL';

-- AlterTable
ALTER TABLE "payments" ADD COLUMN     "serviceId" TEXT;

-- AlterTable
ALTER TABLE "client_services" ADD COLUMN     "reminderSentAt" TIMESTAMP(3),
ADD COLUMN     "reminderSentFor" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "payments_serviceId_idx" ON "payments"("serviceId");

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "client_services"("id") ON DELETE SET NULL ON UPDATE CASCADE;

