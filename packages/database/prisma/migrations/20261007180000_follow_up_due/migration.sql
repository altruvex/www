-- Lead follow-up sweep (2026-10-07). Additive only: one enum value for the
-- in-app alert the sweep writes. Not used by any statement here, so ADD VALUE
-- is safe inside the migration transaction (PG 12+).

-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'FOLLOW_UP_DUE';
