# Services › Consulting — direction prototypes (2026-09-20)

Same process as `../2026-09-services-interface-design` and `../2026-09-services-development`: Awwwards
Site-of-the-Day review first, then working prototypes Ali chooses from. Ali asked to see the directions
**before** the full pages were built, so this round starts with `overview.html`.

Open directly: `open overview.html` (relative assets, no server needed).

## Stage 1 — `overview.html` (built)

The signature **device** of each direction only, at full size, in the house tokens (cyan consulting world,
Outfit/Inter/Geist Mono, 22/28/34 radii, pills, serif-italic world clause, light + dark). Hero, scope, the
fixed-price offer, FAQ and close are identical house pieces in all three and are deliberately not drawn —
the device is the decision.

| block | direction | proof shape | what it argues |
|---|---|---|---|
| A | **Findings register** | Accumulation + ranking | 18 audit check classes as one dense register; three orderings of the same set (*As found* → *By risk* → *Audit order*, risk removed per unit of effort) re-flow with a FLIP animation. Claim: the order is the product, not the list. |
| B | **Cost curve** | Consequence | One drawn chart owns the page: the cost of changing the same decision across Definition → Architecture → Build → Live, with the audit's fixed price as a flat line crossing it early. Only the schema's real figures are stated (12,000 EGP, 5 business days, the published 22,000–275,000 build range); the curve carries no y-axis numbers because we have not measured anything yet. |
| C | **The instrument** | Anatomy (channels) | Cyan is the diagnosis world taken literally: six scan channels, each a scale with the stops on it, selecting one reads out what is examined and what comes back. Labelled a scan plan, never a readout of anybody's system. |

### Device-ledger check (`07-section-composer.md` §5)

All three proof shapes are currently unused on the site. Taken already: *artifact* (`quote-artifact-section`,
`consulting-brief-section`), *sequence* (`process-section`, `/process`, `pipeline-section`, `/approach`),
*comparison* (`boundary-section`, `/about` handoff-chain), *quantity vs target* (`/standards` pass-line),
*card row* (over-subscribed, unavailable). Accumulation and Consequence had no entry; Anatomy has one
(`/about` name-principle) but on type, not on an instrument.

## The commercial rule all three carry (added 2026-09-20)

Ali: **the 12,000 EGP audit fee is deducted from the project cost if the client goes on to build with
Altruvex.** If they don't, they keep the findings and the roadmap and it cost them 12,000. `overview.html`
states it once, above the three devices, as a figure that forks two ways, and direction B draws it as a
second dashed line falling away from the flat audit line.

**Resolved 2026-09-20 — the page may publish the claim.** The term now lives in the schema as
`creditedToBuildRate: 1` on `CONSULTING_PACKAGES["technical-audit"]`, and every surface resolves from it:

- `consultingView("technical-audit", locale)` returns `creditLabel`, `creditAmountLabel`, `creditIfBuild`
  and `creditIfNot` — the rule as its two halves, already filled with the figure. A page renders those
  rather than writing the sentence again; `creditAmountLabel === null` is the signal to print neither half.
- `pricingTokens` gains `auditCredit`, so prose elsewhere quotes the figure through a `{token}`.
- The consulting FAQ ("Can we use the audit without hiring Altruvex for the build?") states both halves in
  EN and AR, and `ConsultingFaqSection` now fills pricing tokens so the visible answer and the FAQPage
  JSON-LD come from one resolution.

**The money treatment, decided by Ali on 2026-09-20: the credit is a reduction of the project price, not a
prepayment against it.** The audit is a separate completed supply that was invoiced and taxed on its own
fee; the build is then quoted at list minus the credit, and VAT is charged on what is actually invoiced —
the same rule `applyVat` already follows for a discount. In the admin, *This build follows a paid audit*
stamps `discount.kind = "audit-credit"` with the schema's figure; the proposal gate re-derives that figure
on every save, and the contract's §3 names the audit and states both halves of the rule instead of printing
an anonymous discount line. `handleContractSigned` needed no change: it opens the three payments as
percentages of the net `totalPrice`, so the credit is already inside the figure it bills from.

## Stage 2 — `b.html`, the full page (built 2026-09-20)

Ali picked **D + B**. `b.html` is the whole page, scrollable, in the cyan consulting world, light and dark:

| # | section | device |
|---|---|---|
| — | hero | **D** — the h1 assembles from scattered glyphs; the serif-italic clause lands in the world accent. Under it the Sharplink three-beat row: claim · the measured engagement panel · `+01 +02 +03`. |
| 01 | the case for deciding early | **B** — the cost curve, the flat audit line crossing it, and the dashed credit line falling to the axis. |
| 02 | what the fee actually does | the 12,000 forking two ways. |
| 03 | scope | report chapters (after `stateofaidesign.com`): numbered, body left, *In this chapter* list right. Real copy from `serviceDetails.consulting.seo.sections`. |
| 04 | the brief | **slot** — a static stand-in for the existing pinned `consulting-brief-section`, at realistic height. Nothing about that section is restyled. |
| 05 | the offer | the house inverted panel: price · duration · credit · the five deliverables. |
| 06 | FAQ | the site's shared hairline device. The "can we use the audit without hiring you" answer now carries both halves of the credit rule. |
| — | close | the display close, locked dark. |

**The brief is a toggle, not a decision.** The bar at the bottom has `Brief: on / off`; the choice is kept in
`localStorage` so a reload does not reset the comparison. Page height with it: 7,703px. Without: 6,664px.

### Calm pass (2026-09-20, same day)

Ali on the first build: *"overview is simpler, calmer, less complex, easier on the eye."* He was right — the
page had accumulated containers the overview never had. Every box came out:

- The hero's three-beat row was a plain column, a gradient bordered panel and three bordered mini-cards.
  It is now three columns of hairline rows with no border, no fill and no radius anywhere.
- The offer was a dark island with a bordered card **inside** it. It is now an open section on the page
  surface, hairline rows for the deliverables — which leaves the page exactly one dark moment, the close,
  the same as `/services/interface-design`.
- The h1 came down from `clamp(3rem,7.2vw,7.75rem)` to `clamp(2.75rem,6vw,6.25rem)`.
- The curve keeps a hairline frame but drops its fill and moves to the mid radius.

Page height fell from 7,703px to 6,350px with nothing cut — that was all container padding.

### Verified in the browser

Desktop 1440 and phone 375, light and dark, no console errors, no horizontal overflow at either width.
Fixed during the pass: the curve's `Published build range` caption ran off the card, the credit label sat on
top of its own dashed line, the shared nav had no phone rule and overflowed, and the chart's 10-unit labels
rendered at ~3px on a 375px screen (short captions + viewBox-scaled type below 760px).

### Still open before this becomes real code

- **All copy is unreviewed**, and the hero line (*"Your system is already telling you what is wrong."*) is new
  — it is not in `messages/{en,ar}` and the Arabic has not been written.
- **The h1 and SEO.** The assembling line is the `h1` here; the service name sits in the eyebrow. Check that
  against `lib/metadata.ts` before shipping.
- **Arabic**: letters in Latin, words in Arabic (see D above), and `Vazirmatn` for the headline.
- The credit figures must render from `consultingView()`, never be typed — see the section above.

## D — the hero device brought back from Awwwards (2026-09-20, second pass)

Ali asked for an idea taken from Awwwards rather than composed from first principles. The one worth taking is
**Sharplink** (Studio Freight, SOTD): the page opens on a headline scattered into loose glyphs — `E w … g` —
that fly into place and resolve to *"Ethereum with an Edge"*. You watch an unreadable line become a sentence.
That is what an audit does to a system, so the effect argues instead of decorating. Under it Sharplink runs a
three-beat row: claim left, one measured panel centre, consequences as small `+01 / +02 / +03` cards right.

`overview.html` block **D** is that device on the consulting claim, with a Replay button and an EN/عربي switch.

**Arabic is the catch, and it is structural.** Arabic is cursive: scattering it letter by letter breaks the
joining and the line stops being Arabic. D runs **letter by letter in Latin and word by word in Arabic**, and
that split has to exist from the first commit, not be patched on later. Press عربي in the prototype to see it.

D is a hero device and combines with A, B or C — it does not replace one.

### What was deliberately refused

The dominant 2026 SOTD pattern — **one object pinned on one side, a walked list of named claims on the other,
the object changing state per claim** (Sharplink's principles section, Cerebrium's sticky feature column) — is
the most transferable thing in the round, and it is **already ours**: `tech-dna-section` on
`/services/development` is nine stack nodes you hover to light their edges, and `ownership-stack-section` is an
exploded specimen with a drawn spine. Taking it here would repeat two sections at once. Ledger rule: refused.

## Live references reviewed (2026-09-20)

| site | award | what was taken |
|---|---|---|
| [sharplink.com](https://www.sharplink.com) (Studio Freight) | SOTD | **Direction D** — the headline that assembles from scattered glyphs, and the claim / measured panel / numbered consequences row under it. |
| [stateofaidesign.com](https://stateofaidesign.com) (++hellohello) | SOTD | A report as a website: numbered chapters, an "in this chapter we'll cover" contents list, one statement per screen at display scale. Feeds A and C. |
| [cerebrium.ai](https://cerebrium.ai) (Louis Paquet) | SOTD | Sticky left column of features against a right column of real artifacts scrolling past; the active item lights. Pattern refused — see above. |
| [aspensearch.com](https://www.aspensearch.com) (Edoardo Lunardi) | SOTD | Hard-split quadrant grid, display type butted to the gutter. Noted, not used — the halftone treatment is off-house. |
| [why.zero.university](https://why.zero.university) (Sindhur Dutta) | SOTD | A single measurement counting down a labelled scale as the page's spine. Not used: the whole page is gated behind a WebGL "draw a zero" interaction, and 3D heroes are off the table here. |

## Copy status

**Unreviewed.** Every string in `overview.html` is new English written for the device; none of it is in
`messages/{en,ar}` yet. Arabic has not been written or laid out. Nothing here states a figure that is not
already in the pricing schema.
