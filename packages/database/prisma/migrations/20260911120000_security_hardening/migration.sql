-- Security hardening (SECURITY_AUDIT.md, 2026-09-11).
--
--   users.passwordHash      dropped (LOW-12). Better Auth stores the credential
--                           hash in accounts.password; this column was written by
--                           the seed script only and read by nothing.
--   users.twoFactorEnabled  + two_factors     Better Auth two-factor plugin (MED-08).
--   auth_rate_limits        Better Auth rate limiter in the database, so every
--                           serverless instance shares one counter (MED-07).
--   contracts.signTokenExpiresAt              sign links expire (MED-03).
--   webhook_deliveries      replay protection for signed webhooks (LOW-06).

-- AlterTable
ALTER TABLE "users" DROP COLUMN "passwordHash",
ADD COLUMN     "twoFactorEnabled" BOOLEAN DEFAULT false;

-- AlterTable
ALTER TABLE "contracts" ADD COLUMN     "signTokenExpiresAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "two_factors" (
    "id" TEXT NOT NULL,
    "secret" TEXT NOT NULL,
    "backupCodes" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "verified" BOOLEAN DEFAULT true,
    "failedVerificationCount" INTEGER DEFAULT 0,
    "lockedUntil" TIMESTAMP(3),

    CONSTRAINT "two_factors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth_rate_limits" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "count" INTEGER NOT NULL,
    "lastRequest" BIGINT NOT NULL,

    CONSTRAINT "auth_rate_limits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "webhook_deliveries" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "deliveryId" TEXT NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "webhook_deliveries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "two_factors_secret_idx" ON "two_factors"("secret");

-- CreateIndex
CREATE INDEX "two_factors_userId_idx" ON "two_factors"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "auth_rate_limits_key_key" ON "auth_rate_limits"("key");

-- CreateIndex
CREATE INDEX "webhook_deliveries_receivedAt_idx" ON "webhook_deliveries"("receivedAt");

-- CreateIndex
CREATE UNIQUE INDEX "webhook_deliveries_provider_deliveryId_key" ON "webhook_deliveries"("provider", "deliveryId");

-- AddForeignKey
ALTER TABLE "two_factors" ADD CONSTRAINT "two_factors_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Backfill: every contract that can still be signed gets 30 days from the
-- moment this migration runs, rather than an expiry in the past that would
-- silently kill links already sent to clients.
UPDATE "contracts"
SET "signTokenExpiresAt" = NOW() + INTERVAL '30 days'
WHERE "signToken" IS NOT NULL
  AND "status" IN ('DRAFT', 'SENT');
