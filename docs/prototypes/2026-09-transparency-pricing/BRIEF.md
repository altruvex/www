# Transparency + Pricing + Estimator — prototype brief (2026-09-29)

Phase 3 of the Transparency / Pricing / Estimator rework. Owner: altruvex-design-intelligence (ADI).
Prototypes only — standalone HTML in this folder, nothing in the repo apps. Ali picks one direction.

## Decisions already made (do not re-open)
- Named tiers (essential / professional / ecommerce / flagship, "Focused Website", "Marketing System"…)
  are DELETED. No tier names, no "Most common", "Recommended", "Best value", no Basic/Pro/Premium.
- Build starting price = "From {minimumEngagement}". Interface design alone = "Scoped per project".
  Technical audit = fixed fee, fully credited to the build if the client proceeds (`consulting.creditIfBuild`
  / `creditIfNot`). Maintenance = Essential / Professional monthly figures + Enterprise "Custom"
  (plan names come from the schema; they stay).
- The 12 service × complexity cells stay public, UNNAMED, collapsed by default under Custom development.
  Complexity band labels must NOT be "Essential / Professional / Flagship" (collides with maintenance
  plan names). Use working labels **Contained / Standard / Extensive** (AR: محدود / قياسي / واسع),
  marked "label proposal" in a small note.
- Payment 50 / 30 / 20: 50% to start, 30% at a development milestone, 20% before production launch.
  VAT is excluded and stated in BOTH locales (`terms.vatNote`). Ownership passes at final payment.
  Proposal validity 30 days.
- The estimator is indicative, never a quotation. The proposal is the only binding number.
  Pricing answers "How does Altruvex charge?", the estimator "What might my project require?",
  the proposal "What exactly will it cost?".
- Seven cost drivers, each honestly classed:
  | driver | class |
  |---|---|
  | Scope (what gets designed, engineered, integrated) | moves the estimate (project type) |
  | Complexity | moves the estimate (complexity band) |
  | Content | moves the estimate (content readiness factor; brand identity factor sits here too) |
  | Timeline | moves the estimate (timeline factor) |
  | Integrations (payments, auth, CRM, APIs, analytics) | confirmed in scope review — never priced by the estimator |
  | Performance (performance, accessibility, SEO, infrastructure targets) | confirmed in scope review |
  | Ongoing operation (maintenance, monitoring, security, updates) | priced separately — monthly plans |
  Multipliers shown are the real ones from `data.js` `factors` — never typed.

## Figures
Every figure comes from `data.js` (`window.AX.en` / `window.AX.ar`), generated from
`@repo/pricing-schema` on 2026-09-29. Never type a price, a percent, or a week count into HTML.
Worked example available: `AX.<locale>.example` (website · standard complexity · partial brand ·
content help · standard timeline → cell range, estimate range, weeks).
`AX.<locale>.widestSpan` is the estimator's honest opening range over all `combos`.
The proposal NEVER shows an invented number — it shows "One figure, set after scope review" (or AR).

## House style (inherited — not re-picked)
- Reuse `../2026-09-pricing/base.css` tokens (copy into this folder as `base.css`, extend, don't fork the
  palette). Outfit display (light weight), Inter body, Geist Mono eyebrows/indexes, Vazirmatn for AR.
- Structure from hairlines and whitespace, never cards (RUL-080). No three-equal-cards-with-icon (RUL-083).
  A box only when the content genuinely is a document.
- Brand blue ONLY at decision points: figures the buyer decides under and the primary CTA (COL-002).
- Homepage section must look like its neighbours: same horizontal hairlines, grey mono indexes (RUL-078).
- One signature moment per section, 2–3 per page max. Motion: entrance/scroll/hand-triggered, no idle
  loops, full argument with `prefers-reduced-motion`. Digit settle on figures is allowed.
- No pinned horizontal track (RUL-145). No blueprint/ruler aesthetics. No emoji, no fake logos.
- Pill (`border-radius: 999px`) only for tags/dots/toggles — never a CTA. CTAs: control radius.
- RTL via logical properties; AR numerals come from data.js (Arabic-Indic); no letter-spacing on AR.
- Mobile 375px must work: no horizontal page scroll, tap targets ≥ 44px.
- AA contrast: body text ≥ 4.5:1 in both themes. Never use brand-soft background under body-size
  brand-text.

## Each prototype file contains, in order (same copy across A/B/C; only the devices differ)
1. **Homepage section — "Transparent by design"** (compact form of the direction's device;
   CTAs: "See how we scope projects" → pricing, "Estimate your project" → transparency).
2. **/pricing page**:
   - Hero: eyebrow PRICING; headline idea "Priced from requirements, not packages." (voice: precise,
     calm, no hype); one line on the model; CTAs "Estimate your project" (primary) / "Discuss your
     requirements".
   - 01 How pricing works + 02 What determines cost — THIS IS WHERE A/B/C DIFFER (see below).
   - 03 Service investment — quiet hairline register, identical in A/B/C: rows Interface design /
     Custom development (+ disclosure "See all 12 published ranges" → unnamed matrix) / Technical audit
     (fee + credit sentence) / Maintenance (Essential, Professional, Custom — a compact inline list, not
     cards). Columns: service · what it covers · how it's priced · figure.
   - 04 Commercial terms — `<dl>` hairline list: payment 50/30/20 (with milestones as above), VAT,
     revision rate, warranty, proposal validity, ownership at final payment.
   - Close: "Estimate your project" / "Discuss your requirements".
3. Shared file `estimator.html` (built once, linked from every prototype's switcher): the glass-box
   estimator with the NEW step "What does it need?" (multi-select scope notes: CMS, sign-in & accounts,
   payments & third-party integrations, Arabic + English, performance / SEO targets, ongoing
   maintenance — labelled "Reviewed in scope — doesn't move this range"), and the result: range + weeks,
   "Scope drivers" in plain words (priced factors with their real multiplier + the chosen notes marked
   "confirmed in scope"), indicative disclaimer, primary CTA "Request a formal proposal" opening a short
   form (phone required; name, email, company optional; note field). Interactive with data.js.

## Directions (01 + 02 device, and the homepage compact form)
- **A · Resolution spine** — Proof: Sequence. One vertical spine (horizontal on ≥1024px is allowed only if
  it is not a pinned track) of five stages: Requirements → Scope → Complexity → Estimate → Proposal.
  Beside each stage, the price of ONE worked example at that stage's resolution: "—" (unknown) →
  `minimumEngagement` → `example.cell` → `example.estimate` → "One figure, set after scope review".
  The drivers attach to the stage where they act (scope/content at Scope, complexity at Complexity,
  timeline at Estimate, integrations/performance at scope review before Proposal, ongoing operation after
  launch). Signature: as each stage enters, its figure settles at the next resolution. Homepage: the same
  five stages as one compact row with the figures only.
- **B · The split line** — Proof: Comparison. One frame split by a single rule into three columns:
  "Moves your estimate" (scope, complexity, content, timeline — each with its real multiplier range),
  "Settled in scope review" (integrations, performance — with what gets checked), "Billed monthly"
  (ongoing operation → maintenance). Above it, the five-step chain as one plain sentence-line with
  arrows, not a diagram. Signature: the rule draws once; hovering/focusing a driver shows which estimator
  question carries it. Homepage: the split line alone, three columns, one line each.
- **C · Three documents** — Proof: Comparison of resolution. The same project answered three times, as
  three paper sheets side by side (stacked on mobile): the Pricing line ("From …", the model), the
  Estimate sheet (`example.estimate`, drivers listed, "indicative"), the Proposal cover (scope, one
  figure "set after scope review", validity, "binding"). Each sheet is a real document box (this is where
  a box is earned). The seven drivers live as margin notes on the Estimate sheet. Signature: sheets
  slide into register as they enter. Homepage: the three sheets as thumbnails with their one-line
  answers. Note: this overlaps the homepage quote-artifact device — if C wins, that section is redundant.

## Copy
Draft EN + AR in the file (a JS dictionary + a language toggle). Arabic must carry the same meaning,
not a literal translation. Mark the page footer "Copy unreviewed — draft". Avoid "enterprise-grade",
"world-class", benefit adjectives. Use the facts: fixed audit fee, credit, published ranges, indicative.

## Chrome (every file)
Bottom fixed switcher: Homepage/Pricing anchors · A · B · C · Estimator · EN/AR · Light/Dark.
Link `index.html` (overview with the three directions and one-line claims).

## Trend report (live signal, fetched 2026-09-29 — not rulings)
- No 2025–26 Awwwards/CSSDA/Godly winner has a real pricing-logic page; Ali's picks (The First The Last,
  Trionn, Produx, Kott) publish none. This page leads rather than follows.
- Kott Studio (nominee, 2026-09-15): numbered service rows with a per-row action; the line
  "Fixed price after one call, in writing, before anything starts" — the estimate→binding split in one sentence.
- Everything Design /pricing (2026-09-06): ONE ledger table service · range · timeline, a paragraph on why
  price moves, drivers footnoted as plain sentences. Closest to our service-investment register.
- Design Key (2026-05): names variance drivers; firm quote needs discovery; paid discovery credited to the build.
- Flowtrix: "starting points, not fixed quotes… confirmed on a call, not guessed from a form."
- Railway / Fly.io: the illustrative-vs-binding footnote; an itemised "that's all on your invoice" list.
- Dying: three-card tiers with "Popular" badge; dollar bands dressed as tiers; award-site 4-step process with
  no cost information.

## Data additions
`AX.<locale>.estimates["<serviceId>|<complexityId>|<timeline>|<brand>|<content>"] = { price, weeks }` —
all 324 combinations, formatted per locale, straight from `calculateEstimate`. The estimator LOOKS UP;
it never re-implements pricing. Opening span = `widestSpan`; a partially answered state shows the
min–max over the matching keys (parse numbers only for comparison — display the schema-formatted labels
of the min/max endpoints, or show widestSpan until build questions are answered).
Band labels in `matrix.bands` are the old ones — override them with the working labels above.
