-- Realign the transparency_leads primary key constraint name with its table.
--
-- `20260427050000_rename_estimator_leads` renamed the table and both of its
-- indexes, but a table rename in Postgres does not rename the constraints on
-- it — so the primary key stayed `estimator_leads_pkey` while the schema
-- implies `transparency_leads_pkey`. Every database built from this history
-- carries the mismatch, which is why `prisma migrate dev` reports
-- "Renamed the primary key on columns (id)" as drift and offers to reset.
--
-- Renaming a constraint rewrites no rows and drops no index: the primary key
-- and its backing index are untouched, only the label changes.
--
-- Guarded so it is a no-op where the name is already correct (a database
-- created by `db push` rather than replayed from these migrations).
DO $$
DECLARE
  pk_name text;
BEGIN
  SELECT conname
    INTO pk_name
    FROM pg_constraint
   WHERE conrelid = '"transparency_leads"'::regclass
     AND contype = 'p';

  IF pk_name IS NOT NULL AND pk_name <> 'transparency_leads_pkey' THEN
    EXECUTE format(
      'ALTER TABLE "transparency_leads" RENAME CONSTRAINT %I TO %I',
      pk_name,
      'transparency_leads_pkey'
    );
  END IF;
END
$$;
