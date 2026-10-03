# Altruvex Sans — prototype 01 (2026-09-27)

> Prototype 01 is retained as historical evidence. Production builds live in
> `packages/brand-font/`.

A side-by-side comparison of today's type (Outfit + Vazirmatn, as the site ships it) and the
harmonised Altruvex Sans proposal. Nothing here is used by `apps/www`. The live site does not
change until Ali picks a direction on `compare.html`.

New session? Read `HANDOFF.md` (current state, next steps), then `HISTORY.md` (what was asked and
every stage so far).

Open the page through a static server. `file://` also works, but some browsers block local
fonts there.

```
python3 -m http.server 3177 --directory docs/prototypes/2026-09-altruvex-sans
# → http://localhost:3177/compare.html
```

`before-after.html` shows the prototype before the stress-test changes (`before-j/`) against the
current files. It has a flip view (press `D`) and a side-by-side view; both frames scroll together and
the page controls are mirrored.

Controls on `compare.html`:

- Theme: light or dark.
- Language: EN + AR, EN only, or AR only.
- View: **A · B · C** (default), side by side, or flip (press `F` to toggle between today and the proposal).
  A = today; B = the Altruvex Sans fonts with today's tracking; C = B plus the tracking ladder.
  A → B changes only the Arabic; B → C changes only the English spacing. Section 06 overlays A and C.
- Latin tracking: Ladder (default) or Live. Ladder applies the size-based tracking table to the
  English display type in the proposal column. Live shows the fonts alone, at today's values.

Decision (Ali, 2026-09-27): Arabic scale **×1.0625**. The ×1.10 file is kept for the record only.

`stress-test.html` is the typography stress test: 15 sections covering metrics, joining forms,
marks, bidi, numerals, punctuation, weights, sizes, the tracking ladder, silhouettes, long-form
text, line heights, UI, the hero and responsive frames. It shows evidence only. The diagnostic that
goes with it (measured with HarfBuzz and fontTools against the prototype files) is
`stress-test-findings.md`.

## What the proposal is

The proposal is one family name served from two files, split by `unicode-range`:

| file | source | change |
|---|---|---|
| `AltruvexSans-Latin-proto.woff2` | Outfit v1.100 (OFL) | Renamed only. The outlines are untouched. |
| `AltruvexSans-Arabic-x10625-proto.woff2` | Vazirmatn v33.003 (OFL) | Vazirmatn's own Latin is removed. Outlines, advances, gvar, HVAR and GPOS anchors are scaled by ×1.0625 inside the font, so no CSS `font-size-adjust` is needed. |
| `AltruvexSans-Arabic-x11-proto.woff2` | same as above | The same build at ×1.10, for comparison. |

`Outfit-today.woff2` and `Vazirmatn-today.woff2` are the unmodified originals. The "today" column
uses them.

## Measured numbers (em, weight 400)

| | value |
|---|---|
| Outfit x-height | 0.475 |
| Outfit ascender (`h`) | 0.714 |
| Outfit cap height | 0.694 |
| Vazirmatn medial tooth (beh `uniFE92`) | 0.298 |
| Vazirmatn alef | 0.672 |
| tooth ÷ x today | 0.63 (Readex Pro 0.63, IBM Plex 0.64, Noto 0.75) |
| alef ÷ ascender today | 0.94 (Readex Pro 1.00, IBM Plex 1.00, Noto 0.94) |
| k = ascender ÷ alef | 0.714 / 0.672 = **1.0625** |
| after ×1.0625 | alef 0.714 (= Outfit ascender), tooth 0.317 (0.67 × x) |
| after ×1.10 | alef 0.739, tooth 0.328 |

Stroke weight, compared as the scaled Vazirmatn kashida against Outfit's horizontal stroke:
1.09 at weight 400, 1.08 at 600, 1.04 at 700 and 0.98 at 900.

**Correction (stress test, 2026-09-27):** the horizontal-stroke comparison hides a problem at the
heavy end. The vertical stems diverge: alef ÷ Outfit `l` is 1.03 / 0.97 / 1.00 / 0.91 / 0.84 at
300 / 400 / 500 / 600 / 700. Arabic ÷ Latin ink density is 0.86 / 0.83 / 0.86 / 0.82 / 0.79 at the
same weights. At 600 and 700, the weights used for h2 and h1, the Arabic is lighter than the Latin, so
the earlier claim that "no `avar` remap is needed" does not hold. See `stress-test.html` §07. It is fixed by the 600/700 remap below.

Note: ADI row TYP-001 reports x = 0.460 and seen = 0.346. Those figures were measured at Outfit's
Thin default instance and from isolated seen. The numbers above are taken at weight 400 from the
tooth that appears in running text.

## Changes applied after the stress test (2026-09-27)

The details and the numbers are in `stress-test-findings.md` §K.

- **Arabic weight remap (build).** In the ×1.0625 file, requested 600/700 draw Vazirmatn 670/825
  through `avar`; 100–500 are unchanged. The target is ink density matched to Outfit, not stems.
- **Thin spaces (build).** U+2009 and U+202F map to Outfit's space in the Latin file.
- **Arabic word space (CSS).** `:lang(ar) { word-spacing: .077em }` on Altruvex Sans. In production
  this becomes a token on the Arabic root, with Latin runs tagged so they are not widened. Use `:lang(ar)`
  and not `[lang="ar"]`: an em word-spacing inherits as px, so it must be declared on every Arabic element.
- **Weight-aware ladder (CSS).** Tracking = ladder(size) × k(weight). The table is below.
- **Line-height rules for production:**
  - Never write a `font:` shorthand without `/line-height`, and never set `line-height: normal`.
  - Fully vocalised Arabic (stacked marks, marks on alef/lam) takes ≥ 1.5.
  - Plain and lightly vocalised Arabic headings stay at 1.3 (RUL-147).

## Latin tracking ladder (section 05)

The ladder sets tracking by type size, not by element. Outfit has no Display cut, so tracking tightens
steadily as size grows. Apple's HIG table (Typography → Specifications → Tracking values) turns
positive again from 28 pt only because SF Display is drawn tight; its numbers do not transfer.

| size | ladder (em) | live today (em) |
|---|---|---|
| 20px | −0.010 | −0.015 (h4) |
| 24px | −0.015 | −0.015 (h4) |
| 32px | −0.020 | −0.018 (h3) |
| 40px | −0.024 | −0.020 (h2) |
| 52px | −0.028 | −0.020 (h2, .section-title) |
| 72px | −0.032 | −0.030 (h1) |
| 96px | −0.036 | −0.035 (hero) |
| 136px | −0.040 | −0.035 (hero) |

The table is for weight 400. Other weights take it × k: 300 ×1.074 · 500 ×0.918 · 600 ×0.865 ·
700 ×0.803 · 800 ×0.75. k is Outfit's own n|n spacing relative to 400, so each weight gives up the same
share of its designed space. At 52px/600 that is −0.024, and at 48px/300 it is −0.029.

Between steps, the prototype interpolates on log(size). In production this becomes `--track-*`
tokens, one per step, in the token layer. Arabic letter-spacing is 0 at every size (SIG-027; apple.com
uses the same `:lang(ar){letter-spacing:0}`).

## Lesson kept in the build

The Arabic file keeps Vazirmatn's own ascent/descent, scaled by k. `<Accent>` paints its gradient
with `background-clip: text`, and the gradient only covers the font's content box. When the build
used Outfit's shallow descender instead, the dots of «في» disappeared inside accents.

## Rebuild

This needs fontTools and brotli. Put `Outfit[wght].ttf` and `Vazirmatn[wght].ttf` from google/fonts
in the working directory as `Outfit-VF.ttf` and `Vazirmatn-VF.ttf`, then run:

```
python3 build.py fonts/
```

## Licences

Both fonts are under SIL OFL 1.1, and neither declares a Reserved Font Name, so the rename to
"Altruvex Sans" is allowed. Any derivative must:

- stay under the OFL;
- keep the original copyright lines, with "Modifications Copyright 2026 Altruvex" added;
- ship the licence texts (`fonts/OFL-*.txt`);
- not be sold on its own;
- not use the original authors' names to promote the derivative.

The OFL does not cover the site that uses the fonts. The served font files cannot be made
exclusive: anyone may reuse them under the OFL.
