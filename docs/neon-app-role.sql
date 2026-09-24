-- ============================================================================
-- Altruvex — least-privilege application role for Neon Postgres
--
-- Why: the application currently connects as `neondb_owner`, which owns the
-- database. Every query it runs carries the right to DROP a table, read
-- `accounts.password`, or ALTER a role. A single injection, a leaked
-- connection string, or a remote-code-execution bug in the framework is then
-- total loss rather than bounded loss. This creates a role that can read and
-- write rows and do nothing else.
--
-- Corresponds to HIGH-03 in SECURITY_AUDIT.md and item 1 in SECURITY_TODO.md.
--
-- WHERE TO RUN
--   Neon console → your project → SQL Editor, with the PRODUCTION branch
--   selected and `neondb_owner` as the role. Run it once, top to bottom.
--   Nothing here drops or alters existing data; the only destructive verb is
--   REVOKE, and every REVOKE targets a privilege this application never uses.
--
-- BEFORE YOU START
--   1. Replace PUT_A_LONG_RANDOM_PASSWORD_HERE below. Generate it locally:
--          openssl rand -base64 32
--   2. Save that password in your password manager first. A role created in
--      SQL is not managed by the Neon console, so Neon cannot show it to you
--      again — only reset it (see "Rotating", at the bottom).
--   3. If your database is not named `neondb`, change it in the GRANT CONNECT
--      line. `SELECT current_database();` will tell you.
-- ============================================================================


-- ── 1. The role ─────────────────────────────────────────────────────────────
-- LOGIN so it can connect; nothing else. No superuser, no ability to create
-- databases or further roles, no inherited rights from other roles.

-- Written as a DO block so the whole file can be run twice without error, and
-- so it also works if you created `altruvex_app` in the Neon console first —
-- on some Neon projects `neondb_owner` is not allowed to create roles, and the
-- console is then the way in. If this step fails with "permission denied to
-- create role", create the role in the console (Project → Roles → New role)
-- and run the file again; everything below it will still apply.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'altruvex_app') THEN
    RAISE NOTICE 'Role altruvex_app already exists — leaving its password alone.';
  ELSE
    CREATE ROLE altruvex_app
      WITH LOGIN
           PASSWORD 'PUT_A_LONG_RANDOM_PASSWORD_HERE'
           NOSUPERUSER
           NOCREATEDB
           NOCREATEROLE
           NOBYPASSRLS;
  END IF;
END
$$;


-- ── 2. Reaching the database and the schema ─────────────────────────────────
-- USAGE lets the role see objects inside `public`. CREATE is deliberately not
-- granted: the application never creates a table, and migrations run as the
-- owner through DIRECT_DATABASE_URL.

GRANT CONNECT ON DATABASE neondb TO altruvex_app;
GRANT USAGE   ON SCHEMA   public TO altruvex_app;


-- ── 3. Rows, and only rows ──────────────────────────────────────────────────
-- The four verbs Prisma Client actually issues, across the 40 tables that
-- exist today. TRUNCATE, REFERENCES and TRIGGER are not among them, so they
-- are never granted rather than granted and taken back.

GRANT SELECT, INSERT, UPDATE, DELETE
  ON ALL TABLES IN SCHEMA public
  TO altruvex_app;

-- No column in this schema uses a sequence today (every id is a uuid), so this
-- grants nothing at present. It is here so that the day someone adds an
-- autoincrementing column, inserts do not start failing in production with a
-- permission error on a sequence nobody thought about.
GRANT USAGE, SELECT
  ON ALL SEQUENCES IN SCHEMA public
  TO altruvex_app;


-- ── 4. Tables that do not exist yet ─────────────────────────────────────────
-- ALL TABLES above is a snapshot: it covers what is there right now. The next
-- migration creates tables this role cannot touch unless default privileges
-- are set. They attach to the creating role, which is why this names
-- `neondb_owner` — the role `prisma migrate deploy` connects as. If migrations
-- ever run as a different role, repeat this block for that role too.

ALTER DEFAULT PRIVILEGES FOR ROLE neondb_owner IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO altruvex_app;

ALTER DEFAULT PRIVILEGES FOR ROLE neondb_owner IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO altruvex_app;


-- ── 5. Two things the application must not be able to do ────────────────────

-- 5a. The audit trail is append-only.
--     `/audit` is what survives a hard delete: the row's fields are snapshotted
--     into activity_events before the record is removed. Nothing in the
--     application deletes an event — the only DELETEs are in the verify
--     scripts, which run against a scratch database as the owner. Enforcing it
--     here means a bug, or someone with the application's credentials, cannot
--     erase the record of what they did.
--
--     UPDATE stays granted: deleting a User sets `activity_events.actorId` to
--     NULL through the foreign key, which is an UPDATE, and the event is meant
--     to outlive the account.
DO $$
BEGIN
  IF to_regclass('public.activity_events') IS NOT NULL THEN
    REVOKE DELETE ON activity_events FROM altruvex_app;
  ELSE
    RAISE NOTICE 'No activity_events table on this branch — skipped.';
  END IF;
END
$$;

-- 5b. Migration history is written by migrations, not by the app.
DO $$
BEGIN
  IF to_regclass('public._prisma_migrations') IS NOT NULL THEN
    REVOKE INSERT, UPDATE, DELETE ON _prisma_migrations FROM altruvex_app;
  ELSE
    RAISE NOTICE 'No _prisma_migrations table yet — skipped; re-run after the first migrate deploy.';
  END IF;
END
$$;


-- ── 6. Close the default door on the schema ─────────────────────────────────
-- Postgres 15 and later already remove CREATE on `public` from PUBLIC. This is
-- a no-op on a modern Neon project and a real fix on an older one; either way
-- it states the intention rather than assuming the default.

REVOKE CREATE ON SCHEMA public FROM PUBLIC;


-- ============================================================================
-- VERIFY — run these after the block above. Each says what you should see.
-- ============================================================================

-- 1. The role exists and is not privileged.
--    Expect: rolsuper = f, rolcreatedb = f, rolcreaterole = f, rolcanlogin = t
SELECT rolname, rolsuper, rolcreatedb, rolcreaterole, rolcanlogin
FROM pg_roles
WHERE rolname = 'altruvex_app';

-- 2. It can read and write ordinary business tables.
--    Expect: t, t, t, t
SELECT has_table_privilege('altruvex_app', 'clients', 'SELECT') AS can_read,
       has_table_privilege('altruvex_app', 'clients', 'INSERT') AS can_insert,
       has_table_privilege('altruvex_app', 'clients', 'UPDATE') AS can_update,
       has_table_privilege('altruvex_app', 'clients', 'DELETE') AS can_delete;

-- 3. The audit trail accepts writes but refuses erasure.
--    Expect: can_write = t, can_delete = f
SELECT has_table_privilege('altruvex_app', 'activity_events', 'INSERT') AS can_write,
       has_table_privilege('altruvex_app', 'activity_events', 'DELETE') AS can_delete;

-- 4. It cannot create objects or truncate tables.
--    Expect: can_create_in_schema = f, can_truncate = f
SELECT has_schema_privilege('altruvex_app', 'public', 'CREATE') AS can_create_in_schema,
       has_table_privilege('altruvex_app', 'clients', 'TRUNCATE') AS can_truncate;

-- 5. Nothing was missed across the 40 tables.
--    Expect: zero rows. Any row here is a table the application cannot read.
SELECT c.relname AS table_without_select
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relkind = 'r'
  AND NOT has_table_privilege('altruvex_app', c.oid, 'SELECT')
ORDER BY 1;

-- 6. The real proof, and it must FAIL. Connect as altruvex_app (psql, or the
--    Neon SQL editor with the role switched) and run:
--
--        CREATE TABLE _probe (id int);
--
--    Expect: ERROR: permission denied for schema public
--    If it succeeds, step 6 above did not take — check who owns the schema.


-- ============================================================================
-- AFTER THIS RUNS
--
-- In Vercel, on BOTH projects (admin and www):
--
--   DATABASE_URL         the POOLED host, as altruvex_app:
--     postgresql://altruvex_app:PASSWORD@ep-...-pooler.REGION.aws.neon.tech/neondb?sslmode=verify-full&channel_binding=require
--
--   DIRECT_DATABASE_URL  the DIRECT host (no `-pooler`), still as neondb_owner.
--     Only `prisma migrate deploy` uses it; packages/database/prisma.config.ts
--     prefers it and falls back to DATABASE_URL.
--
-- `sslmode=verify-full` is not optional: packages/database/index.ts refuses to
-- connect in production without it, because every weaker value stops verifying
-- the server's certificate once `pg` drops its verify-full aliases.
--
-- Redeploy, then confirm the app still reads and writes — open /clients, then
-- change something small and check /audit recorded it.
--
--
-- ROTATING THE PASSWORD (do this if it ever leaks, no downtime beyond a redeploy)
--
--   ALTER ROLE altruvex_app WITH PASSWORD 'a-new-long-random-password';
--
-- Then update DATABASE_URL in Vercel and redeploy. Existing connections keep
-- working until they are recycled.
--
--
-- REMOVING THE ROLE (only if you decide to go back)
--
--   ALTER DEFAULT PRIVILEGES FOR ROLE neondb_owner IN SCHEMA public
--     REVOKE SELECT, INSERT, UPDATE, DELETE ON TABLES FROM altruvex_app;
--   ALTER DEFAULT PRIVILEGES FOR ROLE neondb_owner IN SCHEMA public
--     REVOKE USAGE, SELECT ON SEQUENCES FROM altruvex_app;
--   REVOKE ALL ON ALL TABLES IN SCHEMA public FROM altruvex_app;
--   REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM altruvex_app;
--   REVOKE ALL ON SCHEMA public FROM altruvex_app;
--   REVOKE ALL ON DATABASE neondb FROM altruvex_app;
--   DROP ROLE altruvex_app;
--
-- Point DATABASE_URL back at neondb_owner before dropping the role, or the
-- application loses its connection.
-- ============================================================================
