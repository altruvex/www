# Work — homepage section + /work page (2026-10-01)

Direction prototypes, two rounds, for the Work section and the /work page. Same copy, same images, one
switcher. Shared brief: `BRIEF.md`. Serve with the `prototypes` launch config (port 4173) and open
`/2026-10-work/a.html`.

Why a redesign: the current device (CMP-006, figures lead at display size) does not fit the content.
The real metrics are words ("High-res zoom", "Production live"), and there are three builds. The
honest proof shape is the artifact — the live sites — so all three directions lead with it (RUL-076).

| File | Direction | Idea sources (idea only) | Status |
|---|---|---|---|
| `a.html` | **The live window** — each build is its real site in a large window with a URL bar and a live mark; identity sits beneath as a hairline row. Signature: the window opens from an inset clip and the screenshot settles. | Jesper Landberg (Awwwards SOTD 2026-09-29); TRIONN "Work Showcase" (SOTD 2026-07-27); Love & Logic (SIT-194) | rejected 2026-10-01 |
| `b.html` | **The index and its window** — a typographic index with one sticky preview window that swaps by a vertical wipe. Under 900px each row carries its own frame. | Tokonoma list view (CMP-079); DashDigital "Project page list preview"; 3s Design "Project list table" | rejected 2026-10-01 |
| `c.html` | **The case file** — a sticky screenshot beside three movements (problem, what we built, outcome) with a progress hairline. | The First The Last / bleibtgleich'26 (SOTD 2026-09-22); Clément Grellier (SIT-250); Shed (SIT-113) | rejected 2026-10-01 |

## Round 2 — picked (2026-10-01)

Ali rejected A, B and C: they were one idea (a site screenshot in a frame) in three layouts, and a
screenshot of a site is not brand imagery. Round 2 has no browser frame and no screenshot.

| File | Direction | Idea sources (idea only) | Status |
|---|---|---|---|
| `d.html` | **The sentence** — the work told as one display sentence; the build names are the links. Signature: a scroll-linked word read (colour, not opacity). | Type-driven scroll sections (CMP-112); HOLOGRAPHIK (SIT-155, SOTD 2025-11-13); the site's own `/services/development` statement | **picked for the homepage section** |
| `e.html` | **The light stage** — each build is a dark inset stage with one brand-mood photograph, the build's title on it. | The site's inset photo stage (CMP-001); Locomotive (SIT-185, SOTD 2026-06-24); Love & Logic (SIT-194) | **picked for /work** |

Ali asked for the build to be simpler than the prototypes. The repo build therefore drops, from D,
the lede and the per-build summaries; and from E, the problem / built / outcome columns and the
stack line (they stay on `/work/[slug]`), and moves the summary and links under the stage. Built in
`apps/www/components/sections/work-section.tsx` and `app/[locale]/(main)/(marketing)/work/page-client.tsx`.

## Checked

Each file at about 1050px (dark) and 375px (light): no horizontal page scroll, no console errors,
no reveal left hidden in view, images load. Not checked: 768px, 1440px, reduced motion, keyboard
order.

## Not settled

- Copy the prototypes wrote themselves and nobody has reviewed: the close ("Start a project." /
  "Start the next build."), "04 · The next entry is unwritten.", "You are looking at it.",
  "03 builds · all live".
- The summaries and facts in `BRIEF.md` are shortened from `messages/en/caseStudies.json`; the repo
  build uses the message files, in both locales.
- Altruvex.com has no screenshot. The prototypes use a mood photo (`blue-folds`) or an ink plate,
  marked as "this site". The photo was not shortlisted with Ali.
- C: the screenshot frame is taller than the image, so a blank band shows under it.
- Nothing here is production code. The repo build reuses SectionHeading / Eyebrow / Container and
  the `lib/motion` hooks.
