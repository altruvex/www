# /process prototypes — 2026-09

Three standalone directions for the /process rebuild, built after the ADI database search and a
dated Awwwards pass. Everything is in `index.html`, which has a switcher and a notes panel. Open
it directly in a browser.

| | Direction | Device |
|---|---|---|
| **A** | Chapters | phase index → one near-full-viewport chapter per phase, each ending in its gate, with a sticky rail marking the current phase |
| B | Your part | our phase stays quiet; your part is one verb at display size, and a gate line draws before the next phase comes to full ink; a sticky scope switch |
| C | What you hold | a sticky "In your hands" card collects each phase's deliverables as it passes |

**Picked: A** (Ali, 2026-09-30). It shipped in
`apps/www/app/[locale]/(main)/(marketing)/process/`:

- `page-client.tsx`: hero, mood photo band, then the chapters and scope sections;
- `phase-chapters.tsx`;
- `scope-bars.tsx`.

Where the build differs from the prototype:

- The register SectionHeading is kept above the phase index.
- The scope comparison ships as two static bars. The prototype toggled between the two scopes.
- The photo is `public/brand/mood/green-folds.webp`, a re-tint of `blue-folds.webp` (the copy in this folder).

B and C are kept for reference only. Do not build them without a new decision.
