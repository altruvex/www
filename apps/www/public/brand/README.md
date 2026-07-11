# Brand imagery drop-in

Abstract/technical brand renders. Drop a file here with the exact name below and
it appears automatically via `components/shared/brand-image.tsx` (`<BrandImage
slot="…" />`). Until a file exists, `BrandImage` renders nothing — the layout is
never broken by a missing asset.

Style: near-black charcoal (subtle blue undertone), single electric-blue accent
light, precision 3D forms, brushed metal + glass, thin wireframe linework,
volumetric depth. No text, no logos, no human figures, no multicolor gradients.
Export at **2×** the target size so Next.js downscales cleanly. Seed-lock the set
so all renders read as one system.

| File | Slot | Aspect | Wired at |
|------|------|--------|----------|
| `hero-abstract.png` | `hero` | 16:9 ultra-wide | homepage hero (full-bleed, masked, Ken-Burns) |
| `about-identity.png` | `about` | 4:5 portrait | about/company page — not yet placed |
| `process-diagram.png` | `process` | 3:2 | services / how-we-work — not yet placed |
| `proof-abstract.png` | `proof` | 16:9 | case studies / results — not yet placed |
| `aisa-concept.png` | `aisa` | 1:1 | Aisa teaser — not yet placed |
| `loading-mark.png` | `loadingMark` | 1:1 small | loader / route mark — not yet placed |
| `404-abstract.png` | `notFound` | 16:9 | 404 page (masked background) |

Note: the **OG / social image is intentionally not here** — it is generated
dynamically at `app/[locale]/opengraph-image.tsx` (1200×630), which is preferred
over a static `og-image.png`. Do not add one.

"Not yet placed" slots: the `BrandImage` component is ready; the Sonnet rollout
pass wires them into their sections. Drop the files in first, then place.
