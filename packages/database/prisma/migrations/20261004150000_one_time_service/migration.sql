-- A one-time client service (a theme, a lifetime licence) has no billing term:
-- termMonths NULL means bought once, billed once, never renews, never expires.
-- AlterTable
ALTER TABLE "client_services" ALTER COLUMN "termMonths" DROP NOT NULL;
