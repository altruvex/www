# Altruvex Design Principles (the law layer)

> **What this is.** The codified perception / typography / color / spacing knowledge base the
> Altruvex site is audited against. `design.md` remains the **token layer** (what the values are);
> this file is the **law layer** (why, and what must hold). When a token and a principle disagree,
> the conflict is surfaced and adjudicated in a change table — never silently resolved.
>
> **Numbers are heuristics, not citations.** Every figure here (ratios, percentages, ms) is a
> directional engineering default distilled from professional practice — not a research citation.
> Encode the rule; never quote the stat as evidence in user-facing or client-facing material.
>
> **Scripts.** Every rule declares a script scope. `latin-only` rules must never be applied to
> Arabic. `arabic-variant` rules state the Arabic counterpart explicitly. RTL mirrors all
> directional/scan rules (top-left anchors become top-right).
>
> **Entry format.**
> `Rule` — one imperative sentence. `Values` — concrete numbers. `Applies to` — where.
> `Script scope` — both | latin-only | arabic-variant. `Verify by` — the test.
> `Class` — `hard-rule` (verifiable, must hold) | `heuristic` (directional default, deviate with
> a written reason) | `judgment` (trained-eye call, no mechanical test).

---

## 1. Typography

### T1 — Weight hierarchy needs real distance
Rule: Build weight hierarchy from steps of ≥200; never rely on adjacent weights (400 vs 500) to rank content.
Values: Working triad 400 / 600 / 700–800. A 100-unit gap is invisible at body sizes in most variable fonts.
Applies to: All text; loaded font weights in `app/[locale]/layout.tsx`.
Script scope: both (Vazirmatn ships the same weight axis).
Verify by: Greyscale screenshot — every intended rank must still read; diff loaded weights vs. weights actually used (grep `font-*` classes).
Class: hard-rule

### T2 — Every weight has one job
Rule: Assign each loaded weight a single role and load nothing without a role.
Values: 100–200 oversized display only · 300 elegance at ≥16px only · 400 body · 500–600 UI/nav emphasis · 700 headings & CTAs · 800–900 hero impact only. Cap the loaded set (≤4 weights per family).
Applies to: Font loading config; all components.
Script scope: both.
Verify by: Grep loaded weights vs. usage map; any weight with zero or ambiguous role is removed.
Class: heuristic

### T3 — Non-linear modular scale
Rule: Derive the type scale from a ratio, not from taste-picked sizes.
Values: Major Third ×1.25 anchored at 16px body (16 → 20 → 25 → 31 → 39 → 49). Fluid clamps are fine as long as min/max endpoints sit on the scale.
Applies to: `globals.css` heading sizes, `.display`, body.
Script scope: both.
Verify by: Compute ratio between adjacent clamp endpoints; each step ≈1.2–1.3.
Class: heuristic

### T4 — Headings are scope, not styling
Rule: Use heading levels to declare scope — H1 = page, H2 = section, H3 = block, H4 = detail — and never skip or pick a level for its looks.
Values: Exactly one H1 per page.
Applies to: All pages and sections; `SectionHeading`, heroes, MDX.
Script scope: both.
Verify by: DOM outline (browser a11y tree / HeadingsMap); no level skips, one H1.
Class: hard-rule

### T5 — Line height by role
Rule: Set leading by text role: reading text loose, display tight, small print loosest.
Values: Latin — body ×1.5–1.6 · headings ×1.1–1.25 · captions/small ×1.6–1.7.
Applies to: `globals.css` base styles, `.label`, `.caption`.
Script scope: arabic-variant — Arabic needs more vertical room (ascenders, dots, diacritics): body ×1.8–2.0 · headings ×1.25–1.35. Never copy Latin leading to Arabic.
Verify by: Computed style in DevTools per role, both locales.
Class: heuristic

### T6 — Line length (measure)
Rule: Cap reading text to a measured line length; long lines cause return-sweep errors.
Values: Latin 50–75 CPL, sweet spot ~66, hard ceiling 80. Encode as max-width tokens (`~60–68ch` prose, narrower for captions).
Applies to: Body copy, section descriptions, MDX articles, legal pages.
Script scope: arabic-variant — CPL counting differs on connected script; keep the same physical max-width tokens and verify by words-per-line (~8–12 average) in Vazirmatn.
Verify by: Count characters (or words, AR) on 5 random full lines at desktop width.
Class: hard-rule

### T7 — Start-align, never justify
Rule: Align text to the reading start edge; never justify on the web (unpredictable word gaps break responsively).
Values: —
Applies to: All text blocks.
Script scope: both — "start" = left in LTR, right in RTL; use logical properties/classes, never physical `text-left`.
Verify by: Grep for `text-justify`/`text-left`/`text-right` (physical) in components; visual check in AR.
Class: hard-rule

### T8 — All-caps is a label treatment
Rule: Reserve all-caps for short labels (≤3–4 words); never set running text in caps — it erases word-shape landmarks.
Values: Caps text gets positive tracking (see T9); eyebrow spec: 0.875rem mono, +0.22em.
Applies to: `.eyebrow`, badges, tiny labels.
Script scope: latin-only — Arabic has no case; the eyebrow drops `text-transform` and tracking in RTL (already in `globals.css`).
Verify by: Grep `uppercase` usage; flag any multi-sentence caps.
Class: hard-rule

### T9 — Tracking inverts across the display threshold
Rule: Track small text slightly open and display text slightly tight; one tracking value cannot serve all sizes.
Values: Caps/labels ≈ +0.02–0.22em · body ≈ 0 to +0.01em · display/headlines ≈ −0.015 to −0.04em (scaling tighter as size grows).
Applies to: Type scale definitions.
Script scope: latin-only — connected Arabic script must have `letter-spacing: 0` at every size (enforced `!important` in `globals.css`; keep it).
Verify by: Computed `letter-spacing` per scale step; AR audit shows 0 everywhere.
Class: heuristic

### T10 — Font pairing is metric, not intuitive
Rule: Pair typefaces by x-height and proportional compatibility; x-height, not font-size, sets perceived size.
Values: When mixing faces inline (mono eyebrow ↔ sans heading, serif Highlight ↔ sans), match apparent letterform size, adjusting size ±5–10% if needed.
Applies to: Outfit/Inter/Geist Mono/Georgia pairings; mixed-script lines.
Script scope: arabic-variant — match Vazirmatn's loop/tooth height to Latin x-height when Latin fragments (numbers, brand names) sit inside Arabic text.
Verify by: Overlay screenshot of the pair at equal size; measure apparent height in px.
Class: judgment

### T11 — No fake small caps
Rule: Use small caps only if the font ships true small-cap glyphs; synthesized small caps (scaled uppercase) have ~30%-too-thin strokes — otherwise don't use small caps at all.
Values: —
Applies to: Any future `font-variant-caps` use (none today).
Script scope: latin-only.
Verify by: Check the font's OpenType `smcp` feature; visual stroke-weight comparison.
Class: hard-rule

### T12 — Typeface signal matches the claim
Rule: Choose letterform genre by the message it must carry: serif = authority/trust anchors for long reading, sans = clarity/innovation, mono = engineering/spec, script/display = personality at readability's cost.
Values: Altruvex mapping: Outfit (sans display) = clarity/confidence · Inter = neutral reading · Geist Mono = the engineering signal · serif italic (Highlight) = craft/restraint.
Applies to: Emphasis system, any new surface.
Script scope: arabic-variant — the serif-italic craft signal falls back to weight contrast (bold Vazirmatn), never synthetic italic; Arabic italics are not a real convention.
Verify by: judgment — does the face's genre agree with the sentence's job?
Class: judgment

### T13 — Dark-mode type compensation
Rule: Compensate for irradiation (bright-on-dark inflates counters and thins perceived stroke): step weight and/or size up and open tracking slightly in dark mode; keep body contrast ≥4.5:1.
Values: +25–50 effective weight or +1px size on small text; tracking +0.005–0.01em (Latin only); never below AA.
Applies to: Dark theme tokens; small text especially.
Script scope: latin-only for the tracking component; size/weight compensation applies to both scripts.
Verify by: Side-by-side light/dark screenshot at 100%; contrast checker on dark body text.
Class: heuristic

---

## 2. Color

### C1 — A palette is a relationship system
Rule: Never approve a color in isolation — simultaneous contrast changes how an identical value reads on different backgrounds; validate every token in its real UI context (light, dark, inverted scene).
Values: —
Applies to: All tokens; especially `--local-accent` worlds and gradient keys across scenes.
Script scope: both.
Verify by: Screenshot the token in every scene it ships in; never approve from a swatch sheet.
Class: hard-rule

### C2 — HSL lightness is not luminance
Rule: Never reason about contrast or "equal brightness" from HSL channel values; perception follows CIELAB-like curves (equal-L yellow vs blue differ >10× in luminance).
Values: —
Applies to: Scale construction, contrast claims, gradient stop choices.
Script scope: both.
Verify by: Measured WCAG contrast ratio (luminance-based), not channel math.
Class: hard-rule

### C3 — Build scales by interpolation, validate by eye
Rule: Author color scales as base-500 + defined 100/900 edges, interpolate the steps holding hue and adjusting S/L, then validate in real UI and rotate hue slightly only if steps feel off.
Values: —
Applies to: Neutral ramp `--n-*`, any future accent ramps.
Script scope: both.
Verify by: Plot the scale's L values (should step monotonically); in-UI check of adjacent steps.
Class: heuristic

### C4 — Structure must survive greyscale
Rule: Build hierarchy in greyscale first and add color last; if the UI fails with color removed, the hierarchy is broken — color may reinforce rank, never create it.
Values: Working greyscale of 4–6 steps drawn from an S 0–10%, L 7–95% ramp.
Applies to: Every section; the site's mostly-mono doctrine is this rule.
Script scope: both.
Verify by: Greyscale screenshot (`filter: saturate(0)`) — primary anchor, hierarchy, and states must all still read.
Class: hard-rule

### C5 — Saturation tiers
Rule: Separate the palette into saturation bands — equal saturation everywhere flattens hierarchy and fatigues the eye.
Values: Neutrals 0–10% S · functional UI color 50–90% S · brand accents 70–100% S.
Applies to: Token architecture; new color additions.
Script scope: both.
Verify by: List every token's S value; each must fall in its band.
Class: heuristic

### C6 — 60-30-10 with one dominant temperature
Rule: Distribute color area ~60% neutral / 30% secondary / 10% accent, and let one temperature dominate — a 50/50 warm/cool split reads unresolved. Warm advances, cool recedes: use temperature as depth.
Values: 60/30/10 by rendered area, per view.
Applies to: Page composition; section color worlds; social assets.
Script scope: both.
Verify by: Eyeball area estimate on a full-section screenshot; flag any view where accent area rivals neutral.
Class: heuristic

### C7 — Near-black, never #000
Rule: Use near-black instead of pure #000 on screens.
Values: Ink ≈ L 5–10% (site: `#0F0F0F`).
Applies to: Text, dark backgrounds.
Script scope: both.
Verify by: Grep for `#000`/`0 0% 0%` in tokens and components.
Class: hard-rule

### C8 — Dark mode drops chroma, lifts tone
Rule: Derive dark-mode color variants by keeping hue, reducing chroma ~20–30%, and lifting tone — dark backgrounds amplify perceived saturation.
Values: Chroma −20–30% vs. the light-mode token; verify contrast after.
Applies to: Dark variants of worlds, gradients, semantic colors.
Script scope: both.
Verify by: Compare S (or OKLCH C) of light vs dark variant pairs; in-UI vibrancy check.
Class: heuristic

### C9 — Token architecture: primitive → semantic → system
Rule: Route every color through the three-layer token chain (primitive value → semantic role → component/system use); components never touch primitives or raw hex.
Values: —
Applies to: `globals.css` + all components.
Script scope: both.
Verify by: Grep components for hex/rgb/hsl literals (must be zero); every semantic token resolves to a primitive.
Class: hard-rule

### C10 — Functional hue semantics drive assignment
Rule: Assign accent/gradient hues by the section's job using conventional color function — blue = trust/authority, warm high-chroma (orange/red) = action/urgency, yellow = caution, green = positive/confirmation — and keep cultural context in mind.
Values: Site mapping: blue world = brand/trust · orange world = action/CTA/pricing · green world = proof/shipped.
Applies to: Color worlds, gradient keys, semantic tokens.
Script scope: both (verify hue conventions hold for the Arab market audience; no known inversions for these three).
Verify by: Table of section → world → job; flag any hue fighting its section's job.
Class: heuristic

### C11 — Semantic colors signal state, never decorate
Rule: Use success/warning/error tokens only for genuine state; approving color for emphasis comes from the color world, not from `--success`.
Values: —
Applies to: All components; forms.
Script scope: both.
Verify by: Grep semantic-token usage; each hit must be a real state signal.
Class: hard-rule

### C12 — Contrast floors and the AAA target
Rule: Meet AA everywhere and design toward AAA where feasible.
Values: Body text ≥4.5:1 · large text (≥24px / ≥18.66px bold) and UI components ≥3:1 · target 7:1 for primary reading text where the aesthetic allows.
Applies to: All text/background pairs in all scenes (light, dark, inverted, tinted bands).
Script scope: both.
Verify by: Contrast checker on every token pair, all scenes.
Class: hard-rule

### C13 — Color is never the only signal
Rule: Pair every color-coded meaning with a redundant cue (icon, label, weight, pattern) and simulate deuteranopia + protanopia — WCAG contrast does not cover color-vision deficiency.
Values: Two most common CVD types simulated per audit; status/charts/errors always dual-coded.
Applies to: Status dots, form validation, world-coded sections, any chart.
Script scope: both.
Verify by: CVD simulation (Chrome DevTools rendering emulation / Sim Daltonism); remove color mentally — meaning must survive.
Class: hard-rule

---

## 3. Spacing & Layout

### S1 — Dual-layer spacing scale
Rule: Run two spacing responsibilities on one scale: 4pt handles precision (icon geometry, baselines, inside components), 8pt handles rhythm (layout gaps, padding, margins, sizing) — assign responsibility, don't choose one layer.
Values: 4 · 8 · 12 · 16 · 20 · 24 · 32 · 40 · 48 (+ larger 8-multiples). Every spacing value maps onto the scale.
Applies to: All margins/paddings/gaps; Tailwind spacing usage.
Script scope: both.
Verify by: Grep for arbitrary spacing values (`p-[..px]`, odd fractions); measure rendered gaps in DevTools.
Class: hard-rule

### S2 — Columns: 12 / 8 / 4
Rule: Compose layout on a 12-column desktop grid (12 = LCM of 2,3,4) collapsing to 8 on tablet and 4 on mobile; pick the grid *type* by job — manuscript for long text, column for streams, modular for dashboards, hierarchical (intentional rule-breaking) for heroes.
Values: 12 / 8 / 4 columns.
Applies to: Section layouts, card grids.
Script scope: both (columns mirror automatically in RTL when logical order is used).
Verify by: Overlay a 12-col guide on desktop screenshots; check grid-template definitions.
Class: heuristic

### S3 — Proximity encodes relationship
Rule: Vary spacing to encode structure — related things sit closer than unrelated things; equal spacing everywhere flattens hierarchy, and proximity registers before reading begins.
Values: The gap *within* a group must be visibly smaller (≈½ or less) than the gap *between* groups.
Applies to: Card internals, form groups, heading→body distances, list items.
Script scope: both.
Verify by: Measure within-group vs between-group gaps; squint test — groups must form before text is legible.
Class: hard-rule

### S4 — Whitespace is active
Rule: Deploy whitespace to create hierarchy and focus (active), not merely to fill leftover room (passive); spacing hierarchy registers before color or weight.
Values: —
Applies to: Section rhythm, hero composition, card padding.
Script scope: both.
Verify by: judgment — for each large gap, name what it separates or spotlights; if nothing, it's passive.
Class: judgment

### S5 — Optical padding: horizontal ≈ 2× vertical
Rule: Pad compact interactive elements roughly twice as much horizontally as vertically — vertical space reads as enclosure and visually "weighs" more.
Values: h-pad ≈ 2× v-pad on buttons, tags, chips, pills. Not for containers/cards.
Applies to: Buttons, badges, chips, input-adjacent controls.
Script scope: both.
Verify by: Measure computed padding; ratio ≈ 1.6–2.4.
Class: heuristic

### S6 — Icon-side padding compensates the gap
Rule: On buttons with an icon, reduce the icon-side padding by the icon gap — the gap optically inflates that side.
Values: icon-side padding = text-side padding − gap.
Applies to: Buttons with leading/trailing icons; icon+label chips.
Script scope: both (side flips in RTL; use logical padding).
Verify by: Measure both paddings + gap in DevTools; screenshot symmetry check.
Class: heuristic

### S7 — Optical centering sits above geometric center
Rule: Shift vertically-centered focal content up slightly — geometric center reads low.
Values: −2 to −6% of container height (or −8 to −24px in tall heroes).
Applies to: Heroes, modals, empty states, vertically centered cards.
Script scope: both.
Verify by: Measure offsets; A/B screenshot at true center vs shifted.
Class: heuristic

### S8 — Icon geometry
Rule: Build icons on a consistent bounding box with a trim area, even stroke weights aligned to the pixel grid, and compensate shape mass (circles slightly exceed squares); align icons optically, not geometrically.
Values: 24px box, 2px trim, 2px strokes (Lucide default conforms); circle diameter ≈ +4–8% over square side for equal perceived mass.
Applies to: All Lucide usage; any custom glyph.
Script scope: both (directional icons — arrows, chevrons — must mirror in RTL).
Verify by: Zoom to 400%: strokes pixel-sharp, consistent weight; RTL screenshot for directional icons.
Class: heuristic

### S9 — Logo clearspace
Rule: Define wordmark clearspace as a cap-height multiple applied on all sides; nothing enters it.
Values: ≥1× cap height on all sides (tighten only in favicon-scale contexts).
Applies to: Wordmark placements — nav, footer, social assets, OG images.
Script scope: both.
Verify by: Overlay a cap-height square around the mark in screenshots.
Class: heuristic

---

## 4. Components & Interaction

### CI1 — Minimum target size 44px
Rule: Give every interactive element a ≥44px effective hit target — tap errors are target-size errors (Fitts); a smaller visual can carry a larger hit area.
Values: ≥44×44px effective; list rows full-width and ≥44px tall with start-aligned anchors; rows use spacing OR dividers, never both.
Applies to: Buttons, icon buttons, links in nav, list rows, form controls.
Script scope: both.
Verify by: Measure hit areas in DevTools (including padding/pseudo-element extensions).
Class: hard-rule

### CI2 — One primary CTA per view
Rule: Give each view exactly one primary action; a second primary creates decision paralysis. Primary commits, secondary offers the alternative; place the primary where the task ends.
Values: 1 primary per viewport-ish view; secondaries visually subordinate (outline/ghost).
Applies to: Heroes, section CTAs, pricing, forms, nav.
Script scope: both (task-end position mirrors in RTL).
Verify by: Count filled/primary-styled CTAs per view in screenshots.
Class: hard-rule

### CI3 — Buttons act, links go; both get five states
Rule: Use buttons for state changes and links for location changes, and design all five states for each: default, hover, focus-visible, active, and disabled (buttons) / visited-where-meaningful (links).
Values: Focus state always visibly distinct from hover.
Applies to: `button.tsx`, inline links, nav.
Script scope: both.
Verify by: Keyboard-walk the page; trigger each state and screenshot.
Class: hard-rule

### CI4 — Links keep their underline and their scent
Rule: Underline inline links inside running text, and write link labels that carry full information scent ("Read the pricing breakdown", never "Click here" / "Learn more" alone).
Values: —
Applies to: MDX prose, body copy links, footers.
Script scope: both.
Verify by: Grep link labels; visual check that in-prose links are underlined (color alone fails C13).
Class: hard-rule

### CI5 — Cards chunk; the whole card is the target
Rule: Use cards to chunk repeating content, make the entire card clickable (Fitts), order internals top→bottom ending with actions, and keep card layouts identical across a grid — inconsistent layouts destroy comparison.
Values: One layout template per card grid.
Applies to: Work items, service cards, pricing tiles, article cards.
Script scope: both.
Verify by: Click every region of a card; diff the DOM structure of sibling cards.
Class: hard-rule

### CI6 — Form mechanics
Rule: Build forms as a single column of grouped, clearly labeled fields with auto-formatting, real-time inline validation, and progress indication on multi-step flows.
Values: One column; group gaps > field gaps (S3); validation appears at the field, on blur or submit—not only at the top.
Applies to: Contact, estimator, audit lead capture, schedule.
Script scope: both.
Verify by: Submit invalid data; watch where and when errors render; check column count at all breakpoints.
Class: hard-rule

### CI7 — Progress honesty and the goal gradient
Rule: Animate progress only while work is happening (static = complete/paused), and near completion make the remaining distance visible — motivation spikes near ~80%.
Values: —
Applies to: Multi-step estimator, loaders, any wizard.
Script scope: both.
Verify by: Observe each state; confirm animated ⇔ active.
Class: heuristic

### CI8 — Radius is a system and a voice
Rule: Derive all radii from a base unit with a proportional scale; nested radii shrink (inner = outer − padding); choose the base deliberately as brand voice — very low radius reads precision/authority, large reads consumer-friendly.
Values: inner = outer − padding for nested rounded elements; one base unit sitewide.
Applies to: Cards, buttons, inputs, overlays, nested media.
Script scope: both.
Verify by: Measure nested pairs in DevTools; check all radii derive from the base token.
Class: hard-rule (the nesting math) + judgment (the brand-voice choice)

### CI9 — Elevation: edges first, two-layer shadows, few levels
Rule: Define depth with edges first (top edge light/dark cues), confirm with a two-layer shadow — a soft directional key that grows with height plus a tight ambient contact shadow whose opacity decays as elevation rises; ~5 levels suffice. Raised = dark top edge/bottom glow; inset = reversed.
Values: Ambient opacity ~0.08 (low) → ~0.02 (high); ≤5 elevation levels sitewide.
Applies to: Cards, overlays, nav glass, pressed/inset states.
Script scope: both.
Verify by: Inventory all shadow tokens (count levels); inspect layer structure of each.
Class: heuristic

### CI10 — Glass has five parameters
Rule: Specify glass surfaces along all five parameters — light (surface gradient), refraction (blur), depth (shadow), dispersion (saturation), frost (opacity) — and provide a reduced-transparency fallback.
Values: —
Applies to: `.liquid-glass*`, nav, overlays.
Script scope: both.
Verify by: Inspect the utility's declaration for all five; toggle `prefers-reduced-transparency`.
Class: heuristic

### CI11 — Defaults are not consent
Rule: Read intent from the user's action; never pre-select options for the business's benefit (pre-checked marketing, preselected upsells, sneaky opt-ins).
Values: —
Applies to: Forms, estimator defaults, cookie/consent surfaces.
Script scope: both.
Verify by: Audit every default value: who benefits?
Class: hard-rule

---

## 5. Motion

### M1 — Ease-out entrances, never linear
Rule: Enter with ease-out-dominant curves (matching physical deceleration) and never linear — linear reads as unnatural before users can articulate why; exits may accelerate.
Values: Entrance curves front-load velocity (e.g. cubic-bezier(0.2, 0, 0, 1)); linear reserved for continuous loops (marquees, shimmer) only.
Applies to: All reveals, transitions, GSAP presets, CSS animations.
Script scope: both.
Verify by: Audit every ease token and every `ease`/`animation-timing-function` literal; confirm GSAP receives registered eases, not silently-defaulted strings.
Class: hard-rule

### M2 — Anticipation before meaningful reveals
Rule: Precede a meaningful reveal with a small counter-movement (anticipation beat) so attention arrives before the motion; without it the reveal feels abrupt.
Values: Counter-movement ≈ 4–8% of travel distance, ≈ 15–20% of duration, opposite direction.
Applies to: Hero/section headline reveals, featured-element entrances — not micro-hovers.
Script scope: both (direction mirrors with the travel axis in RTL when horizontal).
Verify by: Frame-step the animation (slow-mo in DevTools); the first frames move opposite to travel.
Class: heuristic

### M3 — Motion respects capability and preference
Rule: Gate all non-essential motion on `prefers-reduced-motion`, pointer capability, and constrained devices; the base interaction must work with motion off.
Values: Reduced motion ⇒ near-instant (~0.01ms) equivalents; hover-dependent flourishes require `pointer: fine`.
Applies to: All GSAP hooks, CSS animations, Lenis.
Script scope: both.
Verify by: Toggle reduced-motion emulation; test on touch.
Class: hard-rule

---

## 6. Perception & Cognition

### P1 — One focal point, built by size or contrast
Rule: Give every view exactly one primary anchor established by size or contrast — alignment structures a layout but cannot rank it; a second competing highlight kills recall for both (Von Restorff works through isolation).
Values: 1 anchor per section; the anchor wins on ≥2 aligned weight factors (P2).
Applies to: Every section; social assets.
Script scope: both.
Verify by: 5-second squint test — name the anchor; if two candidates tie, it fails.
Class: hard-rule

### P2 — Visual weight factors must point the same way
Rule: Compose emphasis from the six weight factors — size, saturation, color dominance, isolation, shape, lightness — aligned in one direction; conflicting factors break hierarchy, and over-highlighting dilutes everything (bold doesn't emphasize; contrast ratio does).
Values: —
Applies to: Headlines, emphasis system usage, cards, CTAs.
Script scope: both.
Verify by: For the intended anchor, list which factors favor it; ≥2 favor it, none favor a rival.
Class: judgment

### P3 — Center bias and the attention grid
Rule: Put the one anchor at/near the center of the composition (first fixation lands center) and utilities at the edges; attention decays toward the bottom-trailing corner — top-leading is strongest.
Values: Top-left strongest / bottom-right weakest in LTR.
Applies to: Heroes, section compositions, OG images.
Script scope: both — RTL mirrors horizontally: top-right strongest, bottom-left weakest.
Verify by: Screenshot with a 3×3 grid overlay; anchor occupies center band, critical info avoids the weak corner.
Class: heuristic

### P4 — Scan pattern matches intent
Rule: Structure action-driven landing views for the Z-pattern (logo top-leading, CTA top-trailing, proof on the diagonal, final action bottom-trailing), content-heavy views for the F-pattern (front-load first lines and start edge), and skimmable pages as layer-cake sections.
Values: —
Applies to: Home, service pages (Z); articles, FAQ, legal (F); all (layer-cake).
Script scope: both — patterns mirror in RTL (F anchors hang off the right edge).
Verify by: Trace the expected pattern over a screenshot in both directions; critical elements sit on it.
Class: heuristic

### P5 — Working memory caps simultaneous choices
Rule: Where options compete simultaneously (pricing tables, filter sets, KPI rows), present ≤4±1 chunks and chunk anything above; navigation is scanned, not compared — exempt.
Values: ≤5 competing options; grouped icon sets ≤4 for instant recognition, 7 forces scanning.
Applies to: Pricing, estimator steps, stat/KPI clusters, filters.
Script scope: both.
Verify by: Count simultaneously-competing choices per cluster.
Class: heuristic

### P6 — Rule of odds
Rule: Prefer odd counts for peer item sets — odd counts create a dominant center and lock attention; even counts close symmetrically (calm, but anchor-less). Breaks down above ~9 (reads as a crowd).
Values: 3 / 5 / 7 for featured groups.
Applies to: Feature grids, stat rows, trust markers.
Script scope: both.
Verify by: Count items per featured group.
Class: heuristic

### P7 — Labels and colors must agree (Stroop)
Rule: Never let a word and its color conflict — mismatches add ~100–200ms and read as wrongness (a green "Delete", a red "Success").
Values: —
Applies to: Buttons, statuses, badges, alerts, form messages.
Script scope: both.
Verify by: Table of every colored label: semantic hue vs verbal meaning must match (C10/C11).
Class: hard-rule

### P8 — Jakob's Law: innovate the value, not the interface
Rule: Keep interface conventions users carry from the rest of the web (logo top-leading linking home, nav placement, cart/search idioms); spend novelty on content and craft, not on relearning costs.
Values: —
Applies to: Nav, footer, forms, e-commerce patterns.
Script scope: both (conventions mirror in RTL).
Verify by: judgment — list deviations from convention; each needs a defended reason.
Class: judgment

### P9 — Fitts's Law beyond target size
Rule: Make frequent/important targets bigger and closer to the user's current position; exploit infinite screen edges where applicable; on mobile respect the thumb zone over aesthetics.
Values: T = a + b·log₂(D/S + 1) — directional model, not a computed spec.
Applies to: Sticky nav, mobile CTA placement, dialog action rows.
Script scope: both (thumb zone mirrors for RTL/handedness-neutral).
Verify by: Mobile screenshot with thumb-zone overlay; primary actions in easy reach.
Class: heuristic

### P10 — Banner blindness: critical info lives in the flow
Rule: Integrate critical information into the main content flow, styled like the system — anything shaped like an ad or floating outside the flow is filtered out unseen.
Values: —
Applies to: Announcements, lead-capture inserts, promos.
Script scope: both.
Verify by: judgment — does the element look like the system or like an interruption?
Class: heuristic

### P11 — Alerts must match the attention set
Rule: Make interruptions feature-match what the user is currently attending to (inattentional blindness: mismatched alerts are looked at and not seen) — placement and styling must connect to the task.
Values: —
Applies to: Form errors (at the field), toasts, validation summaries.
Script scope: both.
Verify by: Trigger the alert mid-task; is it inside the task's visual channel?
Class: heuristic

### P12 — Peak-End: design the end first, then the peak
Rule: Explicitly design each page's final moment (the end) and its single strongest moment (the peak) — users remember those two, not the average; name both per page.
Values: 1 named peak + 1 named end per page.
Applies to: Every page; the closing CTA section is the default "end."
Script scope: both.
Verify by: Per-page audit line: "Peak = X, End = Y" — if unnameable, it fails.
Class: judgment

### P13 — Option structure shapes choice (decoy effect)
Rule: Design pricing/tier structure knowing the option set itself steers the decision — an intentional anchor/decoy is a structural choice, never persuasion copy; never exploit it deceptively (CI11).
Values: 3-option structures with a deliberate reference option are the classic shape.
Applies to: Pricing, estimator tiers, proposals.
Script scope: both.
Verify by: judgment — is the intended choice architecture explicit and honest?
Class: judgment

### P14 — Diagrams beat prose for systems
Rule: Explain systems and architectures with diagrams — dual coding (visual + semantic) encodes and recalls better than text alone.
Values: —
Applies to: Process, architecture/stack sections, articles, proposals.
Script scope: both (diagram flow direction mirrors in RTL).
Verify by: judgment — could this paragraph be a diagram?
Class: heuristic

### P15 — Shape language carries meaning (Bouba-Kiki)
Rule: Align the brand's shape language with its sound and claim — sharp/precise geometry for a precision-engineering brand, rounded organic forms for softness — pre-linguistically, shape is read before copy.
Values: —
Applies to: Radius choice (CI8), icon geometry, gradient/blob usage, logo surround.
Script scope: both.
Verify by: judgment — do the shapes say what the copy says?
Class: judgment

### P16 — Aspect ratio is semantic
Rule: Choose aspect ratios by the feeling of the frame: 2.39:1 cinematic/contextual, 4:3 central focus, 9:16 direct/intimate (mobile), 1:1 balanced.
Values: As listed.
Applies to: Work screenshots, OG/social canvases, embedded media.
Script scope: both.
Verify by: Ratio inventory of media surfaces vs intent.
Class: heuristic

### P17 — Gestalt and the core six make it understood, not interpreted
Rule: Compose with grouping, similarity, continuity, closure, and boundaries, plus the core principles (hierarchy, contrast, spacing, alignment, repetition, emphasis) so structure is perceived without conscious decoding.
Values: —
Applies to: Everything; the umbrella under S3/S4/P1–P3.
Script scope: both.
Verify by: The squint test + greyscale test (C4) as proxies.
Class: judgment

### P18 — Subtraction beats addition
Rule: When a composition competes with itself, remove elements rather than amplifying the anchor — single focal point + extreme contrast + pattern interrupt outperform multi-signal layouts (the Oatly/The Ordinary pattern).
Values: —
Applies to: Heroes, social assets, landing sections.
Script scope: both.
Verify by: judgment — for each element, delete it mentally; if nothing breaks, delete it actually.
Class: judgment

### P19 — Golden ratio is a guideline, not a law
Rule: Never justify a layout decision solely by the golden ratio — no universal aesthetic preference is proven; use the modular scale (T3) and grid (S2) as the actual system.
Values: —
Applies to: Documentation, design rationale.
Script scope: both.
Verify by: Grep rationale docs for golden-ratio claims presented as law.
Class: judgment

### P20 — Atomic composition: changes inherit upward
Rule: Build the system as atoms → molecules → organisms so a change at a lower level propagates upward automatically; never fork a lower-level primitive inside a higher-level component.
Values: —
Applies to: Component architecture (`ui/` → `sections/` → pages); token chain (C9).
Script scope: both.
Verify by: Grep for re-implementations of `ui/` primitives inside sections.
Class: hard-rule

---

## 7. Accessibility

*(The floor, restated as law — several entries above are cross-referenced here because they are accessibility rules first.)*

### A1 — Contrast floors
See **C12**. AA is the floor (4.5:1 body / 3:1 large+UI), AAA (7:1) the design target for primary reading text. Hard-rule.

### A2 — Never color-only
See **C13**. Every meaning carried by color has a redundant cue; deuteranopia + protanopia simulated per audit. Hard-rule.

### A3 — Target size
See **CI1**. ≥44px effective targets everywhere. Hard-rule.

### A4 — Visible focus, always
Rule: Every interactive element shows a visible, high-contrast `focus-visible` state distinct from hover; keyboard order follows visual order.
Values: ≥2px outline, ≥3:1 against adjacent colors, offset so it never disappears against its own fill.
Applies to: All interactive elements; both scenes.
Script scope: both.
Verify by: Tab through every page; screenshot focus on light, dark, and inverted scenes.
Class: hard-rule

### A5 — Semantic structure
Rule: Convey structure in the DOM — real headings in scope order (T4), landmarks, `aria-labelledby` on sections, list semantics for lists — never divs styled as structure.
Values: —
Applies to: All sections and pages.
Script scope: both (plus `dir` correctness and logical properties for RTL).
Verify by: a11y tree inspection; axe/Lighthouse pass.
Class: hard-rule

### A6 — Preference media queries are contracts
Rule: Honor `prefers-reduced-motion` (M3) and `prefers-reduced-transparency` (CI10) with real fallbacks that preserve full function and meaning.
Values: —
Applies to: Motion system, glass surfaces, grain.
Script scope: both.
Verify by: Toggle both preferences; walk the site.
Class: hard-rule

### A7 — Language and direction integrity
Rule: Declare `lang` and `dir` correctly per locale, use logical CSS properties, and treat RTL as a first-class rendering — mirrored scan anchors, mirrored directional icons, zero Latin tracking leakage into Arabic.
Values: `letter-spacing: 0` in AR (T9); heading/body leading per T5.
Applies to: Layout shell; every directional style.
Script scope: both (this rule *is* the bridge).
Verify by: Full AR-RTL walkthrough per audit; automated grep for physical direction classes.
Class: hard-rule

---

## Archive: print

Parked for future collateral work (proposals, printed decks). **Excluded from the web system.**
CMYK vs Pantone (pre-mixed ink consistency) · ICC profiles for RGB→CMYK conversion · soft-proofing ·
FOGRA39 ~300% total ink limit · 3mm bleed · A-series √2 paper ratio · manuscript margins 1:1:2:2.

---

*Companion docs: `design.md` (token layer) · `docs/design-audit-2026.md` (Phase 4 findings, when created).
Rules added during implementation get appended to the relevant section with the same format.*
