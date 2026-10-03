# Altruvex Sans — what Ali wanted, and every stage so far

This is the story of the work, in order. `HANDOFF.md` is the current state (decisions, files, how to
rebuild, open items). Read this file to understand *why* things are the way they are. Read
`HANDOFF.md` to know *what to do next*.

All of this happened in one long Claude Code session on 2026-09-27. It was started from the
`the-map-website` working directory, but the work lives only in this folder. Ali's messages were in
English and Egyptian Arabic; the Arabic ones are quoted below with an English gloss.

## The goal

Ali wants **Altruvex Sans**: Altruvex's own bilingual (Latin + Arabic) typeface for the marketing site
(`apps/www`). It should feel "premium, refined, distinctive", and taste and experience matter most.

The working method Ali set:

- The base is an OFL fork of today's faces: Outfit for Latin and Vazirmatn for Arabic. The live
  identity stays: Outfit display, Inter body, Geist Mono labels, Vazirmatn Arabic, h1 700 / h2 600.
- The two scripts are harmonised **inside the font files**, measured from the fonts, so that neither
  script needs CSS scaling.
- **Prototype first.** Ali compares today's type with the proposal in the browser and decides.
  Nothing reaches the live site before that approval.
- Claude runs no git commands. Claude gives commit message text, and Ali commits.
- Design authority is the `altruvex-design-intelligence` skill (ADI), not design-master.

Hard limits from the start:

- Apple's SF fonts cannot be used, traced or derived.
- The Apple-like switch to Inter display + Noto Sans Arabic was tried and rejected (ADI REJ-063). It
  must not be re-proposed.
- Arabic headings keep line-height 1.3 (RUL-147).

## Stages

### 1 · Base, plan and first prototype (≈01:00)

**Ali asked** for three things:

- A recommended base, with the licences checked.
- A plan covering metrics, weights, signature glyphs, spacing, naming, subsetting and self-hosting,
  and a test page.
- A working HTML comparison prototype in `docs/prototypes/`.

**Done:**

- **Licences.** Both fonts are SIL OFL 1.1, and neither declares a Reserved Font Name, so renaming
  them to "Altruvex Sans" is allowed.
  - May: modify, subset and self-host.
  - Must: keep the OFL, keep the original copyright lines, and ship the OFL texts.
  - May not: sell the fonts alone, or make them exclusive.
- **Key measurement.** The Arabic tooth height to Outfit x-height ratio (0.63) was already normal. The
  real gap was the alef, at 0.94 of Outfit's ascender. Scaling the Arabic ×1.0625 inside the font puts
  the alef exactly on the ascender (0.714em).
- **Build.** `build.py` builds the Latin file (Outfit, renamed) and the Arabic file (Vazirmatn with its
  Latin removed, scaled). Both are served as one family and split by `unicode-range`.
- **Page.** `compare.html` uses the live site copy (hero and section titles), in EN and AR, light and
  dark, with flip and side-by-side views and a measured metrics specimen.
- **Defect found and fixed.** The first build rendered «في» without dots in the proposal column. The
  build was fixed and the dots restored.

### 2 · Apple reference, verified (≈01:12)

**Ali asked:** to verify a pasted note on how Apple solved these problems against primary sources
(HIG, developer.apple.com/fonts, WWDC sessions, apple.com's live CSS), to drop anything unconfirmed,
and to turn each point into a decision.

The seven points were: optical sizes, tracking per size, one family per script, metric harmonisation,
the weight ladder, numerals, and platform line-height.

**Done:**

- All seven points were confirmed at least in part.
- Point 2 was corrected: Apple's tracking is *not* simply "negative at large sizes, positive at small
  sizes".

Decisions that came out of it:

- **No optical-size axis in v1.** Latin is display-only, since Inter sets the body. An Arabic Display
  master would be v2, and it needs a type designer.
- **A size-based Latin tracking ladder** is proposed, built on the site's current values at the sizes
  already tuned.
- **Arabic tracking is always 0** (SIG-027), as on apple.com/ae-ar.
- **Digits:** Outfit has no Arabic-Indic digits. Tabular widths differ across scripts, 0.59em for Latin
  against 0.70em for Arabic. This went to the designer's list.

### 3 · "×1.0625, add the tracking ladder to the prototype — ووريني دلوقتي يلا الفرق" (≈01:18)

(Gloss of the Arabic: "show me the difference now".)

**Ali decided** on an Arabic scale of ×1.0625. The ×1.10 file is kept for the record only.

**Done:**

- The ladder was added to `compare.html` (§05, and a Ladder/Live toggle).
- The server was run on port 3177, and Ali opened it themself.

### 4 · "Show me old vs current and the difference between all three" (≈01:23–01:33)

Ali's messages were:

- «هل يمكنك ان تريني النسخه القديمه والنسخه الحاليه وتريني الفرق بين الثلاثه» (show me the old and
  current versions and the difference between the three).
- «ممكن تشغله دلوقتي عشان اشوفه بنفسي» (run it so I can see it myself).
- «انا عايز الفرق بين A and b and c هنا بالتحديد» (I want the difference between A, B and C, right
  here).

**Done:** `compare.html` became a three-column page:

| column | what it shows |
|---|---|
| **A** | Today's type |
| **B** | Altruvex Sans fonts, with only the Arabic changed |
| **C** | B plus the tracking ladder, with only the Latin spacing changed |

- §01 stacks three panels, A → B → C. Each panel shows the previous version as a ghost, with a
  measured caption.
- §06 overlays A under C.

### 5 · The 16-section stress test (≈01:33–01:58)

**Ali pasted** a type-designer brief:

- The rules: "Do NOT redesign the typeface yet. Do NOT change the font. Do NOT invent improvements
  before testing."
- The judging rule: "Prefer optical consistency over mathematical equality."
- What it covered: metrics, Arabic glyphs and joins, diacritics, mixed-script lines, weights, sizes,
  line-height, bidi, responsive layout and more.

**Done:**

- `stress-test.html`: the specimen page.
- `stress-test-findings.md`: the diagnostic, graded A pass · B warning · C fail · D–I, with J as the
  required changes.
- Every number was measured with HarfBuzz and fontTools, not judged by eye.

Three outright fails:

1. The Arabic word space was 27% too narrow. It was inherited from Outfit by the build, and nobody
   chose it.
2. Arabic at 700 was lighter than the Latin.
3. Vocalised Arabic collided at line-height 1.3–1.4.

### 6 · Files for the designer (≈01:58, again at 13:58)

Ali's messages were:

- «اريني الملفات التي ممكن ان اشاركها مع designer» (show me the files I can share with a designer).
- «ممكن تعطيني ملف zip مره اخري» (give me the zip file again).

**Done:**

- `~/Downloads/altruvex-sans-for-designer.zip` (14 files). It now serves as the pre-J backup.
- A list of questions that need a designer's eye: Arabic 700 weight, all-caps at 120px, Arabic word
  space, and terminals, stroke and dots.

### 7 · "طبق التعديلات المطلوبة J1 لـ J6" (apply the required changes J1–J6) (≈14:06)

**Done**, in the prototype only (the numbers are in findings §K and HANDOFF §4):

| change | what it does |
|---|---|
| J1 | Arabic word-spacing .077em |
| J2 | avar remap for Arabic weight: 600 → 670, 700 → 825 (chosen by ink density) |
| J3 | Vocalised Arabic needs ≥ 1.5 line-height when marks are dense or stacked |
| J4 | No `line-height: normal` anywhere |
| J5 | Weight-aware tracking ladder, `ladder(px) × k(w)` |
| J6 | Thin spaces mapped to Outfit's space |

Ali was told about these deviations:

- 670/825 instead of about 720 by stems.
- Weight 300 is 7% tighter.
- J1 is a flat .077em.
- The thin space is as wide as a word space.

### 8 · «وريني الفرق قبل وبعد في compare.html ، وبعدها احفظ كل هذه الاشياء في ملف» (≈14:42)

(Gloss: show me the before/after difference in compare.html, then save all of this in a file for a
new session.)

**Done:**

- `before-j/`: the pre-change pages and fonts.
- `before-after.html`: flip (key `D`) or side by side, with synced scroll and mirrored controls.
- **A bug was found while measuring.** `[lang="ar"] { word-spacing: .077em }` resolved the em at 16px,
  and headings inherited it as px, so the hero got .028em. It is fixed with `:lang(ar)`, which is also
  a production rule.
- `HANDOFF.md` and `tools/measure.py` were written, and the r2 zip rebuilt.
- A memory pointer was added in Claude's memory for the `the-map-website` project.

### 9 · «احفظ كل ما تم في هذه السيشن كلها في المشروع» (≈15:22)

(Gloss: save everything done in this whole session into the project, so a new session understands
what I wanted and every stage we reached.)

**Done:**

- This file.
- A pointer to it from `HANDOFF.md` and `README.md`.
- The zip was rebuilt.

## Where it stands (2026-09-27, end of session)

- The prototype has J1–J6 applied and verified in Chromium.
- **Waiting on Ali's approval** of the prototype (`compare.html` / `before-after.html`), and on the
  designer's review of the r2 zip.
- `apps/www` is untouched. No commits were made by Claude.
- The commit message text for Ali is in `HANDOFF.md` §8.

## How Ali likes to work (for the next session)

- **Chat:** caveman style, in Egyptian Arabic. Files are normal English prose.
- **Show, don't describe.** Run the server and open the page for Ali to see. Give before/after with
  numbers, and say honestly when a difference is small.
- **Decisions are Ali's.** Present options with measured evidence and a recommendation, then wait. Any
  deviation from what was asked is stated plainly.
