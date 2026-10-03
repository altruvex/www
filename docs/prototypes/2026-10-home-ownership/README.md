# Homepage ownership section — prototypes (2026-10-01)

Three standalone directions for `apps/www/components/sections/ownership-stack-section.tsx`.
**Ali picked C on 2026-10-01; it is built in the repo.**

Open: `http://localhost:4173/2026-10-home-ownership/index.html` (the `prototypes` preview
config in `.claude/launch.json`). The bar at the bottom switches direction, language and theme.

## What is wrong with the live section

1. Five bordered slabs, each carrying an index, a name, a pill tag, a spec, a detail paragraph
   and an ownership line, plus an axis legend, an intro block and a closing line. The claim
   ("a template stops at the surface; you own all five layers") has to be dug out of the chrome.
2. The scrubbed "exploded staircase" motion is too quiet to carry the idea (CMP-008).
3. The pill tags print figures the section does not prove ("≤1s LCP", "99.9% uptime").
4. It sits directly under the problem section's five drawn rows; a second five-row register
   there would be a repeat (RUL-006).

## Directions

Same heading, same five layers, same ownership lines and closing line in all three. The pill
tags, the axis legend and "The Difference" intro block are dropped in all three.

| | Device | Idea source | Risk |
|---|---|---|---|
| **A · One line, two positions** | The five layer names as one block of display type. The only rule is a dashed line: under *A template* it sits below Interface and the four layers beneath go grey; under *Altruvex* it drops below Infrastructure. Plays once on arrival, then a two-button switch. Proof = comparison. | Large text service list — OIC Design (Awwwards element, May 2023). Two-state comparison is free in the ADI ledger. The moving line and the switch are my own addition. | A control on the homepage. The detail paragraphs are dropped. Needs five new template-side lines. |
| **B · Under the surface** | One brand-mood photograph (`blue-folds.webp`, unused elsewhere) as an inset stage. The five layers are a persistent index on it; one panel beside it shows the chosen layer and what you own. A dashed line under Interface marks where a template stops. Proof = anatomy. | Cerebrium "Why" index + single spec panel (Awwwards SOTD, 10 Sep 2026). The inset photo stage is the site's own idiom (hero, /work). | A third photograph moment on the homepage. Four of five ownership lines are hidden until chosen. On touch it is a tap list. |
| **C · Lift the surface** | Each layer is a sheet. Scrolling lifts one away and the next is already lying beneath it, a shade deeper. The bottom edge of the first sheet is the template line. CSS sticky, not a pin (RUL-084). Proof = anatomy. | Overlapping sections — Illoca (Awwwards SOTD, 4 Sep 2026; ADI CMP-089), turned upside down. One full block per item — Trionn services page. Depth-by-shade is my own addition. | Longest of the three (about three viewports). Dark lower sheets are a new surface for the homepage. Near REJ-035 (sticky card stack) and /services/interface-design's sticky rows. Plain stacked blocks on mobile. |

The Awwwards references were read on 2026-10-01 from page text, not screenshots; they are live
signal, not rulings. No dated reference was found for a "beneath the surface" device that needs
neither WebGL nor a pin, so the reveal mechanics in A and C are mine.

## New copy — not reviewed by Ali

- `compare` — EN "What you are handed", AR "ما الذي تستلمه" (A).
- `segTemplate` — EN "A template", AR "قالب جاهز" (A).
- Five template-side lines (A), written from the "not …" half of each existing ownership line:
  "A theme with your logo dropped in." / "Not yours. A one-off file that drifts on the first
  edit." / "Not yours. A plugin's assumptions, bent to fit." / "Not yours. A black-box table
  you rent." / "Not yours. A subscription that holds your site." — with Arabic counterparts.
- In A the owned line is the first half of the existing ownership line, cut at the dash.

## Checked

Desktop 1440 (light) and mobile 375 (dark), English and Arabic: no horizontal overflow, no
console errors. Dark at 1440 and light at 375 were not looked at. Reduced motion is handled in
CSS and script but was not checked in a browser.

## After the pick

Build in `ownership-stack-section.tsx` with `SectionHeading` / `Eyebrow` / `Container` / `Num`,
tokens and the `lib/motion` hooks; update `messages/{en,ar}/ownershipStack.json` in both locales
and remove the dead keys; update the device ledger in ADI's `07-section-composer.md` §5 (and
remove its stale boundary-section row); if B is picked, add the "Used at" line to
`apps/www/public/brand/mood/README.md`.
