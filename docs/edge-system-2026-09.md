# Edge system — unification record (September 2026)

This is the record of the pass that unified every border and radius in `apps/www` into one system.
The rules themselves live in `design.md` §6.1. This file keeps the decisions, the QA checklist,
and the exception record, so a later change can check what was decided and why.

## 1. Decisions (Ali, 2026-09-18 → 19)

| # | Decision |
|---|---|
| D1 | `border-t-2 border-foreground` is a named exception, the **ledger-head-rule**. It is valid only as the top rule that opens a ledger or register data block. It is never thinned and never used as generic emphasis. |
| D2 | A third role, **Grid (C)**: an outer border plus a panel radius, with internal 1px lines at `--border-subtle` and zero radius. It applies only to tabular or grid data (the estimator, transparency grids, ownership stack, maintenance table). |
| D3 | The `ctl-*` (control, height-keyed) and `panel-*` (container, role-keyed) families stay fully separate. |
| D4 | New names `--radius-panel-sm/md/lg` (22/28/34). The legacy `rounded-sm/md/lg` sites were migrated to `ctl-*` one by one, against each site's measured height. |
| D5 | `--border-subtle` is an alias of `--s-border`. No new colour. |
| D6 | `apps/admin` is out of scope. **Superseded 2026-10-05 by §8** (one system, two dialects). |
| D7 | The accent side rule is a decorative exception, and uses logical properties only. |
| D8 | Semantic status cards keep tinted edges. Everything else resolves to `--border-subtle`. |
| D9 | The `corner-shape: squircle` rule was restored. It is the primitive the Apple-like goal depends on. |
| D10 | `packages/ui/src/www` is not migrated to the new tokens, because it is shared with admin, whose separate token layer would resolve them to nothing. Its physical-property RTL bugs were fixed anyway: calendar `rounded-l/r` → `s/e`, calendar `pl/pr` → `ps/pe`, select `pr/pl/right` → `pe/ps/end`. **Superseded 2026-10-05 by §8:** the tokens now live in the shared layer, so they resolve in admin too. |
| E1 | Command-palette list padding changed from `p-2` to `p-3`, so its rows are `ctl` (28 − 12 = 16) and are not capsules. |
| E2 | The code-block copy button moved to `top-2.5 end-2.5` and is `ctl-sm` (22 − 10 = 12). This also fixed the physical `right-4`. |
| E3 | The audit-lead card uses `panel-sm`. Size and importance are not reasons for a bigger radius. |
| E4 | `--radius-ctl-xs` = 4px, for elements 24px tall or less. It absorbed the `[0.3rem]`, `[0.1875rem]` and `[2px]` arbitrary values. |
| E6 | (2026-10-03) Buttons are pills (`rounded-full`) in both apps — `MagneticButton`, `CtaButtonGroup` and the shared Button primitive. This supersedes the "pill is never a CTA" line of RUL-065 for buttons only; every other control keeps `ctl-*` by height. Reason: the switch was already made across both apps and the shared primitive, and reverting one app would split the system. |
| E7 | (2026-10-06) A floating menu (Select, DropdownMenu) takes `rounded-menu` = `ctl-sm` + its 4px padding, so its corners are concentric with the `ctl-sm` rows inside it (www 16px around 12px). The other overlays keep `panel-md` by role. Reason: a `panel-md` menu around `ctl-sm` rows left a visible uneven gap at every corner. `--radius-menu` is registered in all three `cn` helpers. |
| E5 | The standards card-top rule was thinned to 1px `border-border-subtle` (language B, hover accent tint). It is not a ledger, so D1 does not cover it. |

## 2. Tokens (`apps/www/app/globals.css`; ctl-xs and panel-* moved to `packages/ui` tokens.css in §8)

`--radius-ctl-xs` 4 · `--radius-panel-sm` 22 · `--radius-panel-md` 28 · `--radius-panel-lg` 34 ·
`--radius-panel-inset` 6 (panel-sm − 1rem) · `--color-border-subtle` → `--border-subtle` →
`--s-border`, declared beside each of the six `--s-border` definitions. `--radius-surface`,
`--radius-overlay` and `--radius-section` alias the panel tokens. `--radius-nested` was unused and
was removed.

## 3. QA checklist

This was produced by a classifier that reads every `rounded-*`, `border-*`, `divide-*`,
`bg-border*` and raw `ring-*` class in `apps/www/app` and `apps/www/components`. Every class traces
either to a token (`panel-*`, `ctl-*`, `rounded-full`/`none`, a 1px side,
`border-border-subtle`/`-mid`, `transparent`/`current`, focus/hover states) or to a named exception.

**642 edge classes in 73 files: 538 → token, 104 → named exception, 0 unexplained.**
One file is pending (§5).

| Page / section | File | Edges | → token | → named exception | Status |
|---|---|---:|---:|---|---|
| Page /about | `(marketing)/about/handoff-chain.tsx` | 9 | 7 | ink (control outline / diagram) ×2 | ✓ |
|  | `(marketing)/about/name-principle.tsx` | 13 | 8 | diagram/glyph ×2, accent/selected ×2, accent-side-rule ×1 | ✓ |
|  | `(marketing)/about/page-client.tsx` | 4 | 4 | — | ✓ |
| Page /app/[locale] | `app/[locale]/error.tsx` | 6 | 5 | ink (control outline / diagram) ×1 | ✓ |
|  | `app/[locale]/layout.tsx` | 3 | 3 | — | ✓ |
|  | `app/[locale]/loading.tsx` | 1 | 1 | — | ✓ |
|  | `app/[locale]/opengraph-image.tsx` | 1 | 1 | — | ✓ |
| Page /approach | `(marketing)/approach/decision-order.tsx` | 3 | 3 | — | ✓ |
|  | `(marketing)/approach/page-client.tsx` | 34 | 26 | ledger-head-rule ×8 | ✓ |
| Page /contact | `(marketing)/contact/page-client.tsx` | 4 | 2 | ledger-head-rule ×2 | ✓ |
| Page /faq | `(marketing)/faq/page-client.tsx` | 2 | 2 | — | ✓ |
| Page /how-we-work | `(marketing)/how-we-work/page-client.tsx` | 15 | 12 | ledger-head-rule ×2, ink (control outline / diagram) ×1 | ✓ |
| Page /offline | `(utility)/offline/page-client.tsx` | 10 | 9 | status-edge ×1 | ✓ |
| Page /pricing | `(marketing)/pricing/page-client.tsx` | 6 | 4 | ledger-head-rule ×2 | ✓ |
|  | `(marketing)/pricing/price-grid.tsx` | 33 | 24 | accent/selected ×3, diagram/glyph ×2, ink (control outline / diagram) ×2, ledger-head-rule ×2 | ✓ |
| Page /process | `(marketing)/process/page-client.tsx` | 8 | 6 | ledger-head-rule ×2 | ✓ |
|  | `(marketing)/process/phase-strip.tsx` | 4 | 2 | ledger-head-rule ×2 | ✓ |
| Page /schedule | `(marketing)/schedule/page-client.tsx` | 12 | 4 | ledger-head-rule ×2, status-edge ×6 | ✓ |
|  | `(marketing)/schedule/page.tsx` | 6 | 6 | — | ✓ |
| Page /services/consulting | `(marketing)/services/consulting/page-client.tsx` | 12 | 12 | — | ✓ |
| Page /services/development | `(marketing)/services/development/page-client.tsx` | 18 | 18 | — | ✓ |
| Page /services/interface-design | `(marketing)/services/interface-design/page-client.tsx` | 17 | 16 | diagram/glyph ×1 | ✓ |
| Page /standards | `(marketing)/standards/page-client.tsx` | 20 | 15 | accent/selected ×1, ledger-head-rule ×2, diagram/glyph ×1, ink (control outline / diagram) ×1 | ✓ |
|  | `(marketing)/standards/pass-line.tsx` | 4 | 2 | ledger-head-rule ×2 | ✓ |
| Page /transparency | `(marketing)/transparency/page-client.tsx` | 20 | 20 | — | ✓ |
| Page /work | `(marketing)/work/page-client.tsx` | 6 | 4 | diagram/glyph ×1, ink (control outline / diagram) ×1 | ✓ |
| Page /work/[slug] | `(marketing)/work/[slug]/page-client.tsx` | 21 | 19 | link-underline ×1, accent/selected ×1 | ✓ |
| Page /writing | `(content)/writing/page-client.tsx` | 5 | 5 | — | ✓ |
| Page /writing/[slug] | `(content)/writing/[slug]/page.tsx` | 13 | 13 | — | ✓ |
| Articles, MDX & legal | `c/legal/legal-page-layout.tsx` | 14 | 12 | ledger-head-rule ×2 | ✓ |
|  | `c/legal/legal-prose.tsx` | 4 | 4 | — | ✓ |
|  | `c/mdx/callout.tsx` | 6 | 2 | accent/selected ×1, status-edge ×3 | ✓ |
|  | `c/mdx/code-block.tsx` | 6 | 6 | — | ✓ |
|  | `c/mdx/mdx-components.tsx` | 4 | 2 | accent-side-rule ×1, accent/selected ×1 | ✓ |
|  | `c/mdx/quote.tsx` | 2 | — | accent-side-rule ×1, accent/selected ×1 | ✓ |
| Section · /faq, /writing | `c/sections/page-hero.tsx` | 2 | — | ledger-head-rule ×2 | ✓ |
| Section · /pricing | `c/sections/plan-summary.tsx` | 1 | 1 | — | ✓ |
| Section · /pricing, /schedule | `c/sections/faq-section.tsx` | 2 | 2 | — | ✓ |
| Section · /process | `c/base/segmented-control.tsx` | 2 | 2 | — | ✓ |
| Section · /services/consulting | `c/sections/consulting-brief-section.tsx` | 14 | 8 | status-edge ×3, text-highlight (open) ×1, accent-side-rule ×2 | ✓ |
|  | `c/sections/technical-section.tsx` | 2 | 2 | — | ✓ |
| Section · /services/maintenance | `c/sections/service-maintenance/maintenance-hero.tsx` | 11 | 10 | diagram/glyph ×1 | ✓ |
|  | `c/sections/service-maintenance/maintenance-plans.tsx` | 16 | 12 | diagram/glyph ×3, accent/selected ×1 | ✓ |
| Section · /transparency | `c/sections/transparency-chapter.tsx` | 2 | 2 | — | ✓ |
|  | `c/sections/transparency-estimator.tsx` | 2 | 2 | — | ✓ |
|  | `c/sections/transparency-measures-details-section.tsx` | 10 | 9 | glass ×1 | ✓ |
| Section · /work | `c/sections/work-record.tsx` | 8 | 8 | — | ✓ |
| Section · /writing/[slug] | `c/sections/audit-lead-capture.tsx` | 9 | 8 | status-edge ×1 | ✓ |
| Section · site nav (via the language switcher) | `c/base/language-switcher-base.tsx` | 1 | 1 | — | ✓ |
|  | `c/base/theme-toggle-base.tsx` | 1 | 1 | — | ✓ |
|  | `c/sections/ownership-stack-section.tsx` | 21 | 15 | accent/selected ×4, diagram/glyph ×2 | ✓ |
|  | `c/sections/problem-section.tsx` | 7 | 7 | — | ✓ |
|  | `c/sections/process-section.tsx` | 1 | 1 | — | ✓ |
|  | `c/sections/quote-artifact-section.tsx` | 12 | 12 | — | ✓ |
|  | `c/sections/services-section.tsx` | 4 | 4 | — | ✓ |
|  | `c/sections/transparency-estimator/instrument.tsx` | 16 | 15 | accent/selected ×1 | ✓ |
|  | `c/sections/transparency-estimator/questions.tsx` | 17 | 13 | state (radio) ×1, accent/selected ×1, ink (control outline / diagram) ×2 | ✓ |
|  | `c/sections/transparency-estimator/result-panel.tsx` | 21 | 21 | — | ✓ |
|  | `c/sections/trust-section.tsx` | 16 | 12 | ledger-head-rule ×2, ink (control outline / diagram) ×2 | ✓ |
|  | `c/sections/work-section.tsx` | 6 | 6 | — | ✓ |
| Site chrome & shared components | `c/interactive/command-palette.tsx` | 18 | 18 | — | ✓ |
|  | `c/interactive/cta-button-group.tsx` | 1 | 1 | — | ✓ |
|  | `c/interactive/exit-intent-modal.tsx` | 9 | 8 | status-edge ×1 | ✓ |
|  | `c/layout/footer.tsx` | 8 | 8 | — | ✓ |
|  | `c/layout/nav.tsx` | 20 | 20 | — | ✓ |
|  | `c/magnetic-button.tsx` | 17 | 13 | ink (control outline / diagram) ×4 | ✓ |
|  | `c/shared/altruvex-logo.tsx` | 3 | — | logo-tile ×3 | ✓ |
|  | `c/shared/contents-rail.tsx` | 3 | 3 | — | ✓ |
|  | `c/shared/error-boundary.tsx` | 1 | 1 | — | ✓ |
|  | `c/shared/faq-list.tsx` | 6 | 6 | — | ✓ |
|  | `c/shared/section-skeleton.tsx` | 4 | 4 | — | ✓ |
| Pending | `c/sections/services-index/services-stage.tsx` | — | — | — | ⏸ pending |

## 4. Exception record

| exception | count | why it is justified | where |
|---|---:|---|---|
| ledger-head-rule | 15 sites | D1: it marks the start of a register; thinning it would erase the ledger reading | `(marketing)/approach/page-client.tsx`, `(marketing)/contact/page-client.tsx`, `(marketing)/how-we-work/page-client.tsx`, `(marketing)/pricing/page-client.tsx`, `(marketing)/pricing/price-grid.tsx`, `(marketing)/process/page-client.tsx`, `(marketing)/process/phase-strip.tsx`, `(marketing)/schedule/page-client.tsx`, `(marketing)/standards/page-client.tsx`, `(marketing)/standards/pass-line.tsx`, `c/legal/legal-page-layout.tsx`, `c/sections/page-hero.tsx`, `c/sections/trust-section.tsx` |
| accent-side-rule | 5 | D7: a quote or note mark, not a separator; logical side only | `(marketing)/about/name-principle.tsx`, `c/mdx/mdx-components.tsx`, `c/mdx/quote.tsx`, `c/sections/consulting-brief-section.tsx` |
| status-edge | 15 | D8: the tint carries meaning (error, success, warning, info) | `(marketing)/schedule/page-client.tsx`, `(utility)/offline/page-client.tsx`, `c/interactive/exit-intent-modal.tsx`, `c/mdx/callout.tsx`, `c/sections/audit-lead-capture.tsx`, `c/sections/consulting-brief-section.tsx` |
| accent / selected | 17 | selection and active states (price cell, plan glyphs, diagram accents); an interactive state, not a resting edge | `(marketing)/about/name-principle.tsx`, `(marketing)/pricing/price-grid.tsx`, `(marketing)/standards/page-client.tsx`, `(marketing)/work/[slug]/page-client.tsx`, `c/mdx/callout.tsx`, `c/mdx/mdx-components.tsx`, `c/mdx/quote.tsx`, `c/sections/ownership-stack-section.tsx`, `c/sections/service-maintenance/maintenance-plans.tsx`, `c/sections/transparency-estimator/instrument.tsx`, `c/sections/transparency-estimator/questions.tsx` |
| ink (control outline / diagram) | 16 | MagneticButton's secondary and filled outlines (a control boundary needs more than 10% ink, see the border-mid contrast trap) and drawn diagram nodes | `(marketing)/about/handoff-chain.tsx`, `(marketing)/how-we-work/page-client.tsx`, `(marketing)/pricing/price-grid.tsx`, `(marketing)/standards/page-client.tsx`, `(marketing)/work/page-client.tsx`, `app/[locale]/error.tsx`, `c/magnetic-button.tsx`, `c/sections/transparency-estimator/questions.tsx`, `c/sections/trust-section.tsx` |
| diagram / glyph | 13 | drawings (connectors, brackets, markers, swatches, icon strokes), not UI edges; 2px and dashed strokes are allowed here | `(marketing)/about/name-principle.tsx`, `(marketing)/pricing/price-grid.tsx`, `(marketing)/services/interface-design/page-client.tsx`, `(marketing)/standards/page-client.tsx`, `(marketing)/work/page-client.tsx`, `c/sections/ownership-stack-section.tsx`, `c/sections/service-maintenance/maintenance-hero.tsx`, `c/sections/service-maintenance/maintenance-plans.tsx` |
| logo tile | 4 | a mark keeps one shape in both apps, so the tile takes `rounded-ctl-xs` at every size (24–44px); ctl-sm and up derive from each app's `--radius` and would round the 36px www tile into a circle (2026-10-05, replaces the old `rounded-xl`/`2xl`/`[1.25rem]` exception) | `packages/ui/src/components/brand/altruvex-logo.tsx` |
| glass | 1 | a grid living on a liquid-glass panel keeps the glass line colour | `c/sections/transparency-measures-details-section.tsx` |
| state (radio) | 1 | a 2px ring on a radio is its selection state | `c/sections/transparency-estimator/questions.tsx` |
| link underline | 1 | a text-decoration underline on a link, not an edge | `(marketing)/work/[slug]/page-client.tsx` |

Outside `apps/www/app` and `apps/www/components` (D10, left for the admin/www token reconciliation):
- `packages/ui/src/www` inputs `rounded-md` and drawer `rounded-t-section` (the drawer still
  renders 34px through the alias);
- `packages/ui` `SurfaceCard` `border-border`;
- `packages/ui/src/styles/tokens.css`, which is untouched.

## 5. Pending

- `apps/www/components/sections/services-index/services-stage.tsx` was being rewritten by another
  session during this pass (it was modified minutes before QA). Only its foot rule was migrated.
  After that work lands, sweep it: the new `rounded-2xl` panel → `panel-lg` or `panel-sm` by role,
  `rounded-sm` → `ctl-sm`, `border-border` → `border-border-subtle`.
- Correction (2026-09-19): an earlier draft said `UIPlaygroundSection` and `TechDNASection` were
  not rendered anywhere. That was a case-sensitive search error. They render on
  `/services/interface-design` and `/services/development`, and they were **not** deleted. Their
  control radii were then checked against measured heights: playground segment 32px → 12, options
  40px → 16, list button 42px → 18, segmented well 42px (78px when wrapped) → 16 (concentric:
  12 + p-1), tech-dna popover 194px → 28 (`panel-md`), tech-dna tag 25px → 4 (`ctl-xs`; `ctl-sm` at
  25px would be nearly a capsule).
- The `.cb-hl` text-highlight marks moved from `var(--radius-xs)` (8px) to `var(--radius-ctl-xs)`
  (4px). Checked at runtime: the variable is emitted, and the marks render at 4px.

## 6. Verification

- **Squircle:** computed `corner-shape` reads `superellipse(2)` on rounded-rects and
  `superellipse(1)` on `rounded-full` (Chrome 152). A `after:rounded-full` parent stays squircle.
- **Tokens:** headless Chrome over 31 page loads × light/dark × EN/AR, checking every element
  that carries a `panel-*`/`ctl-*` radius (radius ≠ 0) and every `border-border-subtle` element
  (border colour equals `--border-subtle` computed **at that element**, so inverted scenes are
  covered). 0 problems.
- **Heights → control tokens:** price cell 96px → 20px, pipeline button 36px → 16px, key hint 15px
  → 4px, palette `kbd` 24px → 4px, palette row 40px → 16px, skip link 56px → 20px. MagneticButton:
  sm 40px → 16px, default 44 → 48px → 18 → 20px, lg 52 → 56px → 20px.
- **RTL:** a calendar week-edge day carries its 16px corner on the outer side in both directions.
- `tsc --noEmit` and eslint are clean for `apps/www`. `apps/admin`'s only type error is unrelated
  and was already there (`scripts/seed-admin.ts` → `dotenv-flow/config`).

## 7. Known visual deltas

- In dark mode, hairlines rise from 8% to 10% white (`--s-border` is slightly stronger than the old
  `--border` there). In light mode the value is unchanged.
- Cards that sat on the control family moved up to `panel-sm`: work-record media frame and estimator
  grids 16 → 22. The audit-lead card moved down 28 → 22, and the tech-dna popover up 22 → 28.
- Controls that sat on the panel family moved down: pipeline button 22 → 16, palette rows 22 → 16,
  keys, inline code and tags 16–22 → 4. MagneticButton went from 28 to 16–20 by size.

## 8. Admin and packages/ui sweep (2026-10-05)

Ali approved "one system, two dialects" on 2026-10-03 and started the sweep on 2026-10-05. Admin and
`packages/ui` now use the same edge tokens as www. D6 and D10 are superseded.

**Tokens.** `--radius-ctl-xs` and `--radius-panel-sm/md/lg` moved from `apps/www/app/globals.css`
into `packages/ui/src/styles/tokens.css` (`@theme inline`), so both apps emit them. The panel
tokens derive from each app's `--radius`:

| token | www (`--radius` 16px) | admin (`--radius` 10px) |
|---|---:|---:|
| ctl-xs | 4 | 4 |
| ctl-sm / ctl / ctl-lg / ctl-xl | 12 / 16 / 18 / 20 | 6 / 10 / 12 / 14 |
| panel-sm / md / lg | 22 / 28 / 34 | 16 / 22 / 28 |

`--radius-panel-inset` stays in www, because it is tied to www's 1rem padding. Admin control heights
are its own (`--control-h-sm/-/lg/xl` = 28/32/36/48px in `apps/admin/app/globals.css`), so
ctl-* in admin is keyed against those heights.

**Mapping used.** Controls take ctl-* by their measured height (≤24 → xs, 25–30 → sm, 31–34 → ctl,
35–44 → lg, ≥45 → xl). Containers in page flow take panel-sm. Floating overlays take panel-md (dialog,
sheet, popover, menu, command palette, selection dock), the same as www's popover. A box nested
inside a padded container counts as a control and takes ctl-* by its own height. Buttons stay
`rounded-full` (E6). Badges and tags that were rectangular (`rounded-sm`) became `ctl-xs` and keep
their shape. Avatars stay square tiles.

**Borders.** `border-border` became `border-border-subtle` and `divide-border` became
`divide-border-subtle`, side variants included. The admin base layer now defaults to
`border-border-subtle`. In light mode nothing changes. In dark mode, hairlines rise from 8% to 10%
white, which is the same delta www took in §7. Tinted status edges keep their tint (D8).

**Motion and RTL.** Duration literals became `duration-(--dur-state|--dur-panel)`. `ease-in-out`
became `ease-default`. `ease-[var(--ease-standard)]` became `ease-(--ease-standard)`, which keeps the
curve. Physical `text-left` became `text-start`. A control's hover edge `border-border-mid` became
`border-foreground/45` (the border-mid contrast trap).

**Exceptions (brand-allow).**
- `packages/ui/src/theme-switch.ts`: the theme crossfade keeps a cubic-bezier, because the Web
  Animations API cannot read a CSS variable.
- `hierarchy-multiple-h1` in `portal/[token]/portal-shell.tsx`, `quote/[token]/page.tsx` and
  `sign/[token]/page.tsx`: each extra h1 sits in a separate early-return branch, so only one renders.

**The logo (done 2026-10-05).** `AltruvexLogo` moved from `apps/www/components/shared` to
`packages/ui/src/components/brand/altruvex-logo.tsx` and is exported from `@repo/ui`. It has three
variants: `full` (the wordmark), `icon` (the tile) and `lockup` (the tile, then the wordmark). Its
sizes run from `xs` to `lg`. The www nav, the brand app and the four admin surfaces render it:
`login/auth-shell.tsx`, `portal/[token]/portal-shell.tsx`, `sign/[token]/page.tsx` and
`components/shell/sidebar.tsx`. Those four used to hand-roll it.

Decisions:
- **One wordmark.** It is set in capitals at semibold, as the app icons set it. Admin's mixed-case
  "Altruvex" is now capitals too. The fitted footer wordmark is separate and unchanged.
- **One tile.** The tile is the ink "A" admin always showed (`bg-foreground`, `text-background`).
  The www glass tile was never rendered anywhere, and a glass tile needs a backdrop to read at 24px.
- **The tile skips `cn()`.** twMerge reads `text-meta` as a colour and drops `text-background`.
- **The hover fade uses `--dur-state`.** It used to use www's `--motion-drawer`, which admin does not
  define. A hover fade is a state change, so `--dur-state` is the right token anyway.
- **The signing page carries the lockup.** Its muted "Altruvex" kicker is gone, so the page matches
  the portal header.

**Visible changes on client-facing pages.** The full-width submit on `sign/[token]` is now a pill
(E6). The password toggle on login and reset-password is `rounded-e-full`, to match the pill Input
it sits in.

**Still open.**
- The admin `Accordion` in `packages/ui/src/components/overlays` reads `--motion-fast` and
  `--ease-strong`, which admin does not define. Nothing in admin renders it today.
- MagneticButton was not touched (it is www-only, and it is a pill).

**Verification.** The drift audit shows 0 errors in admin, ui and www. The only admin findings left
were the 4 logo findings, and the logo move cleared them, so admin and ui are now clean. `check-types` passes for admin and ui, `tsc --noEmit` passes for www, and
admin eslint is clean. Checked in the browser:
- Admin resolves panel-sm/md/lg to 16/22/28px, and ctl-xs/xl to 4/14px.
- www still resolves 4/22/28/34px (inset 6px).
- The admin login looks right in light and dark.
- The www FAQ accordion opens and closes.

Dashboard pages were not checked in the browser, because that needs a login, and logging in waits on
Ali.

## 9. www system sweep, phase 4 (2026-10-05)

Mechanical and measured: no section was redesigned, no copy changed.

**Type sizes.** About 105 fixed bracket sizes in 45 files (41 www, 4 packages/ui) moved onto the scale. The rule comes from T3
(Major Third anchored at 16px) in `docs/design-principles.md`. Body and label text rounds **up** to
the next step, so a sweep never makes reading text smaller. Headings and display text go to the
nearest step.

| was | now | why |
|---|---|---|
| 15px / 0.9375rem (50×) | `text-base` 16px | secondary body; 16 is the T3 anchor |
| 13px / 0.8125rem / 0.8rem / 0.9rem | `text-md` 14px | labels and notes round up |
| 17px / 1.0625rem | `text-body` | that *is* the body size; new utility over `--text-body-base` |
| 9–11px / 0.6875rem | `text-micro` 11px | badges, kbd; 9–10px was below the smallest step |
| 0.75rem | `text-meta` | exact |
| 1.25rem / 1.375rem | `text-xl` / `text-2xl` | heading, nearest step (22px tie → 24) |
| 2rem / 2.25rem | `text-3xl` / `text-4xl` | heading, nearest step |

Kept: `text-[0.4em]` (relative to its numeral), `text-[24vw]` (the fitted footer wordmark),
`text-[length:inherit]`, clamp() display sizes (the `type-heading-own-scale` info rule tracks those),
and MagneticButton's `text-[15px]`, because MagneticButton is never touched.

`text-body` is `--text-body: var(--text-body-base)` in the www `@theme inline`; it does not exist in
admin. The new audit rule `type-arbitrary-size` (warn, all apps) keeps fixed bracket sizes from
coming back.

**twMerge.** The three `cn()` helpers (`packages/ui`, `apps/www`, `apps/admin`) now register
`micro`, `meta`, `md` and `body` as font sizes through `extendTailwindMerge`. Before this,
twMerge read them as colours and dropped the real text colour on the same element. That was the
logo-tile bug. A few elements whose colour had been silently dropped now show the colour their
class asked for.

**Edges and spacing.**
- The 7 `border-border` register head rules became `border-border-subtle` (D5/D8).
- The services photo stage backdrop went from `bg-black!` to `bg-inverted-bg!`, which is 9% in
  both themes under `data-scene-lock="dark"` (C7).
- A3: the last two literal gap pairs became `mt-(--heading-gap)` (interface-lab, hero to media)
  and `mt-(--section-block)` (estimator, instrument to questions).
- A8: `SectionSkeleton` now uses `<Container>`, so the loading frame matches the section width.
- The exit-intent modal and command palette dropped `shadow-2xl shadow-foreground/10`, because
  `.liquid-glass` already sets `--glass-shadow`. That glow read white in dark.
- The skip link uses `shadow-card`.
- No raw radii were left.

**Verification.**
- The audit shows 0 errors and 0 warnings on www (it was 8 warnings). The only infos left are
  heading clamps, heavy rules and the loader wordmark.
- tsc passes for www, ui and admin.
- www lint and knip are clean, and `bun run validate` passes.
- Browser (:3000):
  - Computed sizes are right: `text-body` 17px, `text-md` 14px, `text-2xl` 24px.
  - Checked `/en/services` in light and `/ar/approach` in dark, with no console errors.

Phase 5 is closed; see §10.

## 10. www decisions, phase 5 (2026-10-05)

The phase was measured before any edit. Each item in `docs/restraint-audit-2026-10-03.md`
(sections B to E) was checked against the current tree.

Most items had already landed in the page rebuilds of 2026-10-03 and 2026-10-04:
- B1 to B5, A5 and A7.
- Every C item except those below.
- D, E2, E3, E5 and E6.

B1 was checked in the browser: on `/en` only the hero and the close carry a gradient. Ownership, work and trust take the soft tone.

Three edits were applied:

| Item | File | Change |
|---|---|---|
| C Approach, one world | `approach/page-client.tsx` `ClosingSection` | It passes `world="blue"`. Before, `SectionEndCta` fell back to its orange default on an all-blue page. |
| C Consulting, nested borders | `consulting-audit/scan-channels.tsx` | The returns list inside each channel row drops its per-item `border-b` (now `py-2`). The row keeps its single hairline. |
| E4 | `interactive/exit-intent-modal.tsx` | The 40px close button moves from `ctl-xs` (the ≤ 24px radius) to `rounded-full`, because it is a circular icon button. |

Four items were kept on purpose, so a later pass does not reopen them:
- **C Home, mobile drawer second CTA (`nav.tsx`):** kept.
  - It is a secondary, not a second primary.
  - The drawer has no other path to a call; the Index panel's direct lines are desktop-only.
  - Same reasoning as the Process top index.
- **C How-we-work `:230`:** the agreement rows have no `border-b` any more. The underline left under each answer is the answer's own line, part of the device, not a row border.
- **D Pricing brand blue ×3 → 1:** superseded. The /pricing redesign (finished 2026-10-04, after the audit) set the brand-blue roles: the key spine stage, the worked cell, the matrix summary and the plans link. Phase 5 redesigns no section.
- **B6 dev-studio facts trio:** kept per the 2026-10-03 ruling (CMP-029, Ali's pick). Its plan line, "B6 dev-studio hairlines", predates that ruling.

Verification:
- Code checks: `tsc` (www), `bun run lint`, `knip`, `bun run validate` and the brand audit all pass, with 0 errors.
- Browser:
  - `/en/approach`, light: the close is `accent-world-blue`.
  - `/ar/services/consulting`, dark: channel rows have one hairline each, the inner list has none, and there are no console errors.
- The exit-intent modal was not opened in the browser; that change is one class.

## 11. One component, two dialects (2026-10-06)

`@repo/ui/www` is a skin, not a fork. Each control exists once in `packages/ui/src/components`
and takes a `variant`: `ControlVariant = "box" | "line"` for Input, Textarea, SelectField,
SelectTrigger and DatePicker, and `field | eyebrow` for Label. The tool default is `box`. The
`@repo/ui/www` files only wrap with `variant="line"` / `"eyebrow"` or re-export (Accordion,
Calendar, Drawer, Select parts). Do not copy a component into `src/www` again. A new look is a
new variant on the one file.

Closed in the same pass:
- **Drawer.** `rounded-t/b-panel-md` replaced the undefined `radius-section`.
- **Separator** and menu separators use `border-subtle`.
- **`.plane`, `.rows` and `--row-h`** moved from admin's globals to `packages/ui/src/styles/surfaces.css`, so the shared skeletons render in every app.
- **The Accordion** uses `--dur-panel` / `--ease-standard`. It used to use the undefined `--motion-fast` / `--ease-strong`.
- **Sheet `side="end"`** slides with physical `slide-*-right` plus an `rtl:` override. The logical `slide-*-end` utilities compile `:dir()` down to a `:lang()` fallback, so they slide the wrong way wherever `dir` and `lang` differ.
- **The DatePicker popover and Calendar** receive `dir` from the locale. The month dropdown is formatted in the calendar's own locale through Intl (`ar-EG-u-nu-latn`), not the browser's.
- **The box SelectTrigger is a pill** (`rounded-full px-3`), like the box Input it sits beside in every tool form. It used to be `rounded-md`, a 10px box next to pill fields.
- **Direction.** Every Radix root with a `dir` (Select, Accordion, DropdownMenu) reads `useDirection()` from `@repo/ui`'s own `DirectionProvider`. www sets it once in `app/[locale]/layout.tsx` from `LOCALE_META`. Radix's own provider cannot reach all primitives, because they pin different `@radix-ui/react-direction` copies (1.1.2 and 1.1.4).

### One source for every shared piece (2026-10-06)

A redesign of a shared piece is one edit, and it reaches www, admin and the brand app together.
Only behaviour that belongs to one app stays in that app.

- **www primitives live in `packages/ui/src/www/`.** These are Emphasis (`Highlight`, `Accent`, `Strong`, `Dim`, and `ACCENT_SHIMMER`, the one shimmer-speed source that `apps/www/lib/motion/tokens.ts` reads), `Eyebrow`, and the MagneticButton class maps (`button.ts`). MagneticButton itself, with its magnet, press and ripple, stays in `apps/www`. Only its class strings moved, and they are unchanged. The brand app's ButtonSpecimen reads the same maps.
- **SegmentedControl** is one component with `variant: "box" | "pill"`. `@repo/ui/www` wraps it with `pill`. Both dialects share one keyboard model: Home and End jump to the ends, the arrow keys follow the element's computed direction, and disabled options are skipped.
- **`ArrowIcon`** (direction `forward | back | external`, hover nudge on the nearest `group`), **`AltruvexWordmark`** (the footer's fitted wordmark) and **`cn`** are exported from `@repo/ui`. `apps/www/lib/utils/utils.ts` and `apps/admin/lib/utils.ts` re-export `cn`, so there is one tailwind-merge registry.
- **The cmdk pickers** in admin use the menu classes (`menuItem`, `menuSearch`, `menuEmpty`, `menuSeparator`). cmdk marks the active item with `data-selected`, and `menuItem` styles it the way Radix's `data-highlighted` is styled. **`PopoverContent surface="menu"`** gives a picker the one menu surface. Menus wear `.liquid-glass-menu` (dense clear fill, no radius), so the glass holds without fighting the menu radius.
- **`.telemetry`** (the small uppercase label voice that `menuLabel` uses) moved from admin's globals into `surfaces.css`.
- **One Dialog** (`packages/ui/src/components/overlays/dialog.tsx`) carries every modal. `surface="panel"` is admin's solid popover plane; `surface="glass"` is www's clear glass with its drawer timing. `placement` is `center`, `top` (the command palettes) or `sheet` (the exit-intent sheet). The www palette, the exit-intent modal and the admin palette all use it. Lenis handling (`data-lenis-prevent`, scroll lock) and the GSAP entrance stay in the www callers.
- **The brand audit enforces this.** The `reuse` category has four rules: `ui-mirror-copy` (a shared export redefined in an app), `ui-mirror-comment` ("keep in step" or "mirrors"), `ui-primitive-import` (Radix, vaul or cmdk imported straight into an app) and `ui-hand-built-modal`. The list of shared exports is read from `packages/ui/src/index.ts` and `www/index.ts` when the audit runs.

