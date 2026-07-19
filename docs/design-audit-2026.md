# Altruvex Design Audit — Phase 4 (July 2026)

> Section-by-section audit of the working tree against `docs/design-principles.md` (rule IDs
> T/C/S/CI/M/P/A) and the reconciled token layer (`design.md`). Modes covered: **EN-LTR ×
> AR-RTL × light × dark**, desktop + 375px viewport. Evidence: in-page computed-style scanner
> (contrast, target sizes, CPL, heading outline, gradient budget) run per route/theme/locale,
> static greps, component reads, and screenshots for judgment calls.
>
> Severity: **blocker** (brand/legibility/a11y failure) · **degrade** (measurable rule
> violation, real but survivable) · **polish** (refinement).

## 0. Methodology notes & retracted findings (read first)

Three initially alarming findings were **disproven by verification** and are recorded so they
don't resurface as folklore:

1. *"Whole page duplicated in DOM with two exposed H1s"* — stale HMR ghost DOM in a long-lived
   dev tab. Fresh server: 1 `main`, 1 H1 (hero H1 is `sr-only` — the visible headline is the
   styled block; valid pattern).
2. *"Scene-inversion island illegible in dark mode"* — artifact of manually toggling `.dark`
   alongside next-themes' `light` class (both classes present → corrupted cascade). Under the
   native theme flow, `[data-scene="inverted"]` + `.dark` correctly yields the white island
   (`rgb(250,250,250)`) with dark ink.
3. *"Mid-page reload strands the lazy Services/Process sections"* — not reproducible; both
   top and mid-page reloads mount content (~2s). One transient occurrence attributed to dev
   first-compile.

Also: the browser pane cannot emulate `pointer: coarse`, so the Phase 2 touch-target variants
were verified at the compiled-CSS level (rule present with correct condition), not behaviorally.
Screenshots mid-page during Lenis scrolling intermittently capture black — top-of-page and
post-interaction captures were used instead.

**What passed cleanly (verified, both locales):**
- AR-RTL integrity (A7): `dir=rtl`, **zero** letter-spacing leakage across 300 sampled elements,
  Vazirmatn on all headings, body leading exactly 1.9, eyebrow caps-transform dropped, gradient
  sweep and arrows correctly mirrored, logo at top-right (RTL leading edge). Exemplary.
- Heading semantics (T4): 1 H1 per page, no skips — everywhere except `/transparency` (below).
- Greyscale survival (C4): hero + menu hierarchy fully legible desaturated; primary CTA keeps
  rank via fill vs outline.
- Token discipline (C9): zero raw hex in components.
- Scan pattern (P4): hero is a correct Z (logo top-leading, CTA pair at the action point,
  proof stat row on the diagonal), mirrored properly in RTL.
- Motion (M1/M3): all entrances ease-out via registered CustomEase; the only linear/ease-in-out
  timing functions are loops (`pl-scan`, `pl-breathe`, shimmer) which M1 exempts, plus two
  borderline cases listed under polish.
- Forms (CI6): contact form single-column, all real fields labelled (the unlabeled `website`
  field is a honeypot — intentional).
- Cards (CI5): work cards fully clickable via inset-link pattern, consistent structure.
- Estimator chunking (P5): 4 options per step ✓.

---

## 1. Systemic findings (cross-section — fix once, fixes everywhere)

### SYS-1 · Header scene state goes stale → wordmark illegible on light 〔**blocker**〕
The fixed header carries `data-scene="inverted"` while over the light hero, rendering the
wordmark white-on-light (measured 1.09:1; screenshot-confirmed "ALTRUVEX" ghost). Present at
initial load in the light theme and after scrolling back from the dark island; opening/closing
the menu resets it (which confirms the state, not the styling, is at fault).
**Where:** [nav.tsx:60](apps/www/components/layout/nav.tsx) (`isNavInverted`), likely fed by
`hooks/use-transparency.ts`.
**Fix:** derive `isNavInverted` from actual header-overlap geometry on every scroll frame
(including scrollY=0 and programmatic jumps), not from cached enter/leave events; initialize
from position at mount. Add a regression check: at scrollY 0, light theme, wordmark computed
color must be ink.
**Verify by:** computed color of wordmark at top in light/dark; scroll down past island and back.

### SYS-2 · `text-s-low` used for readable metadata 〔**degrade**〕
The 52%-ink surface token is applied to real reading content at 14px — measured 3.72–3.79:1
(needs 4.5). Cluster: work-item mono metadata (labels, values, years, domains) on home + `/work`
(~13 elements/page).
**Where:** [work-item.tsx:137,143,190,215](apps/www/components/work-item.tsx).
**Fix:** metadata that carries information → `text-s-mid` (72%, ≈7:1) or `text-muted-foreground`;
reserve `s-low`/`s-muted` for genuinely decorative marks. Consider documenting in design.md §3.7:
"s-low and below are non-reading tones."
**Verify by:** re-run contrast scan on `/` and `/work`; zero sub-4.5 in work sections.

### SYS-3 · Blue-world `--local-accent` fails as small text in dark 〔**degrade**〕
`.dark .accent-world-blue` sets `--local-accent` to the fill blue `214 89% 48%` → as text
(eyebrow `tone="accent"`, step counters) it measures **3.85:1** (needs 4.5). Orange (7.86:1)
and green (6.65:1) pass after the Phase 2 chroma caps; only blue's fill/text dual use breaks.
Seen on transparency-estimator ("The ledger", "Step 1/5") EN + AR.
**Where:** [globals.css](apps/www/app/globals.css) `.dark .accent-world-blue`;
[transparency-estimator.tsx:454](apps/www/components/sections/transparency-estimator.tsx).
**Fix (recommended):** add a per-world `--local-accent-text` token (equal to `--local-accent`
in every case except blue-dark, where it takes `214 95% 64%` — the existing AA-safe brand-text
value) and point text consumers (`Eyebrow tone=accent`, `text-local-accent` on <18px text) at
it. Do **not** lighten the fill token — buttons depend on it.
**Verify by:** contrast scan dark `/` + `/transparency`; fills unchanged (screenshot).

### SYS-4 · Link-shaped targets below 24px sitewide 〔**degrade**〕
20–27 interactive elements per page measure 18–21px tall: nav dropdown items (19px), footer
link lists (19–21px), work-item "Visit project"/"View LinkedIn" links (21px), the link-variant
"Back" button (28×21). Buttons got the Phase 2 `pointer-coarse` fix; **links did not**.
WCAG 2.5.8 minimum is 24px; the CI1 house rule wants 44px effective on touch.
**Where:** nav dropdown + footer link components; [work-item.tsx:210](apps/www/components/work-item.tsx);
link-variant Button usages.
**Fix:** add `py-1.5`/`min-h-6` (24px floor) to list links universally and
`pointer-coarse:min-h-11 pointer-coarse:py-2.5` on nav/footer/list links; give the `link`
Button variant the same size classes as other variants.
**Verify by:** target scan at 375px: zero <24px; buttons/links ≥44 under forced coarse pointer
(DevTools sensor emulation).

### SYS-5 · Gradient-accent budget: 6–7 per page vs the documented "~2" 〔**degrade** + adjudication〕
Home renders 6 visible gradient accents (+hero = 7): ember (problem) → iris (ownership) → mint
(work) → iris (trust) → iris (pricing-signal) → ember (CTA). Three simultaneous violations of
design.md §3.4: budget (≤2), same-gradient adjacency (trust-iris → pricing-iris), and **two
world mismatches** — `problem` (blue world, ember accent — the long-flagged one) and
**`pricing-signal` (orange world, iris accent — newly found)**. Subpages are compliant
(1–2 world-matched accents each; `/services/development` exactly 2, both matched).
**Fix (recommended):** (a) amend the rule honestly to "≤1 per section, hero + closing CTA are
the anchors, never two same-gradient adjacent, always world-matched" — the 2/page budget was
never the built reality; (b) then bring home into spec: trust → `<Highlight>` (its claims are
restraint-toned: "no template shortcuts"), pricing-signal → `ember` (orange world), problem →
decide re-world orange vs re-accent iris. Net: 5 accents, no adjacency, no mismatch.
**Verify by:** visible-gradient scan: every accent world-matched, no adjacent duplicates.

### SYS-6 · Five home sections lack `aria-labelledby` 〔**degrade**〕
`#services`, `#work`, ownership-stack, `#transparency-estimator`, `#pricing-signal` (plus
service-hero, tech-dna, pipeline on subpages) violate the §10.8 convention and A5.
**Fix:** pass `titleId` through `SectionHeading` and set `aria-labelledby` on each `<section>`.
**Verify by:** scanner's `sectionsNoLabel` = empty on all routes.

### SYS-7 · Inline article links have no underline 〔**degrade**〕
MDX `a` renders color-only until hover (CI4 + C13 — color-only signal).
**Where:** [mdx-components.tsx:85](apps/www/components/mdx/mdx-components.tsx).
**Fix:** `underline underline-offset-4 decoration-foreground/30 hover:decoration-current`.
**Verify by:** computed `text-decoration-line: underline` on article links at rest.

### SYS-8 · Responsive-twin DOM duplication 〔**polish**〕
Service pages and `/contact` render whole sections twice (hidden at the other breakpoint):
duplicate H1 in DOM (`visible:false` twin), tech-dna twice. Not an AT problem (display:none is
out of the a11y tree) but doubles DOM/hydration weight on a site that sells sub-1s mobile.
**Fix:** collapse twins into one instance with responsive classes where structure allows.
**Verify by:** one H1 element in DOM per page; single tech-dna/pipeline instance.

### SYS-9 · Unguarded physical-direction utilities 〔**polish**〕
21 usages of `text-left/right`, `ml-/mr-/pl-/pr-`, arbitrary `left-[]/right-[]` without
`rtl:`/`ltr:` guards ([scene-inversion-wrapper.tsx](apps/www/components/scene-inversion-wrapper.tsx),
[accordion.tsx](apps/www/components/ui/accordion.tsx), [consulting-brief-section.tsx](apps/www/components/sections/consulting-brief-section.tsx),
[date-picker.tsx](apps/www/components/ui/date-picker.tsx), [language-switcher-base.tsx](apps/www/components/base/language-switcher-base.tsx), +).
AR rendering currently looks correct (each needs a per-case check — some are symmetric), but
every one is a latent RTL bug. **Fix:** convert to logical utilities (`ms-/me-/ps-/pe-/text-start`).

---

## 2. Per-section findings

### Home / Hero (`hero-section.server.tsx`, blue world)
- ✔ Focal point (P1): headline owns the view; single filled primary CTA; greyscale pass.
- ✔ Z-pattern both directions; status eyebrow; proof stat row.
- **〔adjudication · polish〕** Primary CTA is `bg-brand` (blue) — design.md §3.9 says the
  primary CTA is *ink* and brand-blue fills are "not the primary CTA." Either the doctrine or
  the hero is wrong. Recommendation: keep the blue hero CTA (it's the one brand-fill moment
  that earns it) and amend §3.9 to name the hero as the sanctioned exception; nav CTA stays ink.
- **〔polish〕** Optical centering (S7): hero block sits at geometric center; nudge content
  block up ~2–3vh.
- Peak-End (P12): page peak = Ownership Stack diagram; end = ember CTA. Both deliberately
  designed ✓.

### Problem (`problem-section.tsx`, inherit blue)
- **〔degrade〕** SYS-5 world mismatch (ember on blue world) — decide: re-world to orange
  (problem→action framing, then eyebrow/accents follow) or re-accent to iris. Recommendation:
  **re-world to orange** — the section's job is agitation toward action, and it hands off to
  orange-world services in the scene island.
- ✔ 5 failure cards (odd count, P6 ✓); hierarchy survives greyscale.

### Ownership Stack (`ownership-stack-section.tsx`, inherit blue, iris)
- **〔degrade〕** Sub-AA micro-annotations in **both modes**: `text-primary/35` at 10px
  (axis labels "Surface/Foundation", line 177; legend line 288 at /40; badges lines 244/277
  at /45; footnote line 333 at /35). Light ≈2.5–3.9:1, dark ≈3.0–3.9:1.
  **Fix:** floor at `/60` (≥5:1 both modes); keep hierarchy via the 10px mono + tracking, not
  sub-AA opacity. If any layer annotation is genuinely decorative, `aria-hidden` it *and* keep
  ≥3:1 visually.
- ✔ The diagram is the page's dual-coded peak (P14) — right call structurally.
- ✔ Layer labels/dividers pass natively (earlier corrupted-cascade readings retracted).

### Scene island: Services + Process (`scene-inversion-wrapper.tsx` + children)
- ✔ Island inversion cascade correct in all four mode combinations (verified natively).
- **〔degrade〕** Process inactive-step eyebrows ("01 · Research"…): 3.23:1 light / 3.79 dark
  at 14px. Fix: inactive label ≥`text-muted-foreground`; keep the active/inactive distinction
  via weight or the accent dot, not sub-AA grey ([process-section.tsx:150](apps/www/components/sections/process-section.tsx) `monoCaps` class).
- **〔polish〕** Step-content expander uses `ease-in-out` 320ms — entrances should be ease-out
  (M1); use `--ease-strong`.
- ✔ 4 services / 4 steps: even counts (P6 prefers odd) — accepted as the deliberate
  "engineering grid" symmetry; noted, no change.
- SYS-6 labels; SYS-8 twins on service pages.

### Work (`work-section.tsx` + `work-item.tsx`, green world)
- **〔degrade〕** SYS-2 metadata contrast cluster (13 elements).
- **〔degrade〕** CPL: work-item description measures est. **126 CPL** (home) / 86 (index) —
  far over the 80 ceiling (T6). Fix: `max-w-(--measure-prose)` on the description block.
- **〔degrade〕** "Visit project" links 21px tall (SYS-4).
- ✔ Whole-card clickability, consistent card anatomy, mint accent world-matched.

### Trust (`trust-section.tsx`, blue world)
- **〔degrade〕** SYS-5: iris accent here + iris on the next section (adjacency). Recommended:
  convert "no template shortcuts." to `<Highlight>` — it's a restraint claim by the §5 decision
  rule anyway.
- ✔ 3 verify-items (odd ✓), LinkedIn link needs SYS-4 padding.

### Transparency Estimator (`transparency-estimator.tsx`, blue world)
- **〔degrade〕** SYS-3 (blue-dark accent text 3.85:1 — "The ledger", "Step 1/5", EN+AR).
- ✔ 4 options/step (P5), progress indication present; goal-gradient: show remaining steps near
  the end (CI7 — check copy states "step 4 of 5" style; it does).
- On `/transparency` page: **〔degrade〕** heading skip H1 → H3 ("What are we building?") —
  promote to H2 (T4/A5).

### Pricing Signal (`pricing-signal-section.tsx`, orange world)
- **〔degrade〕** SYS-5 mismatch: iris accent in an orange world → switch to `ember`.

### CTA (`cta-section.tsx` / `section-end-cta.tsx`, orange world)
- ✔ Ember matched; single primary; page end designed (P12 ✓). Anticipation beat applies via
  `useSectionElement` (M2) — visually confirm in Phase 5 fix-verification.

### Nav + Footer (`nav.tsx`, `footer.tsx`)
- **〔blocker〕** SYS-1 stale scene → illegible wordmark.
- **〔degrade〕** SYS-4: dropdown/footer links 19–21px.
- ✔ Nav CTA is ink (doctrine ✓); menu greyscale hierarchy ✓; Jakob conventions kept (P8 ✓).

### Contact (`/contact`)
- **〔blocker〕** WhatsApp CTA: white on `--messaging-whatsapp` (142 70% 49%) = **1.96:1**
  ([page-client.tsx:245](apps/www/app/[locale]/(main)/(marketing)/contact/page-client.tsx)).
  Fix: dark ink text on the green (≈6:1), or darken the green to `142 72% 30%` for white text —
  keep the recognizable hue either way (C12; Stroop-safe).
- **〔degrade〕** Form status has no `aria-live` region — async submit feedback is invisible to
  AT (A5/P11). Add `role="status"` to the result message container.
- ✔ Single column, labels, honeypot correctly unlabeled/hidden.

### Pipeline (`pipeline-section.tsx`, green world — `/services/development`)
- **〔degrade〕** Simulated terminal log lines: 2.02:1 (`[info]`) / 3.05 (`[warn]`) / 3.61
  (`[ok]`) at 11.5px. It's decorative flavor, but it reads as content. Fix: `aria-hidden` the
  terminal *and* lift line colors to ≥3:1 visual (s-mid for info lines); keep the dim-log
  aesthetic by dimming the *prefix* only.
- ✔ `pl-scan` linear loop exempt (M1); mint accent matched.

### Writing / Articles
- ✔ Article pages: 1 H1, contrast clean, one world-scoped `<Mark>` per article, audit-lead-capture
  is in-flow (P10 ✓) with underline inputs.
- **〔degrade〕** SYS-7 (no underline on inline links).
- Editorial gradients (`sunset`/`lavender`/`aurora`/`ocean`) conform to the Phase 2 tier rule ✓.

### Pricing page (`/pricing`)
- ✔ 0 contrast issues, 1 world-matched ember, headings clean.
- **〔polish〕** 3 list items at est. 86 CPL — apply `--measure-wide` cap.
- SYS-4/SYS-6 apply.

### About / Standards / Approach / How-we-work / Schedule
- Spot-audited (about: clean contrast, 1 ember world-matched ✓; heading structures clean).
  SYS-4/SYS-6/SYS-8/SYS-9 apply as sitewide items. Full per-page re-scan rides Phase 5's
  post-fix verification.

---

## 3. Phase 5 fix order (by severity, one commit per item-group)

1. **SYS-1** header scene reset (blocker, brand mark).
2. **Contact WhatsApp contrast** (blocker, conversion surface).
3. **SYS-2 + Ownership + Process + Pipeline contrast cluster** (one "reading-tones" commit:
   s-low→s-mid for metadata, /35–/45→/60 annotations, inactive steps, terminal).
4. **SYS-3** `--local-accent-text` token + Eyebrow accent consumers.
5. **SYS-5** gradient budget: rule amendment in design.md + trust→Highlight,
   pricing-signal→ember, problem re-world decision.
6. **SYS-4** link target floors (24px min + pointer-coarse 44px).
7. **SYS-6** aria-labelledby; **/transparency** H1→H3 skip; contact `aria-live`.
8. **SYS-7** MDX underlines; work-item CPL caps (measure tokens).
9. Polish batch: SYS-8 twins, SYS-9 logical properties, process expander ease, hero optical
   nudge, hero-CTA doctrine amendment in design.md, `.label`/`.caption` adopt-or-remove.

Each fix re-runs the relevant scanner checks (the audit script lives in this doc's methodology;
re-runnable in any tab) and the affected mode matrix before its commit.
