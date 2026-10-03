# Section heading emphasis — when to use which shape and which colour

Scope: every `<SectionHeading>` and every hand-rolled `h1`/`h2` that uses `<Highlight>` or `<Accent>` in `apps/www`.
Law layer: `docs/design-principles.md` (C10 functional hue semantics, T-rules on mixed faces). This document is the application of that law to headings.

## 0. The rule on one screen (2026-10-03)

Every headline has at most one emphasised clause, and that clause takes exactly one of three treatments:

| treatment | when | how |
|---|---|---|
| **Gradient** (Colour) | the clause is what the client *gets*: an outcome, proof, a live thing, a price they can trust, an invitation to act | `accent="world"` / `<Accent gradient="world">`, inside an `accent-world-*` wrapper. At most 2 per page (homepage and `/services/*` excepted, §2-3). Never on an inverted island |
| **Dimmed italic** | the clause is how we *think* or *work*, an identity claim, or any warning / loss / "not" | `<Highlight>` in the drawn italic of Altruvex Sans. Display headings use `tone="soft"` (the SectionHeading default); `tone="muted"` is for text-size titles only (modal titles, MDX `em`, closing lines under a section); `tone="surface"` on inverted islands |
| **Plain** | the heading is a label or a description and there is no second clause worth a voice change | one line, no `<Highlight>` |

Two tests decide a doubtful case: if colouring the clause would celebrate bad news, it is italic; if the clause would read the same on a competitor's site, it is plain. `Highlight tone="world"` / `italicWorld` (the italic painted in the world gradient) stays a `/services` signature (RUL-063) and is not used on other pages. Named gradient alternates (`mint`, `sunset`, `ocean`) are only for the collisions in §2, never for taste.

Arabic: no italic exists, so the dimmed clause is the brand face in bold and the gradient clause is the same weight as its line (RTL-071).

## 1. The three shapes

| shape | component | looks like | job |
|---|---|---|---|
| **Plain** | no second line | one sans line, foreground colour | utility / descriptive titles ("Questions About Building Your Tech Stack", "Contact") |
| **Italic** | `<Highlight>` (SectionHeading default when `accent` is omitted) | dimmed italic (the drawn italic of Altruvex Sans, light weight); bold sans in RTL | the composed voice: craft, method, restraint, philosophy, identity — and **every negative / loss / risk framing** |
| **Colour** | `<Accent>` (`accent="world"` or a named gradient) | world-matched gradient, inline, per-word animated | the bold voice: outcome, value-prop, proof, conversion |
| **World italic** | `<Highlight tone="world">` / `<SectionHeading italicWorld>` | the italic clause, painted in the section's world gradient (bold sans in RTL) | `/services` only: the composed voice, but claiming an outcome, proof or a price |

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
| `accent-world-violet` | interface design: craft, the designed surface | `world` (indigo → violet) | — | — |
| `accent-world-cyan` | consulting: diagnosis, the instrument reading | `world` (teal → cyan) | — | — |

- **Default: `accent="world"`.** It reads `--world-grad-*` from the wrapper (light, dark and inverted variants are defined in `globals.css`), so the heading can never wear the wrong world. This is what removed the drift that had put `iris` in an orange section and `lavender` in a blue one.
- **Alternate** (named): only when a page has two Colour headings in the same world, or a same-world section sits directly before the closing CTA. Example: homepage quote-artifact (`sunset`) sits right above the `ember` CTA.
- **`iris`**: the page hero `h1` only, one per page (homepage "revenue").
- **The two discipline worlds (violet, cyan) exist on `/services` only.** There a hue
  names the discipline rather than the job (C10), each service page wears one world end to end -
  hero, sections and closing CTA, the pattern `/services/maintenance` already shipped in green -
  and the map lives in `apps/www/lib/config/accent-world.ts` (`SERVICE_WORLD`), never in a
  className. They take **no named alternate**: `accent="world"` is the only way to wear them, so
  a discipline hue cannot be applied to a page that is not that discipline.
- **Inside a page, the world appears only where something is true of that moment**: the eyebrow
  above a coloured heading, the primary button, an active/selected element, a progress fill, a
  hover affordance. Cards, rules, body copy and the rest stay monochrome. `/services/maintenance`
  is the reference for the dose. Two things are deliberately *not* recoloured: semantic state
  (`text-success` on a passing step, the audit's red/amber/green annotations - C11 says those
  signal state and must not follow a page's hue), and the `/services/interface-design` playground
  stage, which is a specimen of the real component library and would be lying if its `primary`
  button were repainted to match the section around it.
- **Retired for headings:** `aurora`, `lavender`, `neon`, `candy`. They exist for the playground and MDX colour only.

### World italic on /services (added 2026-09-13)

The service pages each wear one world end to end, so the Italic/Colour split is where their
rhythm comes from. A second clause that would be Colour by the decision test in section 1 keeps
its italic face there and takes the world gradient instead of dimmed ink. The test itself
does not change: warnings and method stay muted Italic.

| page | clause | shape |
|---|---|---|
| all four heroes | "built to convert." / "built to scale." / "& Web Audits." / "built for reliability." | World italic |
| /services/interface-design | showcase "No generic patterns." | Italic - negative framing |
| /services/interface-design | playground "The system itself, running." | World italic - a live thing |
| /services/interface-design | what-we-offer "in every engagement." | Italic - method |
| /services/development | tech stack "every tool, chosen with intent." | Italic - method |
| /services/consulting | brief "carefully." | Italic - method |
| /services/consulting | audit panel "Fixed Scope, Fixed Price." | World italic - cost certainty; the dark panel resolves the world's dark gradient |

The per-page budget in section 3 does not apply to `/services`, as it does not apply to the
homepage: a single-world page cannot break the same-world adjacency rule, so the alternation of
muted and world italic carries the hierarchy instead.

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
| /services (index) | hero list rows | per discipline | — | each row carries its own world, so the hover arrow teaches the hue before the click |
| /services/interface-design | whole page | violet | Colour `world` | hero, playground and CTA, one world |
| /services/development | whole page (incl. pipeline "systems that last") | blue | Colour `world` | was green `mint`; development is the brand world |
| /services/consulting | whole page | cyan | Colour `world` | was orange; the audit panel's hairline follows the world too |
| /services/maintenance | whole page | green | Colour `world` / `mint` | unchanged — this is the pattern the other four now follow |
| /about | name principle "are not decoration." | blue | Italic | identity claim; key renamed to `titleItalic` |
| /about, /pricing, /how-we-work, /services, /work/[slug] | all others | — | Italic / Plain | unchanged |
| shared `SectionEndCta`, `CtaSection` | orange | Colour `world` | were `ember` (same result, now drift-proof) |

Corrections of 2026-10-03, after the September page rebuilds drifted from this map:

| page | section | world | shape | note |
|---|---|---|---|---|
| /about | hero "we hold ourselves to." | blue | Italic | was World italic, which is `/services` only; an identity claim |
| /process | hero "Every time." | green | Italic | was World italic; method |
| /work | hero "In production." | green | Colour `world` | was `mint`; no same-world collision on the page, so no alternate |
| /approach | contrasts "And what gets said here instead." | green | Colour `world` | the map above already ruled Colour; the rebuild had dropped it |
| /faq, /writing, legal | `PageHero` second line | blue | Italic `soft` | was `muted`; every display heading now dims with the same ink |

## 6. Adding a new section

1. Wrap the section in the world its job belongs to (C10), or `theme="surface"` if it is an inverted island.
2. Write the headline with the split already decided; name the key `titleItalic` or `titleAccent`.
3. `accent` omitted (Italic) unless the clause passes test 2 in §1; then `accent="world"`.
4. Check the section before and after it. Same world and both Colour → alternate or downgrade.
5. Count the page's Colour headings. Three is a bug unless the page is `/`.
