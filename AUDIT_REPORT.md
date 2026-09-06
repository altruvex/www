# SuperAdmin Audit Report — Phase 1

Scope: `apps/admin` (Next.js App Router, Prisma/Postgres via `@repo/database`, better-auth). Covers every page, API route, and lib file under the admin app, including the two unauthenticated client-facing surfaces (`/portal/[token]`, `/sign/[token]`) and the WhatsApp webhook.

No code has been changed. This is the findings report only. Checkboxes track fix status for Phase 2.

**Read this first:** the single highest-impact finding is [CRIT-1](#crit-1) — two admin pages render real client data with zero auth check. Fix that before anything else.

---

## Critical

### CRIT-1
- [ ] **Unauthenticated data exposure: `/` and `/clients` render full client PII and revenue data with no session/role check.**
  `apps/admin/app/(dashboard)/clients/page.tsx:6-43` and `apps/admin/app/page.tsx:81-107` (via `apps/admin/lib/dashboard-data.ts`) are React Server Components that call `prisma.client.findMany()` / `getDashboardData()` directly and render the result. Neither imports `requireAdminSession` or checks a session. `apps/admin/app/(dashboard)/layout.tsx:18-31` (the shared layout wrapping both pages) does not perform an auth check either — it's a Suspense shell around `<Navbar />` and `children`. `requireAdminSession` (`apps/admin/lib/require-admin.ts`) is only ever called from inside `app/api/admin/**` route handlers.
  **Impact:** anyone who requests `/` or `/clients` directly — no cookie, or a logged-in non-admin `USER`-role session — gets a fully server-rendered HTML page containing client names, phones, emails, companies, transparency-lead pricing, proposal/contract status, and (on `/`) pipeline revenue, payments due, and at-risk projects. `/meetings`, `/clients/[id]`, `/clients/[id]/new-proposal` are `"use client"` and fetch through the gated API, so they're safe (degrade to empty/loading for unauthorized users) — only these two SSR pages leak.
  **Fix:** add a session/role check at the top of `app/(dashboard)/layout.tsx` (redirect to `/login` if missing/wrong role) so every page under the group is covered by one gate, rather than trusting each new page to remember its own check.

### CRIT-2
- [ ] **Signing a contract can permanently create a Project with zero Payments — no transaction, no recovery path.**
  `apps/admin/lib/contract-signing.ts:43-84` (`handleContractSigned`) — `prisma.project.create` (line ~55) and `prisma.payment.createMany` (line ~64) are two separate awaited calls, not wrapped in `prisma.$transaction`. If `project.create` succeeds and `payment.createMany` throws, the function throws and the request 500s — but the `Project` row is already committed. The idempotency guard at line ~43-47 (`if (!project) { … }`) means every future call for this contract finds the existing `Project` via `findUnique` and **never re-enters the payment-creation block**. Net effect: a signed, real client contract ends up with a `Project` and no `Payment` rows, permanently, invisible until someone notices the client was never invoiced.
  **Fix:** wrap `project.create` + `payment.createMany` (and ideally the contract-status update) in one `prisma.$transaction([...])`. Add a one-off reconciliation query ("any Project with zero Payments") to check whether this has already happened in production.

### CRIT-3
- [ ] **WhatsApp webhook signature verification silently no-ops when `WHATSAPP_APP_SECRET` is unset — and that var is optional even in production.**
  `apps/admin/app/api/whatsapp/webhook/route.ts:22-27` — `isValidSignature` returns `true` for every request when `appSecret` is falsy. `apps/admin/lib/env.ts:14` declares `WHATSAPP_APP_SECRET: z.string().optional()`, and the required-in-production list (`lib/env.ts:30-32`) only forces `DATABASE_URL` and `BETTER_AUTH_SECRET`. Nothing prevents the app from booting in production with webhook auth fully disabled, and nothing warns the operator.
  **Impact if unset:** anyone can POST arbitrary payloads to the webhook and (a) inject fabricated `Client` rows via `linkClientToLead`, or (b) forge delivery/read timestamps on real `Proposal`/`WhatsAppMessage` rows, corrupting the funnel metrics on the dashboard.
  **Fix:** make `WHATSAPP_APP_SECRET` required whenever the webhook route can be reached (i.e., required in production env validation), and confirm it is actually set in the current deployment now, not just fixed going forward.

### CRIT-4
- [ ] **Meetings beyond the first 50 are permanently invisible in the UI, with no pagination controls, and this is a present-day bug, not a future scale risk.**
  `apps/admin/app/(dashboard)/meetings/page.tsx:101-126` never sends `page`/`pageSize` to the API, so it always gets the server default `pageSize=50` (`apps/admin/app/api/admin/meetings/route.ts:21`). There is no page state, no "Next/Previous" UI, despite the API already supporting `skip`/`take`. Meetings are ordered oldest-first by `scheduledDate asc`, so once there are more than 50 rows, upcoming/future meetings can silently fall outside the visible window with zero indication more exist.
  **Fix:** wire pagination controls into `meetings/page.tsx` the same way `clients-client.tsx` already does correctly for the clients list.

---

## High

### Security / auth

- [ ] **HIGH-1 — No rate limiting on any public write endpoint; `RateLimitBucket` model exists in the schema but is referenced nowhere in code.** `apps/admin/app/api/sign/[token]/route.ts` (whole file); `packages/database/prisma/schema.prisma` `RateLimitBucket` model is dead. A leaked/shared sign link has no throttling on repeated POSTs.
- [ ] **HIGH-2 — `Contract.signToken` never expires.** `apps/admin/app/api/sign/[token]/route.ts:13-16,71-73` — unlike `Proposal.validUntil`, there's no staleness check; a months-old forgotten sign link can still spawn a Project + Payments today.
- [ ] **HIGH-3 — A `DECLINED` contract can still be signed through the public endpoint.** `apps/admin/lib/contract-signing.ts` only guards `status !== "SIGNED"`, not `DECLINED`/`EXPIRED` — the public sign route has no status guard preventing this either.
- [ ] **HIGH-4 — `Client.phone` has no unique constraint, causing a real duplicate-client race.** `packages/database/prisma/schema.prisma` (`Client` model, only `@@index([phone])`). Two conditions expose it: (a) `linkClientToLead` (`packages/database/index.ts:34-64`, called from `app/api/whatsapp/webhook/route.ts:114-119`) does `findFirst` → branch → `create`/`update` with no transaction — two concurrent webhook retries for the same new phone can both miss the check and both create a Client. (b) `apps/admin/app/api/admin/clients/route.ts:128-138` (admin-facing POST) does **zero** existing-phone lookup before creating — an admin double-submit creates two Client rows for one phone, silently forking that client's history.
- [ ] **HIGH-5 — No status guard or idempotency on the proposal/contract "send" endpoints — double-click sends duplicate real WhatsApp messages.** `apps/admin/app/api/admin/proposals/[id]/send/route.ts:26-65` and `apps/admin/app/api/admin/contracts/[id]/send/route.ts:26-52` never check current status before sending. Two rapid clicks both call the WhatsApp Graph API (real message, real cost) and both update the same row — DB ends up looking consistent (last write wins) while two messages actually went out. The contracts version can also regress an already-`SIGNED` contract's status back to `SENT`.

### Data / documents

- [ ] **HIGH-6 — Failed proposal/contract document generation leaves a permanent dead-end record with no retry path, and resubmitting creates a duplicate row.** `apps/admin/app/api/admin/proposals/route.ts:103-132` and `apps/admin/app/api/admin/contracts/route.ts:81-107` — on PPTX/DOCX/upload failure, the row is still created with `fileUrl: null` and a 502 returned, but there's no server-side idempotency check, so retrying via the form creates a **second** Proposal row. On the UI side, `clients/[id]/page.tsx:696-808` shows no regenerate/retry action once the row exists — a proposal with `fileUrl: null` shows no Send/Download button and is a dead end; for contracts, "Generate Contract" disappears forever once *any* Contract row exists (even a broken one), while "Mark as Signed" still works even though no document was ever produced.

### State handling

- [ ] **HIGH-7 — No global 401/403 handling anywhere; an expired session fails every action silently.** Every fetch call site treats a 401 (`{success:false,message:"Unauthorized"}`) as a generic business error — toasts `data.message` — but never redirects to `/login`. If a session expires mid-work, every subsequent action just toasts "Unauthorized" forever with no way back in. Affects all mutation call sites across `clients-client.tsx`, `clients/[id]/page.tsx`, `new-proposal/page.tsx`, `meetings/page.tsx`.
- [ ] **HIGH-8 — Client status/priority update failures on the detail page are completely invisible.** `apps/admin/app/(dashboard)/clients/[id]/page.tsx:200-224` (`updateClient`) calls `setError(...)` on failure, but the only render of `error` is gated behind `if (error && !client)` (line ~353) — always false once the page has loaded, since `client` is already set. No toast either (unlike the equivalent on the clients list, `clients-client.tsx:133-158`, which correctly does both). A failed stage/priority change here just snaps the dropdown back with zero explanation.

### DRY (high blast-radius duplication)

- [ ] **HIGH-9 — Identical fetch/mutation boilerplate (loading → fetch → success/error toast → finally) repeated 14 times** across `clients-client.tsx`, `clients/[id]/page.tsx`, `new-proposal/page.tsx`, `meetings/page.tsx`, `portal/[token]/page.tsx`, `sign/[token]/page.tsx`. Propose `lib/use-admin-mutation.ts` (`useAdminMutation`) + a small `useAdminFetch` for reads — collapses ~20 lines per call site to ~3, and removes the `// eslint-disable-next-line react-hooks/set-state-in-effect` needed 6 times to suppress the manual-state-in-effect pattern.
- [ ] **HIGH-10 — The `if (!(await requireAdminSession(request))) return 401` guard is copy-pasted 14 times** across all 8 `app/api/admin/**/route.ts` files with zero shared wrapper. Propose `lib/with-admin.ts` exporting `withAdmin(handler)` so a new route literally cannot be added without the check — turns "forgot the auth guard" from a code-review risk into a compile-time impossibility. (Also raised independently by the architecture audit as a process-scalability risk.)
- [ ] **HIGH-11 — Status/priority `<Select>` option lists are copy-pasted verbatim across 4 call sites**, each hand-typing the same enum values instead of importing Prisma's generated `SubmissionStatus`/`Priority` enums: `clients-client.tsx:347-374,377-400` and `clients/[id]/page.tsx:402-422,424-443`. A new/renamed enum value requires remembering to update every copy in sync — real drift risk, not hypothetical.

### Accessibility (Blockers)

- [ ] **HIGH-12 — Status/priority/source/type badge text fails WCAG AA contrast almost everywhere, in at least one theme for every variant.** `apps/admin/lib/status-badges.ts` (all badges) uses `text-{color} bg-{color}/10`-style pairs. Computed against actual card background: `warning` text 2.89:1 light / `success` text 3.19:1 light, `brand`/`accent` 3.12:1 dark, `destructive` 3.17:1 dark — all below the 4.5:1 floor for 12px badge text. One file, dozens of visible instances across `clients-client.tsx`, `clients/[id]/page.tsx`, `meetings/page.tsx`, `portal/[token]/page.tsx`.
- [ ] **HIGH-13 — Proposal line-item inputs (the screen that produces the real dollar figure sent to a client) have zero labels.** `apps/admin/app/(dashboard)/clients/[id]/new-proposal/page.tsx:380-393` — no `<label>`, no `aria-label`, no `placeholder`; a screen-reader user gets "textbox" / "textbox, edit text" with no indication which field is description vs. price.
- [ ] **HIGH-14 — A clickable `<div>` (not a button/link) is used for navigation, unreachable by keyboard.** `apps/admin/app/(dashboard)/clients/[id]/page.tsx:656-660` — `<div onClick={() => router.push("/meetings")}>` with no `role`, `tabIndex`, or `onKeyDown`. Invisible to Tab and to screen readers.
- [ ] **HIGH-15 — Two hand-rolled modals have no focus trap, no Escape-to-close, and no dialog ARIA semantics — while an accessible primitive already exists in the same codebase.** `MarkSignedDialog` (`clients/[id]/page.tsx:884-946`) and `AddClientDialog` (`clients-client.tsx:467-584`) are raw `<div className="fixed inset-0...">` overlays; Tab walks straight through them into the page behind. `meetings/page.tsx:452-510` already uses the correctly-accessible Radix `AlertDialog` (`components/ui/alert-dialog.tsx`) with unmodified defaults — both modals should be rebuilt on the same primitive family (this is also a DRY finding, see MED-16).

### Performance

- [ ] **HIGH-16 — `getDashboardData()` fetches unbounded tables on every dashboard load.** `apps/admin/lib/dashboard-data.ts:97-116` — `clientsForFunnel` (`client.findMany`, no `take`/cursor, with nested `proposals`/`contracts`), `proposalsEverSent`, and `transparencyLeads` all pull every row just to count/aggregate in JS (lines ~141-145). `app/page.tsx` is `force-dynamic`, so this runs uncached on every single hit to `/`. Replace the count-in-JS patterns with `prisma.count()`/`groupBy`, and add a bound or cursor to `clientsForFunnel`.

---

## Medium

### DB integrity

- [ ] **MED-1 — Prisma constraint errors (P2002 unique violation, P2025 record-not-found) are never caught specifically anywhere in the app** — they always fall through to a generic 500/"Failed to X" message. Concretely: `apps/admin/app/api/admin/contracts/route.ts:66-124` (duplicate Contract-for-Proposal race — the `@unique` constraint prevents actual duplicates, but the resulting P2002 becomes an opaque 500 instead of a clean "a contract already exists, refresh"), and `apps/admin/app/api/admin/meetings/route.ts:157-163` (`assignedToId` connected without checking the User exists first — invalid UUID throws P2025, surfaces as a bland 500 with no indication the assignee was invalid).
- [ ] **MED-2 — DB update can fail *after* an external WhatsApp send already succeeded, with no compensation, in two places.** `apps/admin/app/api/admin/proposals/[id]/send/route.ts:46-65` and `apps/admin/app/api/admin/contracts/[id]/send/route.ts` — if `sendTemplateMessage` succeeds but the subsequent `prisma.*.update` (setting status SENT) throws, the client actually received the message but the admin sees a generic failure and the record's status never updates, with nothing linking the two back together.
- [ ] **MED-3 — `WhatsAppMessage` rows can get stuck at `QUEUED` forever if the process dies between a successful Graph API call and the DB status update.** `apps/admin/lib/whatsapp-api.ts:100-105,152-157` — no reconciliation/sweep job exists for stuck `QUEUED` rows.
- [ ] **MED-4 — Missing indexes on columns the dashboard filters/groups by.** `apps/admin/lib/dashboard-data.ts` — `Contract.signedAt`, `Payment.dueDate`, `ContactSubmission.utmSource`, `Project.phase` are all queried but unindexed in `packages/database/prisma/schema.prisma`. Low risk today, worth adding before the tables grow.

### State handling

- [ ] **MED-5 — List-fetch failures with `{success:false}` (not a network error) fail completely silently — stale data stays on screen with no feedback.** `apps/admin/app/(dashboard)/clients/clients-client.tsx:93-115` and `apps/admin/app/(dashboard)/meetings/page.tsx:101-120` — both only handle the `catch` branch; a non-2xx JSON response with `success:false` has no `else` and no toast.
- [ ] **MED-6 — No in-flight guard on pagination/search — rapid clicks can race and leave the table showing a mismatched page.** `apps/admin/app/(dashboard)/clients/clients-client.tsx:425-449` (Prev/Next only disabled by page boundary, not by `loading`) and the search input (204-213, never disabled during `loading`).
- [ ] **MED-7 — Double-submit not guarded on meeting delete/status-change confirm dialogs.** `apps/admin/app/(dashboard)/meetings/page.tsx:466-471,495-508` — `AlertDialogAction` buttons have no `disabled={deleting/updating}` binding, unlike every other mutating button in the codebase.
- [ ] **MED-8 — Sign-out has no error handling or loading state.** `apps/admin/components/navbar.tsx:60-70` — `await signOut()` with no try/catch; a rejected call means the redirect never fires and the button silently does nothing, with no guard against repeated clicks.
- [ ] **MED-9 — Server-side zod validation errors are collapsed to a generic "Validation failed" toast on the client; the specific field-level reason is discarded.** Every zod-validated route (`clients/route.ts:146-150`, `clients/[id]/route.ts:126-130`, `proposals/route.ts:145-149`, `contracts/route.ts:113-117`, `meetings/route.ts:203-211`) returns `{message, errors}`, but every client caller only reads `data.message`. (`mark-signed/route.ts:53-57` is the one exception that returns something specific.)
- [ ] **MED-10 — Redundant, undebounced client-side re-filter layered on top of the debounced server search causes visible flicker.** `apps/admin/app/(dashboard)/meetings/page.tsx:195-207` re-filters the already-fetched `meetings` array against the raw (non-debounced) `searchQuery`, so every keystroke re-renders against stale data before the 500ms-debounced server response lands and re-renders again.

### Performance

- [ ] **MED-11 — Long synchronous request for proposal generation (up to ~60s) with no queue or progress feedback beyond a spinner.** `apps/admin/app/api/admin/proposals/route.ts:107-117` chains PPTX build → upload → LibreOffice PDF conversion (`apps/admin/lib/pptx-to-pdf.ts:23-27`, 60s `execFile` timeout) sequentially in one request handler — a real risk if the hosting platform's function timeout is shorter than LibreOffice's conversion budget.
- [ ] **MED-12 — Unbounded `GET` on `/api/admin/proposals` (currently only called with a `clientId` filter, but the endpoint itself has no `take`).** `apps/admin/app/api/admin/proposals/route.ts:22-25` — add a `take` as a guard against future unfiltered calls returning the whole table.

### DRY / reinvented wheels

- [ ] **MED-13 — Six independent, drifting implementations of "format currency."** `new-proposal/page.tsx:55-61`, `sign/[token]/page.tsx:32-38` (byte-identical to the previous), `app/page.tsx:38-50`, `clients/[id]/page.tsx:335-340,707-711,846-850` (one hardcodes `en-EG`, others `en-US`, for the same currency). Extract `lib/format.ts` → `formatCurrency(amount, currency, locale?)`.
- [ ] **MED-14 — `date-fns` is an installed dependency, imported nowhere; three near-identical hand-rolled date formatters exist instead.** `clients-client.tsx:166-174`, `clients/[id]/page.tsx:318-333`, `meetings/page.tsx:215-232`. Since the dependency is already paid for, consolidating into `lib/format.ts` (alongside MED-13) is close to zero-risk.
- [ ] **MED-15 — Full-page loading spinner block duplicated 6 times with minor inconsistencies** (`clients/[id]/page.tsx:343-350`, `meetings/page.tsx:235-242`, `new-proposal/page.tsx:215-219`, `portal/[token]/page.tsx:93-97`, `sign/[token]/page.tsx:103-107`, `login/page.tsx:94-98`). Extract `<PageLoading label? />`.
- [ ] **MED-16 — Hand-rolled modal chrome (see HIGH-15) is also a DRY problem, not just a11y** — both should move to a shared `components/ui/dialog.tsx` (Radix `Dialog`, same family as the already-installed `AlertDialog`), fixing the duplication and the focus-trap gap in one change.
- [ ] **MED-17 — Payment status badge mapping is inlined twice instead of using the existing `lib/status-badges.ts` convention.** `clients/[id]/page.tsx:852-863` and `portal/[token]/page.tsx:185-195` duplicate the same 4-branch PAID/PENDING/OVERDUE/WAIVED → class mapping that every *other* status badge in the app already centralizes.
- [ ] **MED-18 — `useState`/`useEffect`-based data fetching is hand-rolled at 6 read call sites, each fighting the same lint rule.** `date-fns` aside, consider `SWR` (already a natural Next.js fit, ~13KB, actively maintained) if more read-heavy admin pages are planned — solves both the manual loading/error triad and the "refetch after every mutation" pattern (`clients/[id]/page.tsx:214,235,258,279,302`) via `mutate()`. Not urgent at 6 call sites; a hand-rolled `useAdminFetch` (no new dependency) is a reasonable middle ground if SWR feels like overkill.

### Accessibility (Serious/AA)

- [ ] **MED-19 — No `<label>` element anywhere in the app (`htmlFor` used zero times).** Login (`login/page.tsx:54-70`), Add-client dialog (`clients-client.tsx:529-565`, 5 fields), Mark-signed dialog (`clients/[id]/page.tsx:914-922`), both search boxes.
- [ ] **MED-20 — Visible label text exists but isn't programmatically associated, so Radix `Select`s announce only the current value, not the field name** — worst instance is the **client-facing contract-signing page**: `sign/[token]/page.tsx:191-201` ("Full legal name"). Also `clients/[id]/page.tsx:401,425` (Stage/Priority) and 5 selects in `new-proposal/page.tsx`.
- [ ] **MED-21 — Table headers and secondary text fail contrast due to stacked opacity modifiers on an otherwise-passing token.** `clients-client.tsx:268-287` (all 7 column headers at `text-muted-foreground/60` → 2.46:1), `:319` (`/80` → 3.58:1), `:339` (`/70` → 2.95:1), `new-proposal/page.tsx:322` (`/70` → 2.95:1). The base `--muted-foreground` token itself passes (5.44:1+) — the bug is the `/NN` opacity stacking, easy fix.
- [ ] **MED-22 — Icon-only action buttons (download/send proposal, download/send contract) have no padding, making the hit target the bare 14×14px icon** — below the WCAG 2.5.8 24×24px minimum. `clients/[id]/page.tsx:714-735,762-783`. Also relies on `title` for the accessible name rather than `aria-label` — fragile.
- [ ] **MED-23 — No `aria-live`/`role="status"` on any loading indicator anywhere.** `components/loading-icon.tsx` (used at 7 call sites) is a bare unannounced `<span>`.
- [ ] **MED-24 — Selection-by-color-only "card option" buttons with no ARIA selected-state semantics.** `new-proposal/page.tsx:63-86,239-274` — no `aria-pressed`/`role="radio"`/`aria-checked`, selected state conveyed by border/background color only.

### Architecture

- [ ] **MED-25 — No service/data-access layer; route handlers mix auth, validation, business logic (pricing math), Prisma writes, and document generation inline.** Clearest examples: `app/api/admin/proposals/route.ts` POST (lines 54-157) and `app/api/admin/contracts/route.ts` POST (lines 42-125). Propose `lib/services/create-proposal.ts`, `lib/services/create-contract.ts` to isolate the multi-step workflow from HTTP concerns.
- [ ] **MED-26 — No shared types layer between API responses and UI; hand-written interfaces drift from what Prisma actually returns.** `clients/page.tsx:35` does `clientsRaw as unknown as ClientRow[]` — a double-cast through `unknown` that suppresses type checking entirely. `Meeting` is independently hand-typed in both `clients/[id]/page.tsx:76` and `meetings/page.tsx:48`. Propose deriving UI types from `Prisma.*GetPayload<typeof someInclude>` exported from a `lib/data/*.ts` layer (naturally falls out of MED-25).
- [ ] **MED-27 — `clients/[id]/page.tsx` is 946 lines mixing 5 hand-written types, 6 fetch/mutation handlers, 3 formatters, and ~500 lines of JSX (including an inline `MarkSignedDialog`) in one file.** Split: fetch/mutation handlers → a hook or `lib/data/clients.ts`, formatters → `lib/format.ts` (ties into MED-13/14), `MarkSignedDialog` → its own file.
- [ ] **MED-28 — `getDashboardData()` is one large function assembling 10 queries into one object — a predictable merge-conflict point as more dashboard widgets get added.** `apps/admin/lib/dashboard-data.ts:50-189`. Split into per-widget functions in `lib/dashboard/` composed by a thin `getDashboardData()`.
- [ ] **MED-29 — `lib/proposal-builder.ts` (1011 lines) holds 7 independent slide-builder functions in one file with shared module-level constants — a merge-conflict and testability problem.** Split into `lib/documents/proposal/slides/{cover,problem,solution,timeline,investment,scope,closing}.ts` + `lib/documents/proposal/tokens.ts`, composed by `lib/documents/proposal/index.ts`.

---

## Low

### DB integrity
- [ ] **LOW-1** — Raw upstream WhatsApp Graph API error text forwarded to the admin client in error responses. `proposals/[id]/send/route.ts:74-79`, `contracts/[id]/send/route.ts:80-84`. Admin-only, low severity.
- [ ] **LOW-2** — No sanity bound on proposal `lineItems` length or individual `amount` values (a stray extra zero sails straight through to the client-facing document). `app/api/admin/proposals/route.ts`.
- [ ] **LOW-3** — Meeting hard-delete has no soft-delete/audit trail; a wrong-meeting delete is unrecoverable (though correctly idempotent against double-submit). `app/api/admin/meetings/route.ts:224-280`.
- [ ] **LOW-4** — Zod validation errors return the raw `ZodError` object to the client instead of a sanitized subset. Consistent across every zod-validated route — normal for an admin tool, noted for completeness.

### State handling
- [ ] **LOW-5** — Related-meetings/proposals sections on the client detail page disappear entirely when empty instead of showing an explicit "No X yet" state. `clients/[id]/page.tsx:648,689`. Low-impact, arguably intentional.
- [ ] **LOW-6** — Single `updating` boolean on the client detail page disables both Stage and Priority selects even when only one is being changed. `clients/[id]/page.tsx:407,431`.
- [ ] **LOW-7** — Portal and sign pages collapse all failure types (network error, 500, genuine 404) into one generic "not found" message. Acceptable for public-facing pages (no info leak), but a real outage looks identical to a bad link.

### Performance
- [ ] **LOW-8** — No `React.memo`/`useCallback` on list row renderers, but every reviewed list is capped at 20-50 rows — no measurable impact today, not worth doing preemptively.

### DRY
- [ ] **LOW-9** — `process.env.NODE_ENV !== "production"`-guarded `console.error` repeated identically 22 times. Propose a one-line `logServerError(context, error)` util as a natural home for future error tracking (Sentry etc.).
- [ ] **LOW-10** — "Not found / error" full-page state duplicated 3 times (`clients/[id]/page.tsx:353-368`, `portal/[token]/page.tsx:100-112`, `sign/[token]/page.tsx:110-122`). Extract `<PageError title message />`.
- [ ] **LOW-11** — `lib/whatsapp-api.ts`'s "create QUEUED record → send → update SENT/FAILED" block is duplicated between `sendTemplateMessage` and `sendTextMessage` (~25 lines). Propose a shared `withMessageRecord()` helper.
- [ ] **LOW-12** — react-hook-form and `@tanstack/table` were both considered and are **not** currently justified: all 4 forms are 1-5 fields with no cross-field validation, and both tables are already server-paginated with no client-side sort/resize needs. Revisit only if more/larger forms or richer table interactions are added.

### Accessibility (Moderate)
- [ ] **LOW-13** — `apps/admin` has no `prefers-reduced-motion`/`prefers-reduced-transparency` media query, unlike `apps/www` which already solved this — a regression relative to the sibling app's existing a11y pass. Affects the `.liquid-glass` backdrop-blur used on nearly every card and the `LoadingIcon` pulse animation.
- [ ] **LOW-14** — Filter `<Select>`s (status/type/stage/source filters) have no accessible name distinguishing them from the identical-looking per-row status editors. Add `aria-label="Filter by status"` etc.
- [ ] **LOW-15** — Focus rings use `box-shadow` (`ring-*`) rather than `outline`, which doesn't survive forced-colors/high-contrast mode; the global `outline`-based fallback in `globals.css:246-248` is overridden by `outline-none` in `button.tsx:8` and `select.tsx:40`.
- [ ] **LOW-16** — Links (portal "View staging build →", sign "Review the full agreement") are distinguished from body text by color alone at rest, underlined only on hover. Contrast is decent (4.62:1) so this is advisory.
- [ ] **LOW-17** — Add-client phone validation error isn't tied to the offending field via `aria-invalid`/`aria-describedby`. `clients-client.tsx:484-486,566-570`.
- [ ] **LOW-18** — No `autocomplete` attributes on login fields (email/password) — hurts password-manager integration.
- [ ] **LOW-19** — Delete-meeting button uses raw Tailwind red instead of the `text-destructive` design token, so it won't get swept up when HIGH-12's badge-contrast fix lands. `meetings/page.tsx:438`.

### Architecture
- [ ] **LOW-20** — `lib/` has 15 files at ~3,900 total lines; only the document-generation cluster (`proposal-builder.ts`, `proposal-content.ts`, `contract-builder.ts`, `pptx-to-pdf.ts` — 1,645 lines, 42% of `lib/`) is large enough to warrant its own `lib/documents/` folder today. The rest (auth, whatsapp-api, storage, small UI utils) are fine flat at this size — don't do a blanket restructure.
- [ ] **LOW-21** — `portal`/`sign` (public, token-gated, client-facing) and the authenticated dashboard currently share one deployment/origin/cookie scope. Not a concrete vulnerability today (2 public routes, independent per-route guards, low traffic) — a subdomain split is the textbook fix but not yet justified. Worth revisiting if traffic or team size grows, or noted as a deliberate tradeoff.

---

## What's already solid (confirmed, not findings)

- `clients-client.tsx`'s `updateClient`, `AddClientDialog`; `clients/[id]/page.tsx`'s `sendProposal`/`generateContract`/`sendContract`/`markContractSigned`/`MarkSignedDialog`; `new-proposal/page.tsx`'s `handleGenerate`; `meetings/page.tsx`'s `updateMeeting`/`confirmDelete`; `login/page.tsx`; `sign/[token]/page.tsx`'s `handleSign` — all have correct per-action loading state, `disabled`+`aria-busy`, try/catch/finally, and success/error toasts.
- `contract-signing.ts`'s idempotency guards (status/project-existence/onboarding-message checks) are well-designed defensively — the *missing transaction* (CRIT-2) is the only real gap in an otherwise careful function.
- Clients list pagination (`clients/page.tsx` + `api/admin/clients/route.ts`) correctly uses `Promise.all([findMany, count])` with `skip`/`take` — the pattern `meetings/page.tsx` should copy (CRIT-4).
- `requireAdminSession` is called correctly at the top of every one of the 8 `app/api/admin/**` route handlers — no route is missing it (the gap is entirely in SSR pages bypassing the API layer, see CRIT-1).
- No `any` anywhere in `app`/`lib` (grepped) — the codebase is disciplined about this even where shared types are missing.
- `date-fns`, `zod`, `sonner`, Radix primitives are already installed and consistently used where they are used — no ad-hoc `alert()`, no ad-hoc validation library reinvention.
- Dashboard data queries already correctly `Promise.all` everything — no N+1 patterns found anywhere in `dashboard-data.ts` or the API routes.
- Sonner toasts carry `aria-live="polite"` internally, so most dynamic-content status changes (sends, updates, deletions) are already announced to screen readers — the gap is specifically loading states (MED-23) and color-only badge/selection states (HIGH-12, MED-24).
- Radix `AlertDialog` (used correctly in `meetings/page.tsx`) has no overridden defaults — focus trap and Escape-to-close both work there; it's the two hand-rolled modals that need to catch up to it (HIGH-15).

---

## Suggested Phase 2 order

1. CRIT-1 (auth gate on the dashboard layout) — one file, closes the biggest hole.
2. CRIT-3 (require `WHATSAPP_APP_SECRET` in prod) — verify current deployment value first.
3. CRIT-2 (transaction in `contract-signing.ts`) + reconciliation check for existing bad data.
4. CRIT-4 (meetings pagination) — data-visibility bug affecting real usage today.
5. HIGH-4, HIGH-5 (phone uniqueness + send idempotency) — the two real double-write/race risks.
6. HIGH-9/HIGH-10 (mutation hook + `withAdmin` wrapper) — do these together; every later fix in this report gets easier once they land, since they touch nearly every file above.
7. Remaining High, then Medium, then Low, per the DRY-first-touch-fewer-files logic where it applies (e.g. HIGH-11/MED-17/HIGH-12 all funnel through `status-badges.ts` — worth batching).

Awaiting approval before starting Phase 2.
