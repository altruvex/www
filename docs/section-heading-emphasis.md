# Section heading emphasis — when to use which shape and which colour

Scope: every `<SectionHeading>` and every hand-rolled `h1`/`h2` that uses `<Highlight>` or `<Accent>` in `apps/www`.
Law layer: `docs/design-principles.md` (C10 functional hue semantics, T-rules on mixed faces). This document is the application of that law to headings.

## 1. The three shapes

| shape | component | looks like | job |
|---|---|---|---|
| **Plain** | no second line | one sans line, foreground colour | utility / descriptive titles ("Questions About Building Your Tech Stack", "Contact") |
| **Italic** | `<Highlight>` (SectionHeading default when `accent` is omitted) | dimmed serif-italic, light weight; bold sans in RTL | the composed voice: craft, method, restraint, philosophy, identity — and **every negative / loss / risk framing** |
| **Colour** | `<Accent>` (`accent="world"` or a named gradient) | world-matched gradient, inline, per-word animated | the bold voice: outcome, value-prop, proof, conversion |

Decision test for the second clause of a headline, in order:

1. Is it a warning, a loss, a "not / never / gamble / cost" phrase? → **Italic**. Never colour the bad news ("a gamble.", "compounds in cost.", "They're getting templates.", "What we will not do.").
2. Is it what the client *gets* — money, proof, a live thing, an invitation to act? → **Colour** ("no hidden costs.", "you can inspect today", "scope your build?", "In production.").
3. Is it how we *think* or how we *work*? → **Italic** ("Execution second.", "the project.", "chosen with intent.", "One uncompromising standard.").
4. Nothing above fits → **Plain**.

A section on `theme="surface"` (inverted island) has no accent-world, so it cannot take Colour; Italic is its ceiling.

## 2. Colour = the section's world, never a free choice

Every coloured heading sits inside an `accent-world-*` wrapper. The gradient must be that world's gradient — the colourful text must agree with the section's button and kicker, not contrast with them.

| world | job (C10) | `accent="world"` resolves to | alternate | hero only |
|---|---|---|---|---|
| `accent-world-blue` | brand, trust, ownership, architecture | `brand` (blue → indigo) | `ocean` (cyan → blue) | `iris` (blue → violet) |
| `accent-world-orange` | action, CTA, pricing, cost certainty | `ember` (amber → red) | `sunset` (orange → pink) | — |
| `accent-world-green` | proof, shipped, reliability, "live" | `forest` (deep green) | `mint` (green → teal) | — |

- **Default: `accent="world"`.** It reads `--world-grad-*` from the wrapper (light, dark and inverted variants are defined in `globals.css`), so the heading can never wear the wrong world. This is what removed the drift that had put `iris` in an orange section and `lavender` in a blue one.
- **Alternate** (named): only when a page has two Colour headings in the same world, or a same-world section sits directly before the closing CTA. Example: homepage quote-artifact (`sunset`) sits right above the `ember` CTA.
- **`iris`**: the page hero `h1` only, one per page (homepage "revenue").
- **Retired for headings:** `aurora`, `lavender`, `neon`, `candy`. They exist for the playground and MDX colour only.

## 3. Budget and adjacency

- **≤ 2 Colour headings per page.** The homepage is the one deliberate exception (every section coloured, world-matched).
- **Never two Colour headings of the same world back-to-back.** Different worlds next to each other (green proof → orange CTA) build hierarchy and are fine. "Visually different" (a dark card vs a plain band) does not count as separation.
- **The closing CTA wins.** When a same-world neighbour collides with the closing CTA, the neighbour downgrades to Italic or takes the alternate; the CTA keeps `world`.
- **Body copy never takes Colour or Italic.** Body rhythm uses `<Strong>` / `<Dim>` through `t.rich(key, bodyMarks)` only.

## 4. Message keys

- `titleItalic` — the second clause renders through `<Highlight>`.
- `titleAccent` — the second clause renders through `<Accent>` on its primary consumer.
- A key name follows its primary consumer; if a shared key is rendered differently on another page (about's `PathwaysSection` renders `commercial.cta.titleAccent` as Italic because `SectionEndCta` follows it), the render site changes, not the key.

## 5. Current map (2026-09-05)

| page | section | world | shape | note |
|---|---|---|---|---|
| / | hero | blue | Colour `iris` | hero-only gradient |
| / | problem | orange | Italic | negative framing ("templates") |
| / | ownership stack | blue | Colour `world` | was `iris` — iris is hero-only |
| / | work | green | Colour `mint` | green alternate, "live" register |
| / | trust | blue | Colour `world` | was `lavender` — off-world |
| / | transparency estimator | none | Italic | no wrapper |
| / | quote artifact | orange | Colour `sunset` | alternate: sits directly above the ember CTA. `.accent-sunset` did not exist before this pass — the line rendered invisible |
| / | CTA | orange | Colour `world` | closing conversion |
| /approach | contrasts "Common vs **Altruvex**" | green | Colour `world` | brand-as-answer, proof world |
| /approach | decisions, constraints, multilingual | green | Italic | method / philosophy — were `forest` |
| /approach | boundaries "What we will not do." | orange | Italic | negative — was `ember` |
| /approach | closing "let's talk." | orange | Colour `world` | conversion |
| /process | closing "the project." | orange | Italic | method, not conversion — was `ember` |
| /standards | closing "automatically." | green | Colour `world` | guarantee / proof |
| /services/maintenance | pricing "transparent, predictable." | orange | Colour `world` | cost certainty — was `iris` (blue in an orange section) |
| /services/maintenance | cta "a gamble." | orange | Italic | loss-framed exception |
| /services/* closing CTAs | orange | Colour `ember` | inline `<Accent>`, in-world |
| /services/ecommerce | proof | green | Colour `forest` | in-world |
| /services/development | pipeline "systems that last" | green | Colour `mint` | in-world alternate |
| /about | name principle "are not decoration." | blue | Italic | identity claim; key renamed to `titleItalic` |
| /about, /pricing, /how-we-work, /services, /work/[slug] | all others | — | Italic / Plain | unchanged |
| shared `SectionEndCta`, `CtaSection` | orange | Colour `world` | were `ember` (same result, now drift-proof) |

## 6. Adding a new section

1. Wrap the section in the world its job belongs to (C10), or `theme="surface"` if it is an inverted island.
2. Write the headline with the split already decided; name the key `titleItalic` or `titleAccent`.
3. `accent` omitted (Italic) unless the clause passes test 2 in §1; then `accent="world"`.
4. Check the section before and after it. Same world and both Colour → alternate or downgrade.
5. Count the page's Colour headings. Three is a bug unless the page is `/`.
