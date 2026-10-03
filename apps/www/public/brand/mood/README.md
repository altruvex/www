# Brand-mood photography

Photos saved on 2026-09-28 from the homepage hero v5 shortlist
(`docs/prototypes/2026-09-hero-v5/`), kept for reuse in hero and mood slots across the site
(RUL-118: dark, single light, single material, tinted to the brand-blue world).

All are from Unsplash under the Unsplash License (free commercial use, no attribution
required; credit kept here anyway). Encoded to WebP at 2400px wide.

| File | Photographer | Unsplash photo | Used at |
|------|--------------|----------------|---------|
| `navy-fabric-light.webp` | Alexander X. | `RwCfqz27ets` | homepage hero (picked by Ali, 2026-09-28) |
| `blue-ribs-light.webp` | Universtock | `Iz1V4Vlig-c` | homepage services, Maintenance row |
| `blue-wall-light-bands.webp` | Cai Fang | `tREpYEw-I_E` | homepage services, Interface Design row; /about photo stage; /work stage (Art Lighting Store) |
| `single-lamp-dark-wall.webp` | Greg Rosenke | `6QnEf_b47eA` | homepage services, Technical Consulting row; /work stage (NewLight) |
| `blue-light-streaks.webp` | Alexander X. | `attaiMHl274` | /work stage (Art Lighting Store) |
| `blue-concrete.webp` | Franck V. | `m8Ws8L6BfQ8` | homepage services, Custom Development row |
| `blue-folds.webp` | Pawel Czerwinski | `qIZMt-o2RIk` | — (source of `green-folds.webp`) |
| `green-folds.webp` | Pawel Czerwinski | `qIZMt-o2RIk` | /process photo band (picked by Ali, 2026-09-30); /work stage (Altruvex.com) |

`green-folds.webp` is `blue-folds.webp` re-tinted to the green world (/process) with the CSS
filter chain `hue-rotate(-62deg) saturate(.8) brightness(.85)` baked in (W3C filter matrices,
2026-09-30), so the page carries no runtime filter. Re-derive it the same way if the source changes.

Page URL for any row: `https://unsplash.com/photos/<id>`. Update "Used at" when a photo is placed.
