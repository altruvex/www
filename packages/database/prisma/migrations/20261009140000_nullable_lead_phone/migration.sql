-- Email-only estimate leads (2026-10-09): a lead or client may have no phone.
-- Nullable only; existing indexes stay. An empty string was the old stand-in
-- for "no number" and becomes NULL.

-- AlterTable
ALTER TABLE "transparency_leads" ALTER COLUMN "phone" DROP NOT NULL;

-- AlterTable
ALTER TABLE "clients" ALTER COLUMN "phone" DROP NOT NULL;

UPDATE "transparency_leads" SET "phone" = NULL WHERE "phone" = '';
UPDATE "clients" SET "phone" = NULL WHERE "phone" = '';
