-- CreateEnum
CREATE TYPE "MaintenanceSubscriptionStatus" AS ENUM ('ACTIVE', 'PAUSED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "MaintenanceRequestStatus" AS ENUM ('SUBMITTED', 'IN_PROGRESS', 'COMPLETED', 'DECLINED');

-- CreateTable
CREATE TABLE "maintenance_subscriptions" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "status" "MaintenanceSubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "portalToken" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "maintenance_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "maintenance_requests" (
    "id" TEXT NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "detail" TEXT,
    "status" "MaintenanceRequestStatus" NOT NULL DEFAULT 'SUBMITTED',
    "cycleStart" TIMESTAMP(3) NOT NULL,
    "countsToCap" BOOLEAN NOT NULL DEFAULT true,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "maintenance_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "maintenance_subscriptions_portalToken_key" ON "maintenance_subscriptions"("portalToken");

-- CreateIndex
CREATE INDEX "maintenance_subscriptions_clientId_idx" ON "maintenance_subscriptions"("clientId");

-- CreateIndex
CREATE INDEX "maintenance_subscriptions_status_idx" ON "maintenance_subscriptions"("status");

-- CreateIndex
CREATE INDEX "maintenance_requests_subscriptionId_cycleStart_idx" ON "maintenance_requests"("subscriptionId", "cycleStart");

-- CreateIndex
CREATE INDEX "maintenance_requests_status_idx" ON "maintenance_requests"("status");

-- AddForeignKey
ALTER TABLE "maintenance_subscriptions" ADD CONSTRAINT "maintenance_subscriptions_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_requests" ADD CONSTRAINT "maintenance_requests_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "maintenance_subscriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

