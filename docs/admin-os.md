# Altruvex Admin OS — system reference

> **What this is.** The design and architecture reference for `apps/admin`, the internal
> operating system of Altruvex. `docs/design-principles.md` is still the law layer and
> `design.md` the company token layer; this file records what the admin app does with
> them, and the decisions that are specific to an operational surface rather than a
> marketing one.
>
> **Design brief:** `docs/admin-os-design-brief.md` (written before any code, per the
> design-master flow). This file is the outcome.

---

## 1. Why it does not look like apps/www

The marketing site is a **reading** surface: 18px body, 1.75 leading, 4.5rem headlines,
glass cards, an ambient brand glow behind the page. Every one of those choices is right
there and wrong here.

An operating system is a **scanning** surface. The whole job is to let one person hold
the state of a company in their head, so the design optimises for information per screen
and for the speed of finding one row among two hundred.

| | apps/www | apps/admin |
|---|---|---|
| Body | 17–18px / 1.75 | **13px / 1.45** |
| Page title | `clamp(3rem, 5vw, 4.5rem)` | **20px** |
| Container | rounded-3xl glass card, shadow | **flat plane, 1px hairline, no shadow** |
| Background | radial brand glow | **flat. An OS has no weather.** |
| Radius | up to 24px | **4–10px** |
| Colour | brand-led, expressive | **neutral-led, colour is state only** |

The token **names** are identical across both apps on purpose — one vocabulary company-wide
(`--background`, `--card`, `--border`, `--brand`, …). Only the values differ, plus a small
admin-only set (`--row-h`, `--status-*`, `--elev-*`, `--sidebar-w`, `--chart-*`).

## 2. The aesthetic direction

Picked once, in the brief: **Swiss industrial print, de-radicalized**.

Taken: rigid modular grid, visible hairline structure instead of card chrome, mono
micro-labels for every piece of metadata, extreme scale contrast (an 11px mono label above
a 28px numeral), a purely utilitarian palette, zero decoration.

Explicitly rejected: CRT scanlines, halftone and dither, phosphor glow, ASCII framing,
viewport-bleeding numerals, all-caps prose, and the skill's ban on Inter (the repo's
existing type stack outranks it).

**The one risk taken:** panels have no shadow and no hover lift. Forty modules of dense
tabular data cannot each be a floating card without becoming visual soup — so cards float
and *planes tile*, and this app tiles.

## 3. Colour is state, never decoration

Six tones. Not five, not seven. They describe **what the operator must do**, not mood:

| tone | meaning |
|---|---|
| `neutral` | inert. Nothing is happening and nothing should. |
| `info` | in flight, on the happy path, no human needed. |
| `progress` | actively being worked by someone. |
| `warning` | a human must act soon or this goes wrong. |
| `danger` | already wrong: failed, lost, overdue, rejected. |
| `success` | terminal-good: won, signed, paid, launched. |

Every enum in `schema.prisma` maps to exactly one of them in **`lib/status.ts`**, which is
the only place a state becomes a colour. Screens call `statusOf(registry, value)` and
render `<StatusPill />`; no screen writes `bg-success/10` by hand. A seventh colour, or the
same enum rendered two ways on two screens, is a bug.

Chart series colours are a **separate**, validated categorical ramp (`--chart-1..6`).
Status tones are reserved and are never reused as "series 4".

### Accessibility (measured, not asserted)

Every text and status pair clears **WCAG 2.2 AA (4.5:1)** at body size, in both themes, on
`--card`, `--bg`, `--surface` and `--surface-2`, and each status tone clears 4.5:1 against
its own 10% tint.

The third text rank deserves a note. A "meta" grey at 3.6:1 fails AA no matter how small
the text is meant to be — 12px is not large text. So there is **no lighter third grey**:
rank three is carried by size, weight and the mono face instead. That is
`docs/design-principles.md` C4 applied literally — colour reinforces hierarchy, it never
creates it.

Chart palettes were validated with the `dataviz` skill's own script (lightness band,
chroma floor, CVD ΔE on adjacent pairs, normal-vision floor, contrast) for light and dark
separately. Dark is a *selected* palette, not an inverted light one, because inverting
fails the band and CVD checks.

## 4. Architecture

### Server-first, with small client islands

Every route is a server component reading Prisma directly. The client bundle is three
things: the shell (sidebar collapse, palette, mobile drawer), the `DataTable`, and the
per-page mutation islands. There is no data-fetching client component and no loading
spinner where a server render would do.

### Derived state, not stored state

Two things in this system are computed rather than columns, and both are deliberate:

- **Pipeline stage** (`deriveClientStage`) is the furthest-along artifact a client has: a
  signed contract beats a sent contract beats a read proposal beats the status field. The
  board therefore cannot disagree with the documents. Four of the eight board columns are
  read-only for exactly this reason, and the board says so rather than accepting a drag and
  silently reverting it.
- **The record timeline** (`lib/activity.ts`) is derived from the timestamp columns that
  already exist (`sentAt`, `readAt`, `signedAt`, `paidAt`…), so it cannot disagree with the
  documents. It sits beside — not instead of — the audit trail: every mutation writes an
  `ActivityEvent` at its mutation site (`recordActivity`/`recordChange`), which is what
  answers *who* changed *what*, *when*, and from what to what. `/audit` reads that table;
  each detail page shows its own slice through `EntityAudit`.
- **Payment OVERDUE, subscription PAST_DUE/GRACE/EXPIRED, service expiry and warranty** are
  derived from dates at read time and never settable from a form.

### Permissions

`lib/rbac.ts` holds a role × subject × action matrix and the mapping from the database's
three roles onto the six product roles. The `/team` permission grid is **generated from
that matrix**, so it cannot describe something the server does not enforce.

The product role is `User.opsRole` when one is assigned, otherwise derived from the auth
role (SUPERADMIN → OWNER, ADMIN → ADMIN); the auth role alone still decides who may sign in.
Roles are assigned on `/team`, audited.

Client-side `can()` decides whether to *render* a control. It is never the access decision:
every server action calls `authorize(action, subject)` (`lib/authorize.ts`), and API routes
pass `can: [action, subject]` to `withAdmin`.

### Honesty about what does not exist

A capability with nothing behind it says so in place — `Planned` (`components/os/planned.tsx`)
or "Integration required" for anything that needs a provider that is not connected (card
payments, refunds, tax). As of the OS pass no whole module is a placeholder; `/automations`
lists the two jobs that really run (GitHub ingest, the renewal sweep) and marks the rest
planned.

They are **not** faked with mock rows. A dashboard full of invented clients teaches an
operator to trust numbers that are not real, which is a worse outcome than an empty screen.

## 5. The component kit

| component | job |
|---|---|
| `os/data-table` | the load-bearing one: sort, search, column visibility, selection, bulk actions, density, saved views, and a genuinely different mobile rendering (cards, not a shrunken table) |
| `os/page-header` | the fixed page anatomy: identity · state · what changed · what needs attention · what you can do |
| `os/detail-layout` | header / main / aside, with the aside below main on mobile rather than hidden |
| `os/panel` | the flat plane. Not a card: no shadow, no lift, no rounded-3xl |
| `os/timeline` | one renderer for every activity feed, so an event looks identical everywhere |
| `os/action-center` | the ranked cross-module "what needs a human" list |
| `os/board` | drag-and-drop pipeline, with a keyboard-equivalent stage select on every card |
| `os/stat-tile` | the 11px label / 28px numeral scale contrast |
| `os/chart` | bar, column, legend, hero number — built to the dataviz procedure |
| `os/empty-state` | explains the section, why it is empty, and the action that fills it |
| `os/error-state` | what happened · what it means · how to recover · technical detail |
| `os/planned` | the honesty valve for unmodelled modules |
| `ui/badge` → `StatusPill` | the single way a state is drawn |
| `ui/menu` | the one menu vocabulary — surface, item, label, separator, indicator. `ui/dropdown-menu` and `ui/select` both render from it, so every floating list is the same plane |
| `ui/segmented-control` | one-of-N, always visible. Radio semantics with arrow-key selection; exports `segmentClass` so the filter chips (activity, invoices, automations) and the board/list switch share the exact visual without pretending to be a form control |
| `ui/input` → `Field` | the label/hint/error wiring, passed down by CONTEXT, not by cloning the child. A wrapped control (leading icon, colour swatch, suffix) would otherwise leave the label pointing at a `div` |

### Reconstruction kit (2026-10)

Built first for the OS reconstruction; pages use these and never hand-roll copies.

| component | job |
|---|---|
| `os/confirm-dialog` → `ConfirmDialog` | the one confirmation for destructive and money actions. States the consequence on its own line, disables both buttons while pending, stays open on `{ ok: false, message }` and shows the server's message inline, toasts only a message the server returned. `requireText` gates confirm behind a typed word. Trigger element or controlled `open` |
| `os/inspect-sheet` → `InspectSheet`, `inspectHref` | the list inspector, opened by `?inspect=<id>` and rendered by the server, so it deep-links and survives refresh. Closing hides it at once and drops only `inspect`. Right panel ≥768px, bottom sheet below. `inspectHref(pathname, searchParams, id)` is server-callable (the client half lives in `inspect-sheet-client.tsx`) and keeps every other param, `page` included |
| `os/section-index` → `Dossier`, `DossierSection` | the detail page as one scroll: sticky 180px index on lg, sticky chip row under the topbar below lg, optional facts aside (sticky column on xl, above the sections below). IntersectionObserver scroll-spy on the window, `aria-current="location"`, smooth jumps unless reduced motion |
| `os/list-row` → `List`, `ListRow` | the one non-table row: 28px tone square, title, meta, trailing, chevron. `href` navigates, `inspect` opens the inspector without scrolling, `expandable` reveals in place (`aria-expanded`), none is static. Controls go in `actions`, outside the clickable area |
| `os/pager` → `Pager` | server pagination as links: "41–60 of 312", prev/next disabled at the edges, optional per-page sizes. No `"use client"`, so `hrefFor` is passed from the server page |
| `os/filter-bar` → `FilterBar`, `FilterChip`, `ActiveFilters` | filters as URL params via `router.replace` (no scroll, `page` dropped on change); search debounced 250ms; chips share `segmentClass`; `ActiveFilters` shows removable chips with readable labels |
| `os/soon` → `Soon`, `SoonButton` | the honesty valve for one control: a neutral SOON mark whose tooltip (and screen-reader text) names the missing backend piece. `SoonButton` is a disabled Button wrapped so its tooltip still opens. `planned` stays for whole modules |
| `os/page-skeleton` → `ListPageSkeleton`, `DetailPageSkeleton`, `OverviewSkeleton` | `loading.tsx` skeletons drawn on the same grid as the real page (header → strip → filters → table; header → index + sections + aside; strip → stream + aside), so nothing jumps when it lands |
| `os/pager` → `CursorPager` | the cursor twin of `Pager` for feeds that page by cursor rather than offset (`/audit`, where events keep arriving and offsets would drift): "Newer" / "Older" links, either edge disabled when there is nothing on that side |
| `os/data-table` `BulkAction.confirm` | a bulk action that destroys or moves money declares `{ title, description?, consequence?, confirmLabel?, tone? }` (or a function of the selected rows) and runs through `ConfirmDialog`; `onRun` may return `{ ok, message }` so a refusal is shown, not toasted as success |
| `os/filter-bar` `ActiveFilters` `clears` | a filter chip may name the params that depend on it (`product` clears `source`), so removing it never leaves an orphaned narrower filter. Filter changes drop `page` and `cursor` |
| `os/error-state` → `AlertBar` | `action` / `href` are optional — a warning that has no recovery step says so without an empty button |

### The control rail

Every interactive control resolves its height from three tokens in
`app/globals.css`, and nothing hardcodes its own:

| token | px | who uses it |
|---|---|---|
| `--control-h-sm` | 28 | toolbars, table filters, the whole topbar rail, sidebar rows, inline row actions (`Button size="sm"` / `"icon-sm"`) |
| `--control-h` | 32 | the default: `Input`, `SelectTrigger`, `Button` default, and every page-header action |
| `--control-h-lg` | 36 | the single prominent action on a page (rare); also the tab strip height |

Every page action goes through `ui/button` — `<Button asChild variant="outline">`
wrapping the `Link`/`a`, never a hand-written `inline-flex h-… rounded-md border …`
copy of the button styles (40 of those were converted on 2026-09-06). The two
survivors in the proposal builder are deliberately NOT buttons: they are
single-select segmented controls with a `border-brand bg-brand-soft` selected
state, which `Button` has no variant for. They still read the rail token.

`QuickActions` stacks its children full-width, so it overrides `Button`'s centred
content back to the inline start — a stacked list of actions reads as a menu.

Every text control is `Input` / `Textarea`, every menu is `Select` or
`DropdownMenu`, and every overlay is a `Sheet` — the hand-built overlays on
/settings, /tasks and /audit (no focus trap, no Escape, no dialog role, 12px
type) are gone. Two exceptions, both deliberate:

- **the invoice viewer** stays a custom modal, because it is a printable
  document and `print:` rules have to reach it;
- **`os/board`'s stage picker** stays a native `<select>`, because it is the
  keyboard and screen-reader equivalent of dragging a card.

Two rules follow from it:

1. **A page-header action is 32, a toolbar action is 28.** Never mix the two in
   one row — that is exactly how the topbar `+` ended up 4px taller than the
   search chip beside it (`Button size="icon-sm"` was 32 while the rest of the
   rail was 28).
2. **Buttons read from the admin token layer only.** No stock shadcn `accent`
   colours, `shadow-xs`, `ring-[3px]` or `dark:bg-input/30` — those belong to a
   different design system and were the reason `Select` and `DropdownMenu`
   looked like two different products when opened from the same toolbar.

## 6. Keyboard

`⌘K` / `/` command palette · `[` collapse sidebar · `?` shortcut sheet · `g` then a key to
jump — the list is `GOTO_SHORTCUTS` in `lib/nav.ts`, and the shortcut sheet is generated
from it, so this doc does not repeat it. The palette searches navigation instantly (static) and
records over the network (debounced, abortable), so it is usable the millisecond it opens.

## 7. Known gaps

- Two-factor (TOTP + backup codes) can be required with `ADMIN_MFA_REQUIRED=true`; until it is,
  an operator may skip enrolment in their own browser.
- No card processor: payments are recorded by hand (`metadata.manual`), refunds and partial
  captures read "Integration required".
- Tax is not configured; invoices say so instead of printing a rate.
- Signing is click-to-sign with name, timestamp and IP: evidence of assent, not a qualified
  electronic signature.
- No free-form WhatsApp compose. Outside the 24-hour session window only approved templates
  send, and a compose box that silently fails half the time is worse than none.
- Email sends only when a transport is configured (`docs/email.md`); with none, nothing is
  sent and the settings page says so.
- The renewal cron sweep writes notifications but no `ActivityEvent`; `/integrations`
  infers its last run from the newest `RENEWAL_DUE` notification.
- Invoices have no legal name, address or tax rate: `CompanySettings` has no columns for
  them, so the issuer falls back to one constant and the tax line says no rate is configured.
  The contract page prints the studio name as a literal for the same reason.
- Plans are schema rows with no admin table; editing a plan reads Soon on `/pricing`.
- `setProjectPhase`, `setProjectStatus` and `setMeetingStatus` in `_actions/records.ts` still
  throw on refusal; every caller wraps them and shows the message, but a new caller must too.
- The services API (`/api/admin/services`) is gated on project capabilities, so a PM may
  add and edit services without reading money: for a role outside `canSeeFinance` the edit
  sheet leaves price, cost and currency out of the request, and the route answers with no
  price, cost or opened amount. Other admin APIs have not been audited for the same split.
- The leads badge and `/leads?stage=new` read every proposal a client has, while
  `deriveClientStage` reads only the newest; a client whose newest proposal is a draft but who
  once received an older one counts as contacted in the badge. The two agree on every client
  with one proposal.
- The action centre reads 25 rows per source and engineering health shows at most 8 products;
  both say "more" rather than counting what they did not read.

## 8. What the visual QA pass found

Every route was walked signed-in, in both themes, at desktop and mobile. Nine defects
came out of it; all are fixed. Recorded here because most of them are the kind that only
appear against real data.

1. **Nested `<a>` in mobile cards — hydration failure.** The mobile card wrapped the whole
   record in a `Link`, and a phone column rendered `<a href="tel:">` inside it. Invalid
   HTML; React bailed out of hydration on every list screen at mobile width. Fixed by
   making the card a `div` with a stretched link on the title (`after:absolute inset-0`)
   and lifting interactive children above it with `relative z-10`.
2. **Tables overflowed their plane.** Without `table-layout: fixed`, a long cell expands
   its column and `truncate` never fires — one verbose form submission pushed the
   Received column off-screen. Added `table-fixed`, `overflow-hidden` on cells, and a
   `9rem` floor on width-less columns so the identity column can never collapse.
3. **Column widths fought each other.** Percentage identity columns plus fixed pixel
   metadata columns squeezed client names to "Ali Abd…". Now exactly one column per table
   is width-less and absorbs the remainder; context columns drop out at `xl` before the
   name gets squeezed.
4. **Sidebar groups were collapsed by default**, so the dashboard showed two links and
   nine chevrons. The grouping *is* the progressive disclosure; a second collapsed layer
   on top hid the application. Groups now open by default, remember what the operator
   closes, and always open when the current route is inside them.
5. **Board cards had a dead band.** The stage `<select>` was `opacity-0` until hover but
   still occupied layout. It is also the keyboard path for moving a deal, so hiding it was
   wrong twice. Now permanently visible as a muted mono control.
6. **Command palette lost results to a race.** Aborting the previous request was not
   enough — the loser could still write an empty list and leave the spinner running. Added
   a sequence guard; an aborted request now writes nothing at all.
7. **Empty "Go to" group** rendered its heading with no items when a query matched no
   navigation entry.
8. **A zero drew a bar.** `Math.max(1.5, …)` gave every zero-value row a visible sliver —
   a number the eye reads before it reads the label. Zero now draws nothing.
9. **Raw uuids in the UI**: the proposal sidebar printed `createdBy` verbatim. It resolves
   to the user's name now, with a short id as the fallback.

Plus three squeezes: the funnel's count/percent columns collided, health metric pairs
overlapped on long values, and tab strips showed a scrollbar track.

## 9. The proposal builder

The last surface still speaking the old layout language. It was one ~800-line scroll:
fifteen stacked sections, the estimator at the top, the derived totals at the bottom, and
a validation list somewhere in between. Nothing about it said which slide you were editing.

**It is now indexed by the document.** A rail lists the deck in order — Scope & price,
then slides 01–07, then Preview — and one pane is open at a time. Each rail entry carries
its own validation count, so "where is the problem" is answered without scrolling.

- **Setup is a step, not a header.** The five estimator inputs re-seed the whole deck, so
  they get their own pane and a hero range readout. The deck entries stay locked until an
  estimate exists, because there is nothing to edit before then.
- **The action bar is always visible** and carries the three numbers that decide whether a
  proposal is sendable: total, weeks, payment split. When the split is not 100% the number
  goes red in the bar, in the page header, and on the rail entry that owns it.
- **"N issues to fix" is a button** that jumps to the first group that has one.
- **Issues no group claims** get their own panel — a schema error with no field to attach
  to must not fail silently.
- **Mobile is a horizontal chip strip**, not the vertical rail. The rail is 700px tall;
  putting it above the first field on a phone would be exactly the "shrink the desktop
  layout" mistake §33 forbids.
- **Primitives moved onto the OS token set**: 32px controls, 13px body, mono numerics with
  the spinner arrows removed, hairline list rows instead of filled boxes. Labels are now
  wired to their controls with `htmlFor`/`id` through a field context, and errors are
  announced via `aria-describedby` — previously every label pointed at nothing.

**The generated deck is byte-for-byte unaffected.** `proposal-builder.ts`,
`proposal-content.ts`, `proposal-defaults.ts`, `proposal-schema.ts` and both API routes
were not touched; the POST body is the same five fields; the seeding rule (estimator
midpoint, re-seeded only when the estimator inputs change) is unchanged. Verified by
running the real generator from the redesigned form — the preview renders the same cover,
the same slide 2/3/4, the same accent.

## 10. Final audit — logic defects found and fixed

A last pass over the whole application, hunting for correctness rather than appearance.
Eleven defects; all fixed.

### Broken feature

1. **Meeting approve/decline threw for every role, owner included.** `setMeetingStatus`
   authorised `approve` on the `project` subject, and no role in the matrix has `approve`
   on `project` — the permission table only grants it on `proposal` and `contract`. Both
   buttons on `/calendar` were dead. Added a real `meeting` subject and used it.

### Money

2. **Amounts were summed across currencies and printed as EGP.** Proposals can be issued
   in USD (the builder offers it), so a single USD deal silently corrupted the weighted
   pipeline, open value, average deal, accepted value, won value, per-source and
   per-project-type totals, and both monthly charts. Every aggregate now sums *per
   currency* via `sumByCurrency` / `scaleByCurrency` and renders with `moneyByCurrency`.
   The monthly column charts plot the dominant currency and say so rather than adding.
3. **Payments had no currency at all.** `Payment.amount` has no currency column, so every
   payment figure was EGP by assumption. It is derivable — payment → project → contract →
   proposal — and now is, on the payments list, the dashboard cash panel, the project and
   contract detail pages, and the activity feed.
4. **A month-over-month percentage across mixed currencies.** The signed-this-month trend
   compared two cross-currency totals. It now returns `null` unless both months are in one
   and the same currency.

### Dates

5. **The calendar was off by a day.** Entry keys used `toISOString()` (UTC) while the month
   grid was built from local dates. In Cairo (UTC+2/+3) anything stored near local midnight
   landed on the previous cell. All day keys are local now, including "today".

### Counting

6. **The Inbox badge counted every inbound message ever**, not the ones nobody answered —
   contradicting the rule stated in `lib/nav.ts` that these badges are "needs a human"
   counts. It now counts threads where the client spoke last.
7. **The action centre only looked at the 100 newest inbound messages**, so a quiet client
   whose message aged out of that window silently stopped appearing. It now groups by
   client and fetches only for the clients genuinely waiting — correct *and* cheaper.
8. **The lead score counted our own outbound messages as "replies on WhatsApp"**, so
   sending a proposal raised the lead's score. The score measured our activity, not theirs.
   Inbound only now; the column is labelled "Replies".
9. **On-time delivery punished projects with no target date** — they counted as late,
   making the percentage a measure of data entry. They are now excluded from the
   denominator and reported separately.
10. **Analytics read the raw `status` column for "qualified"** while every other screen
    derives the stage from the furthest-along artifact. Now derived, like the rest.
11. A dead `leadToProposal` metric that was never rendered and was wrong anyway (it divided
    proposal count by client count and called it a conversion rate). Removed.

### Smaller

- A declined or expired contract sat on "Sent for signature" in the lifecycle strip, which
  reads as still in flight. Dead ends now stop there and say why.
- The pipeline board's optimistic override outlived the data it corrected; it is derived
  now, so a card cannot be pinned to a column the records have left.
- Unconverted estimates linked to the page they were already on. `rowHref` may now return
  undefined per row.
- The slide-heading inputs in the proposal builder had placeholders but no accessible name.

## 11. The OS pass (2026-10) — capability map

Every number on Today links to the filtered list it counts; every related record is an
`EntityLink` resolved through `lib/entity-links.ts`; lists accept `?client=` / `?project=` /
`?product=` and show the filter as a removable chip.

| Area | Routes | What it does now |
|---|---|---|
| Today | `/` | Attention queue (`lib/action-center.ts`), engineering status, revenue panel (finance roles), pipeline, delivery, activity |
| Clients | `/clients`, `/clients/[id]` | Hub with tabs: overview, deals, delivery, sites, money, conversations, meetings, notes, audit; notes are audited without their body |
| Sales | `/leads`, `/pipeline`, `/proposals`, `/contracts`, `/documents` | Filters by stage/status/client; marking a contract SIGNED runs `handleContractSigned` |
| Delivery | `/projects/[id]`, `/tasks`, `/calendar` | Editable project with milestones and its engineering; full task edit |
| Engineering | `/products/[id]`, `/deployments/[id]`, `/deployments/builds/[id]`, `/logs`, `/incidents/[id]` | Read-only CI history (ingest only), log ↔ incident linking |
| Revenue | `/payments` (Billing), `/invoices`, `/renewals`, `/maintenance/[id]`, `/services`, `/pricing`, `/analytics` | Record payment / new charge, outstanding per client per currency, persisted invoice numbers (`lib/invoice-number.ts`), retainer plan changes and confirmed status changes, first-period payment on create, audited price overrides, MRR (`lib/revenue-metrics.ts`) |
| System | `/team`, `/settings`, `/audit`, `/integrations`, `/automations`, `/notifications` | Invite (set-password link), role assignment, own sessions, 2FA backup codes; audit filters by actor/action/entity/date with before → after; integrations and health merged |

Verification for this pass: `verify:security`, `verify:lifecycle`, `verify:services`,
`verify:change-requests`, `verify:github`, `verify:slack`, and, against a scratch database,
`verify:engineering`, `verify:admin-api`, `verify:maintenance`, `verify:delete`,
`verify:invoice-number`. The migration `20261003150000_os_completion` must be deployed to
production before this code runs there.

## 12. The reconstruction (2026-10-03)

One pass over every page, section and component under one direction, chosen as a hybrid of
the three prototypes:

- **Shell** — sidebar + topbar on desktop; on a phone a bottom bar (Today · Inbox · Clients ·
  Products · Menu) whose slots fall back along a route chain per role, so no tab is dead or
  doubled, and a Menu sheet that reaches every surface including the ones without a sidebar row.
  The breadcrumb drops a group crumb that would repeat the page name.
- **Today ("Now")** — one count strip where every number links to the list that applies the
  same predicate (`/proposals?status=open`, `/contracts?status=SENT`,
  `/deployments?tab=builds&status=FAILED&window=24h`, `/tasks?due=week`,
  `/payments?status=overdue`, `/renewals?attention=1`, `/leads?stage=new`,
  `/inbox?filter=waiting`), then the attention stream and the engineering/revenue aside. A tile
  whose list the role cannot open is not rendered.
- **Lists** — ledger tables (`DataTable`) with `FilterBar` / `ActiveFilters` in the URL and a
  server-rendered `InspectSheet` opened by `?inspect=<id>`, so an inspected row deep-links.
  `lib/entity-links.ts` now sends payments and services to their inspectors.
- **Detail pages** — the `Dossier`: one scroll, sticky section index with scroll-spy, facts aside.
- **Actions** — destructive and money actions go through `ConfirmDialog` with the consequence
  and the amount; toasts carry the server's own message; refusals stay inline.

### Access, decided once

`lib/page-gate.ts` `gateRoute` runs on every dashboard page (50/50), and the sidebar, the
phone bar, the Menu sheet and the palette derive visibility from the same `ROUTE_GATES` through
`pageDecision`, so a role never sees a link to a page that refuses it
(`NAV_WIDER_THAN_GATE` is empty and should stay empty). Money is a second, finer gate:
`canSeeFinance` hides figures — prices, payment amounts, service prices, the confirmation
amounts — for roles that may still open the page.

Where the line sits (a ruling, open to revisit): **deal values** — proposal and contract totals —
are visible to every role that may view proposals, because selling needs them; `canSeeFinance`
gates the **money ledger**: payments, invoices, service price and cost, retainer amounts and
revenue. Ledger money is stripped **on the server** (`toSubscriptionView`, `redactMoney`, the
change-request rate and amounts, the dashboard feed's `NOT` clause on finance and pricing
events) — a figure never travels to a browser that hides it. A control the server would refuse
is hidden, or disabled with a `Hint` when hiding would leave a confusing hole; links into a
route the role cannot open go through `roleCanOpen`.

### Filters added so a count can link to its list

- `/deployments?window=24h|7d|30d` (on `createdAt`, kept across tabs).
- `/renewals?attention=1` — exactly `RenewalRow.needsAttention`, the predicate the sidebar badge
  counts (`countRenewalsNeedingAttention`).
- `/leads?stage=new` — `UNCONTACTED_WHERE` in `lib/dashboard-data.ts`, shared with the badge.
- `/incidents?deployment=<id>` — the incidents a deployment opened.

### Server refusals added in this pass

- The proposal and contract send routes refuse a record that is no longer DRAFT or SENT (409),
  matching the condition the UI already used to show the button.
- Converting a submission marked SPAM to a client is refused with the reason.
- Length limits in messages are formatted from the constant they check, never typed twice.

### Verification

`tsc --noEmit` 0 errors; eslint clean on every changed file; `bun run validate` (price-literal
guard, parity report, billing-cycle checks); all thirteen `verify:*` scripts, the
database-backed ones against a scratch database — never production.

A route sweep opened all 53 dashboard routes as each of the five roles (OWNER, SALES, PM,
FINANCE, VIEWER), on desktop and on a 390px phone, against a seeded scratch database. Dark mode
was only screenshotted for OWNER, on seven pages; the other roles were not checked in dark.
What the sweep found, and what was fixed from it:

- Dossier pages (client, contract, incident, product, project, proposal) were wider than a
  phone: the section index's single implicit grid column sized to its chip row. Now
  `minmax(0,1fr)` (`components/os/section-index.tsx`).
- `/logs` was wider than a phone: the filter bar's trailing group could not wrap
  (`components/os/filter-bar.tsx`).
- Builds and deployments showed a delete control to every role, while `deleteRecords` allows
  it to OWNER only (`delete project`). The tables and both detail pages now ask `can()` first.
- The Today feed and a client's history linked every event to its record, including records
  the viewer's role cannot open (a submission, for PM and FINANCE). Each event now carries
  `linkable`, decided on the server with `roleCanOpen`; an unopenable record is named without
  a link. Re-checked by opening every link on Today as PM, FINANCE, SALES and VIEWER: none
  lands on "Not in your role".
- Rows opened their inspector only from the title. A click anywhere on a list row, a task
  card or a service row now opens it (`components/os/row-open.ts`); clicks on a control inside
  the row keep their own meaning, and the title is still the keyboard's way in.

Not confirmed: a React "unique key" warning on `/deployments` (the filter element now carries
a key, not re-checked in a browser), and one report of `/contracts?inspect=<signed contract>`
not opening — the server renders that inspector, and it did not reproduce.

## 13. Recorded projects (2026-10-04)

A project used to exist only as the child of a signed contract (`Project.contractId` was
required and unique), so work built before this system — and anything a client had made
elsewhere — had no row for a domain, a retainer, a change request or a charge to attach to.
Inventing a proposal and a contract to open one would have been a record of a signature that
never happened.

- `Project.contractId` is now optional (still unique; the foreign key still restricts a contract
  delete). `Project.origin` says how the row came to be: `CONTRACT` (opened by
  `handleContractSigned`, the normal route) or `RECORDED` (entered by hand). `Project.currency`
  is set only for a recorded project; a contract project keeps reading its proposal's currency.
  Migration `20261004120000_project_origin`.
- One resolver, `projectCurrency` in `apps/admin/lib/project-currency.ts`, answers a project's
  currency for both kinds (`contract.proposal.currency ?? currency`). Every screen, action,
  the client portal and the verify scripts read through it; `PROJECT_CURRENCY_SELECT` /
  `PROJECT_CURRENCY_INCLUDE` are the fields it needs.
- Recording is `recordPastProject` (`_actions/projects.ts`): client, name, currency, finished or
  still supported, optional live/staging URL, optional launch and completion dates. Unknown dates
  stay null. It creates no payments, tasks or services and writes `project.recorded` with
  `metadata.manual = true`. Creating the row already COMPLETED is the documented exception to
  "COMPLETED only through Close project" — there is nothing to close.
- The sheet starts from what the client's record already holds, so the operator only adds what
  is missing. On picking a client (or arriving with `?client=`), fields the operator has not typed
  in are filled: the name from the first product not yet on a project; the live URL from that
  product's production URL, else the client's website, else a DOMAIN service's host name; the
  staging URL from the product; the currency from the first loose service, else the client's
  latest proposal. A hint under the client names each source, or says the record holds nothing.
  Nothing is saved unseen — these are starting values in the form.
- **Attach.** The client's products and services that belong to no project yet (`projectId`
  null; cancelled services excluded) are listed ticked under *Attach to this project*; unticked
  ones stay where they are. In one transaction the project is created and the ticked rows —
  re-checked on the server to be that client's and still loose — get its `projectId`. Attaching
  moves existing rows and never creates one; it needs `edit client` on top of `create project`
  (a role without it is refused with a message, nothing written). The audit event's `after`
  carries `attachedProducts` / `attachedServices` (names).
- Where to find it: the *Record a past project* button on `/projects` (roles that may create a
  project), `/projects?new=recorded&client=<id>` from a client's Next steps, and the sheet in
  `projects/record-project-sheet.tsx`.
- What a recorded project shows: a *Recorded* pill on its page and in the client hub; "Recorded —
  no contract" where the contract link would be; no contract value row and "—" in the projects
  table. Never a zero. Contract revenue (`lib/revenue-metrics.ts`) is read from contract rows, so a
  recorded project contributes nothing to it. Its dates read *Recorded* where a contract project
  reads *Started* (page header, aside and the projects table's Started column), the Elapsed row is
  omitted, the timeline opens with "Recorded in this system", and its empty Money section says
  payments made before it was recorded were not carried over — never the 50/30/20 promise.
- A client with any project derives as **Signed** (`deriveClientStage`): work delivered is business
  won, so a client whose only project is recorded leaves Leads, the uncontacted count
  (`UNCONTACTED_WHERE`) and the nav's "waiting" badge. Every caller of `deriveClientStage` selects
  `projects: { select: { id: true }, take: 1 }`.
- Browser-verified on the scratch database 2026-10-04: the record sheet (pre-fill, validation,
  redirect), the recorded project page, `?new=task|charge|retainer|incident` pre-fills, the client
  stage change, and the projects row menu. The same day: the record-derived pre-fill (on arrival
  with `?client=` and on picking a client) and attaching — a ticked product and domain service
  moved onto the new project, an unticked hosting service left loose, the audit row naming both.
- Pinned by `verify:admin-api` ("Recorded project (no contract)"): created without a contract,
  `projectCurrency` reads its own currency, the client page lists no payments for it, the delete
  registry plans and removes it with its origin in the snapshot.

## 14. One-time services (2026-10-04)

A client sometimes asks Altruvex to buy something once on their behalf — a theme, a lifetime
plugin licence. That is a `ClientService` with `termMonths` null (migration
`20261004150000_one_time_service`), not a new model, so price, internal cost, provider,
reference and the project/product links work exactly as for a recurring service.

- `isOneTime` in `lib/service-lifecycle.ts` is the one test every surface uses. An ACTIVE one-time
  service derives the state `one-time` (label "Owned", success tone), never pending/expiring/expired,
  never crosses an alert threshold, and `needsAttention` is false.
- Billing: "Mark bought" (PATCH `activate`) opens exactly one PENDING payment through the same
  `termBilling` path as a recurring first term. Renew, remind, set-expiry and the renewal sweep refuse
  or skip it (`renewRefusal` — the route answers with it, the screens hide the action on it).
- Totals: `annualised(price, null)` is 0, so a purchase never inflates a yearly services figure;
  `termLabel` reads "One-time".
- Proposals: a service line may be one-time; the deck prints "ONE-TIME", the contract
  "One-time · Bought once", and signing opens a one-time PENDING service (`firstTermIncluded` false).
  Older proposal JSON with a number keeps parsing. The deck block heading is still the editable
  `labels.services` default ("Recurring services") — rename it per proposal when it holds only
  one-time lines.
- Pinned by `verify:services` (lifecycle cases + proposal → deck → contract → signed service).
- Known parity gap, shared with recurring services: creating a service with `startedAt` already set
  opens no payment.
