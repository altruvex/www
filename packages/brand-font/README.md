# Altruvex Sans (Track A)

Production build of Altruvex Sans for the web. Track A is an **interim OFL derivative** of
Inter v4.001 (Latin; Outfit v1.100 until 2026-10-10) and Vazirmatn v33.003 (Arabic). It is not a
custom-drawn typeface: no upright glyph is drawn, synthesized or edited here. The Latin italic is
the exception: the drawn italic made from Outfit on 2026-10-03 is kept frozen, byte for byte, in
`frozen/italic-outfit-2026-10-03/` (Ali, 2026-10-10), and `tools/italic.py` refuses to rebuild it.
`tools/italic_fit.py` scales those files uniformly per weight so their x-height matches the Inter
upright at opsz 32 (0.470–0.486em → 0.516em; Ali asked for this in the font, not in CSS). The shapes
do not change; vertical metrics are kept. (An optional, currently disabled crossbar lengthening for `t`/`T` lives in
`tools/glyph_edits.py`; see `bar_widening` in `config/font.yaml`.) Every output stays under the SIL Open Font License 1.1.

Prototype 01 (`docs/prototypes/2026-09-altruvex-sans/`) is retained as historical evidence. This
package is where production builds live.

## Status

| Phase | Scope | State |
|---|---|---|
| A.1 | Reproducible build, measurement, licence and glyph integrity | done |
| A.2 | Space and brackets, weight candidates, line-height, tracking, mixed-script matrix | done; weights 675/830 and the sidebearing model chosen by Ali |
| A.4-web | HarfBuzz and FontBakery regression tests, number/price and Accent regressions, optical proof | done; decisions taken 2026-09-30 (below) |
| A.5-web | `apps/www` integration through `next/font/local` behind `--font-brand`, fallback metrics, bidi, font-loading and payload measurement | built; decisions taken 2026-09-30 (below); renders waiting for Ali's review |
| Inter rebase | Latin source Outfit → Inter 4 (opsz kept), Arabic refitted (k, pairing, tracking, vocalised line-height) | built 2026-10-10; payload budgets re-based, approved by Ali 2026-10-10 |
| Desktop | Installable statics for the proposal deck and contract (`dist/desktop/`) | built and wired into the deck and contract 2026-10-03 (below) |

`apps/www` uses this package for every piece of text: headings, body and labels, in both scripts
(Ali, 2026-10-01). It is the only web font the site loads; since 2026-10-02 code blocks use it
too. The Latin emphasis clause in a heading is the frozen drawn italic (built on Outfit
2026-10-03, fitted by `tools/italic_fit.py`), served as static files at 300/400/500/700. The fallback, payload and font-loading reports in
`dist/` were re-run on 2026-10-01 with the font setting all text: no line changes, CLS 0, 89.8 KB of
fonts per locale. `font_loading.py` probes headings, buttons, form controls and nav links, not body
paragraphs (whole-page CLS covers those), Firefox could not launch on this machine, and the prose
below (phase A.5-web) still describes the headings-only state it was written in.

## Commands

The tooling is Python and runs through [uv](https://docs.astral.sh/uv/). Dependencies are pinned
in `pyproject.toml` and locked in `uv.lock`.

```bash
uv run python tools/fetch.py    # download the pinned sources into sources/ and check SHA-256
uv run python tools/build.py    # build dist/web/*.woff2 and dist/build-report.json
uv run python tools/italic_fit.py   # the frozen drawn italic scaled to the Inter x-height -> dist/web/AltruvexSansLatin-Italic-*.woff2
uv run python tools/tracking.py # dist/web/tokens.css and dist/spacing-report.json from the built Latin font
uv run python tools/fallback.py --browser # dist/web/fallback.css and dist/fallback-report.json (measured fallback faces)
uv run python tools/pairing.py  # proofs/a5/pairing.json: live heading anchors and the Arabic weight beside a light Latin display
uv run python tools/matrix.py   # mixed RTL/LTR matrix -> proofs/a2/matrix.json + screenshots
uv run python tools/proof.py    # weights, Arabic line height, tracking by case -> proofs/a2/proof.json + screenshots
uv run python tools/shaping.py  # HarfBuzz shaping and mark collisions -> dist/harfbuzz-report.json
uv run python tools/fontbakery.py # FontBakery check-universal (via uvx) -> dist/fontbakery-report.json
uv run python tools/regress.py  # numbers, prices, Arabic marks in the Accent gradient -> proofs/a4/regress.json + screenshots
uv run python tools/optical.py  # optical relations and display tracking by case -> proofs/a4/optical.json + screenshots
uv run python tools/payload.py  # font bytes from a production build of apps/www -> dist/payload-report.json
uv run python tools/font_loading.py # as served + font late, per route/engine/width, 5 runs -> dist/font-loading-report.json
# (payload.py and font_loading.py need `bun run build` then `next start -p 3020` in apps/www)
uv run pytest -q                # all tests, including browser tests (-m "not browser" to skip them)
```

Proof screenshots (`proofs/**/*.png`) are not committed; the tools regenerate them. The JSON
measurements and `dist/` are committed, and a test fails if `dist/` differs from a fresh build.

Browser tests and proofs need Playwright's engines once: `uv run playwright install chromium firefox
webkit`. WebKit is Playwright's WebKit build, not Safari. An engine that does not launch is recorded
as not run and its tests skip; it is never counted as passing.

The same commands are available as `bun run font:fetch`, `font:build` and `font:test`. They are
deliberately not named `build` or `test`, so Turborepo does not run them with the rest of the
monorepo.

## Outputs

| File | Family | Source |
|---|---|---|
| `dist/web/AltruvexSansLatin-VF.woff2` | Altruvex Sans Latin | Inter (opsz + wght), cut to the configured coverage |
| `dist/web/AltruvexSansArabic-VF.woff2` | Altruvex Sans Arabic | Vazirmatn, Arabic subset, scaled by k |
| `dist/web/AltruvexSansLatin-Italic-{300,400,500,700}.woff2` | Altruvex Sans Latin, italic | frozen drawn italic (built on Outfit 2026-10-03) scaled by `tools/italic_fit.py`; `apps/www` loads 300 and 400 |
| `dist/italic-report.json` | — | Per italic weight: s against the upright, curve deviation, pairs kerned apart, tt/ff gaps |
| `dist/og/AltruvexSans{Latin,Arabic}-{400,700}.ttf` | Altruvex Sans Latin / Arabic | Static instances of the two web files (fontTools instancer) for `next/og` |
| `dist/build-report.json` | — | Sizes, hashes, integrity, licence and metrics, as measured by the build |
| `dist/web/tokens.css` | — | Latin tracking by size bucket and weight, caps word-spacing, Arabic tracking 0, line heights, the Arabic display-light weight |
| `dist/web/fallback.css` | — | `@font-face` fallback faces per script, sized from measured local fonts (`dist/fallback-report.json`) |
| `dist/bidi-report.json` | — | Mixed-direction strings in `apps/www` copy, checked in the browser |
| `dist/payload-report.json` | — | Font bytes per file and per route before page load, from `next build` + `next start` |
| `dist/font-loading-report.json` | — | Width, height and line count of headings, buttons and controls before and after the swap; LCP, CLS; with and without the Arabic preload |
| `dist/spacing-report.json` | — | The measurements behind the tokens, and both weight models |
| `dist/harfbuzz-report.json` | — | Shaping per production stack, font fallback per character, mark collisions |
| `dist/fontbakery-report.json` | — | FontBakery counts, and every FAIL and WARN with its message |
| `proofs/a4/` | — | Optical proof and browser regressions per engine (JSON and screenshots) |

The two families are separate on purpose. Each script is served in its upstream form, and the
browser picks per character through the `font-family` stack. The Latin file is Inter's cmap cut to
the configured coverage; nothing is added, so the thin and narrow no-break spaces (U+2009, U+202F)
are not copied into it.

## Sources

All inputs are declared in `config/font.yaml`. The build reads nothing else.

| Source | Version | Upstream commit | File sha256 |
|---|---|---|---|
| `Inter[opsz,wght].ttf` | 4.001 | rsms/inter (google/fonts `0b58fb37`) | `29160a80…c559031` |
| `Vazirmatn[wght].ttf` | 33.003 | rastikerdar/vazirmatn `14f8686` | `696249a2…fd49dca` |

Vazirmatn comes from google/fonts at `8b0a1d0f5983c89bc2b93f1b5fb55f9e252744b5`, Inter from
`0b58fb370093f9a9f4ff785d94405710b79de67c`. `sources/` is not committed; `fetch.py`
recreates it, and the build refuses to run if a hash does not match.

## What the build changes

The full record is `licenses/FONTLOG.txt`.

- **Latin:** renamed, with a modification notice added to the copyright record. Nothing else.
- **Arabic:** subset, scaled by k, renamed, with a modification notice added to the copyright
  record.

### Scaling (Arabic)

`k = 1.08203125` (2216/2048; set 2026-10-10 with the Inter rebase, replacing Ali's 1.0625 for
Outfit; do not change without approval). It sets Vazirmatn's alef to Inter's ascender height:
0.6724em × 1.08203125 = 0.7275em.

The em stays 2048 units. The build runs fontTools `scale_upem` to 2216 (2048 × 1.08203125, an integer,
so k is exact), then resets `unitsPerEm` to 2048. Outlines, advances, variation deltas, HVAR,
GDEF and GPOS are all multiplied by k. Each stored value is within 0.5 font units of source × k,
and the integrity check enforces that.

Vertical metrics are Vazirmatn's times k, not the Latin's. Outfit's shallower descender clipped the
dots under yeh and beh inside `background-clip: text` gradients in prototype 01.

### Subset policy (Arabic)

- `unicodes`: the Arabic script ranges as prototype 01 took them. Codepoints Vazirmatn lacks are
  skipped and counted in the report, never synthesized. U+061C (Arabic letter mark) is one of
  them.
- `required_unicodes`: space, no-break space, thin space, narrow no-break space, ( ) [ ] « ».
  These are Vazirmatn's own glyphs, and the build fails if one is missing. Prototype 01 dropped
  them, so Arabic text fell back to the Latin space (Outfit's 0.208em then; Vazirmatn × k is 0.2905em now).
- No Latin letters are included.

### Weight mapping

Applied in the Arabic file's `avar` only (chosen by Ali from the A.2 proof, 2026-09-29):

| CSS weight | Candidates | Chosen (drawn Vazirmatn weight) |
|---|---|---|
| 600 | 650, 675, 700 | 675 |
| 700 | 800, 830, 850 | 830 |

Weights 500 and below are unchanged; 800 draws about 865 and 900 stays 900. The map is composed
into Vazirmatn's own avar, so every drawn weight is one Vazirmatn already has; no outline or delta
changes. Pages request the CSS weight (600, 700), never the drawn one. `tests/test_weights.py`
checks each requested weight lands on its chosen source weight. The A.2 candidate comparison is
kept in `proofs/a2/weight-candidates.json`.

## Spacing (phase A.2)

`tools/tracking.py` generates `dist/web/tokens.css` from the `spacing` section of `config/font.yaml`
and the built Latin font:

- The size ladder is anchored on the headings `apps/www` actually renders (`proofs/a5/pairing.json`),
  not on prototype 01's ladder. Each anchor is reproduced within 1% of the letter gap. The ladder is
  not monotonic between 72 and 136 px: the live hero (300, -0.035em) and h1 (700, -0.030em) disagree,
  and the tokens report that rather than smoothing it.
- How tracking changes with weight is measured from the font: the white between two "n"s and
  inside one, at half x-height, per weight. `weight_model` picks one of two models; the report
  keeps both, because they disagree at heavy weights. Ali chose `sidebearing`.
- Sizes share a token while it stays within `bucket_gap_fraction` of the letter gap of the exact
  value at every size and weight it covers.
- Arabic is never tracked. `--lh-heading-ar: 1.3` and `--lh-vocalised: 1.5` are tested in the
  browser: fully vocalised Arabic touches at 1.3 and clears at 1.5.

- All caps from 120 px up keep their `--track` token and add `word-spacing: var(--word-caps-…)`,
  which restores the lowercase word-to-letter white ratio. Tightening letter-spacing instead made
  letters collide (Seen), so the lever is word spacing (`spacing.caps.lever`). No page sets caps at
  that size yet.
- `--weight-ar-display-light` is the Arabic weight whose ink density beside a light (300) Latin
  display matches the other heading pairs: 310 (0.891 against a target of 0.893, Chromium and WebKit).
- `--lh-display-latin: 1.2` exists for Latin display type; no rule reads it yet.

## Integration (phase A.5-web)

- `apps/www/app/[locale]/layout.tsx` loads both files with `next/font/local` (`display: optional`,
  preloaded, `adjustFontFallback: false` because `fallback.css` supplies per-script fallbacks). The
  variables sit on `<html>`.
- `apps/www/app/globals.css` orders them into `--font-brand` per locale (Latin first on English
  pages, Arabic first on Arabic pages) and maps `--font-sans` to it. Components use `font-sans`
  or the heading defaults and never name a family.
- Headings use the `--track-*` tokens; Arabic headings use `--lh-heading-ar`; every RTL heading
  that sets `font-light` takes `--weight-ar-display-light` from one rule in `globals.css`.
- The Accent gradient pads its painted box by 0.36em above, 0.13em below and 0.02em at the end,
  and cancels it with an equal negative margin, so Arabic dots and marks are no longer clipped
  and layout does not move (`proofs/a4/regress.json`). Split-animation spans carry the same pad.
- The files are named `-VF.woff2`, not `[wght].woff2`: the bracketed name was URL-encoded in the
  preload link but not in `@font-face`, so browsers fetched each file twice.

## Regression tests (phase A.4-web)

- **HarfBuzz** (`tools/shaping.py`, `tests/test_harfbuzz.py`): shapes text the way a browser does
  with the production stacks (first font in the stack whose cmap has the character) and measures
  mark collisions on a raster at the approved weight pairs. It also pins which file serves each
  shared character: the Arabic file lacks `. , ! :`, so they come from the Latin file; the Latin
  file lacks U+2009 and U+202F, so they come from the Arabic file.
- **FontBakery** (`tools/fontbakery.py`, `tests/test_fontbakery.py`): 1.1.0 `check-universal`,
  run isolated through `uvx` with pinned dependencies, on each font decompressed to TTF. No check
  is excluded. Every FAIL and WARN must be listed with a reason in the tool; the test fails on a
  new one and on one that no longer occurs. A clean run is not typography approval. It needs
  `uvx` and the network the first time; without them its test skips.
- **Numbers, prices and the Accent** (`tools/regress.py`, `tests/test_regress.py`): prices are
  resolved at run time from `@repo/pricing-schema` and never written to a file. The browser
  formats them in both locales, and every emitted codepoint must be in one of the two cmaps.
  Arabic marks inside the Accent gradient (`background-clip: text`) must not be clipped.
- **Optical proof** (`proofs/a4-proof.html`, `tools/optical.py`, `tests/test_optical.py`): alef
  against l and H, Arabic against Latin mass, vocalised ink height, and display tracking by case.
  The page states numbers only. Ali judges the screenshots; no threshold declares visual parity.

## Decisions (2026-09-30)

Ali delegated the A.4-web decisions, asking for the choice that still holds in a year.

| Question | Decision | Why |
|---|---|---|
| Blank Arabic `.notdef` (FontBakery FAIL) | Accepted, reason recorded in `tools/fontbakery.py` | A missing character falls through the stack on the web; Track A adds no glyphs |
| Accent gradient clips Arabic dots and marks | Pad-and-cancel on the `Accent` box in `apps/www` (done in A.5; strict xfail removed) | The clip is the CSS box, not the font; it already happened with the live fonts |
| Word space vanishes in caps at 120px and up | A caps bucket generated by `tools/tracking.py`, applied as word spacing (done in A.5) | Measured from the font like the rest; tighter letter-spacing made letters collide |
| Size ladder at 400 | Anchored on the sizes `apps/www` renders (done in A.5) | Tokens for sizes nobody uses are dead weight |
| Hero Arabic weight next to EN 300 | 310, by ink density (done in A.5), shown to Ali | A rule, not a one-off; Ali judges the render |
| Latin display line-height 1.2 | `--lh-display-latin` (done in A.5, no consumer yet) | One source for every page |
| Font file names | `-VF.woff2` instead of `[wght].woff2` | The bracketed name made browsers download each file twice |
| « » in RTL | Unicode bidi mirroring, no override | The engines already agree |
| Proof screenshots | Not committed | About 68 MB of reproducible output would stay in git history for good |
| Package name | `@repo/brand-font` | Matches every other workspace |
| `dist/` | Committed | `apps/www` loads it through `next/font/local` without Python in its build |
| U+202F width (0.068 em) | Kept as Vazirmatn draws it | No glyph edits; neither `en` nor `ar-EG` formatting emits it (Measured in `proofs/a4/regress.json`) |
| Dev dependencies uharfbuzz, freetype-py, numpy; FontBakery via uvx | Kept, pinned | Dev-only; FontBakery stays isolated from the project env |

### A.5-web decisions (2026-09-30)

Ali chose the first and delegated the rest, asking for the choice that makes a difference for
years rather than the one that saves effort or bytes now.

| Question | Decision | Why |
|---|---|---|
| Headings change line count when the font swaps in | `font-display: optional` for both brand files (Ali) | A heading must never reflow after first paint. The fallback is fitted to the corpus average, so a short balanced heading near a wrap boundary can still differ by a line; only not swapping removes that for good |
| Arabic file preloaded on English pages (46 KB before load) | Both preloads stay on every locale | `optional` shows the brand face only if it is ready at first paint; without the preload the brand face would not appear on a first visit. Next preloads per layout, so per-locale preload would mean splitting the route tree |
| Payload budgets | Enforced: Latin 85 / Arabic 51 / initial EN 187 / initial AR 187 KB (measured baseline x 1.10, rounded up; re-based on the Inter build, Ali 2026-10-10; Outfit build was 49 / 51 / 226 / 263) | A budget that is not enforced only records growth. The test fails when one is exceeded |
| Font-loading pass criteria | Hard fail on any heading line-count change after first paint and on CLS above 0.01; per-string width within ±1.5% and button width within 33px are recorded as diagnostics | The line rule is the spec's. The width numbers explain a failure; they do not replace the line rule |
| Fallback fit threshold | ±1.5% per string is measured and recorded, not a gate (revised the same day, after measuring) | Arial is off by up to 9.2% and Tahoma by up to 10.1% on single strings, and one `size-adjust` cannot close a spread. Under `optional` a fallback face is never swapped out, so the spread cannot move layout; the gate is the line-count rule in the browser |
| Caps word-spacing tokens | Kept | Generated from the font by `tools/tracking.py`; the gap they fix is measured |
| Size ladder, non-monotonic between 72 and 136 | Kept as measured | Anchored on the sizes `apps/www` renders; smoothing it would replace measurement with a guess |
| Arabic light display weight | `--weight-ar-display-light` (310) on every RTL light display in the brand face, not only the hero | One rule for the pairing; a per-component value drifts |
| `--lh-display-latin` with no consumer | Kept; no consumer is forced | The first Latin display that needs 1.2 reads it instead of inventing a value |
| Licence texts on the website | Served from `apps/www` as a build-time copy with a byte check, not committed copies | The OFL travels with the fonts; one source cannot drift |
| Social (OG) image font | Static TTF instances at 400 and 700 in `dist/og`, cut from the shipped variable files; `opengraph-image.tsx` reads them from the package | Satori reads neither WOFF2 nor variable fonts; cutting from the web files means they cannot drift (`tests/test_og.py` pins advances), and the image no longer depends on a network fetch at render time |
| Estimate PDF fonts | Display in the brand face, body in Inter / Vazirmatn, by reusing the page's own `next/font` faces; Tajawal and the Google `@import` removed | Matches the site; the site's CSP (`font-src 'self'`) already blocked the Google import; no second copy of any font |
| Arabic social card | `/ar` serves an Arabic card; the words are laid out right to left in flex rows, and Arabic runs are shaped into presentation forms in the file | Satori has no bidi and measures isolated glyphs; this needs no dependency. Satori applies no mark positioning, so a tanween can touch the dots below it |

## Verification

Each build checks two things and fails if either does not pass:

- **Glyph integrity** (`tools/integrity.py`): every output glyph is compared with its source
  glyph, including contours, components, coordinates, gvar deltas and advances, within the
  scaling tolerance. Any added, deleted or modified glyph fails the build.
- **Licence** (`tools/licensing.py`): OFL 1.1 is present, no Reserved Font Name is declared or
  used, no upstream family name is left in the identifying name records, and the upstream
  copyright is kept.

The tests also check that two builds are byte-identical and that the committed `dist/` matches
a fresh build.

The browser tests (Chromium and WebKit; Firefox is recorded as not run: on macOS 27 its profile service
cannot use `~/Library/Application Support/Firefox` (EPERM, measured with lldb), and the reason
string in every report carries that evidence) check Arabic space widths in context, bidi order, codepoint coverage, line
contact and weight rendering. Payload budgets are measured from a production build of `apps/www`
(`dist/payload-report.json`); they are enforced (`config/font.yaml`): `tools/payload.py` exits non-zero and the tests fail when a
file or an initial-route total exceeds its budget. `tools/font_loading.py` measures two paths per
engine, route and width, five runs each: as served (CLS at most 0.01, no heading changes line count
after first paint) and font late (the brand file held past first paint; under `font-display:
optional` the fallback must stay and no heading may change line count). Glyph and button widths
are recorded as diagnostics. `webkit_block_period` records WebKit's first-paint delay with the brand file
held 1.5 s and 5 s under `swap`, `optional` and `fallback`: about 0.33 s in every case, so the
delay is WebKit's own and does not follow `font-display` (`--block-period-only` reruns just it).
Run `tools/build.py` before `tools/fallback.py --browser`, or the fresh-run tests see stale input.

## Licensing obligations

When the fonts are distributed, including served from `apps/www`:

- Ship `licenses/OFL-Inter.txt`, `licenses/OFL-Outfit.txt` (the frozen italic), `licenses/OFL-Vazirmatn.txt` and `licenses/Apache-2.0.txt`
  with them, or make them available with them. The OFL text is also embedded in each font's name table.
- Keep the upstream copyright records. The build appends to them and never replaces them.
- Do not sell the fonts on their own.
- Keep `licenses/FONTLOG.txt` up to date when the build changes.

`apps/www` serves `licenses/*` at `/fonts/licenses/<file>`, because serving the woff2 is
distribution. `apps/www/scripts/font-licenses.mjs` copies them before `dev` and `build`; the copy is
gitignored and never edited by hand, and `bun run check:font-licenses` (also run by `build`) fails
if a served file differs from the package. This folder is the only source. Name record 14 keeps
the generic SIL URL rather than the site's copy, so the fonts do not depend on one domain.

Vazirmatn's name record 10 says its Latin glyphs and data come from Roboto (Apache License 2.0).
The Arabic subset keeps Vazirmatn's spaces, brackets and guillemets. Whether any of those came from
Roboto has not been established, so `licenses/Apache-2.0.txt` ships with the fonts as a
precaution: it costs nothing, and it removes the question.

## Desktop

`bun run font:desktop` (or `uv run python tools/desktop.py`), after `build.py` and `italic_fit.py`.
It instances the files `apps/www` ships, never the sources, so a document draws the site's outlines,
advances and kerning:

| family | styles | files |
|---|---|---|
| Altruvex Sans | Light, Regular, Medium, Bold, each with its italic | `AltruvexSans-*.ttf` (8) |
| Altruvex Sans Arabic | Light, Regular, Medium, Bold (no italic: Arabic is never slanted) | `AltruvexSansArabic-*.ttf` (4) |

Regular, Italic, Bold and Bold Italic share the legacy family (name ID 1) so B/I buttons link them;
Light and Medium are their own legacy families ("Altruvex Sans Light"), and all of them share the
typographic family (IDs 16/17). The variable tables are removed. The OFL texts and FONTLOG are
copied beside the fonts, and `dist/desktop-report.json` records each file's size and SHA-256.
`tests/test_desktop.py` pins the naming, the style bits, reproducibility and advance parity with
the web files.

Wired 2026-10-03: the proposal deck (`apps/admin/lib/proposal-builder.ts`) and the contract
(`lib/contract-builder.ts`) name Altruvex Sans ("Altruvex Sans Light" for the display lines and the
italic accent word) and embed nothing. Headless LibreOffice, which renders the PDF and the previews,
draws text through fontconfig, and on macOS its bundled config sees no system font at all, so
`apps/admin/lib/soffice-fonts.ts` hands every `soffice` call a config that adds this folder (read
through `node_modules`, so nothing has to be installed) and the OS font folders. The fonts are also
in `~/Library/Fonts` on Ali's Mac for PowerPoint and Word. A .pptx or .docx opened on a machine
without them falls back to another face; the PDF carries them embedded.
