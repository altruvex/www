# Altruvex Sans — session handoff (2026-09-27)

Read this first in a new session. It records where the Altruvex Sans prototype stands, what was
decided and why, and what is still open. The numbers themselves are in `stress-test-findings.md`
(A–J diagnostic, K applied changes) and `README.md`.

The full story (what Ali asked for at each stage, and what came of it) is in `HISTORY.md`.

## 1. What this is

Altruvex's own bilingual typeface, as a prototype:

- **Name:** "Altruvex Sans". One family name served from two files, split by `unicode-range`.
- **Latin:** Outfit v1.100 (OFL), renamed.
- **Arabic:** Vazirmatn v33.003 (OFL), with its Latin removed and everything scaled ×1.0625 inside
  the font, so alef = Outfit ascender = 0.714em.
- **Spacing:** a Latin tracking ladder by size, scaled per weight. Arabic letter-spacing is always 0.
- **Folder:** `/Users/ali/altruvex/docs/prototypes/2026-09-altruvex-sans/`.
- **Design authority:** the `altruvex-design-intelligence` skill (ADI), not design-master.

## 2. Standing constraints (Ali's words, verbatim where quoted)

- "Don't change the live site until I approve the prototype." `apps/www` has not been touched.
- "No git commands — give me the commit message text only." Ali commits.
- "Apple's SF fonts cannot be used, traced or derived (licence)."
- Apple-like Inter/Noto as the display face was rejected. Do not re-propose it (REJ-063).
- Arabic headings keep line-height 1.3 (RUL-147).
- Stress-test rule that still governs judgement calls: "Prefer optical consistency over mathematical
  equality."
- Chat replies: caveman style, in Egyptian Arabic. Everything written to files is normal English prose.

## 3. Decisions made

| date | decision | by |
|---|---|---|
| 2026-09-27 | Arabic scale ×1.0625. The ×1.10 file is kept for the record only. | Ali |
| 2026-09-27 | Add the size-based Latin tracking ladder to the prototype. | Ali |
| 2026-09-27 | Apply stress-test changes J1–J6 (to the prototype only). | Ali |

## 4. Current state — J1–J6 applied and verified in Chromium

| change | where | what |
|---|---|---|
| J1 Arabic word space | CSS in both pages | `:lang(ar) { word-spacing: .077em }` on Altruvex Sans only (`.087em` for ×1.10). The Latin space is 0.208em; Vazirmatn's own is 0.285em. |
| J2 Arabic weight | `build.py` → `avar` of the ×1.0625 file | Requested 600 → drawn 670, and 700 → 825. 100–500 are unchanged. Chosen by ink-density parity with Outfit, not by stems. |
| J3 vocalised leading | stress test §03 default 1.5 | Light single marks stay at 1.3. Dense or stacked marks (شُّ أُ إِ) need ≥ 1.5. |
| J4 no `line-height: normal` | both pages | `html { line-height: 1.5 }` in compare; `/1.4` on every `font:` shorthand. |
| J5 weight-aware ladder | JS in both pages | `track(px, w) = ladder(px) × k(w)`. k: 300 1.074 · 400 1 · 500 .918 · 600 .865 · 700 .803 · 800 .75. |
| J6 thin spaces | `build.py` → Latin cmap | U+2009 and U+202F map to Outfit's `space`. |

Deviations Ali has been told about:

- J2 uses 670/825, from density; stems alone would say about 720.
- J5 makes weight 300 7% tighter. The 48px phone hero goes −.027 → −.029.
- J1 is a flat .077, though the true difference at 300 is .070.
- J6's thin space is as wide as a word space (Outfit has no thin space).

The J1 bug found and fixed during before/after checking:

- `[lang="ar"] { word-spacing: .077em }` resolved the em on the 16px block, and headings inherited
  it as px. The hero got .028em instead of .077em.
- It is now `:lang(ar)`, and the hero, titles and body all measure .077em.
- **Production must use `:lang(ar)` too.**

## 5. Files

| file | purpose |
|---|---|
| `compare.html` | A (today) · B (Altruvex Sans fonts) · C (B + tracking ladder), live copy. The page Ali decides on. |
| `stress-test.html` | 15-section typography stress test; shows evidence only. |
| `before-after.html` | New. `before-j/` against the current files. Flip view (`D`), or side by side, with synced scroll and mirrored controls. |
| `before-j/` | New. `compare.html`, `stress-test.html` and `fonts/` exactly as they were before J1–J6. |
| `stress-test-findings.md` | The diagnostic: A pass · B warning · C fail · D–I · J required · K applied. |
| `HISTORY.md` | What Ali wanted and every stage of the work, in order. |
| `README.md` | What the proposal is, the measured numbers, the ladder, production rules, licences. |
| `build.py` | Builds all fonts from the Outfit and Vazirmatn variable TTFs. Contains `remap_wght` (J2) and the thin-space cmap (J6). |
| `tools/measure.py` | New. HarfBuzz shaping, a nonzero scanline raster, ink area and density helpers used for every number. |
| `fonts/` | 5 woff2 files plus 2 OFL texts. `*-today.woff2` are the untouched originals. |

Zips for the designer, in `~/Downloads`:

- `altruvex-sans-for-designer.zip`: before J, the backup.
- `altruvex-sans-for-designer-r2.zip`: after J1–J6, including the `:lang(ar)` fix, `before-after.html`,
  `before-j/`, `tools/` and this file. Rebuild it if anything changes.

## 6. How to run and rebuild

Server:

- The desktop app has a launch config named `altruvex-sans` in
  `/Users/ali/the-map-website/.claude/launch.json`. It serves this folder on port 3177.
- To start it by hand:
  `python3 -m http.server 3177 --directory /Users/ali/altruvex/docs/prototypes/2026-09-altruvex-sans`
- Then open http://localhost:3177/before-after.html (or `compare.html` / `stress-test.html`).
- The server sends no cache headers, so hard-reload after changing a file.

Tools:

- They need fontTools 4.66, brotli 1.2 and uharfbuzz 0.56. Use a venv; system python3 has none of
  them. The old venv was in a session scratchpad and is gone.

  ```
  python3 -m venv .venv && .venv/bin/pip install fonttools==4.66.0 brotli==1.2.0 uharfbuzz==0.56.2
  ```

- The source TTFs are recovered losslessly from the untouched woff2 files:

  ```
  .venv/bin/python -c "from fontTools.ttLib import TTFont as T; [ (lambda f:(setattr(f,'flavor',None),f.save(o)))(T(i)) for i,o in [('fonts/Outfit-today.woff2','Outfit-VF.ttf'),('fonts/Vazirmatn-today.woff2','Vazirmatn-VF.ttf')] ]"
  ```

- Rebuild: `.venv/bin/python build.py out/`. It reads `Outfit-VF.ttf` and `Vazirmatn-VF.ttf` from the
  working directory. Compare the output with `fonts/`, then copy.

## 7. Open items

1. **Ali's approval of the prototype** on `compare.html` / `before-after.html`. Nothing reaches
   `apps/www` before that.
2. **Designer review.** Send the rebuilt r2 zip. Measurement cannot judge terminal shapes, stroke
   modulation or letterform quality (findings §E).
3. **Findings still open**, not part of J, so not yet decided:
   - Outfit's parentheses and « » are too short for Arabic (D). Options: restore Vazirmatn's for
     Arabic runs, or accept.
   - Tabular digits differ in width between the scripts (0.700 vs 0.590em), so columns do not align
     across languages (B).
   - The ladder ignores case: all-caps is judged by eye in §09/§14 (B).
   - Outfit is tight and small at 12–16px: keep Inter for body text (B).
   - The fallback `@font-face` needs `size-adjust` for the ×1.0625 Arabic (I).
   - An Arabic-only page still downloads the Latin file for spaces and digits (I).
   - Orphans at 320–430: `text-wrap: balance` on headings and `pretty` on body text (H).
   - Bidi content fixes: `<bdi>`/`dir` on embedded runs and a no-break space in "Next.js 16" (G).
4. **Production plan, only after approval:**
   - The fonts go into the token layer.
   - The ladder becomes `--track-*` tokens × weight.
   - Arabic word-spacing becomes a token on `:lang(ar)`.
   - Line-height rules follow J3/J4.
   - OFL obligations apply (README §Licences).

## 8. Commit message text (for Ali; nothing is committed by Claude)

```
feat(altruvex-sans): apply stress-test changes J1–J6 and add a before/after view

- build: remap Arabic x1.0625 weight via avar (600→670, 700→825) for ink-density parity
- build: map U+2009 and U+202F to Outfit's space glyph in the Latin file
- pages: Arabic word-spacing .077em on Altruvex Sans via :lang(ar)
  (Latin space is 0.208em vs Vazirmatn 0.285em)
- pages: weight-aware tracking ladder, track(px, w) = ladder(px) × k(w)
- pages: explicit line-heights; stress test §03 defaults to 1.5 for vocalised Arabic
- add before-after.html and before-j/ (the pre-change prototype) for comparison
- add tools/measure.py (HarfBuzz + raster helpers behind every measured number)
- docs: findings §K, README production rules, HANDOFF.md

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
```
