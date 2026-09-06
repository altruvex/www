# Pricing SSOT Audit — Phase 1

Scope: full monorepo (`apps/www`, `apps/admin`, `packages/*`). No code changed. Findings only.

**Headline:** there are **four** independent pricing authorities, not one. Two of them contradict each other on numbers a client sees within two clicks, and one of them quotes Arabic-speaking clients 25% more than English-speaking clients for the identical maintenance plan.

---

## 1. The four authorities

| # | Authority | Location | Live? | Feeds |
|---|-----------|----------|-------|-------|
| A | `PRICING_TABLE` + `calculateEstimate` | `packages/pricing/index.ts:28-127` | **Live** | Transparency estimator, admin proposal builder |
| B | i18n message copy (EN + AR) | `apps/www/messages/{en,ar}.json` | **Live** | `/pricing`, `/services/maintenance`, `/services/consulting`, FAQ, homepage, SEO offer schema |
| C | `SECTION_PRICING` + `calculateQuickEstimate` | `apps/www/lib/utils/transparency-utils.ts:52-135` | **Dead** | Nothing — no caller outside the file |
| D | `HOSTING_RENEWAL` | `apps/www/lib/utils/transparency-utils.ts:137-142` | **Live** | Client-facing estimate PDF only |

A and B are maintained by hand, independently, and disagree. C is a fossil of an older engine that still holds a *different* third set of numbers. D is a pass-through cost that exists in exactly one surface.

---

## 2. Inventory

| File | Surface | Data type | Current value | Inconsistency |
|------|---------|-----------|---------------|---------------|
| `packages/pricing/index.ts:28-47` | estimator + proposals | tier (project × complexity) | website 35/70/140/220k; webapp 80–450k; ecommerce 55–320k; pwa 95–495k | **Contradicts `/pricing` published ranges** (§3.1) |
| `packages/pricing/index.ts:49-68` | estimator + proposals | timeline weeks | website 2–11w … pwa 6–26w | Diverges from dead table C (enterprise rows differ) |
| `packages/pricing/index.ts:70-99` | estimator + proposals | multipliers | timeline 0.95–1.15; brand 1.0–1.12; content 1.0–1.08 | Not disclosed on `/transparency` despite that page's premise |
| `apps/www/messages/en.json:859` | `/pricing` | tier | Essential `22,000 – 45,000 EGP` | vs A `website/basic` = 35,000–70,000 |
| `apps/www/messages/en.json:889` | `/pricing` | tier | Professional `50,000 – 75,000 EGP` | vs A `website/standard` = 70,000–140,000 |
| `apps/www/messages/en.json:844` | `/pricing` | tier | E-commerce `95,000 – 160,000 EGP` | vs A `ecommerce/basic` = 55,000–95,000 |
| `apps/www/messages/en.json:874` | `/pricing` | tier | Flagship `From 180,000 EGP` | vs A `website/premium` = 140,000–220,000 |
| `apps/www/messages/en.json:755` | `/pricing` | floor | `Projects from 22,000 EGP` | vs A global minimum = 35,000 |
| `apps/www/messages/en.json:790,796,802` | `/pricing` (maintenance strip) | maintenance | 2,000 / 4,000 / Custom EGP per month | Duplicate of rows below |
| `apps/www/messages/en.json:1611,1622,1633` | `/services/maintenance` | maintenance | Custom / 2,000 / 4,000 EGP | Second copy of the same three prices |
| `apps/www/messages/ar.json` (same keys) | `/services/maintenance` (AR) | maintenance | **٢٫٥٠٠ / ٥٫٠٠٠ / ١٠٫٠٠٠** | **AR is 25% higher than EN, and Enterprise is a fixed number where EN says "Custom"** (§3.2) |
| `apps/www/messages/{en,ar}.json` `faq.questions.08` | `/faq` | maintenance | 2,000 / 4,000 EGP in **both** locales | AR FAQ contradicts AR maintenance page (§3.2) |
| `apps/www/messages/en.json:1275` | `/services/consulting` | consulting | Technical Audit `15,000 EGP`, 5 business days | Third copy of this figure |
| `apps/www/messages/*.json` `authority.cards.card2.body` | homepage | consulting | `Fixed-scope Technical Audit at 15,000 EGP` | Prose duplicate — invisible to any price edit |
| `apps/www/messages/*.json` `quoteArtifact.clauses.scope.figure` | homepage | tier | `22,000 – 45,000 EGP · Marketing System` | Prose duplicate of the Essential range |
| `apps/www/lib/utils/transparency-utils.ts:52-78` | — | tier | corporate 22–250k; ecommerce 95–350k; custom 180k–1M; performance 15–100k | **Dead**, and disagrees with A on every row |
| `apps/www/lib/utils/transparency-utils.ts:137-142` | estimate PDF | addon (hosting) | 4,500 / 8,500 / 14,500 / 22,000 EGP by tier | **Only** appears in the PDF — absent from `/pricing`, `/transparency`, admin (§3.3) |
| `apps/www/messages/*.json` `transparency.steps.budget.*`, `transparency.step2.*` | — | tier | 35–70k / 70–140k / 140k+ | **Dead copy** (budget is not a question; `steps` keys used, `step2` orphaned) |
| `apps/admin/lib/proposal-content.ts:209-214` | proposals | line-item split | 25% design / 55% dev / 10% QA / 10% PM | Not represented anywhere client-facing |
| `apps/admin/lib/proposal-defaults.ts:83-87` | proposals | payment split | 50 / 30 / 20 | Duplicated in `contract-builder.ts:159-161` |
| `apps/admin/lib/contract-builder.ts:38` | contracts | tax | `VAT_RATE = 0.14` | **Never disclosed on any public surface** (§3.4) |
| `apps/admin/lib/contract-builder.ts:269` | contracts | rate | `800 EGP/hr` / `$80/hr USD` | Hardcoded in a template literal; **never disclosed publicly** (§3.4) |
| `apps/admin/app/(dashboard)/clients/[id]/new-proposal/page.tsx:184,328` | proposals | FX | `EGP / 50` → USD | Hardcoded exchange rate inside a page component |
| `apps/admin/lib/lead-score.ts:60` | admin scoring | thresholds | 200,000 / 80,000 EGP | Bands hardcoded against A's output |
| `apps/admin/lib/proposal-content.ts:244-251` | proposals | tier names | basic→Essential, standard→Professional, premium→Flagship | Fourth copy of the tier-name mapping |
| `apps/www/components/sections/transparency-estimator.tsx:94-101` | `/transparency` | tier mapping | basic→small, standard→medium, premium→large | Fifth copy; `enterprise` unreachable |
| `apps/www/hooks/use-transparency.ts:43-51` | `/transparency` | tier mapping | essential/small→basic, professional/medium→standard, commerce/flagship/large→premium | Sixth copy, **different key set** from the two above |
| `apps/www/lib/config/commercial.ts:17-27` | www | CTA routing | tier→href map | Seventh place tier identity is enumerated |
| `apps/admin/app/(dashboard)/settings/page.tsx:211` | admin | — | *"There is no separate place to type a price"* | Admin has **no** pricing management UI at all |

---

## 3. Divergences a client can actually catch

### 3.1 `/pricing` → `/transparency` contradicts itself in one click — **critical**

`apps/www/app/[locale]/(main)/(marketing)/pricing/page-client.tsx:22-25` sends every tier CTA to the estimator:

```
/pricing "Essential — 22,000 – 45,000 EGP"
  → /transparency?tier=essential
  → use-transparency.ts:44  essential → complexity "basic"
  → packages/pricing  website/basic  → 35,000 – 70,000 EGP
```

The client reads **22,000–45,000**, clicks the tier's own button, and the next screen quotes **35,000–70,000** — a 59% jump on the floor. Same for Professional (50–75k published → 70–140k quoted). E-commerce moves the other way: 95–160k published → 55–95k quoted, i.e. the estimator *undercuts* the published price and hands the client a discount argument in writing.

This is the single highest-impact finding. The page whose entire premise is "no hidden costs" is the page that contradicts itself.

### 3.2 Arabic clients are quoted 25% more for maintenance — **critical**

| Plan | EN | AR |
|---|---|---|
| Essential | 2,000 EGP | **2,500 EGP** |
| Professional | 4,000 EGP | **5,000 EGP** |
| Enterprise | "Custom" | **10,000 EGP** |

`serviceDetails.maintenance.pricing.plans.*.price` in `en.json` vs `ar.json`.

Worse, it is not even self-consistent inside Arabic: `faq.questions.08.answer` in `ar.json` states ٢٠٠٠ / ٤٠٠٠ per month, and `pricing.maintenance` (the AR `/pricing` strip) also states ٢٬٠٠٠ / ٤٬٠٠٠. So an Arabic visitor reading `/services/maintenance` and `/faq` sees two different prices for the same plan on the same site. This reads as either a pricing error or deliberate locale-based discrimination — both are commercially damaging.

Note the schema migration must *decide* which is correct; the audit cannot. This is a business input needed before Phase 2 seeds data.

### 3.3 Hosting/domain pass-through is disclosed only inside the PDF

`HOSTING_RENEWAL` (4,500–22,000 EGP/yr by tier) is consumed at `transparency-utils.ts:601` and rendered at `:759` via `pdfContent.renewalFromYear2`. It appears on **no** HTML surface. A client evaluating `/pricing` or `/transparency` cannot see the recurring cost until they download a PDF. There is currently **no** domain or business-mail line item anywhere in the codebase — the addon model the brief specifies does not exist in any form yet.

### 3.4 Proposal ≠ contract: figures appear only at contract stage

Proposal generation is correctly sourced (§4), but the contract adds two numbers the client has never seen:
- **VAT at 14%** (`contract-builder.ts:38,250`) — the proposal shows totals excl. VAT; the contract adds 14% on top. Not mentioned on `/pricing`, `/transparency`, or in any proposal slide.
- **800 EGP/hr revision rate** (`contract-builder.ts:269`) — hardcoded mid-sentence in a template literal.

A client who budgets from `/transparency` is short by 14% at signing.

### 3.5 Dead pricing tables still holding wrong numbers

`SECTION_PRICING`, `calculateQuickEstimate`, and `mapBudgetTier` (`transparency-utils.ts:31-135`) have **no callers**. `transparency.step1/step2/step3` and `transparency.steps.budget.*` message keys are likewise orphaned (the estimator's question list at `transparency-estimator.tsx:54-83` has no budget step). They hold a third, contradictory price set. Left in place, the next person to "reuse the existing helper" ships wrong numbers.

---

## 4. Proposal/contract generation — source check

**Good news, and narrower than the brief assumed.** Proposal generation already pulls from `@repo/pricing`:

`new-proposal/page.tsx:16-22` imports `calculateEstimate`; `:161` runs it; `:181-196` seeds `buildDefaultProposalContent` from the range midpoint. Contracts then derive from the saved `Proposal.totalPrice` (`contract-builder.ts:159-161,198`) rather than re-deriving. So **proposals and contracts share the estimator's authority (A)** — they do *not* use a separate pricing table.

The real gap is the inverse of the brief's assumption: **it is the public `/pricing` and `/services/*` pages (authority B) that are detached**, not the generation flow. Proposals are anchored to A; marketing copy is anchored to B; they disagree. A client comparing the published page to their proposal sees a mismatch.

Three residual issues in the generation flow:
- `totalPrice` is a **midpoint**, seeded once and then hand-editable (`:181-196`). Intentional per the code comments, but it means no proposal is guaranteed to sit inside any published range.
- The **USD rate is hardcoded at 50** (`:184`, `:328`). Any USD proposal is mispriced the moment EGP moves.
- The **skills** (`altruvex-proposal`, `altruvex-estimator`) are agent-side and read no schema at all — they are a separate, uncontrolled pricing authority outside the repo.

---

## 5. Structural findings

1. **`packages/pricing` is a calculator, not a schema.** It has no service, tier, maintenance, consulting, or addon entities — only two lookup matrices and a function. Every *name*, *description*, *feature list*, and *plan* lives in i18n JSON. The brief's `packages/pricing-schema` is therefore mostly greenfield; the existing package is one input to it.
2. **Tier identity is enumerated in seven places** with three mutually incompatible key sets (`basic|standard|premium`, `small|medium|large|enterprise`, `essential|professional|ecommerce|flagship`). Adding or renaming a tier today requires seven synchronized edits.
3. **No admin pricing UI exists.** `settings/page.tsx:211` explicitly documents this as intentional. Phase 3 item 6 is net-new construction, not a migration.
4. **Bilingual copy is the storage layer.** Prices are inside human-readable, locale-formatted strings (`"22,000 – 45,000 EGP"`, `"٢٢٬٠٠٠ – ٤٥٬٠٠٠ جنيه"`). Migration must split *numbers* (schema) from *formatting* (locale-aware renderer) or the AR drift will reappear.
5. **SEO structured data is downstream of B.** `buildPricingOfferSchemas` (`schema.ts:883`) emits the message-file strings as `Offer` prices — wrong numbers are being published to search engines as machine-readable offers.
6. **`packages/pricing` has no `lastUpdated`/`version` field**, no build output committed, and no test.

---

## 6. Decisions required before Phase 2

These are business inputs, not engineering choices. Phase 2 cannot seed correct data without them.

1. **Which maintenance prices are real** — EN (2,000/4,000/Custom) or AR (2,500/5,000/10,000)?
2. **Which tier ranges are real** — the published `/pricing` ranges (22–45k …) or the estimator's (35–70k …)? They cannot both be.
3. **Is Enterprise maintenance a fixed price or quoted?** EN and AR disagree on the *kind* of answer.
4. **Should VAT (14%) and the 800 EGP/hr revision rate be surfaced publicly?** The transparency page's stated purpose says yes; current behaviour says no.
5. **Domain / hosting / business-mail cost bases and markup** — no values exist anywhere in the codebase. `HOSTING_RENEWAL` is a bundled retail figure with no recorded cost basis, so it cannot be decomposed into `costBasis + markup` without input.
6. **USD policy** — fixed rate (and what), live rate, or USD-native price list?

---

## 7. Proposed Phase 2 scope

Structure, pending confirmation:

```
packages/pricing-schema/
  src/
    types.ts        # shared primitives, Money, BillingCycle, Versioned<T>
    services.ts     # productized services
    tiers.ts        # tiers per service (absorbs PRICING_TABLE + TIMELINE_TABLE)
    maintenance.ts  # maintenance plans (SLA, cycle, price)
    consulting.ts   # consulting packages incl. Technical Audit
    addons.ts       # pass-through addons + "planned" Managed bundle SKU
    modifiers.ts    # timeline / brand / content multipliers, VAT, hourly rate, FX
    copy/{en,ar}.ts # bilingual names + descriptions, colocated
    compute.ts      # calculateEstimate, computeAddonPrice
    index.ts
```

`packages/pricing` is absorbed and deleted (single consumer surface each side, both already importing it — low-risk swap). Dead authority C and the orphaned `step1/2/3` + `steps.budget` message keys are deleted rather than migrated.

**Ordering recommendation:** fix §3.1 and §3.2 as a data correction *first*, in a separate commit, before the refactor. They are live commercial defects; the refactor is a week of work and they should not wait for it.

Managed bundle SKU: schema-only `status: "planned"` entity + `SOON` badge in the admin pricing UI, no automation, per brief. Not on the critical path.

---

## 8. Effort

| Phase | Work | Risk |
|---|---|---|
| 2 — schema package | ~600 LOC, mechanical once §6 is answered | Low |
| 3.1–3.4 — www surfaces | 4 pages + PDF builder; copy must split number/format | **Medium** — AR/RTL numeral formatting is where this breaks |
| 3.5 — proposals/contracts | Thin; already on authority A. Re-point + surface VAT/hourly | Low |
| 3.6 — admin CRUD | **Net-new**, no existing UI. Largest single item | **High** |
| 3.7 — www app | Same as 3.1–3.4 | Low |
| 4 — CI guard + parity report | Lint rule + cross-surface snapshot test | Medium — needs a tight price-literal regex to avoid false positives on dates/colors/EMUs |

The `apps/admin` CRUD interface (3.6) is the bulk of the work and is independent of 3.1–3.4. It can ship in a later pass without blocking the consistency fixes, if you want the client-facing defects closed sooner.
