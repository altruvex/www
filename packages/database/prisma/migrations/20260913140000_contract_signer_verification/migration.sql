-- Signer verification: a sign link no longer accepts a signature from whoever
-- holds it. The designated signer receives a one-time code by WhatsApp or email
-- and must enter it; only the code's SHA-256 is stored.

-- CreateEnum
CREATE TYPE "SignVerificationChannel" AS ENUM ('WHATSAPP', 'EMAIL');

-- AlterTable
ALTER TABLE "contracts" ADD COLUMN     "signerName" TEXT,
ADD COLUMN     "signerPhone" TEXT,
ADD COLUMN     "signerEmail" TEXT,
ADD COLUMN     "signCodeHash" TEXT,
ADD COLUMN     "signCodeExpiresAt" TIMESTAMP(3),
ADD COLUMN     "signCodeSentAt" TIMESTAMP(3),
ADD COLUMN     "signCodeAttempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "signCodeChannel" "SignVerificationChannel",
ADD COLUMN     "signerVerifiedVia" "SignVerificationChannel",
ADD COLUMN     "signerVerifiedTo" TEXT;
