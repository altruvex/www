# Chromatic Intent × Design Principles — Phase 2 Reconciliation (July 2026)

> The adjudication record for reconciling the live token system (`design.md`, `globals.css`)
> against the law layer (`docs/design-principles.md`). Every accepted change appears in the
> change table; every rejected principle carries its reason. Rule IDs (T1, C8, CI1, …) refer to
> `docs/design-principles.md`.

## 1. Change table (accepted / adapted)

| token / rule | current | proposed (now live) | rationale | risk |
|---|---|---|---|---|
| `h4` size | `clamp(1.125rem, 2vw, 1.75rem)` | `clamp(1.25rem, 1.8vw, 1.5rem)` | T3: old range collided with both neighbors (18px min = body; 28px max within 14% of h3's 32px — no perceptible step). New: 20→24px, clean ~1.33 step below h3. | **Low** — zero raw `<h4>` usages in components/app; only affects future/MDX h4s. |
| measure tokens | none (ad-hoc `max-w-[52ch]`, `max-w-5xl`) | `--measure-prose: 66ch` · `--measure-narrow: 45ch` · `--measure-wide: 75ch` | T6: CPL 50–75 needs tokens to be enforceable. Adoption per-section in Phase 5. | None (additive). |
| `.dark .accent-world-orange` | `27 96% 58%` (OKLCH C 0.168 vs light 0.137 — **+23%**) | `27 78% 61%` (C 0.134 ≤ 0.137) | C8 adapted: cap dark chroma at the light variant's chroma instead of the full −20–30% cut, preserving audited vibrancy while killing amplification. Contrast verified 7.86:1 on `#121212`, 6.94:1 vs button fg. | **Medium** — visible (slightly calmer dark orange). Verify visually in Phase 4; single-line revert. |
| `.dark .accent-world-green` | `158 64% 46%` (C 0.146 vs light 0.104 — **+40%**) | `158 36% 49%` (C 0.100) | Same C8 cap. 6.65:1 on `#121212`, 5.87:1 vs button fg (AA+). | **Medium** — most visible trim (the old green was the loudest violator). Phase 4 visual check. |
| `.dark/.inverted .accent-forest` stops | `156 70% 50% / 148 64% 52% / 170 74% 48%` (via C +30%) | `156 54% 52% / 148 46% 54% / 170 58% 50%` | C8 cap per stop; display-only text, ≥8.2:1. | Low-medium. |
| `.dark/.inverted .accent-mint` stops | `150 66% 52% / 170 74% 50% / 186 82% 50%` (via C +25%) | `150 52% 54% / 170 50% 52% / 186 58% 52%` | C8 cap per stop; ≥8.5:1. | Low-medium. |
| `--elevation-card-lg` contact layer | `0.05` light / `0.5` dark | `0.03` light / `0.35` dark | CI9: contact/ambient opacity must *decay* as elevation rises (card 0.04 → card-lg 0.03 → overlay 0.02); previously it grew. | **Low** — sub-perceptual shift on hover cards. |
| `--elevation-overlay` (+ `--shadow-overlay`) | missing (popovers used ad-hoc/Tailwind shadows) | new level-3 token, both modes | CI9: complete the 4-level ladder (flat/card/card-lg/overlay). Component adoption (popover, select, command palette) in Phase 5. | None (additive). |
| Button sizes (touch) | `default` 40px, `sm` 32px, icons 32–40px on all pointers | + `pointer-coarse:min-h-11` / `pointer-coarse:size-11` | CI1 adapted: 44px enforced where tap errors happen (coarse pointers); compact fine-pointer spec kept — mouse precision doesn't need 44px and the compact sizes are part of the visual language. | **Low** — desktop unchanged; touch buttons grow ≤4–12px. Verify via device emulation. |
| `RevealConfig.anticipate` + `sectionElement` preset | no anticipation pattern in library | opt-in anticipation micro-beat (~8% counter-travel, 18% of duration, 35% opacity), enabled on `sectionElement` | M2. Skipped for `fade` (no travel to counter), scrub (progress is scroll-owned), reduced-motion (existing tier), and word-split headlines (per-word wind-up reads as jitter). | **Medium** — motion feel change on CTAs/featured blocks; Phase 4 checklist item 8 verifies; `anticipate: false` opts out per element. |
| `design.md` §7.1/§6.1 radius claim | "`rounded-sm` … restrained, not pill-shaped" (stale — code ships `rounded-lg`) | doc corrected + decision stated: **12px buttons, deliberate** | CI8 requires the radius voice be chosen deliberately. Decision: keep the Apple-pass 12px (machined mid-radius), reject both pill (consumer softness) and sharp-corner (fights the refined surface language). Code untouched; doc now matches code. | None (doc). |
| `design.md` §10.1 font snippet | showed `weight:` arrays | corrected: variable fonts, no weight arrays | Doc drift — the arrays version would make `font-light`/`font-medium` silent fallbacks; live code comment explicitly loads variable axes. | None (doc). |
| `design.md` §10.11 + §3.3/§3.4/§4.1/§6.3/§8 | stale home map (`transparency-section.tsx`), missing Ownership Stack, no tier/measure/elevation/anticipation notes | updated | Keep the token layer truthful to the tree. | None (doc). |

## 2. Gradient key → section → intent → hue rationale

| Key | Tier | Section(s) live | Intent | Hue rationale | Verdict |
|---|---|---|---|---|---|
| `iris` | core | hero, trust, pricing-signal, ownership-stack, transparency-estimator, services/maintenance | brand / trust / architecture | Blue→violet: blue = trust/authority (C10); the violet tail is the signature lift that keeps it from reading generic-SaaS-blue. | ✓ |
| `ember` | core | cta-section, section-end-cta, all 5 service pages, schedule, approach, how-we-work, process | action / conversion | Amber→burnt-orange: warm high-chroma = action (C10). | ✓ |
| `ember` on `problem-section` | core | problem (blue-world section) | names the industry failure | **Mismatch** — orange gradient inside a blue world violates the world-matching rule. Either re-world the section orange (problem→action framing) or switch the accent to `iris`. | ⚠ Phase 4/5 decision |
| `forest` | core | pipeline, work section + page, standards, approach, ecommerce | proof / shipped | Deep green = positive/production (C10). | ✓ |
| `mint` | core | green-world contexts alongside forest | proof (lighter voice) | Green→teal, same family. | ✓ |
| `brand` | reserve | — (playground only) | blue-world spare | Blue→indigo; allowed when blue world needs a second voice. | ✓ (unused) |
| `ocean` | reserve | MDX (`why-not-wordpress`) | blue-world spare / editorial stat | Cyan→blue, cool = trust. | ✓ |
| `sunset` | reserve | MDX (`custom-web-development-cairo`), playground | warm spare / editorial | Orange→pink; warm action range. | ✓ |
| `aurora` | editorial | MDX (`multilingual-architecture`), playground | article `<Mark>` only | Green→blue→violet spans three worlds — structurally unfit for any single section; legitimate as editorial spice. | ✓ scoped |
| `lavender` | editorial | MDX (`nextjs-development-agency`) | article `<Mark>` only | Violet→pink: no section job (violet ≠ trust/action/proof). | ✓ scoped |
| `neon` | editorial | — (nothing; not even playground) | none | Magenta→indigo: no job anywhere. | Candidate for retirement (kept: zero cost, typed palette member). |
| `candy` | editorial | — (nothing) | none | Pink→red→amber: no job. | Candidate for retirement. |

Decision: **no key deleted.** Core keys are the only ones sections may use; reserve keys need a
world match; editorial keys are fenced to MDX `<Mark>` + the playground (rule added to
`design.md` §3.4). `neon`/`candy` are flagged for retirement if still unused at the next audit.

## 3. Rejected principles (with reasons)

| Principle (appendix) | Verdict | Reason (one line each) |
|---|---|---|
| Weight triad 400/600/**800**; 800–900 hero impact | **Rejected** (800 part) | The brand's display voice is deliberately *light* (hero h1 300, section h2 400 — the anti-bold signature); impact comes from size + tight tracking, and T1's real demand (≥200-unit steps: 300/400 display ↔ 600/700 emphasis) is already satisfied. |
| Body leading strictly ×1.5–1.6 | **Rejected** | Site body is 1.75 EN / 1.9 AR — the airy premium voice on short marketing paragraphs; documented as a deliberate deviation in `design.md` §4.1. |
| Heading leading ×1.2 floor for display | **Rejected** (display regime) | 48–88px Latin display at 1.0–1.08 is standard display convention; Arabic headings keep 1.28. |
| Warm-tinted greyscale (S 2–10%) | **Rejected** | Pure 0%-S neutrals are the engineered-neutral brand look; temperature dominance (C6) is already resolved — cool dominates via the blue accent, no 50/50 ambiguity exists. |
| Full −20–30% dark-mode chroma cut | **Adapted** (not full) | Capped dark chroma at the light variant's chroma instead — the audited dark vibrancy is part of the look; the cap removes amplification, which is the principle's actual mechanism. |
| 44px targets on **all** pointers | **Adapted** | Enforced at 44px on coarse pointers via `pointer-coarse:`; compact fine-pointer sizes kept (mouse precision + visual language). |
| 5-level elevation | **Adapted** | 4 levels (flat/card/card-lg/overlay) + accent glow suffice for a flat-with-a-whisper aesthetic; a 5th would exist only to satisfy the number. |
| 12-column enforced page grid | **Deferred** | Sections compose ad-hoc grids inside one Container; retrofitting a 12-col skeleton is a layout rewrite with no identified defect — S2 stays a guidance heuristic for *new* sections. |
| Dark-mode type variant (size+/weight+/tracking+) | **Rejected** (type-side) | Weight/size deltas between themes cause layout shift; body is 17–18px at 16.4:1 in dark — no legibility deficit. The site already compensates on the *color* side (muted-foreground 40%→58% L, brand-text lifted), which is the same irradiation fix without reflow. |
| Anticipation on headline word-reveals | **Rejected** (scoped) | Per-word counter-movement reads as jitter, not anticipation; the beat lands on element-level reveals (`sectionElement`) only. |
| True small caps (T11) | **N/A** | No small-caps usage exists; rule stands as a guard for future work. |

## 4. Phase 3 — 2026 trend verification

Sources: Figma's web-design-trends library, zeroheight Design Systems Report 2026, Supernova
enterprise-DS outlook, Evil Martians' OKLCH work, plus agency roundups (weighted lower).
Filter: relevant to Altruvex? → passes through Chromatic Intent's existing language? →
strengthens "precision engineering"? All three or it's out.

### Adopted (appended to the change table)

| trend | current | adopted as | rationale | risk |
|---|---|---|---|---|
| OKLCH as the canonical color-reasoning space (Tailwind v4 ships OKLCH tokens; systems store canonical values in OKLCH; all modern browsers support it) | Tokens authored in HSL channels (`hsl(var(--x))` is load-bearing); Phase 2 already *verified* in OKLCH | **Codified: every new/changed color token is decided and verified in OKLCH** (chroma/lightness), then authored in HSL. Authored-format migration **deferred** — rewriting 100+ working tokens is churn with zero visual delta. | C2's law ("HSL channels lie about perception") now has a named working space; matches how Phase 2's chroma caps were actually computed. | None (process rule). |
| W3C Design Tokens Format Module (v2025.10 stable; 24+ orgs; 84% team adoption of tokens) | Token chain exists (primitive → semantic → component) but is CSS-only | **Noted as the export path**: if tokens ever need to feed Figma/design tooling or client handoffs, emit DTCG JSON from `globals.css` — do not restructure the CSS for it today. | C9 already satisfies the three-tier architecture; the standard is a serialization, not a redesign. | None (deferred). |

### Already native (no action — the site was ahead of the trend)

Bold oversized typography as centerpiece · variable fonts · first-class dark mode ·
scroll-triggered motion & micro-interactions · accessibility-baked-in tokens (Phase 2 chroma
caps ship with computed contrast) · performance/sustainable-design discipline (sub-1s promise,
dynamic imports, capability-gated motion).

### Rejected (one line each)

| trend | reason |
|---|---|
| Dopamine/vibrant palettes, maximalism | Fights the 90%-greyscale color-as-event doctrine — restraint *is* the brand. |
| Warm earth-tone palettes | Phase 2 already rejected warm-tinted neutrals; cool engineered neutrality is the identity. |
| Neo-brutalism / anti-design | "Raw and unpolished" is the exact opposite of the reference-standard claim. |
| Neumorphism | Soft-emboss elevation contradicts the edges-first + two-layer-shadow system (CI9). |
| Retrofuturism / neon, collage / scrapbook | No path through Chromatic Intent's language; reads as decoration, the named enemy. |
| Kinetic type (continuously animating headlines) | Motion doctrine is "reveals, not decoration"; the word-split reveal + one gradient sweep is the cap. |
| Experimental navigation (radial menus, hidden drawers) | P8 (Jakob): innovate the value, not the interface. |
| 3D/immersive/WebGL expansion, gamification | Sub-1s mobile performance is a published promise; spectacle spends that budget on decoration. |
| AI-agent-facing design systems (MCP-structured UI context) | Real trend, wrong layer — a potential Altruvex *service offering*, not a change to this site's visual system. |

## 5. Notes for Phase 4/5

- `problem-section` ember-on-blue: decide re-world vs re-accent (see gradient table).
- Adopt `--shadow-overlay` in `popover.tsx` / `select.tsx` / command palette; adopt measure
  tokens in prose blocks; both are per-section Phase 5 work.
- `select.tsx` trigger is `h-9` shadcn default — needs the same `pointer-coarse:` treatment
  as buttons (Phase 5, forms pass).
- `.label` / `.caption` utility classes are defined but have **zero** usages — either adopt or
  remove at Phase 5 cleanup.
- 2026 trend adoption (Phase 3) appends to the change table above.
