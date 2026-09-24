-- CreateEnum
CREATE TYPE "ClientServiceKind" AS ENUM ('DOMAIN', 'HOSTING', 'BUSINESS_EMAIL', 'SSL_CERTIFICATE', 'SOFTWARE_LICENSE', 'OTHER');

-- CreateEnum
CREATE TYPE "ClientServiceStatus" AS ENUM ('PENDING', 'ACTIVE', 'CANCELLED');

-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'RENEWAL_DUE';

-- AlterTable
ALTER TABLE "notifications" ADD COLUMN     "dedupeKey" TEXT;

-- CreateTable
CREATE TABLE "client_services" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "projectId" TEXT,
    "productId" TEXT,
    "proposalId" TEXT,
    "kind" "ClientServiceKind" NOT NULL,
    "name" TEXT NOT NULL,
    "provider" TEXT,
    "reference" TEXT,
    "status" "ClientServiceStatus" NOT NULL DEFAULT 'PENDING',
    "currency" TEXT NOT NULL DEFAULT 'EGP',
    "price" INTEGER NOT NULL,
    "cost" INTEGER,
    "termMonths" INTEGER NOT NULL DEFAULT 12,
    "firstTermIncluded" BOOLEAN NOT NULL DEFAULT false,
    "autoRenew" BOOLEAN NOT NULL DEFAULT false,
    "startedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "lastRenewedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "client_services_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "client_services_clientId_idx" ON "client_services"("clientId");

-- CreateIndex
CREATE INDEX "client_services_projectId_idx" ON "client_services"("projectId");

-- CreateIndex
CREATE INDEX "client_services_status_expiresAt_idx" ON "client_services"("status", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "notifications_userId_dedupeKey_key" ON "notifications"("userId", "dedupeKey");

-- AddForeignKey
ALTER TABLE "client_services" ADD CONSTRAINT "client_services_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_services" ADD CONSTRAINT "client_services_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_services" ADD CONSTRAINT "client_services_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_services" ADD CONSTRAINT "client_services_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "proposals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

