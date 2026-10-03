# Brand imagery

The homepage hero is a single photo, `mood/navy-fabric-light.webp` (Unsplash, Alexander X.),
wired directly in `components/sections/hero-section.server.tsx` as `object-cover` behind a scrim.
One crop serves every breakpoint. The full shortlist and its credits are in `mood/README.md`.

The OG / social image is intentionally not here: it is generated at
`app/[locale]/opengraph-image.tsx` (1200×630). Do not add a static one.
