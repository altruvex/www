# CLAUDE.md

## What this is

Altruvex's monorepo: a bilingual (EN/AR) marketing site plus an internal admin/ERP app for a web
engineering studio. Turborepo + Bun workspaces, two Next.js 16 (App Router) apps, a shared Prisma
database package, and a shared pricing schema that is the single source of truth for every
price either app publishes.

## Commands

Package manager is **Bun** (`packageManager: bun@1.3.11`). Root scripts fan out through Turborepo
to all workspaces; scope to one app with `--filter`.

```bash
bun install                       # install all workspaces
bun run dev                       # turbo run dev (all apps, persistent)
bun run build                     # turbo run build
bun run lint                      # turbo run lint (eslint)
bun run check-types               # turbo run check-types (tsc --noEmit) — admin, pricing-schema, ui only
bun run format                    # prettier --write "**/*.{ts,tsx,md}"
bun run validate                  # price-literal guard + parity report + billing-cycle checks

turbo run dev --filter=www        # just the marketing site  (port 3010)
turbo run dev --filter=admin      # just the admin app       (port 3011)
```

`apps/www` has no `check-types` script, so the root `check-types` does not type-check it; `next build`
does. Both apps lint with plain `eslint` (`bun run lint`) — `next lint` no longer exists in Next 16.

`apps/www` extras:
```bash
bun run knip                      # unused-code/export check (see apps/www/knip.json for exceptions)
bun run analyze                   # ANALYZE=true next build, opens bundle analyzer
```

No unit-test runner is configured in either app. Correctness is pinned instead by verification
scripts under `apps/admin/scripts`, run from `apps/admin`:

```bash
bun run verify:security       # redirect allowlist, URL schemes, admin gate, sign window, MFA switch — needs no database
bun run verify:lifecycle      # pure date/state-machine logic — needs no database
bun run verify:services       # service renewals, alert keys, deck + contract output — needs no database
bun run verify:change-requests # change-request transitions, billing, warranty, closure — needs no database
bun run verify:engineering    # ingest endpoints end-to-end   — needs DATABASE_URL
bun run verify:admin-api      # audit trail, tokens, subscriptions, tasks — needs DATABASE_URL
bun run verify:maintenance    # portal/admin allowance agreement — needs DATABASE_URL
bun run verify:delete         # delete registry: plans and protections — needs DATABASE_URL
bun run verify:github         # GitHub webhook translation — needs no database
bun run verify:slack          # Slack curation, escaping and delivery — needs no database
bun run verify:whatsapp       # WhatsApp webhook signature check — needs no database
bun run verify:email          # mail transport selection and addresses — needs no database
bun run check-types           # tsc --noEmit
```

`verify:delete` runs read-only by default. `DELETE_FIXTURES=1 bun run verify:delete` adds the
cascade case, which creates a client → proposal → contract → project → payment chain and deletes
it again.

The database-backed ones write and then remove their own records — point them at a scratch
database, not production.

Database (`packages/database`, Prisma, Postgres), from that directory: `bun run generate`
(also on postinstall), `db:push`, `db:migrate` (migrate dev + generate), `studio`, `build`
(tsc → `dist/`, which is what `@repo/database` exports).
After editing `packages/database/prisma/schema.prisma`, run `generate` (and `build` if another
workspace needs the compiled `dist/` output) before consumers will pick up the new types.

## Layout

- `apps/www` — public marketing site, `next-intl` (`en` default, no prefix; `ar`), MDX articles.
  Copy lives in `messages/{en,ar}/<namespace>.json`; add keys to BOTH locales, and register a new
  namespace in `NAMESPACES` (`i18n/request.ts`). RTL is first-class: verify both locales.
- `apps/admin` — internal ERP/CRM, English-only, `better-auth`, roles `ADMIN`/`SUPERADMIN`.
- `packages/database` (`@repo/database`) — the one Prisma schema + client + cross-app helpers.
- `packages/pricing-schema` (`@repo/pricing-schema`) — **the only place a price exists.**
- `packages/ui` (`@repo/ui`) — shared UI primitives and tokens used by both apps.

## Binding rules

Full wording and the reasoning behind each: `docs/claude/architecture.md` and
`.claude/rules/admin-app.md` (loads automatically for `apps/admin/**`).

**Pricing**
- **Never write a price literal outside `packages/pricing-schema`.** `scripts/validate-pricing-literals.mjs`
  runs in `bun run validate` and fails the build on one. Fix the schema, do not group the digits
  differently to slip past the check.
- `internalHourEquivalent` (margin) never reaches `apps/www`, the client portal, proposals or
  contracts; the guard allowlists exactly four admin pricing files.
- Editing a price is an admin action (DB override `override ?? default`), not a deploy.
- `computeAddonPrice` throws on `costBasis: null`; never default a cost to zero.
- Run `bun run validate` before pushing anything that touches pricing.

**Admin app**
- New admin API routes use `withAdmin` (`lib/with-admin.ts`); new env vars go in `lib/env.ts`
  (zod) and `turbo.json`, never raw `process.env`. A new token-reached public surface needs its
  prefix in `publicPrefixes` (`proxy.ts`).
- Builds/deployments/logs are written only by CI via `/api/ingest/*` (and the GitHub webhook),
  both through `lib/ingest-writers.ts`; never a UI "Deploy" button, never seeded history.
- Every mutation writes its audit event at the mutation site (`recordActivity`/`recordChange`).
- Every delete goes through `deleteRecords` + the `lib/deletable.ts` registry; deletes are hard,
  the audit snapshot is what survives.
- Derived states stay derived: subscription `PAST_DUE`/`GRACE`/`EXPIRED`, service expiry states,
  warranty. Renewals anchor to the period that ended, never to `now`.
- A manual record claims only what the operator knows (`metadata.manual = true`), never
  transport evidence; a hand-recorded signature still goes through `handleContractSigned`.
- Server actions that refuse return `{ ok, message }` instead of throwing.
- **Honesty rule:** a screen may be empty or marked Planned (`components/os/planned.tsx`), but it
  must never *simulate* working — no success toast over a no-op, no invented rows or counts.
- Integrations never pretend: the WhatsApp webhook and `/api/cron/*` fail closed without their
  secret, email with no transport sends nothing, Slack health reads "unknown"; a notification
  must never break the mutation it describes.

### Security

The posture, and the reasoning behind each decision, is `SECURITY.md` ("Hardening decisions").
The 2026-09-11 audit it came from and its console-only follow-ups are not in the repo.

The four rules most easily undone by accident:

- **Authorization is decided twice.** `proxy.ts` refuses a non-admin, and
  `app/(dashboard)/layout.tsx` decides again from the session. Never let a new
  page-level surface rely on the proxy alone.
- **Client-facing links come from `BETTER_AUTH_URL`** via `lib/public-url.ts`,
  never from the request host. `lib/env.ts` requires it in production.
- **A URL that will be rendered or followed is `httpUrl`** (`lib/http-url.ts`),
  not `z.string().url()` — which accepts `javascript:`.
- **The admin CSP carries a per-request nonce** generated in `proxy.ts`. An
  inline `<script>` without it will not run; pass the nonce through as the root
  layout does for next-themes.

## Design work

All design work on Altruvex's own surfaces runs through the **`altruvex-design-intelligence`**
skill (ADI) on its own — NOT through design-master's generic phases, and never
`client-web-design`. ADI carries Altruvex's own philosophy and its curated database;
other design skills are reference material that ADI filters, never direct inputs. **`design.md` is PAUSED (2026-09-27):** Ali is redesigning every section of the site, so `design.md` describes the previous direction. Do not treat it as a rule; read it only as history. Current direction comes from ADI and Ali's decisions in the session. The live code (`apps/www/app/globals.css`, the `apps/www/messages` copy) shows what ships today. Principles and conflict rulings:
`docs/design-principles.md`, `docs/design-reconciliation-2026-07.md`.

## Reference docs (read on demand)

- `docs/claude/architecture.md` — read before changing the monorepo layout, pricing, the Prisma
  data model, www routing/i18n/SEO/PWA, or admin auth/env/routes/proposals.
- `.claude/rules/admin-app.md` — the full admin domain rules (ingest/GitHub, WhatsApp, email,
  Slack, audit trail, deletes, lifecycles, change requests, manual records); auto-loaded for
  `apps/admin/**`.
- Contracts: `docs/ingest-api.md`, `docs/email.md`, `docs/slack.md`. Security: `SECURITY.md`.
