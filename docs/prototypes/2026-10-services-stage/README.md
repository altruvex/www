# /services stage — prototypes (2026-10-01)

Three standalone directions for the section between the `/services` hero and the closing CTA.
Open `index.html` through the `prototypes` preview
(`http://localhost:4173/2026-10-services-stage/index.html`); the bar at the bottom switches
direction, language and theme. Nothing here is production code — the chosen direction is rebuilt
in `apps/www/components/sections/services-index/services-stage.tsx` with the real tokens,
`lib/motion` and `next-intl`.

## What is wrong with the live stage

1. **Scroll cost.** A 350svh photo track plus an 840svh sticky stage: about twelve viewports of
   held scroll to read nine sentences. RUL-084 allows a pin, but this one behaves like a
   scroll-jacked track (RUL-145 / REJ-005).
2. **Two claims in one device.** "What we do" and "How it runs" share the stage; RUL-076 asks for
   one claim per section.
3. **A second process model.** Discover → Architect → Build → Launch → Evolve disagrees with the
   site's one model in `lib/process-phases.ts` (discovery, wireframe, design, development,
   launch). RUL-006: drop the repeat, link to `/process`.
4. **One item at a time.** The four disciplines can never be compared; the reader has to hold
   them in memory.
5. **The homepage already shows** leaves / deliverables / engagement per service in open rows, so
   `/services` has to add something the homepage does not.

## Trend report — live signal, not rulings

Date: 2026-10-01. Read by static fetch only; motion was not observed. The services sections of
Ali's own picks (The First The Last, Trionn, Produx, Kott Studio) could not be read this round.

| Site | Award | What it does |
|---|---|---|
| Realevate | SOTD 2026-09-27 | four image-led categories, one-line descriptor each |
| Revelatio Studio | SOTD 2026-08-12 | capability buckets always open, sub-capabilities listed |
| LPAS | HM 2026-08-30 | process reduced to four words |
| Hue & Cry | HM 2026-07-21 | numbered list read as steps |
| REDSTONE | HM 2026-03-09 | numbered services with nested links |
| basement.studio | — | capabilities as filters onto the work |

Signal: services sections are getting shorter and more open — everything visible, numbered, with a
door to the detail page; the long pinned services stage is the pattern on its way out.

## Directions

All three: no pin, no scrubbed track, all four disciplines readable without interaction, one door
per discipline, the "how it runs" loop replaced by one line linking to `/process`. Section length
drops from about twelve viewports to between one and four.

| | Claim | Device | Idea source | Risk |
|---|---|---|---|---|
| **A · Life of a system** | The four are not a menu — each sits at a moment in a system's life | One horizontal line with three moments (before you build · the build · once it is live); the four disciplines hang under it as columns, design and development joined under "the build"; a dashed return line closes the loop. Signature: the line draws once on entry | LPAS (process as a few words), Hue & Cry (numbered list as steps) | Changes the order to consulting-first, unlike the nav and homepage. Four columns are tight at 1024px. A timeline could be mistaken for a required sequence — the "start at any point" line answers that |
| **B · The standard stays** | The page heading itself: four disciplines, one standard | The four constants stay fixed in the side column while four tall chapters pass; the constants' marks and a "now reading" line take each discipline's colour. Signature: the standard never moves, only its colour does | Revelatio (always-open buckets), the current stage's own "constant across all four" plate | Closest to the interface-design page's sticky rows (different mechanism: one sticky plate, not stacked titles). Longest of the three, about four viewports |
| **C · Photo + open entries** | Same standard, four ways in | One brand photograph carrying the four constants, then four open three-column entries (name and question · what you leave with and get · terms and door). Signature: the photograph settling on entry | Realevate (image-led, one-line descriptors), REDSTONE (numbered services with links) | Safest and least new: the rows are a cousin of the homepage service rows. The photo is mood, not argument — needs Ali's approval of the image (RUL-121) |

Recommendation: **A**. It is the only one that says something the homepage rows and the nav do
not — where each discipline sits — and it folds the old loop into the same picture instead of
losing it.

**Picked: A** (Ali, 2026-10-01). Built in
`apps/www/components/sections/services-index/services-stage.tsx`; the three moments live in
`LIFE_MOMENTS` (`services-index/data.ts`). B and C were not built.

## Round 2 (2026-10-01) — A rejected after it was built

Ali's verdict on the built A: distracting on desktop, and the idea itself was wrong, not its
styling. Four equal parallel columns under a timeline give the reader no entry point, and the
timeline is a second thing to read. A client arrives with one question — "which one is mine?" —
and A answered "where does each one sit?". Ali also ruled that the photograph with the
"Constant across all four" plate stays; it is restored in the live stage and sits above every
round-2 direction.

`round2.html` (`http://localhost:4173/2026-10-services-stage/round2.html`) — one thing to read at
a time, no pin, no scroll coupling:

| | Claim | Device | Idea source | Risk |
|---|---|---|---|---|
| **D · Which one is yours?** | You already know your question; the discipline is its answer | The four client questions as a large list on one side, ONE answer on the other (name, what you leave with, three deliverables, terms, door). Hover, focus or click a question swaps the answer. Below 1000px each question simply carries its answer | basement.studio (capabilities as filters), the live `services.{id}.problem` questions | Three disciplines' detail is hidden until chosen on desktop; needs the tab pattern done properly for keyboard |
| **E · The index** | Four disciplines, four doors | Four full-width rows — number, large name, the question, what you leave with, terms — each row one link; hovering a row dims the others | REDSTONE (numbered services with links), Realevate (one-line descriptors) | Closest to the homepage service rows; least new |
| **F · Two situations** | The four sort by where you stand | Two groups — "Building something new" (design, development) and "You already have a system" (consulting, maintenance) — two entries each | Revelatio (capability buckets) | The grouping is an editorial claim: an audit can also come before a first build |

Recommendation: **D**. It is the only one that starts from the client's question, shows one
discipline at a time, and is not a repeat of the homepage rows.

New and unreviewed in round 2, EN and AR: "Which one is yours?" / "Four questions — pick the one
you are asking"; "The four disciplines"; "Where you stand"; the two group titles and their
sub-lines in F.

Not checked in round 2: Arabic for D and E, dark, widths between 1000px and 1200px, keyboard
arrow-key movement in D (only focus and click are wired).

## Copy

Live `servicesPage.*` copy is used unchanged. New and unreviewed, EN and AR, direction A only
unless noted:

- "Where each one sits" / "Start at any point — each stands alone"
- "Before you build — When the decision is still open", "The build — Design and engineering, one
  team", "Once it is live — When it has to keep working"
- "What monitoring surfaces becomes the next audit's brief." (reworded from `loop.stages.evolve`)
- all three: "How a build runs, phase by phase — See the process"; B only: "Now reading"

The consulting engagement line reads "Fixed fee, five business days" here. The live string carries
the fee through the `{auditPrice}` token from the pricing schema; the build keeps that token.

## Not checked

Motion feel under Lenis, real Arabic review of the new lines, AA measurement of the white text
over the photo in C, widths between 1000px and 1200px for A.
