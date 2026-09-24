# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

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
bun run check-types                # turbo run check-types (tsc --noEmit)
bun run format                    # prettier --write "**/*.{ts,tsx,md}"

turbo run dev --filter=www        # just the marketing site  (port 3010)
turbo run dev --filter=admin      # just the admin app       (port 3011)
```

Per-app (run from `apps/www` or `apps/admin`):

```bash
next dev --port 3010|3011         # dev server (`bun dev` from the app dir also works)
next build                        # production build
next lint / eslint                # lint
```

`apps/www` extras:
```bash
bun run knip                      # unused-code/export check (see apps/www/knip.json for exceptions)
bun run analyze                   # ANALYZE=true next build, opens bundle analyzer
bun run sync:transparency-i18n    # bun scripts/update-transparency-json.js
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

### Database (`packages/database`, Prisma, Postgres)

```bash
cd packages/database
bun run generate                  # prisma generate (also runs on postinstall)
bun run db:push                   # prisma db push (dev schema sync, no migration)
bun run db:migrate                # prisma migrate dev (creates a migration)
bun run studio                    # prisma studio
bun run build                     # tsc -> dist/ (this is what @repo/database's package.json points at)
```

After editing `packages/database/prisma/schema.prisma`, run `generate` (and `build` if another
workspace needs the compiled `dist/` output) before consumers will pick up the new types.

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
  complexity bands, tiers, maintenance plans, consulting packages and add-ons, with EN/AR copy,
  the estimate engine (`calculateEstimate`), and the view models every surface renders from.
  Identity is two independent axes: `ServiceId` (what is built) x `ComplexityId` (how much scope)
  resolves to a price cell; `TierId` only *names* a cell and chooses how to present it — a tier
  owns no price of its own.
- `packages/eslint-config`, `packages/typescript-config` — shared lint/tsconfig bases
  (`base`, `next-js`/`nextjs`, `react-internal`/`react-library`), consumed via workspace deps.

Both apps depend on `@repo/database` and `@repo/pricing-schema` via `workspace:*`. Turbo's `build`/`lint`/
`check-types` tasks all `dependsOn: ["^build"|"^lint"|"^check-types"]`, so shared packages build
before the apps that consume them.

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

### Engineering operations (the rules that keep these screens trustworthy)

- **Builds, deployments and logs are written by CI, never by the UI.** They arrive through
  `POST /api/ingest/{builds,deployments,logs}`, authenticated by a per-product bearer token
  (`lib/ingest-auth.ts`), and `/api/ingest/` is exempted in `proxy.ts` because a build agent holds
  no session. A "Deploy" button in the admin app would be a claim, not a cause — the split is why
  the deployment history can be read as a record of what actually shipped. Contract:
  `docs/ingest-api.md`.
- **`POST /api/ingest/github` is the same evidence arriving on its own.** GitHub's `workflow_run`
  and `deployment_status` events, verified by HMAC (`GITHUB_WEBHOOK_SECRET`, fails closed) and
  matched to a product by its `repositoryUrl`. Both transports write through
  `lib/ingest-writers.ts` — never reimplement the upsert per transport, or the two paths drift and
  the screens start disagreeing about what shipped. The translation lives in `lib/github.ts` and
  invents nothing GitHub did not send: a branch-to-environment convention is documented as a
  convention, `inactive` is not a rollback, and a repository claimed by two products is refused
  rather than guessed.
- **A repository is attached by picking it or by typing it, and both stay.** `GITHUB_TOKEN`
  (private repos) or `GITHUB_ACCOUNT` (one account's public repos, no credential) turns the
  repository field into a picker that also pre-fills blank product fields; neither is required,
  and a URL can always be typed for a repository this instance cannot see. The picker marks
  repositories already attached elsewhere, because the receiver refuses an event two products
  claim. `components/os/repository-picker.tsx`, `GET /api/admin/github/repositories`.
- **An ingest token is shown once and stored only as a SHA-256** plus its last four characters.
  There is nothing for the UI to leak, and "show it again" is correctly impossible.
- **Empty is the honest state.** Until a pipeline is connected these tables are empty and the
  screens say so. Never seed them with plausible-looking history.

### WhatsApp webhook

- **The signature check fails closed in production.** `/api/whatsapp/webhook` is exempt from the
  session guard in `proxy.ts` and writes straight into the CRM (`handleInboundMessage` creates a
  `Client`), so with no `WHATSAPP_APP_SECRET` set it refuses every payload rather than accepting
  unsigned ones. An earlier version accepted anything when the secret was absent and left a comment
  asking for it to be set before real traffic — production then ran open on exactly that gap. A
  comment is not an enforcement. Local development keeps the tolerance, because Meta cannot reach a
  laptop and the handler has to be exercisable by hand.
- Covered by `bun run verify:whatsapp` (needs no database).

### Email (outbound only)

- **Two transports, chosen by which credentials exist**: `RESEND_API_KEY` (sends from the
  studio's own domain) or `SMTP_HOST`/`SMTP_USER`/`SMTP_PASSWORD` (sends from that mailbox,
  including a plain Gmail account with an app password). Resend wins when both are set. Neither
  is required, and with neither nothing pretends to send.
- **It is the only client-facing channel that works today.** WhatsApp templates need a verified
  business, a registered number and a payment method; email needs none of them.
- **Every attempt is recorded, failures included** (`EmailMessage`, mirroring `WhatsAppMessage`).
  A row that vanished on failure would make a client's history read as though nobody ever tried.
- **`sent` means the transport accepted it, not that it arrived.** `DELIVERED`/`BOUNCED`/
  `COMPLAINED` exist in the enum and *nothing in this application can set them* — they need a
  provider webhook that is not wired up. `/email` says so on the page.
- **The channel is chosen per send, and the wording is editable** (`components/os/send-document.tsx`).
  Defaults come from `lib/email-templates.ts`, which the route also falls back to — one source, so
  the screen and the server cannot drift. The document link is re-appended server-side by
  `ensureLink`: an editable body is a deletable body, and a proposal email with no proposal in it
  looks entirely normal as it is sent.
- **`EMAIL_REPLY_TO` is applied inside `sendEmail`, not per call site.** Mail goes out from a
  sending subdomain nobody reads; a send that forgets the header is a client reply that vanishes
  with no error to notice.
- **Plain text, no HTML template.** Contract and setup: `docs/email.md`.

### Slack (outbound only)

- **One incoming webhook, no app and no bot token.** `SLACK_WEBHOOK_URL` is the whole
  integration. Slack's free plan carries unlimited incoming webhooks.
- **It hooks into `recordActivity`, not into forty mutation sites** — so a new mutation cannot
  be added and forget to notify. But it is **not a second audit log**: only the curated
  `NOTIFIED_ACTIONS` set in `lib/slack.ts` reaches the channel (signed contracts, opened
  incidents, failed deploys, deletions — never `build.succeeded` or `submission.viewed`).
  Adding or removing an event is one line in that map; that map is the whole policy.
- **A notification can never break the mutation it describes**: `notifySlack` swallows its own
  errors and caps the post at four seconds, and it is skipped when a transaction client is
  passed so an HTTP call cannot hold a business transaction open.
- **The health check reports "unknown", never "healthy".** A write-only webhook answers nothing
  until something is posted, so the *Send a test* button on `/integrations` is the real check —
  and it reports Slack's own error rather than a green toast. Contract: `docs/slack.md`.

### Audit trail

- **Write the event at the mutation site**, via `recordActivity`/`recordChange` in
  `lib/activity-log.ts`. `/audit` used to be a projection over `updatedAt`, which can show that a
  row changed but never who changed it or from what.
- `recordChange` skips the write when nothing actually moved, and `before`/`after` carry only the
  changed fields. Values are redacted by field name — never put a secret in a payload.
- **Recording must never break the mutation it describes.** These helpers swallow their own errors.

### Deleting records

- **Every delete goes through `deleteRecords`** (`app/(dashboard)/_actions/delete.ts`), which reads
  its cascade, its protections and its audit snapshot from one registry (`lib/deletable.ts`). A
  screen never issues its own `prisma.delete` — the registry is what knows that a contract owns a
  project which owns payments, and Prisma's default RESTRICT turns a naive delete into a foreign-key
  error an operator cannot act on.
- **Deletes are hard, and the audit trail is what survives them.** The row's fields are snapshotted
  into an `ActivityEvent` before it is removed, so `/audit` still answers what was destroyed, by
  whom, and what it contained. There is no `deletedAt` column and no archive screen.
- **Records of things that actually happened are protected**: signed contracts, collected payments,
  live retainers, and the builds/deployments/logs CI wrote. Those are *soft* blocks — an OWNER can
  override one deliberately, and the override is written into the event. *Hard* blocks (the last
  superadmin, an account with attributed notes) cannot be overridden by anyone, because the database
  would refuse the write anyway.
- **The confirmation dialog is fed by the server, not by the row on screen.** `describeDeletion`
  returns the real cascade counts; an operator sees the six records that go with the one they
  clicked before they type the confirmation.

### Subscription lifecycle

- **Stored status is what an operator set; effective status is what the calendar says.**
  `deriveStatus` in `lib/subscription-lifecycle.ts` is a pure function of the row and the clock, so
  a retainer that lapsed this morning reads as past due with no cron job and no write. Only
  `TRIALING`/`ACTIVE`/`SUSPENDED`/`PAUSED`/`CANCELLED` are settable by hand; `PAST_DUE`, `GRACE`
  and `EXPIRED` are derived and must stay that way.
- **A renewal anchors to the period that just ended, never to `now`** (`computeRenewal`), or
  renewing three days late walks the billing anchor forward every cycle. The month arithmetic
  clamps to month length so a retainer anchored on the 31st does not decay to the 28th.
- That module is deliberately isomorphic (no `server-only`): admin, dashboard and client portal
  must all derive the same status for the same row.

### Security

The posture, and the reasoning behind each decision, is `SECURITY.md`
("Hardening decisions"); the audit it came from is `SECURITY_AUDIT.md`, and the
steps that live in a console rather than in code are `SECURITY_TODO.md`.

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

### Honesty rule

A screen may be empty, and a capability may be marked Planned (`components/os/planned.tsx`,
`state: "planned"` in `lib/nav.ts`) — but it must never *simulate* working. No `toast.success` over
a mutation that persists nothing, no invented run counts, no mock rows that look real. Two screens
previously broke this (`/tasks` synthesised tasks from project phases; `/automations` listed
invented rules with fake run counts and a test-run button that executed nothing); both are now
backed by real data or honestly labelled.

### Change requests and closing a project

- **A one-off change needs no retainer and no new contract.** `ChangeRequest` hangs off the
  `Project`: requested → quoted → approved (recorded by hand, `manual: true`) → in progress →
  delivered. Delivery opens a `CHANGE_REQUEST` payment in the same transaction; zero-amount and
  warranty work open none. Rules: `lib/change-requests.ts` (isomorphic, pinned by
  `verify:change-requests`); actions: `app/(dashboard)/_actions/change-requests.ts`.
- **The hourly rate is the published revision rate** (`revisionHourlyRate` / `…Usd` by project
  currency, override ?? default), snapshotted onto the row at quote time so a later /pricing edit
  cannot re-price agreed work. A currency with no published rate quotes fixed only.
- **Warranty is derived, never stored**: `actualLaunchDate + postLaunchWarrantyDays`, judged
  against when the client *asked*. Free work outside the window is a fixed quote of zero, not
  "warranty".
- **COMPLETED is reached only through Close project**, which checks unpaid payments and open
  change requests (soft blocks, OWNER override written into `project.completed`) and stamps
  `completedAt`. `setProjectStatus` refuses COMPLETED and clears `completedAt` on reopen. Existing
  COMPLETED rows were not backfilled — nobody recorded when they closed.
- **A quote goes to the client like a proposal does**: the operator sets the price, picks email or
  WhatsApp and may rewrite the wording (`sendChangeRequestQuote`; link re-appended server-side). The
  client opens `/quote/[token]` (public, exempted in `proxy.ts`, rate limited) and approves with
  their name or declines. The answer posts the figure they saw, so a quote revised while the page
  was open is refused; a re-quote clears `quoteSentAt` and the link refuses answers until the new
  number is sent. "Viewed" is posted by the page's script, never stamped on render — link
  previewers and mail scanners fetch URLs with nobody behind them. WhatsApp here is free text, so
  it only delivers inside Meta's 24-hour window.
- These actions return `{ ok, message }` instead of throwing: production Next.js replaces a thrown
  server-action message with a digest, and the refusal is the sentence the dialog needs.

### Client services & renewals (domains, hosting, email)

- **`ClientService` is anything a client holds through Altruvex that expires** — domain, hosting,
  business email, SSL, licences. Belongs to a client; optionally to the project that sold it and
  the product it serves. `price` is what the client pays per term and is entered per service (a
  registrar's price for one domain is not a published tier); `cost` is internal and never reaches a
  client surface. Never store a provider password — `reference` is an order/account id.
- **Stored status is PENDING / ACTIVE / CANCELLED; "renewing soon", "expiring" and "expired" are
  derived** from `expiresAt` and the clock in `lib/service-lifecycle.ts` (isomorphic, same rule as
  retainers). PENDING has no dates and raises nothing — an invented expiry would alert against a day
  that never existed. A renewal anchors to the old expiry, re-anchoring to today only when the new
  date would still be in the past.
- **Proposals carry services outside the fee.** `content.services` never enters `investmentTotal`,
  `netTotal`, payments or the discount; the deck prints them under the payment split (and refuses to
  generate if they would hit the footer), the contract adds a clause + table only when the list is
  non-empty, and `handleContractSigned` opens each as a PENDING row in the project transaction.
- **Alerts: derived screens first, pushes second.** The action centre, the sidebar badge and
  `/services` read the clock and are right with no job running. `sweepServiceRenewals`
  (`lib/client-services.ts`) writes `RENEWAL_DUE` notifications at 30/14/7/1/0 days and posts
  `service.renewal_due` to Slack — idempotent through `Notification.dedupeKey` (service + expiry +
  threshold, unique per user), so a renewal re-arms the thresholds. It runs from
  `GET /api/cron/service-renewals` (Vercel cron in `apps/admin/vercel.json`, `CRON_SECRET`, fails
  closed, exempt in `proxy.ts` under `/api/cron/`) and from the *Check renewals now* button.
- **A term that starts opens its payment** (`termBilling`): registering a service whose first term is
  not in the fee, and every renewal, create a PENDING `SERVICE_RENEWAL` payment (`Payment.serviceId`)
  in the same transaction as the date moving. Only when the service is on a project AND priced in
  that project's currency — a payment row has no currency of its own, so anything else is refused
  with a reason, never billed in the wrong currency. Renewal is guarded on the expiry it read, so a
  double click cannot add two years and two invoices.
- **Client renewal reminders are sent by a person, never on a timer** (`/api/admin/services/[id]/remind`).
  Email is sent and recorded as an `EmailMessage`; WhatsApp opens the operator's own phone via wa.me
  (the Business API has no renewal template) and is recorded only as a manual record. "Reminded this
  cycle" is `reminderSentFor == expiresAt`, so a renewal re-arms it without a write.
- **Domain expiry can be read from the registry over RDAP** (`lib/rdap.ts`, rdap.org, no account).
  It pre-fills or syncs; a registry that publishes nothing (.eg) says so and the typed date stands.
- Covered by `bun run verify:services` (needs no database).

### Manual records (what happened outside the system)

- **Every automated step has a manual path beside it, never instead of it.** Proposals and
  contracts carry a *Record manually* menu (`components/os/manual-status.tsx`) next to the
  system send: sent outside the system, accepted/rejected, signed on paper, declined, expired,
  back to draft; signed contracts also get *Record onboarding*. Routes:
  `POST /api/admin/{proposals,contracts}/[id]/status`, `POST /api/admin/contracts/[id]/onboarding`.
- **A manual record claims only what the operator knows.** It writes the status plus an audit
  event with `metadata.manual = true`, the channel and an optional note — never an
  `EmailMessage`/`WhatsAppMessage` row. `DELIVERED`/`READ`/`VIEWED` are transport evidence and
  are not settable by hand.
- **A hand-recorded signature goes through `handleContractSigned`**, so the project and payment
  schedule open exactly once, and a signed contract cannot be moved by hand. A proposal that
  already has a contract cannot be walked back. Declined/expired contracts refuse the sign link.


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
- **Translations**: `messages/en.json` and `messages/ar.json` hold all UI copy — when adding
  user-facing text, add keys to both locale files, not literal strings in components.
- **Content**: MDX articles live under `contents/articles/{en,ar}/`, loaded via
  `@next/mdx`/`next-mdx-remote` + `gray-matter` frontmatter.
- **SEO**: `lib/metadata.ts` centralizes `SITE_CONFIG`/`PAGE_METADATA` and locale-aware URL/SEO
  helpers; `lib/schema.ts` builds JSON-LD structured data (Organization, LocalBusiness, Service,
  FAQ, HowTo, Pricing, Breadcrumb schemas) from that shared metadata — keep new pages wired into
  both rather than hand-rolling metadata per route.
- **UI**: shadcn/ui (`new-york` style, Tailwind v4, `components.json`) under `components/ui`, plus
  `components/{base,interactive,layout,layout-effects,legal,mdx,providers,sections,seo,shared}`.
  Animation stack is GSAP (`@gsap/react`, `lib/motion/`) + Lenis smooth scroll.
- **PWA**: `@ducanh2912/next-pwa`, with an offline route.
- Quality checks specific to this app: `knip` (dead-code/export detection — see `knip.json` for
  intentionally-ignored paths like `components/ui/**`) and `pagespeed.json` (Lighthouse/PageSpeed
  config, since sub-1s mobile performance is a stated product requirement — see design docs below).

### apps/admin (internal ERP)

- **Auth**: `better-auth` (`lib/auth.ts`/`lib/auth-client.ts`), session-cookie based. `proxy.ts`
  (middleware) gates every route except `/login`, `/offline`, `/api/auth/*`, and the WhatsApp
  webhook (which authenticates itself via `X-Hub-Signature-256`, not the session cookie) behind an
  `ADMIN`/`SUPERADMIN` role check on the `better-auth` session.
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
  lead/notification flow; Cloudflare R2 (`@aws-sdk/client-s3`, `lib/storage.ts`) for file storage.
- **UI**: same shadcn/ui + Tailwind v4 stack as `www`, no i18n (admin is English-only).

### Design system & brand

- `design.md` (repo root) is the canonical brand/design-token reference (voice, color, type) —
  it explicitly states its source of truth is the live code (`apps/www/app/globals.css` for
  colors/type, `apps/www/messages/{en,ar}.json` for voice), not the other way around. Update the
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
