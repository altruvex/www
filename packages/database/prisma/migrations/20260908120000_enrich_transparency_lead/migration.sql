-- Enrich transparency leads so a lead carries the context that produced it.
--
-- The estimator collects five answers; only three were stored. The two that
-- were dropped (brand identity, content readiness) are precisely the ones that
-- say how much groundwork a deal needs before engineering starts. Attribution
-- (locale, referrer, UTM) was collected nowhere at all, though the contact-form
-- table has carried it since it was created.

ALTER TABLE "transparency_leads"
  ADD COLUMN "reference"         TEXT,
  ADD COLUMN "email"             TEXT,
  ADD COLUMN "company"           TEXT,
  ADD COLUMN "brandIdentity"     TEXT,
  ADD COLUMN "contentReadiness"  TEXT,
  ADD COLUMN "locale"            TEXT NOT NULL DEFAULT 'en',
  ADD COLUMN "referrer"          TEXT,
  ADD COLUMN "utmSource"         TEXT,
  ADD COLUMN "utmMedium"         TEXT,
  ADD COLUMN "utmCampaign"       TEXT;

-- Existing rows predate the reference code, so they are given one derived from
-- their id. This runs before the NOT NULL/UNIQUE constraints so the table is
-- never in a state that would reject them.
UPDATE "transparency_leads"
   SET "reference" = 'AX-' || UPPER(SUBSTRING(REPLACE("id"::text, '-', '') FROM 1 FOR 8))
 WHERE "reference" IS NULL;

ALTER TABLE "transparency_leads"
  ALTER COLUMN "reference" SET NOT NULL;

CREATE UNIQUE INDEX "transparency_leads_reference_key"
  ON "transparency_leads"("reference");
