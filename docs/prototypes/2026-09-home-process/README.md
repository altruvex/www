# Homepage process section: prototypes

These are directions for `apps/www/components/sections/process-section.tsx`, built so that the
section agrees with the rebuilt /process page (`docs/prototypes/2026-09-process`, direction A).
Open `index.html` directly in a browser. It has a switcher for the direction, EN/AR and the site
theme; the section sits in the services wrapper's inverted scene.

## Where the live section and /process disagree today
1. The homepage retells every phase: headline, description and deliverables. That duplicates the
   /process chapters, and it is a second copy that can drift.
2. The homepage never mentions the client's sign-off ("your role"), which is the claim /process
   is built on.
3. The homepage shows only the longest case (40 days), while /process shows 10 – 40.
4. Nothing on the homepage links to /process.

## v2 (2026-10-01) — `index.html`
Built only from /process's own pieces: the hairline phase index, the light Outfit names, the
headline lit word by word, the gate line with its accent dash, and the two scope bars. Only the
ground (inverted scene) and the world colour (brand blue) are the homepage's.

| | Direction | Device |
|---|---|---|
| A | Index + scope | the /process phase index (rows deep-link to `/process#phase-*`), the two scope bars, one link to /process; about 1.3 viewports |
| B | Open index | the same index as an accordion: one phase open at a time (Development by default), opening into a mini chapter (huge name, word-read headline, gate line); about 1.6 viewports |
| C | Short chapters | /process's chapters without description/deliverables, with the CSS-sticky rail on lg; closest to /process, about 3.5 viewports |

All three:
- show 10 – 40 days;
- name the client's role;
- link to /process;
- keep zero pins (RUL-084);
- draw from one phase model (RUL-089).

The scale signature (SIG-022) is carried by the scope bars, which are drawn from that same model.

New copy, unreviewed:
- "See the whole process" / "شاهد المنهجية كاملة"
- "Read the full phase" / "اقرأ المرحلة كاملة"

## v1 (2026-09-30) — `v1-rejected.html`
**Rejected by Ali:** "completely different from the process page". It introduced new devices: one
calendar with verb beads, a gated staircase, and an index whose hairline is the bar. These
contradicted /process visually, even though they agreed with it in content. Kept for reference
only.

Research note: a dated Awwwards / CSSDA pass (2026-09-30, text-only fetches) found no award site
that draws phases to scale or shows sign-off gates. Kott Studio's homepage "numbered index + one
link out" is the only structural idea taken, and it is what A is built on.

**Picked:** B (Ali, 2026-10-01). Built in `apps/www/components/sections/process-section.tsx`.
The parts both surfaces draw (`phaseIndex`, `ScopeBars`, `PhaseGate`) moved to
`apps/www/components/shared/process-parts.tsx`, and /process imports them from there, so the
two cannot drift. The Gantt and the `process.scale` / `share` / `meta` messages were removed.
