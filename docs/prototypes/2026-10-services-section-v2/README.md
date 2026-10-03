# /services "Where each one sits" — round 2 (2026-10-03)

Ali rejected the live life-line section (prototype A of `../2026-10-services-stage`) outright.
Three replacements, same copy (`servicesPage.stage.*`, `services.*`), one switcher (direction,
EN/AR, light/dark). Open through the `prototypes` preview:
`http://localhost:4173/2026-10-services-section-v2/index.html`. Not production code.

The audit fee shows as a placeholder on purpose — a price exists only in `packages/pricing-schema`.
The three section titles are new copy and unreviewed.

| | Claim | Device | Idea source | Risk |
|---|---|---|---|---|
| **A · Your question** | Name the question you're asking; it leads to one discipline | Four questions set large in life order; the one under the pointer/focus fills a sticky answer panel (what you leave with, deliverables, terms, door), world colour per discipline. Mobile: every answer open under its question | Awwwards services-hover lists (OIC Design, Wandergates, HATAMEX — inspiration elements, 2026-10-03); TFTL index + one sentence (SIT-001), without its pin | Hover-to-reveal hides three answers on desktop until pointed at |
| **B · Three fields** | A system has three moments; we work in all of them | Three tinted fields sized by role (the build is widest, holds design + development); the live field bleeds off the page edge = ongoing; dashed return line back to the audit. Fields open once on entry | The live section's own content, made physical; no vertical rules (RUL-079) — fields separate by tint and gap | Three tinted containers sit near the over-subscribed card row; must stay three, never a grid |
| **C · The loop** | Not a menu — a loop you can enter anywhere | Four world-coloured arcs on one ring (audit → design → development → maintenance → back); pick an arc, the detail beside it changes; previous/next | The live section's return line ("what monitoring surfaces becomes the next audit's brief") promoted to the whole shape | Close in spirit to the rejected Discover→Evolve loop (no travelling pulse here); a ring reads as a diagram |

Recommendation: **B** — everything readable at once with no interaction, and the bleeding live
field says "ongoing" without a word. A is the strongest if Ali wants the visitor's own words first.

**Picked: B** (Ali, 2026-10-03). Built in `apps/www/components/sections/services-index/services-stage.tsx`.
