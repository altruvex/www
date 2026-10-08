-- Website conversion intelligence, part 2 (2026-10-08). A contact enquiry for the
-- Technical Audit or for maintenance was stored as OTHER, so admin could not tell
-- them apart. Additive only: existing OTHER rows are left as they are (their real
-- service is unknown). No statement here uses the new values, so ADD VALUE is safe
-- inside the transaction (PG 12+).

-- AlterEnum
ALTER TYPE "ServiceType" ADD VALUE IF NOT EXISTS 'TECHNICAL_AUDIT' BEFORE 'OTHER';

-- AlterEnum
ALTER TYPE "ServiceType" ADD VALUE IF NOT EXISTS 'MAINTENANCE' BEFORE 'OTHER';
