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
| D6 | `apps/admin` is out of scope. |
| D7 | The accent side rule is a decorative exception, and uses logical properties only. |
| D8 | Semantic status cards keep tinted edges. Everything else resolves to `--border-subtle`. |
| D9 | The `corner-shape: squircle` rule was restored. It is the primitive the Apple-like goal depends on. |
| D10 | `packages/ui/src/www` is not migrated to the new tokens, because it is shared with admin, whose separate token layer would resolve them to nothing. Its physical-property RTL bugs were fixed anyway: calendar `rounded-l/r` → `s/e`, calendar `pl/pr` → `ps/pe`, select `pr/pl/right` → `pe/ps/end`. |
| E1 | Command-palette list padding changed from `p-2` to `p-3`, so its rows are `ctl` (28 − 12 = 16) and are not capsules. |
| E2 | The code-block copy button moved to `top-2.5 end-2.5` and is `ctl-sm` (22 − 10 = 12). This also fixed the physical `right-4`. |
| E3 | The audit-lead card uses `panel-sm`. Size and importance are not reasons for a bigger radius. |
| E4 | `--radius-ctl-xs` = 4px, for elements 24px tall or less. It absorbed the `[0.3rem]`, `[0.1875rem]` and `[2px]` arbitrary values. |
| E5 | The standards card-top rule was thinned to 1px `border-border-subtle` (language B, hover accent tint). It is not a ledger, so D1 does not cover it. |

## 2. Tokens (`apps/www/app/globals.css`)

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

**714 edge classes in 78 files: 602 → token, 112 → named exception, 0 unexplained.**
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
| Section · /services/development | `c/sections/pipeline-section.tsx` | 17 | 16 | status-edge ×1 | ✓ |
|  | `c/sections/tech-dna-section.tsx` | 9 | 9 | — | ✓ |
| Section · /services/interface-design | `c/sections/ui-playground-section.tsx` | 33 | 32 | ink (control outline / diagram) ×1 | ✓ |
| Section · /services/maintenance | `c/sections/service-maintenance/maintenance-hero.tsx` | 11 | 10 | diagram/glyph ×1 | ✓ |
|  | `c/sections/service-maintenance/maintenance-plans.tsx` | 16 | 12 | diagram/glyph ×3, accent/selected ×1 | ✓ |
| Section · /transparency | `c/sections/transparency-chapter.tsx` | 2 | 2 | — | ✓ |
|  | `c/sections/transparency-estimator.tsx` | 2 | 2 | — | ✓ |
|  | `c/sections/transparency-measures-details-section.tsx` | 10 | 9 | glass ×1 | ✓ |
| Section · /work | `c/sections/work-record.tsx` | 8 | 8 | — | ✓ |
| Section · /writing/[slug] | `c/sections/audit-lead-capture.tsx` | 9 | 8 | status-edge ×1 | ✓ |
| Section · site nav (via the language switcher) | `c/base/language-switcher-base.tsx` | 1 | 1 | — | ✓ |
|  | `c/base/theme-toggle-base.tsx` | 1 | 1 | — | ✓ |
|  | `c/sections/boundary-section.tsx` | 5 | 2 | diagram/glyph ×2, accent/selected ×1 | ✓ |
|  | `c/sections/hero-readout.tsx` | 8 | 5 | ledger-head-rule ×2, ink (control outline / diagram) ×1 | ✓ |
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
|  | `c/interactive/custom-cursor.tsx` | 2 | 2 | — | ✓ |
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
| ledger-head-rule | 17 sites | D1: it marks the start of a register; thinning it would erase the ledger reading | `(marketing)/approach/page-client.tsx`, `(marketing)/contact/page-client.tsx`, `(marketing)/how-we-work/page-client.tsx`, `(marketing)/pricing/page-client.tsx`, `(marketing)/pricing/price-grid.tsx`, `(marketing)/process/page-client.tsx`, `(marketing)/process/phase-strip.tsx`, `(marketing)/schedule/page-client.tsx`, `(marketing)/standards/page-client.tsx`, `(marketing)/standards/pass-line.tsx`, `c/legal/legal-page-layout.tsx`, `c/sections/hero-readout.tsx`, `c/sections/page-hero.tsx`, `c/sections/trust-section.tsx` |
| accent-side-rule | 5 | D7: a quote or note mark, not a separator; logical side only | `(marketing)/about/name-principle.tsx`, `c/mdx/mdx-components.tsx`, `c/mdx/quote.tsx`, `c/sections/consulting-brief-section.tsx` |
| status-edge | 16 | D8: the tint carries meaning (error, success, warning, info) | `(marketing)/schedule/page-client.tsx`, `(utility)/offline/page-client.tsx`, `c/interactive/exit-intent-modal.tsx`, `c/mdx/callout.tsx`, `c/sections/audit-lead-capture.tsx`, `c/sections/consulting-brief-section.tsx`, `c/sections/pipeline-section.tsx` |
| accent / selected | 18 | selection and active states (price cell, plan glyphs, diagram accents); an interactive state, not a resting edge | `(marketing)/about/name-principle.tsx`, `(marketing)/pricing/price-grid.tsx`, `(marketing)/standards/page-client.tsx`, `(marketing)/work/[slug]/page-client.tsx`, `c/mdx/callout.tsx`, `c/mdx/mdx-components.tsx`, `c/mdx/quote.tsx`, `c/sections/boundary-section.tsx`, `c/sections/ownership-stack-section.tsx`, `c/sections/service-maintenance/maintenance-plans.tsx`, `c/sections/transparency-estimator/instrument.tsx`, `c/sections/transparency-estimator/questions.tsx` |
| ink (control outline / diagram) | 18 | MagneticButton's secondary and filled outlines (a control boundary needs more than 10% ink, see the border-mid contrast trap) and drawn diagram nodes | `(marketing)/about/handoff-chain.tsx`, `(marketing)/how-we-work/page-client.tsx`, `(marketing)/pricing/price-grid.tsx`, `(marketing)/standards/page-client.tsx`, `(marketing)/work/page-client.tsx`, `app/[locale]/error.tsx`, `c/magnetic-button.tsx`, `c/sections/hero-readout.tsx`, `c/sections/transparency-estimator/questions.tsx`, `c/sections/trust-section.tsx`, `c/sections/ui-playground-section.tsx` |
| diagram / glyph | 15 | drawings (connectors, brackets, markers, swatches, icon strokes), not UI edges; 2px and dashed strokes are allowed here | `(marketing)/about/name-principle.tsx`, `(marketing)/pricing/price-grid.tsx`, `(marketing)/services/interface-design/page-client.tsx`, `(marketing)/standards/page-client.tsx`, `(marketing)/work/page-client.tsx`, `c/sections/boundary-section.tsx`, `c/sections/ownership-stack-section.tsx`, `c/sections/service-maintenance/maintenance-hero.tsx`, `c/sections/service-maintenance/maintenance-plans.tsx` |
| logo tile | 3 | the mark's corner scales with the mark (`rounded-xl`/`2xl`/`[1.25rem]` on 28–44px tiles) | `c/shared/altruvex-logo.tsx` |
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
