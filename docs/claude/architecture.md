# Architecture detail — layout, pricing, data model, both apps, design

> Moved from CLAUDE.md on 2026-09-27 to cut per-session tokens, and checked against the repo that
> day. Admin domain rules are in `.claude/rules/admin-app.md`.

## Architecture

### Monorepo layout

- `apps/www` — the public marketing site (`altruvex.com`). Bilingual EN/AR via `next-intl`, MDX
  articles, case studies, contact/schedule/estimator forms, transparency reporting.
- `apps/admin` — internal ERP/CRM: client pipeline, meetings, proposal generation, WhatsApp
  integration, auth-gated by `better-auth`.
- `packages/database` (`@repo/database`) — single Prisma schema + client shared by both apps.
  Exports the singleton `prisma` client, all generated Prisma types/enums, and cross-app domain
  helpers (e.g. `linkClientToLead`, `normalizePhone`).
- `packages/pricing-schema` (`@repo/pricing-schema`) — **the only place a price exists.** Services,
  complexity bands, maintenance plans, consulting packages and add-ons, with EN/AR copy,
  the estimate engine (`calculateEstimate`, `estimateSpan`), and the view models every surface
  renders from. Identity is two independent axes: `ServiceId` (what is built) x `ComplexityId`
  (how much scope) resolves to a price cell. There are no named tiers or packages (removed
  2026-09-30); a build is published as "from" its floor, and scope notes (`SCOPE_NOTE_IDS`) are
  recorded on a lead without moving the figure.
- `packages/ui` (`@repo/ui`) — shared UI primitives, tokens and the "Liquid Glass" language,
  consumed by both apps (see `packages/ui/README.md`).
- `packages/typescript-config` — the shared tsconfig base (`base.json`), extended by the packages.

Both apps depend on `@repo/database`, `@repo/pricing-schema` and `@repo/ui` via `workspace:*`.
Turbo's `build`/`lint`/`check-types` tasks all `dependsOn: ["^build"|"^lint"|"^check-types"]`, so
shared packages build before the apps that consume them.

### Pricing (single source of truth)

Every published price — cards, the estimator, maintenance and consulting pages, JSON-LD offers,
proposals and contracts — resolves from `@repo/pricing-schema`. Before this existed there were four
independent pricing authorities, and `/pricing` contradicted its own estimator by up to 59%.

Rules that hold across the repo:

- **Never write a price literal outside `packages/pricing-schema`.** `scripts/validate-pricing-literals.mjs`
  runs in `bun run validate` and fails the build on one. Fix the schema, do not group the digits
  differently to slip past the check.
- **Internal margin data never leaves the schema or the admin app.** `internalHourEquivalent` exists
  for margin planning; the guard allowlists exactly four `apps/admin` files, and a read from
  `apps/www` (or from admin's own client portal) fails the build. It must not reach client-facing
  copy, proposals, or contracts.
- **Editing a price is an admin action, not a deploy.** Overrides live in the database and layer over
  the shipped defaults as `override ?? default`, so an empty store or an unreachable database renders
  what the last deploy shipped. `apps/www` resolves them server-side behind a cache tag;
  `POST /api/revalidate-pricing` (authenticated, fails closed) drops that tag so a change lands
  immediately rather than on the 5-minute TTL.
- **Add-ons refuse to price without a cost basis.** `costBasis: null` is deliberate for anything with
  no recorded supplier figure; `computeAddonPrice` throws rather than defaulting to zero.

`bun run validate` = price-literal guard + parity report + billing-cycle checks. Run it before
pushing anything that touches pricing.

### Data model (`packages/database/prisma/schema.prisma`)

Single Postgres schema shared by both apps. Key models: `User`/`Session`/`Account`/`Verification`
(better-auth tables, role-gated via `UserRole`: `USER`/`ADMIN`/`SUPERADMIN`), `ContactSubmission`
(marketing-site contact form leads, with `SubmissionStatus`/`Priority`/`ServiceType`/
`ProjectTimeline`/`BudgetRange` enums), `Meeting`, `ContactNote`, and a `Client` pipeline model
(unified CRM record that inbound leads from different channels — contact form, transparency page,
WhatsApp — get linked into via phone-number matching; see `linkClientToLead` in
`packages/database/index.ts`). Schema changes go through Prisma migrations in
`packages/database/prisma/migrations/`.

Engineering-operations models: `Product` (a site or app Altruvex *operates* — distinct from
`Project`, which is the engagement that built it and has an end date), `Build`, `Deployment`,
`LogEntry`, `Incident`/`IncidentUpdate`, plus `ProjectTask` for delivery work and `ActivityEvent`
for the audit trail. `MaintenanceSubscription` carries the billing lifecycle
(`billingInterval`, `currentPeriodStart`/`End`, `autoRenew`, `trialEndsAt`, `lastRenewedAt`).

### apps/www (marketing site)

- **Routing/i18n**: App Router with `app/[locale]/...` segments. `i18n/routing.ts` defines locales
  (`en` default, `ar`) via `next-intl`'s `defineRouting` with `localePrefix: "as-needed"` (so `en`
  has no `/en` prefix). `proxy.ts` (the Next.js middleware) wraps everything in
  `next-intl`'s `createMiddleware`. Route groups: `(main)/(marketing)` for public pages
  (about, approach, contact, faq, how-we-work, pricing, process, services, standards,
  transparency, work), `(main)/(content)/writing` for MDX articles, `(main)/(legal)` for
  privacy/terms, `(main)/(utility)/offline` for PWA offline fallback.
- **Translations**: all UI copy is split per namespace as `messages/{en,ar}/<namespace>.json` —
  when adding user-facing text, add keys to both locales, not literal strings in components. A new
  namespace must also be added to `NAMESPACES` in `i18n/request.ts`, which imports each file by name.
- **Content**: MDX articles live under `contents/articles/{en,ar}/`, loaded via
  `next-mdx-remote` + `gray-matter` frontmatter.
- **SEO**: `lib/metadata.ts` centralizes `SITE_CONFIG`/`PAGE_METADATA` and locale-aware URL/SEO
  helpers; `lib/schema.ts` builds JSON-LD structured data (Organization, LocalBusiness, Service,
  FAQ, HowTo, Pricing, Breadcrumb schemas) from that shared metadata — keep new pages wired into
  both rather than hand-rolling metadata per route.
- **UI**: shadcn/ui (`new-york` style, Tailwind v4, `components.json`) under `components/ui`, plus
  `components/{base,interactive,layout,legal,mdx,providers,sections,seo,shared}` and
  `components/layout-effects.tsx`. Animation stack is GSAP (`gsap`, `lib/motion/`, rules in
  `MOTION.md`) + Lenis smooth scroll.
- **PWA**: `@ducanh2912/next-pwa`, with an offline route.
- Quality check specific to this app: `knip` (dead-code/export detection — see `knip.json` for
  intentionally-ignored paths like `components/ui/**`).

### apps/admin (internal ERP)

- **Auth**: `better-auth` (`lib/auth.ts`/`lib/auth-client.ts`), session-cookie based. `proxy.ts`
  (middleware) gates every route behind an `ADMIN`/`SUPERADMIN` role check on the `better-auth`
  session, except what `publicPaths` + `publicPrefixes` in `apps/admin/proxy.ts` exempt: `/login`,
  `/offline`, and the prefixes `/api/auth/`, `/sign/`, `/quote/`, `/portal/`, `/client-portal/`
  (each with its `/api/` twin), `/api/ingest/`, `/api/cron/`, plus `/api/whatsapp/webhook` (which
  authenticates itself via `X-Hub-Signature-256`, not the session cookie).
- **Env validation**: `lib/env.ts` parses `process.env` with a `zod` schema at import time; add new
  required env vars there (and to `turbo.json`'s `build.env` allowlist) rather than reading
  `process.env` directly in app code. `turbo.json` also mirrors that list in
  `globalPassThroughEnv`: these are runtime-only secrets that change nothing a build produces, so
  they are made visible to every task without becoming cache keys — the alternative, declaring
  admin secrets as inputs to `@repo/database#build`, would claim that rotating a WhatsApp token
  changes the output of `tsc`. The schema hard-fails in production *at runtime only* —
  `next build` is exempt, because runtime-only secrets are not present in a build environment.
  `PUBLIC_SITE_URL` and `PRICING_REVALIDATE_SECRET` are optional: without them a price change
  still saves and still reaches the public site, just on its cache timer instead of immediately.
- **Domain routes**: `app/(dashboard)/clients/[id]` (client detail + `new-proposal` flow),
  `app/(dashboard)/meetings`, `app/(dashboard)/pricing` (the only place a price is edited),
  `app/(dashboard)/maintenance` (retainers, renewals, allowance usage, client requests), and the
  engineering group `app/(dashboard)/{products,deployments,logs,incidents}`; API routes under
  `app/api/admin/{clients,meetings,proposals,pricing,maintenance,products,tasks,incidents}`,
  `app/api/ingest/*` and `app/api/whatsapp/webhook`. New admin routes should use `withAdmin`
  (`lib/with-admin.ts`) rather than re-implementing the session guard — it makes forgetting the
  check structurally impossible.
- **Client portal**: `app/client-portal/[token]` and `app/api/client-portal/*` are *not* admin
  routes — they are reached by clients with a single-purpose token and are exempted in `proxy.ts`'s
  `publicPrefixes`. Forget that exemption and every client is redirected to a login they cannot
  pass. Both endpoints are rate limited (reads per IP, writes per IP *and* per token).
- **Proposals**: `lib/proposal-builder.ts` + `lib/proposal-content.ts` generate client proposals as
  `.pptx` (via `pptxgenjs`); `lib/pptx-to-pdf.ts` converts to PDF. Pricing figures come from
  `@repo/pricing-schema` — document wording is deliberately pinned there (service and band labels
  keep separate document spellings) because changing it would alter signed agreements.
- **Integrations**: WhatsApp Business API (`lib/whatsapp-api.ts`, webhook handler) for
  lead/notification flow; any S3-compatible bucket — Cloudflare R2 today — (`@aws-sdk/client-s3`, `lib/storage.ts`, `STORAGE_*` env) for file storage.
- **UI**: same shadcn/ui + Tailwind v4 stack as `www`, no i18n (admin is English-only).

### Design system & brand

- [PAUSED 2026-09-27 — site redesign in progress; history only] `design.md` (repo root) was the canonical brand/design-token reference (voice, color, type) —
  it explicitly states its source of truth is the live code (`apps/www/app/globals.css` for
  colors/type, `apps/www/messages/{en,ar}/<namespace>.json` for voice), not the other way around. Update the
  code first, then this doc.
- `docs/design-principles.md` is the "law layer" of perception/typography/color rules (cited
  elsewhere as T1, C8, CI1, M2, …); `docs/design-reconciliation-2026-07.md` adjudicates conflicts
  between `design.md` tokens and those principles. `docs/design-audit-2026.md` is a point-in-time
  audit, not living documentation.
- Brand voice is precise/technical/unhedged with a signature "X — not Y" contrast idiom (see
  `design.md` §1) — keep this in mind when writing any user-facing copy (marketing pages, error
  states, proposal content).
- RTL (Arabic) is treated as a first-class layout direction, not a mirrored LTR template — when
  touching `apps/www` layout/spacing, verify both locales.

## Commands detail (moved from CLAUDE.md's Commands section)

```bash
bun run check-types                # turbo run check-types (tsc --noEmit)
```
That covers `apps/admin`, `packages/pricing-schema` and `packages/ui` only — `apps/www` has no
`check-types` script.

Per-app (run from `apps/www` or `apps/admin`):

```bash
next dev --port 3010|3011         # dev server (`bun dev` from the app dir also works)
next build                        # production build
eslint                            # lint (`bun run lint`; `next lint` was removed in Next 16)
```

### Database (`packages/database`, Prisma, Postgres)

```bash
cd packages/database
bun run generate                  # prisma generate (also runs on postinstall)
bun run db:push                   # prisma db push (dev schema sync, no migration)
bun run db:migrate                # prisma migrate dev && prisma generate
bun run studio                    # prisma studio
bun run build                     # tsc -> dist/ (this is what @repo/database's package.json points at)
```

Also present: `db:deploy`, `db:deploy:prod`, `studio:prod`, `backfill:clients`.
