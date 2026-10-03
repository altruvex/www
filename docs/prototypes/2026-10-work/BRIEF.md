# Work — prototype brief (2026-10-01)

Shared brief for the three direction prototypes of the homepage Work section and the /work page.
Each prototype is ONE standalone HTML file in this folder (`a.html`, `b.html`, `c.html`) that links
`shared.css` and adds its own `<style>` + a small vanilla `<script>`. No frameworks, no CDN scripts,
Google Fonts link for Outfit / Inter / Geist Mono is allowed. References, not production code.

## Page shape (same in all three)

1. `.nav` from shared.css (Altruvex · Work(on) / Services / Pricing / About / Contact · "Start a project").
2. A thin labelled divider "Homepage — Work section", then the **homepage section** (heading + the two
   client builds + one line/link to the flagship and to /work).
3. A thin labelled divider "/work — the page", then the **whole /work page**: h1 hero, all three
   builds, a quiet "next entry is unwritten" line, the dark `.close` from shared.css.
4. `.switch` at the bottom: A / B / C links, the current one `.on`.

## Content — use exactly this, invent nothing

Heading: `Real builds.` + accent line `In production.` (accent = `<em class="acc">`).
Eyebrow: `Selected work`. Lede: "Production builds you can inspect today, plus how we engineered
this site as a live reference."
/work intro: "Each build is live. Open it, test it on your phone, then read how it was made."

| | NewLight | Art Lighting Store | Altruvex.com |
|---|---|---|---|
| client · industry · year | NewLight · Lighting & e-commerce · 2024 | Art Lighting Store · Premium home lighting · 2024 | Altruvex (our own site) · Custom web development · 2025 |
| title | NewLight's first online store | A storefront for fixtures you need to see up close | The site itself had to be the proof |
| summary | A custom e-commerce platform that matches the brand and supports buying in Arabic and English on every device. | High-resolution product imagery at scale, live inventory and fast pages for a premium lighting retailer. | A bilingual build made to show technical quality, native RTL and lead qualification before the first call. |
| facts | Production live · Arabic + English · Full checkout | 95+ Lighthouse · High-res zoom · Inventory synced live | Mobile TTI < 1s · RTL switch < 16ms · Leads arrive pre-qualified |
| problem | A showroom business with no way to sell online without losing the brand's premium feel. | The old platform compressed images and loaded slowly; inventory lived in several systems. | In a market that competes on price, the site had to prove quality without borrowed credibility. |
| built | A custom store, a product system the team runs itself, a structured checkout, two languages. | A Next.js storefront with an image pipeline tuned for zoom; inventory synced into one source. | A custom Next.js stack with native RTL and a transparency flow that qualifies leads. |
| outcome | Launched on custom architecture; the team manages the catalog day to day. | A production storefront the client team operates without engineering support. | Sub-1s mobile TTI, RTL switch with zero layout shift, leads that arrive with scope mapped. |
| live URL | newlight-eg.com | artlighting-eg.com | altruvex.com |
| stack | Next.js · next-intl · Tailwind · PWA · PostgreSQL | Next.js · TypeScript · Tailwind · PostgreSQL · image pipeline | Next.js 16 · TypeScript · Tailwind v4 · GSAP · next-intl · Prisma |
| screenshot | `img/newlight-eg.com-{light,dark}.jpg` | `img/artlighting-eg.com-{light,dark}.jpg` | **none exists** |

Screenshots are 1800×854 (about 2.1:1), top of each homepage. Show the light one in light mode and
the dark one under `prefers-color-scheme: dark` (`<picture>` with a media source).
Altruvex.com has NO screenshot: never fake one, never draw a mock UI. Its artifact is the page the
visitor is on — say so in words ("You are looking at it") or use a brand-mood photo
(`img/navy-fabric-light.jpg`, `img/blue-folds.jpg`, `img/blue-wall-light-bands.jpg`,
`img/blue-ribs-light.jpg`, `img/single-lamp-dark-wall.jpg`) clearly as mood, not as a screenshot.
Links: "Read the case study" (href `#`), "Visit newlight-eg.com ↗" (real https URL, target _blank).
Homepage shows the two client builds; the flagship (Altruvex.com) is one line/link there.

## House rules that bind every prototype

- Type: Outfit light (300) display with tight tracking; Inter body; Geist Mono 11px uppercase eyebrows;
  the accent line is Georgia italic in `--brand-text` (`em.acc`). At most ONE coloured heading per surface.
- Colour: only the variables in shared.css. Work's world accent is green — you may add ONE variable
  `--world:hsl(152 60% 30%)` (dark: `hsl(152 55% 60%)`) for small marks (a dot, a thin rule, the
  "live" state). CTAs stay brand blue. No gradients, no glow, no glass on plain ground.
- Edges: hairlines (`var(--line)`) and space, not cards. A frame is spent only on a real artifact
  (the screenshot). Radii: frame 20–28px, buttons 10px. Pills only for dots/badges, never a CTA.
- No three-equal-cards row, no icons as filler, no emoji, no invented numbers, logos, people or quotes.
- Motion: one signature idea per surface; everything else is the shared `.rv` reveal
  (IntersectionObserver adds `.in`). No pin / scroll-jacking, no horizontal scroll track, no idle
  loops, never tween opacity on display-size type (move it, or clip it). CSS `position: sticky` is allowed.
  `prefers-reduced-motion: reduce` → finished state, no motion. Easing: `var(--ease)`.
- Must work at 390px, 768px and 1440px; no horizontal page scroll; touch has no hover, so anything
  hover-driven needs a tap/scroll equivalent. Links and buttons are real `<a>`/`<button>` with focus-visible.
- Light and dark both hold (shared.css follows `prefers-color-scheme`). Text contrast ≥ 4.5:1.
- LTR English only in the prototype, but use logical properties (`margin-inline`, `inset-inline`, `text-align:start`).

## Report back (≤ 15 lines)

File written, the device in one sentence, the one signature motion, what you verified (open the
file via `python3 -m http.server` or read-through), and anything that does not hold yet.

## Round 2 (2026-10-01) — A, B and C were rejected

Ali rejected all three: they were one idea (a site screenshot inside a frame) in three layouts.
Round 2 has **no browser frame and no site screenshot anywhere**. The benchmark is the site's own
`/services/development` and `/services/interface-design` pages: a huge light display line, a serif
italic accent, ONE cinematic brand-mood photograph (single material, single light), calm at rest,
with the kinetic moment saved for scroll. Everything above in this brief still binds (copy table,
house rules, page shape), except: the switcher now lists `D · Sentence` and `E · Light stage` only,
and the `<picture>` screenshot rule no longer applies.

- `d.html` — **The sentence.** The work is told as running display prose, not as a gallery. The
  build names are real links inside the sentence. Type is the only material: no images at all.
  Signature motion: a scroll-linked word reveal (words go from a dim ink to full ink as the reader
  passes them — a colour change driven by scroll position, not an opacity tween; no pin).
- `e.html` — **The light stage.** Each build is a dark, inset, scene-inverted stage carrying one
  brand-mood photograph under a measured scrim, the build name at display size bottom-start, one
  line, the live link. Both clients sell lighting, so light on a material is the subject.
  Photos available (all already in the repo's brand set, 2:1-ish, dark): `img/green-folds.jpg`
  (work's world colour), `img/single-lamp-dark-wall.jpg`, `img/blue-light-streaks.jpg`,
  `img/blue-wall-light-bands.jpg`, `img/blue-concrete.jpg`, `img/navy-fabric-light.jpg`,
  `img/blue-folds.jpg`, `img/blue-ribs-light.jpg`. Look at each (Read the jpg) before choosing; one
  photo per build, never the same photo twice, never labelled as the client's site.
  Signature motion: the photo drifts slowly inside its stage with scroll (a small translate/scale
  on scroll position, no pin), and the stage arrives by clip, once.
