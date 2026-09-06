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
- **The activity timeline** (`lib/activity.ts`) is derived from the timestamp columns that
  already exist (`sentAt`, `readAt`, `signedAt`, `paidAt`…). A parallel event log would be
  a second source of truth that drifts the first time a row is corrected by hand. The cost
  is that events with no column ("Ali called them") cannot be recorded — that is what the
  planned audit log and a Note model are for, and they *append* to this feed.

### Permissions

`lib/rbac.ts` holds a role × subject × action matrix and the mapping from the database's
three roles onto the six product roles. The `/team` permission grid is **generated from
that matrix**, so it cannot describe something the server does not enforce.

Client-side `can()` decides whether to *render* a control. It is never the access decision:
every server action in `app/(dashboard)/_actions/records.ts` re-authorises independently.

### Honesty about what does not exist

Modules with no model behind them (`/tasks`, `/email`, `/invoices`, `/audit`,
`/automations`) render `PlannedModule`: what the module will do, what must exist first, and
where the work happens today. They are visible in the nav but demoted.

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

`⌘K` / `/` command palette · `[` collapse sidebar · `?` shortcut sheet · `g` then
`d i l k c p n o m y a s` to jump. The palette searches navigation instantly (static) and
records over the network (debounced, abortable), so it is usable the millisecond it opens.

## 7. Known gaps

- No second factor. Password compromise is full compromise of this application.
- No audit table — see §4; the derived timeline cannot show who changed a value or what it
  was before.
- Roles beyond ADMIN/SUPERADMIN are enforced in code but cannot be assigned until the
  schema carries them.
- Signing is click-to-sign with name, timestamp and IP: evidence of assent, not a qualified
  electronic signature.
- No free-form WhatsApp compose. Outside the 24-hour session window only approved templates
  send, and a compose box that silently fails half the time is worse than none.
- No mail transport, so nothing is emailed.

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
