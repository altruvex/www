# Altruvex Sans — stress test diagnostic (2026-09-27)

This diagnostic covers the prototype files `AltruvexSans-Latin-proto.woff2` (Outfit v1.100, renamed)
and `AltruvexSans-Arabic-x10625-proto.woff2` (Vazirmatn v33.003 ×1.0625), tested at weight 400
unless a line says otherwise. The specimen is `stress-test.html`.

Method:

- Shaping: HarfBuzz (uharfbuzz 0.56), run on static instances at 300–850 cut from the prototype
  variable files.
- Ink: ink extents, contacts and density come from a rasteriser at 100–1000 px/em.
- Browser: bidi, UI heights, `Intl` output and the responsive frames were checked in Chromium through
  `stress-test.html`.

"Measured" means a number from those tools. "Seen" means a judgement from screenshots of the page.
No font file was changed for sections A–J. Section K records the changes applied afterwards.

## A · PASS

- **Joining.** All 28 letters produce the expected isolated/initial/medial/final glyphs, with no
  `.notdef` and no duplicate forms.
  - The six right-joining letters (ا د ذ ر ز و) have isolated and final forms only.
  - لا لأ لإ لآ ligate (`uniFEFB/F7/F9/F5`).
  - In all 20 «X+ي» combos the join overlap is identical (the same pixel count), so no join is broken
    or gapped. Measured.
- **Contextual alternates.** ب and م take a wider alternate before a final ي (`calt`, 0.313 → 0.412em
  for ب), which clears the dot. This is deliberate, not an inconsistency: ت/ث have their dots above and
  do not need it. Measured.
- **Marks within a word.** Twenty vocalised strings, including every shadda + vowel stack and the
  dagger alef, have 0 mark contacts under 0.02em at weights 400 and 700. Measured. The marks read
  centred at 24–96px. Seen.
- **Vertical alignment.**
  - Alef = Latin ascender = 0.714 exactly.
  - Isolated ه tops at 0.473 against x-height 0.475.
  - Arabic-Indic digits reach 0.69, the same as Latin cap height 0.694 and lining figures 0.694–0.704.
    Measured.
  - Mixed words on one baseline read as one line. Seen.
- **Plain Arabic headings at line-height 1.3 (RUL-147).** Lines clear each other: the worst gap is
  0.12em at 400 and 0.07em at 700. At 1.1 they collide. Measured.
- **Coverage.**
  - 122 of the 124 specimen characters are covered.
  - Everything `Intl.NumberFormat('ar-EG')` emits for prices is covered (U+200F, ٬ ٫, U+00A0).
  - U+061C is missing, but it is zero-width, so nothing visible falls back.
- **Dashes and small punctuation shared between scripts.** Outfit's and Vazirmatn's versions sit
  within 0.02em of each other in height, so borrowing Outfit's in Arabic is harmless. Measured.
- **UI with an explicit line-height.** EN and AR buttons and inputs are identical (40.5px). Measured.
- **320px.** The EN hero at 48px/700 and the AR hero both fit, with no overflow in any frame from
  320 to 1920. Measured.

## B · WARNING

- **The tracking ladder ignores weight.** Ink gap ÷ counter for lowercase:

  | | at 0 | at −0.039em (120px) |
  |---|---|---|
  | 400 | 0.39 | 0.23 |
  | 700 | 0.43 | 0.19 |

  At −0.05em and 700 it is 0.12. The same em value removes proportionally more space at 700,
  because the counters are smaller (n counter 0.162 vs 0.242). Measured.
- **The tracking ladder ignores case.** An all-caps hero takes the lowercase ladder: caps ratio 0.36
  at 0 falls to 0.25 at −0.039. Caps looked tight at 120px/700 but did not touch. This is seen, not
  measured, so it is left for Ali to judge in §09 and §14.
- **Outfit is not a text face.**
  - x-height 0.475, against 0.516 for IBM Plex Sans and 0.536 for Noto Sans.
  - Spacing ratio (n|n gap ÷ n counter) 0.50, against 0.68 and 0.60.

  At 12–16px with tracking 0 it is tight and small. This supports keeping Inter for body text; it does
  not support using Altruvex Sans below about 18px for running text. Measured.
- **Tabular digits.** Arabic-Indic `tnum` is 0.700em and Latin `tnum` 0.590em, so «٤٬٥٠٠» is 3.075em
  against 2.635em for «4,500». Columns align within each language but not across the two languages.
  Measured.
- **Orphans.** The EN section title and the bilingual heading end on a single word at 320/375/390,
  and the card body at 430. This is layout, not the font. Measured by the page.

## C · FAIL

1. **The Arabic word space is 27% too narrow.**
   - The build removed Vazirmatn's Latin, including U+0020, and `unicode-range` sends every space to
     the Latin file.
   - Arabic words are now separated by Outfit's space, 0.208em. Vazirmatn's own is 0.285em after
     ×1.0625, and the live site today uses 0.268em.
   - This is a side effect of the build, not a decision. Measured.
2. **The Arabic is lighter than the Latin at 700, and slightly at 600.**
   - Stem ratio (alef ÷ l): 1.03 / 0.97 / 1.00 / 0.91 / 0.84 at 300 / 400 / 500 / 600 / 700.
   - Density ratio (AR ÷ EN): 0.86 / 0.83 / 0.86 / 0.82 / 0.79.
   - From 500 to 700, Vazirmatn's stems grow +19 units against Outfit's +43.
   - Seen in §07 and in the bilingual heading in §15: at 700 the Arabic reads a step lighter.
   - Measured and seen.
3. **Vocalised Arabic collides at line-heights up to 1.4.** With the brief's own vocalised strings,
   stacked lines collide at 1.3 and 1.4 (400, 600 and 700) and clear from 1.5. Any heading that
   carries tashkeel at 1.3 will clash. Measured.

## D · METRIC PROBLEMS

- **Vertical extents differ between the files.**

  | | Latin | Arabic |
  |---|---|---|
  | Ink descends to | −0.209 | −0.48 (ي) |
  | Font ascent / descent | 1.0 / 0.26 | 1.089 / 0.571 |

  With `line-height: normal`, a 15px line is 19px in English and 25px in Arabic (+32%). Mixed lines
  are 25px. Measured in Chromium. The gap exists today too (Vazirmatn gives 23.4px); ×1.0625 widens it.
- **×1.0625 costs one leading step.** At 700, plain Arabic at 1.2 now collides (it cleared at ×1.0),
  and the clearance at 1.3 drops from about 0.14em to 0.07em. This is derived by scaling the measured
  span.
- **Outfit's brackets are too short for Arabic.**
  - Outfit's parentheses run −0.116 to 0.738, while Arabic words descend to −0.28/−0.48. Arabic inside
    parentheses therefore hangs below them.
  - Vazirmatn's own parentheses (−0.239 to 0.852) were removed by the build. The same applies to « »:
    Outfit's sit at 0.082–0.399, Vazirmatn's at −0.016 to 0.484.
  - Measured geometry; not yet shown with Arabic inside brackets in the specimen.

## E · GLYPH DESIGN PROBLEMS

- **The weight axis grows unevenly across the scripts** (see C2). This is a design property of the
  two sources, not of the build.
- Nothing else is shown by the evidence. No broken joins, no mark collisions, no mis-sized dots.
  Measurement cannot judge terminal shapes, stroke modulation or letterform quality. That still needs a
  type designer's review.

## F · SPACING PROBLEMS

- The Arabic word space (C1).
- The ladder ignores weight and case (B).
- Outfit is tight at text sizes (B).
- The Latin period, colon and exclamation mark used inside Arabic have almost the same advances as
  Vazirmatn's (0.29 vs 0.288), so they are not a problem.

## G · RTL/LTR PROBLEMS

- **Font level: none found.** ( ) [ ] { } mirror correctly in RTL, because Outfit carries both glyphs
  of each pair and the browser mirrors them.
- **Content level** (Unicode bidi, not the font):
  - An English sentence that ends in "." inside an RTL paragraph shows its period on the left.
  - In "Next.js 16" the "16" can break away to the next line (32px, §04).
  - These need `<bdi>`/`dir` on the embedded run and a no-break space. Seen.

## H · RESPONSIVE PROBLEMS

- Orphans at 320–430 (B). Needs `text-wrap: balance` on headings and `pretty` on body text.
- The one-line hero clips at 80/120/160px on narrow viewports. Expected: it must be stacked or clamped.
- The AR hero (3 lines × 1.3) is 30% taller than the EN hero (3 lines × 1.0). This is accepted
  (RUL-147), but layouts must reserve the space.

## I · PRODUCTION RISKS

- `line-height: normal` anywhere, including browser defaults on form controls, gives different heights
  for EN and AR (D).
- U+2009 (thin space) and U+202F (narrow no-break space) are missing and fall back to a system font.
  `Intl.NumberFormat` does not emit them for `en` or `ar`, but other locales and hand-typed copy do.
- The ×1.0625 scale is baked into the outlines. Any fallback font during load renders about 6% smaller
  than the design expects, so the fallback `@font-face` needs `size-adjust`.
- An Arabic-only page still downloads the Latin file, because the space and the digits live there.
- The OFL obligations still apply (README).

## J · REQUIRED CHANGES (evidence-backed only; applied 2026-09-27, see K)

1. **Restore the Arabic word space.** Either `:lang(ar){word-spacing:.077em}` (0.285 − 0.208), or a
   merged file in which Arabic runs use Vazirmatn's space. Re-check §11 by eye afterwards.
2. **Match the Arabic weight at 600/700.**
   - Density parity at the 300–500 ratio (0.86) puts Arabic 600 at about 675 and Arabic 700 at
     about 830.
   - This can be done with `avar` in the build, or with per-`:lang(ar)` weights. Confirm by eye in §07
     before fixing the numbers; optical match wins over the stem ratio.
3. **Vocalised Arabic gets line-height ≥ 1.5**, headings included. Unvocalised headings stay at 1.3.
4. **No text-bearing element may use `line-height: normal`.** Set it on inputs, buttons, selects and
   badges.
5. **Make the ladder weight-aware.** Keeping 700 at the same optical ratio as 400 needs about −0.032
   instead of −0.039 at 120px, and a matching reduction at every size from 52px up.
6. **Add U+2009 and U+202F** (as spaces with Outfit's metrics) to the Latin build.

## K · APPLIED (2026-09-27)

All six changes are applied to the prototype only (`build.py`, `fonts/`, `compare.html`,
`stress-test.html`). `apps/www` is untouched. The pre-change files are kept in
`~/Downloads/altruvex-sans-for-designer.zip`.

1. **J1 · Arabic word space.** CSS `word-spacing: .077em` on Arabic set in Altruvex Sans (`.087em`
   for the ×1.10 file). Latin runs tagged inside Arabic are reset to `normal`. Measured in Chromium:
   +7.7px per space at 100px.
   - The value is flat. The true difference is 0.070em at 300 and 0.076–0.078em at 400–700.
   - A merged file was not built: the UPMs differ (1000/2048), both files are variable, and a space can
     come from only one file.
   - Spaces in untagged Latin inside an Arabic block are widened too, so tag embedded Latin
     (`lang="en"` or `dir="ltr"`).
   - It is set with `:lang(ar)`, not `[lang="ar"]`. An em `word-spacing` is resolved to px on the
     element that declares it and inherited as px, so a 44px heading inside a 16px `[lang="ar"]` block
     got 0.028em instead of 0.077em. `:lang(ar)` matches every Arabic element, so each one resolves the
     value at its own size. Verified in `compare.html`: hero, titles and body all at 0.077em.
2. **J2 · Arabic weight at 600/700.** The `avar` in the ×1.0625 file now composes a remap:
   requested 600 draws Vazirmatn 670 and 700 draws 825 (800 → 862, 900 → 900); 100–500 are unchanged.
   - The targets come from ink-density parity, averaged over two text samples, not from stems. Stems
     would ask for about 720 at 600, which reads too dark.

     | AR ÷ EN | density, sample 1 | density, sample 2 | alef ÷ `l` stem |
     |---|---|---|---|
     | 600 | 0.918 → 0.962 | 1.010 → 1.058 | 0.91 → 0.96 |
     | 700 | 0.890 → 0.965 | 0.972 → 1.053 | 0.85 → 0.93 |

     300–500 are unchanged (0.96 / 0.93 / 0.96 on sample 1). Seen in §07: at 700 the Arabic no longer
     reads a step lighter.
   - The ×1.10 file is not remapped; it is kept as built, for the record.
3. **J3 · Vocalised line-height, refined by measurement.** Light vocalisation (single marks on short
   letters, as in the compare hero «نُهندِس») tops at 0.965–0.98em. That is inside plain Arabic's
   0.07em clearance at 1.3, so the compare hero stays at 1.3.
   - Dense or stacked marks exceed it and need ≥ 1.5: «شُّ» tops at 1.246–1.262em, «أُ» at
     1.223–1.227em, and «إِ» bottoms at −0.44em.
   - Rule: fully vocalised text, or marks on alef/lam or stacked shadda + vowel → line-height ≥ 1.5.
     Occasional single marks on a 1.3 heading are fine.
   - The §03 default is now 1.5; 1.3 and normal stay as test options.
4. **J4 · No `line-height: normal`.**
   - `compare.html` gets `html { line-height: 1.5 }`, as Tailwind preflight does on the live site.
   - The `font:` shorthands without a line-height (`kbd`; the control, glyph-table and note styles in
     the stress test) now carry `/1.4`.
   - The live site already inherits 1.5 from preflight, and preflight sets `font: inherit` on form
     controls. The production rule is only: never write a `font:` shorthand without `/line-height`,
     and never set `normal`.
5. **J5 · Weight-aware ladder.** `track(px, w) = ladder(px) × k(w)`, where k is the n|n sidebearing
   sum at half x-height divided by its value at 400:

   | weight | 300 | 400 | 500 | 600 | 700 | 800 |
   |---|---|---|---|---|---|---|
   | k | 1.074 | 1 | 0.918 | 0.865 | 0.803 | 0.75 |

   k is interpolated linearly between these points. Every weight loses the same share of its own
   designed spacing.
   - At 120px/700 this gives −0.031em, in line with J5's −0.032.
   - Equal-ratio matching would give −0.041 at 700; it was rejected because it overrides Outfit's
     deliberately looser bold (optical over mathematical).
   - Consequence: **300 gets 7% tighter than before.** The 48px phone hero goes −0.027 → −0.029 and the
     136px hero −0.040 → −0.043. Titles at 52px/600 go −0.028 → −0.024.
   - All labels in both pages now show the weight-aware value; the §07 rows show one value per weight.
6. **J6 · U+2009 and U+202F.** Both map to Outfit's own `space` glyph in the Latin file. Measured:
   20.75px at 100px/400, the same as U+0020. No fallback.
   - Deviation: the thin space is as wide as a word space (0.208em), not narrower. Outfit has no thin
     space, and drawing a new width was out of scope. 0.208em is close to the Unicode ~1/5em anyway.
