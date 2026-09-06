# Pricing SSOT — Validation Report (Phase 4)

Companion to `PRICING_AUDIT.md`. Confirms the audit's findings are closed and that every surface now resolves the same figure for the same entity.

**Result: 41 parity checks, 76 rendered-output assertions, 576 estimate-parity combinations, and the literal guard — all passing. 0 discrepancies.**

---

## 1. What runs

| Command | What it proves | In CI |
|---|---|---|
| `bun run validate:pricing` | No price-like literal exists outside `packages/pricing-schema` | Yes |
| `bun run report:pricing` | Every surface resolves the same figure; schema is self-consistent | Yes |
| `bun run validate` | Both of the above | Yes |
| `bun run verify:rendered` | What a visitor actually sees, in EN and AR, in a real browser | Manual — needs a running build |

`turbo.json` gains a `validate` task. The rendered check is deliberately outside CI: it needs a server, and a validation step that is slow or flaky gets disabled.

## 2. Literal guard

`scripts/validate-pricing-literals.mjs` fails the build on a price-like literal outside the schema. Two shapes are flagged: a number adjacent to a currency marker (`EGP`, `USD`, `$`, `جنيه`, `دولار`), and a thousands-grouped or underscore-separated number in a pricing-relevant file — the form every table in the audit was written in.

It is narrow on purpose. A guard that flags EMU offsets, hex colours and cache TTLs gets switched off within a week, so millisecond constants, colour functions, `px` values and comments are excluded, and anything at or above 1,000,000 is treated as a byte or time constant rather than a quote.

**Verified against deliberate regressions** — each was injected, caught, and reverted:

| Injected | Caught as |
|---|---|
| `const sneaky = "22,000 EGP"` in a component | `pricing/page-client.tsx:86 — found: 22,000 EGP` |
| `"Plans from 2,000 EGP / month"` in `en.json` | `messages/en.json:pricing.sneaky — found: 2,000 EGP` |
| `MAINTENANCE_PLANS.essential.internalHourEquivalent` read in a page | `internalHourEquivalent referenced outside the schema` |

The third guard is separate and deliberate: hour-equivalents are margin planning. They exist in the schema so the request caps can be justified, and referencing one outside it is a build failure.

**Two documented exceptions**, both reasoned rather than convenient:
- `apps/admin/lib/proposal-builder.ts`, `proposal-qa.ts` — English Metric Unit geometry and contrast fixtures. Four-digit literals with no commercial meaning.
- `problem.items[0].delivery` — cites what a template costs *elsewhere* ("A $60 theme with the logo swapped in"). Not a number Altruvex charges, so the schema is the wrong home for it.

## 3. Cross-surface parity

`scripts/pricing-parity-report.mjs` — 41 checks, all passing.

**Tier card ↔ estimator agreement** — the audit's headline defect. Each card's advertised range must equal what the estimator quotes when the visitor follows that card's own CTA:

| Tier | Cell | Card | Estimator | Deep link |
|---|---|---|---|---|
| essential | website/basic | 35,000–70,000 | 35,000–70,000 | `tier=essential&projectType=website` |
| professional | website/standard | 70,000–140,000 | 70,000–140,000 | `tier=professional&projectType=website` |
| ecommerce | ecommerce/standard | 95,000–180,000 | 95,000–180,000 | `tier=ecommerce&projectType=ecommerce` |
| flagship | webapp/premium | From 280,000 | 280,000–450,000 | `tier=flagship&projectType=webapp` |

Both halves derive from the same `tierPriceRange()` call, so they cannot drift. Legacy `tier=commerce` and `tier=small`/`medium`/`large` tokens still resolve — links already sent to clients keep working.

**Locale parity** — same entity, same figure, both locales:

| Entity | EN | AR |
|---|---|---|
| essential | `35,000 – 70,000 EGP` | `٣٥٬٠٠٠ – ٧٠٬٠٠٠ جنيه` |
| professional | `70,000 – 140,000 EGP` | `٧٠٬٠٠٠ – ١٤٠٬٠٠٠ جنيه` |
| ecommerce | `95,000 – 180,000 EGP` | `٩٥٬٠٠٠ – ١٨٠٬٠٠٠ جنيه` |
| flagship | `From 280,000 EGP` | `تبدأ من ٢٨٠٬٠٠٠ جنيه` |
| maintenance essential | `2,500 EGP` | `٢٬٥٠٠ جنيه` |
| maintenance professional | `5,000 EGP` | `٥٬٠٠٠ جنيه` |
| maintenance enterprise | `Custom` | `مخصص` |
| technical audit | `15,000 EGP` | `١٥٬٠٠٠ جنيه` |

Both renderings come from one number through `Intl`, so the 25% EN/AR maintenance gap the audit found cannot recur — there is no second list to drift.

**Also checked:** Enterprise maintenance carries no figure in either locale; VAT, revision rate, USD rate and its review date are published before contract stage; every add-on is a discrete line item; the Managed bundle composes members without collapsing them; an add-on with no cost basis refuses to price rather than quoting zero; no view serialises `internalHourEquivalent`; the engagement floor equals the lowest published cell; the milestone split sums to 100.

## 4. Estimate parity

Before `@repo/pricing` was deleted, all **576** input combinations (4 services × 3 bands × 3 timelines × 4 brand states × 4 content states) were run through both engines and compared. Zero differences. Proposals in flight were priced with the old engine; the new one reproduces it exactly.

## 5. Rendered output (EN/AR + RTL)

`scripts/verify-rendered-pricing.mjs` drives a real Chromium against a production build — 76 assertions, all passing.

- `html[dir]` is `ltr` for EN and `rtl` for AR.
- Every tier range, maintenance price and the audit price render correctly in both locales.
- **Negative assertions**: no page still shows `22,000`, `45,000`, `٢٢٬٠٠٠`, `٤٥٬٠٠٠`, `2,000 EGP`, `4,000 EGP`, `١٠٬٠٠٠ جنيه`, `30 minutes`, or `2 hours`. Every superseded figure is gone from what a visitor sees, not just from the source.
- Deep-link agreement is re-checked by actually clicking through: load `/pricing`, read the tier's `href`, follow it, assert the estimator shows that tier's range.
- FAQ and homepage prose tokens resolve — no `{maintenanceEssential}` reaches the page.

One note on method: `/transparency` and `/faq` are client-rendered (`useSearchParams` opts the subtree out of prerendering), so grepping static HTML shows nothing. That is pre-existing behaviour, not a regression — it is why this check drives a browser rather than reading build output.

## 6. Document generation

Unchanged by design. Verified:
- Service labels keep their document spellings — contracts say "Corporate Website" where the estimator says "Website". Both are held in the schema as `documentName` and `name` rather than reconciled, because reconciling them would alter agreements already signed.
- Band labels keep "Essential / Professional / Flagship".
- The contract's `Three (3) rounds of revisions` phrasing is preserved while the number is sourced from `COMMERCIAL_TERMS.includedRevisionRounds`.
- VAT, the revision rate, the milestone split and the validity window now come from the schema; the rendered strings are byte-identical.

## 7. Audit findings — closure

| Finding | Status |
|---|---|
| §3.1 `/pricing` contradicts the estimator one click later | **Closed** — both derive from one cell; verified by clicking through all four tiers |
| §3.2 AR maintenance 25% above EN; AR self-contradictory | **Closed** — 2,500/5,000/Custom everywhere; one number, two renderings |
| §3.3 Hosting pass-through disclosed only in the PDF | **Partially closed** — the cost-plus-margin rule is now published on `/transparency`; per-item figures await real supplier costs (§8) |
| §3.4 VAT and hourly rate first seen at signing | **Closed** — both published on `/transparency` |
| §3.5 Dead `SECTION_PRICING` holding a third price set | **Closed** — deleted, with the orphaned `step1/2/3` and `steps.budget` keys |
| §5.2 Tier identity in 7 places, 3 key sets | **Closed** — one canonical set in `ids.ts`; the legacy band keys survive as a documented alias in one place |
| §5.5 SEO offers built from message strings | **Closed** — `buildPricingOfferSchemas` and `buildFaqPageSchemas` render from the schema |
| §5.6 No version/staleness field | **Closed** — `PRICING_VERSION` plus per-entity `version`/`lastUpdated` |

## 8. Open — needs your input

**Add-on cost bases.** `domain`, `hosting` and `business-mail` are modelled, typed, and `status: "planned"`, with `costBasis: null` and a `TODO`. They are filtered off every client surface until real supplier figures exist. `computeAddonPrice` returns `null` rather than defaulting to zero, so an unpriced add-on cannot quote a client 0 EGP. Supply the three costs and set `status: "active"` to publish them.

**USD revision rate.** The contract bills revisions at 800 EGP/hr or **80 USD**/hr. At the fixed 50 EGP/USD rate, 800 EGP is ~16 USD — so the USD figure is a separate price list, roughly 5× the EGP rate, not a conversion. Carried over verbatim because it appears in signed agreements. Confirm whether it is intentional.

**Flagship floor — resolved.** The tier previously published "From 180,000 EGP", a floor no cell in the canonical matrix carried. Confirmed as `webapp/premium`, so it now publishes **From 280,000 EGP** (280,000–450,000). This raises the flagship floor by 100,000 against what the site previously advertised — intentional, and the reason the tier is a "from" rather than a range: the conversation there starts with a call.

## 9. Not built this pass — deliberately deferred

**Admin pricing CRUD** (Phase 3 item 6). `apps/admin` still has no pricing UI; `settings/page.tsx:211` documents this as intentional. Prices are edited in `packages/pricing-schema` and deployed. This is net-new construction, not migration, and was sequenced after the public-surface fixes by agreement. The schema is built for it: every entity is a plain typed record with `version`/`lastUpdated`, `allAddonViews()` already returns planned entities for a SOON badge, and `publicAddons()` / `publicMaintenancePlans()` already enforce the client-visibility boundary. What remains is persistence (the entities move from constants to rows), an edit UI, and an audit trail.

**Client Portal.** A new authenticated client-facing surface for maintenance request history and plan details. Net-new construction — new auth boundary, new data model for requests, new routes. Scoped as its own item, not an addition to the maintenance page. Portal access is already modelled as a plan feature (`clientPortalAccess`) and renders on all three plans.

Neither blocks the SSOT work, which is complete for every surface that exists today.
