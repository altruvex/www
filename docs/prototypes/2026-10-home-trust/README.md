# Homepage trust section — prototypes (2026-10-01)

Three standalone directions for `apps/www/components/sections/trust-section.tsx`.
Nothing in the repo's production code has changed; Ali picks one, then it is built.

Open: `http://localhost:4173/2026-10-home-trust/index.html` (the `prototypes` preview
config in `.claude/launch.json`). The bar at the bottom switches direction, language and theme.

## What is wrong with the live section

1. It stacks three blocks — sign-off sheet, client quotes, founder photo — and the photo
   carries a second claim of its own (REJ-034: one register arguing several claims).
2. Its five hairline rows repeat the row registers of the problem, services and process
   sections on the same page (RUL-006: drop repeats).
3. The same initials are printed five times. The claim is "one person", the device says it
   five times.
4. The closing photo (`/images/trust/founder-closing.jpg`) is moss in orange and green —
   outside the section's blue world (RUL-020, SIG-007).

## Directions

Same heading, same stage copy, same two client quotes in all three.

| | Device | Idea source | Risk |
|---|---|---|---|
| **A · The name stays** | Founder name at display size in a CSS-sticky plate (not a pin, RUL-084) with a `0N / 05` counter; the five stages scroll past it as large statements. Quotes, then photo close. | The First The Last (services stage), Art of Documentary "Founders" (Awwwards element) | Longest of the three (~2.4 viewports); still five rows |
| **B · One cell for five rows** | The live sheet, but the five repeated initials become one merged cell: a photo spanning all five rows, signed once. Quotes follow. No photo close. | Trionn about page (founder portrait + role block) | Closest to today; the founder's closing line has no home |
| **C · The clients speak first** | The two quotes lead at display size and take ink as they are read (colour, not opacity). The five stages collapse into one signed sentence. Photo close. | ADI CMP-087 ("Human Notes"), CMP-080 (word-tracked testimonial); Palomino testimonials (Awwwards HM, 2026-08-19) | Only two quotes; attribution is company names only (RUL-100) |

The Awwwards references were read on 2026-10-01 and are live signal, not rulings.

## New copy — not reviewed by Ali

- `signedByAll` — EN "Signed off by · all five" (B), with an Arabic counterpart.
- `noteLabel` — EN "What both had in common" (C).
- `note` — EN "One engineer read the brief, set the scope and price in writing, designed the
  architecture, wrote the code, and shipped it — and is still the one who answers when
  something needs fixing." (C)

## Proposed, not approved

- Replace the closing photo with `apps/www/public/brand/mood/single-lamp-dark-wall.webp`
  (already a brand-mood image, in the blue world). All three prototypes use it.

## Checked

Desktop 1440 and mobile 375, English and Arabic, light and dark: no horizontal overflow.
Reduced motion is handled in CSS but was not checked in a browser.

## After the pick

Build in `trust-section.tsx` with `SectionHeading` / `Eyebrow` / `Container`, tokens and the
`lib/motion` hooks; keys in `messages/{en,ar}/commercial.json`; then update the device ledger
in ADI's `07-section-composer.md` §5.
