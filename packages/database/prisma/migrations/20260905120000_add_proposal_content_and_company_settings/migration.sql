-- AlterTable
ALTER TABLE "proposals" ADD COLUMN     "content" JSONB;

-- CreateTable
CREATE TABLE "company_settings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "phone" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "website" TEXT NOT NULL,
    "brandColor" TEXT NOT NULL DEFAULT '0E51AA',
    "brandColorDark" TEXT NOT NULL DEFAULT '3687F2',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "company_settings_pkey" PRIMARY KEY ("id")
);

