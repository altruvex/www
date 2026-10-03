# Standards page — visual references (2026-09-26)

Research for presenting Altruvex's published thresholds (LCP < 2.5 s, CLS < 0.1, Lighthouse >= 95,
WCAG contrast >= 4.5:1, security-header grade A on the F..A+ scale, zero lint errors, zero CVEs,
coverage > 80 %, weekly patching) as designed visuals rather than plain bar charts.

House constraint carried through every entry: **Altruvex never invents data.** Every device below is
judged on whether it can be driven only by (a) a published threshold and (b) an honest measurement,
and whether it degrades honestly to "not measured yet".

## How this was verified

- Every URL below was fetched with WebFetch on 2026-09-26, or appeared in a search result (marked).
- WebFetch returns page text, not pixels. Where a description of a visual depends on alt text,
  captions, or a summary of the page, that is said in the "Verified" column. Nothing here was viewed
  as a screenshot. Before building from any entry, open it in a browser and confirm the device.
- Could not verify: `securityheaders.com` (HTTP 403), `status.stripe.com` (renders client-side,
  fetch saw only "Loading..."), `scorecard.dev` (fetch failed), `calibreapp.com/docs/features/budgets`
  (404), `linear.app/now/building-for-speed` (404). CrUX Vis (`cruxvis.withgoogle.com`) is a
  client-side app; the fetch returned a generic description that I do not trust — treat as unverified.

## Summary table

| # | Reference | Device | Best fit for | Verified |
|---|---|---|---|---|
| 1 | web.dev — LCP / Web Vitals | Three-zone threshold track with boundary ticks | LCP, CLS | Fetched; visual from alt text |
| 2 | PageSpeed Insights docs | Distribution bar + p75 marker + pass/fail verdict + shape-coded score | LCP, CLS, Lighthouse | Fetched (text) |
| 3 | Lighthouse scoring docs | Score gauge with 0–49 / 50–89 / 90–100 bands on a log-normal curve | Lighthouse >= 95 | Fetched (text) |
| 4 | Vercel Speed Insights docs | P75 selector + color-banded score, "same band = no ranking change" | Lighthouse, CWV | Fetched (text, image referenced) |
| 5 | MDN HTTP Observatory scoring | Letter-grade ladder from a 100-point baseline with penalties and bonuses | Security-header grade | Fetched (grade table) |
| 6 | WebAIM Contrast Checker | Ratio readout + AA/AAA badges + live text specimen | WCAG 4.5:1 | Fetched (text) |
| 7 | Stripe — Accessible color systems | Swatch grid labelled with ratios; perceptual lightness curves | WCAG 4.5:1 (system-wide) | Fetched (text) |
| 8 | Bun homepage | Own bar highlighted + one-line test-conditions footnote + "reproduce" link | Any measured figure | Fetched (quoted footnotes) |
| 9 | Apple MacBook Air | Big multiplier numeral + bar + testing-conditions footnote | Any measured figure | Fetched (quoted footnote) |
| 10 | GitHub Status | 90-day tick strip, one tick per day, five-state legend | Weekly patching, zero CVEs over time | Fetched (text) |
| 11 | Astro homepage | Real-world pass-rate bars with named source (HTTP Archive + CrUX) | Framing CWV against the field | Fetched (text) |
| 12 | Awwwards (Cerebrium SOTD, evaluation system) | Per-criterion jury scores; outlier votes dropped | "Scored by a rule, not by us" framing | Fetched (text) |

Supporting (weaker, listed for completeness): Web Almanac 2024 performance chapter, Codecov
sunburst, Adobe Leonardo, Vercel dashboard write-up, AI in Design Report 2026 (SOTD).

## The references

### 1. web.dev — the Core Web Vitals threshold track
- URLs: https://web.dev/articles/vitals, https://web.dev/articles/lcp
- Device: a horizontal track split into three zones — Good (0–2.5 s), Needs improvement (2.5–4.0 s),
  Poor (> 4.0 s) — with the boundary values printed at the joins. The alt text reads, in part, "Good
  LCP values are 2.5 seconds or less". The same track shape repeats for INP (200 ms) and CLS (0.1).
- Why it works: the threshold is the drawing. The reader sees the whole scale, where "good" ends,
  and that a second boundary exists — the one most marketing pages hide. Measurement is defined
  alongside: the 75th percentile, split by mobile and desktop.
- Altruvex application: the canonical form for LCP and CLS. Draw the track to true scale (0–6 s for
  LCP, 0–0.4 for CLS), place a single bead at the measured p75, label it with the value, the
  percentile and the device class. If no field data exists, draw the track with no bead and the word
  "not measured" — never a placeholder bead. Keep both boundaries (2.5 / 4.0 s, 0.1 / 0.25), because
  Google publishes both.

### 2. PageSpeed Insights — distribution bar, p75 marker, verdict
- URL: https://developers.google.com/speed/docs/insights/v5/about
- Device: for field data, a single bar split into Good / Needs improvement / Poor percentages, with
  the 75th-percentile value reported above it; a page-level verdict ("passes" only when all three
  Core Web Vitals are Good at p75). Lab scores use colour plus shape — green circle (90+), amber
  square (50–89), red triangle (< 50).
- Published thresholds it prints: LCP 2500 / 4000 ms, CLS 0.1 / 0.25, INP 200 / 500 ms,
  FCP 1800 / 3000 ms, TTFB 800 / 1800 ms.
- Why it works: two honest layers — the distribution (what share of visits were good) and the
  single number the verdict is judged on. Shape redundancy means the status survives without colour.
- Altruvex application: pair each threshold track (#1) with a thin distribution strip under it when
  CrUX data exists for the origin. Borrow the circle / square / triangle redundancy for every
  pass/fail mark on the page so status never depends on hue alone (also answers WCAG 1.4.1).

### 3. Lighthouse — banded score with a stated curve
- URL: https://developer.chrome.com/docs/lighthouse/performance/performance-scoring
- Device: the familiar score ring coloured by band (0–49 / 50–89 / 90–100), explained by a log-normal
  curve whose control points are published (25th percentile of HTTP Archive -> 50; 8th percentile ->
  90). Weights are published: TBT 30 %, LCP 25 %, CLS 25 %, FCP 10 %, Speed Index 10 %. The page says
  near 96 is the point of diminishing returns and that 100 is "not expected".
- Why it works: the score is shown with its rule. The band boundaries are someone else's, not the
  vendor's.
- Altruvex application: Altruvex's bar (95) sits inside Google's green band (90+). Draw the 0–100 axis
  with Google's three bands faint, then Altruvex's own line at 95 drawn in ink — makes the claim
  "stricter than the published bar" visible without any adjective. Optionally show the weight split
  as a single stacked strip (30/25/25/10/10) so "95" is legible as a weighted result.

### 4. Vercel Speed Insights — percentile as a control, bands as meaning
- URL: https://vercel.com/docs/speed-insights/metrics
- Device: scores colour-coded 0–49 red, 50–89 orange, 90–100 green, over-time chart with a percentile
  selector (P75 default, P90, P95, P99). The docs make an unusually honest point: moving within a
  band improves experience but does not change search ranking; crossing a band does.
- Why it works: the percentile is exposed as a setting, so the reader knows which slice of users a
  number describes.
- Altruvex application: print the percentile on every measured bead ("p75, mobile") rather than
  hiding it in a footnote. Useful copy idea for the page's voice: "a band crossed — not a point
  gained".

### 5. MDN HTTP Observatory — the grade ladder
- URL: https://developer.mozilla.org/en-US/observatory/docs/tests_and_scoring
- Device (verified as a table, not as a rendered UI): a baseline of 100, penalties subtracted first,
  bonuses added only once the score is 90 or more; the result maps to a 13-step ladder —
  F (0–24), D-, D, D+, C-, C, C+, B-, B, B+, A- (85–89), A (90–99), A+ (100+). Maximum possible score
  is 145.
- Why it works: a letter grade is compact, but the ladder shows how far each step is, and the
  "bonus only above 90" rule is itself a quality gate.
- Altruvex application: this is the published F..A+ scale the security-header metric should cite
  (securityheaders.com could not be fetched, so do not claim its scale). Draw the 13 rungs as a
  vertical or horizontal ladder, ink the rung at A, and place the measured grade as a mark on its
  rung with the numeric score beside it. List the per-header results below as a ledger (header name
  — present / missing), which is data Altruvex can reproduce from a real scan.

### 6. WebAIM Contrast Checker — ratio + badges + specimen
- URL: https://webaim.org/resources/contrastchecker/
- Device: a large ratio readout, separate pass/fail badges for Normal text (AA 4.5:1, AAA 7:1),
  Large text (AA 3:1, AAA 4.5:1) and UI components (3:1), and a live text sample rendered in the
  pair being tested.
- Why it works: specimen-as-proof. The reader does not have to trust the ratio — the text is there.
- Altruvex application: for the 4.5:1 metric, render real pairs from `tokens.css` (body on
  background, muted on background, link on background) as type specimens, each with its computed
  ratio and the AA line. Ratios must be computed from the live tokens at build time, not typed — the
  `border-mid` trap (1.5:1) in memory shows how easily a token drifts under the bar.

### 7. Stripe — "Designing accessible color systems"
- URL: https://stripe.com/blog/accessible-color-systems
- Device: palette grids with contrast values labelled on each swatch, a before/after showing that
  the old default text colours (except black) failed 4.5:1, and CIELAB lightness curves per hue,
  including shaded regions of colours that cannot be displayed.
- Why it works: it proves a system, not a single pair — every swatch carries its number.
- Altruvex application: a compact swatch matrix of the house palette, each cell labelled with its
  ratio against the page background and marked pass/fail at 4.5:1 (and 3:1 for large text / UI).
  Stronger than a single "AA compliant" badge because it can be wrong in public and isn't.

### 8. Bun — benchmark with conditions and a reproduce link
- URL: https://bun.sh/
- Device: horizontal bars with the own bar marked, numeric value at the bar end, "higher/lower is
  better" printed above, and one mono line of conditions under each chart, for example:
  "hello-world app · express 5.2.1 · bombardier -c 50 -d 5s · TLS 1.3 · Linux x64, EPYC 9R14 ·
  medians of 3", followed by a "reproduce" link to the benchmark source in the repo.
- Why it works: the footnote is short enough to read, specific enough to rerun. It turns a claim
  into a procedure.
- Altruvex application: give every measured figure on the standards page a one-line provenance
  string in mono: tool + version, URL tested, device profile, date, run count (e.g. "Lighthouse 12 ·
  mobile, Moto G Power emulation · altruvex.com/ · 2026-09-.. · median of 5"). Link to the CI job or
  report that produced it. This is the single most transferable device for the "never invent data"
  rule.

### 9. Apple — big numeral, bar, and a testing footnote
- URL: https://www.apple.com/macbook-air/
- Device: a large multiplier numeral ("Up to 9.5x faster"), a horizontal comparison bar, and a
  numbered footnote stating who tested, when, on what hardware and software, e.g. "Testing conducted
  by Apple in January 2026 using preproduction … systems …".
- Why it works: the display type carries the claim; the footnote carries the liability. Both are
  present, neither is hidden.
- Altruvex application: permission to set one measured value very large (e.g. the live LCP) as long
  as a footnote marker ties it to its provenance line (#8). Avoid Apple's "up to" hedging — house
  voice is unhedged, and the p75 figure is a better claim than a best case.

### 10. GitHub Status — the tick strip
- URL: https://www.githubstatus.com/
- Device: per component, one tick per day for 90 days, "90 days ago" to "Today", coloured by a
  five-state legend (operational, degraded, partial outage, major outage, maintenance), with a link to
  historical uptime.
- Why it works: a record, not a claim. Gaps and bad days stay visible, which is what makes the green
  ones believable.
- Altruvex application: the natural form for "weekly patching" and "zero CVEs" — 52 ticks, one per
  week, each filled only when a dependency update actually merged (from git history / Dependabot /
  Renovate), and a second strip for `bun audit` / advisory results per week. Empty weeks render
  empty. Also fits "zero lint errors" as a strip of CI runs rather than a single green claim.

### 11. Astro — field pass-rates with a named source
- URL: https://astro.build/
- Device: horizontal bars of "% of real-world sites with good Core Web Vitals" per framework, with
  the attribution line "Based on real-world performance data from HTTP Archive and the Chrome UX
  Report". The fetched text showed no collection date on the chart.
- Why it works: it sets the vendor's number against the field using a third-party dataset.
- Altruvex application: optional context line only — e.g. what share of origins pass CWV per the Web
  Almanac. Lesson from the missing date: always print the dataset date; a comparison without a date
  cannot be checked.

### 12. Awwwards — per-criterion scores, outliers dropped
- URLs: https://www.awwwards.com/sites/cerebrium (SOTD + Developer Award, 2026-09-10),
  https://www.awwwards.com/about-evaluation/
- Device: each winning site's page lists per-criterion scores (Design, Usability, Creativity,
  Content, plus a developer score; Cerebrium's page quotes e.g. animations 8.2/10, responsive
  8.2/10). The evaluation page states the weights (40/30/20/10), a minimum of 18 jurors, that the
  three scores furthest from the mean are discarded, and that a developer score above 7 earns the
  Developer Award.
- Why it works: a composite shown next to its parts and its rule for discarding noise.
- Altruvex application: for Lighthouse, show the category breakdown (Performance, Accessibility,
  Best Practices, SEO) beside the headline score, and state the run rule ("median of 5 runs"),
  mirroring "outliers dropped". Note: the Awwwards data-visualization SOTDs I found (Cerebrium,
  SSTR, The State of the Gallery, AI in Design Report 2026) are immersive/editorial and do **not**
  visualize thresholds — they are not good device references for this page.

## Supporting references (weaker fit)

- **Web Almanac 2024, Performance** — https://almanac.httparchive.org/en/2024/performance —
  stacked good/NI/poor bars by device, big-number figures, and every figure linked to its data sheet
  and SQL query. The data-and-query link is the model for "show your working".
- **Codecov sunburst** — https://docs.codecov.com/docs/graphs — slice size = tracked lines, colour =
  coverage from red to green. Fetched docs did not state default range values.
- **Adobe Leonardo** — https://leonardocolor.io/ — swatches generated from target contrast ratios
  ("generated by target contrast ratios"); inverts the usual check.
- **Vercel dashboard write-up** — https://vercel.com/blog/how-we-made-the-vercel-dashboard-twice-as-fast
  — headline before/after ("from 51 to 94" Lighthouse) with real-user analytics screenshots; plain
  presentation, but a clean before/after precedent.
- **AI in Design Report 2026** (Awwwards SOTD 2026-08-26) — https://stateofaidesign.com/ — editorial
  report; the fetch showed "0+" counters that animate up from zero, which is a caution: a counter
  that reads 0 before JS runs is a false statement to crawlers and no-JS readers.
- Search-result only (not fetched): Stripe BFCM figures (API availability "greater than 99.999%",
  peak 93,304 transactions/min) via https://vercel.com/blog/architecting-reliability-stripes-black-friday-site
  (fetched, but it does not describe the microsite's visuals).

## Metric-by-metric recommendation

| Metric | Published threshold (source) | Device | Honest empty state |
|---|---|---|---|
| LCP | Good <= 2.5 s, Poor > 4.0 s, p75 (web.dev, PSI) | True-scale three-zone track, one bead at p75 (#1), distribution strip under it (#2) | Track drawn, no bead, "no field data yet" |
| CLS | Good <= 0.1, Poor > 0.25, p75 (web.dev, PSI) | Same track at 0–0.4 scale (#1) | Same |
| Lighthouse | Google green >= 90; Altruvex bar 95 (Lighthouse docs) | 0–100 axis, Google bands faint, Altruvex line at 95 in ink, category breakdown (#3, #12) | Axis only, "not run" |
| Contrast | AA 4.5:1 text, 3:1 large/UI (WCAG via WebAIM) | Specimens from live tokens with computed ratios (#6) + swatch matrix (#7) | n/a — always computable at build |
| Security headers | Observatory ladder F..A+ (MDN) | 13-rung ladder, measured rung marked, header ledger below (#5) | Ladder, no mark, "not scanned" |
| Lint errors = 0 | House rule | Tick strip of CI runs (#10) or a single ledger row with the run link (#8) | "no CI run recorded" |
| CVEs = 0 | House rule; advisory DB named | Weekly tick strip of audit results (#10) | Empty ticks |
| Weekly patching | House rule | 52-week tick strip from merged dependency updates (#10) | Empty ticks are the truth |
| Coverage > 80 % | House rule | Single bead on a 0–100 track with an 80 line (#1) | See caution below |

## Cautions specific to Altruvex

1. **Coverage has no measurement source in this repo today.** `CLAUDE.md` states that no unit-test
   runner is configured in either app; correctness is pinned by `verify:*` scripts. A "coverage >
   80 %" figure therefore cannot be measured honestly for Altruvex's own site right now. Either frame
   it as a client-project standard (measured per engagement) or show it as not measured until a
   runner exists. Do not draw a bead.
2. **Security-header scale:** cite MDN HTTP Observatory's published ladder, which was verified.
   securityheaders.com returned 403 and its scale was not verified here.
3. **Print the percentile, device, tool version, date and run count** on every measured value (#4,
   #8, #9). A number without its conditions is the thing the house honesty rule forbids.
4. **No animated count-up from zero for real figures** (see the AI in Design Report note): if a
   value animates, animate the bead's travel along the track, with the true value in the DOM from
   first render.
