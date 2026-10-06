# Content, communication and SEO execution — 2026-10-05

Implementation record of `docs/content-research-2026-10.md` §10 across `apps/www`, EN and AR.
Nothing is committed. All new EN/AR copy is unreviewed by Ali.

## Verification run

| Check | Result |
|---|---|
| `tsc --noEmit` (www) | clean |
| `bun run lint` (www) | clean |
| `bun run knip` (www) | clean |
| `bun run build` (www) | passes (76 static pages) |
| `bun run validate` (root) | passes (price-literal guard, parity, billing cycles) |
| `bun run test` (root, new) | 179 pass, 0 fail |
| Lighthouse a11y / SEO, dev server, mobile | a11y 1.00 on /, /work, /ar, /standards, /services, /pricing, /transparency, /about, /ar/standards. SEO 0.92 everywhere; the only miss is canonical pointing to altruvex.com from localhost |
| HTTP status, production server | unknown paths, unknown `/work/*` and `/writing/*` slugs return **404** (were 200 + noindex) |
| Browser | hero at 1024 / 1120 / 1240 px EN and AR: no title/sub collision, no horizontal scroll. Mobile menu shows Pricing → Transparency · Cost estimator, plus the Estimate your project button. No console errors |

## Homepage QA

| Section | State |
|---|---|
| Hero | Option A, EN "Custom websites / in Arabic & English." AR "مواقع مخصصة / بالعربية والإنجليزية". Primary Start a project → /contact, secondary Estimate your project → /transparency. The fit fix moves the two-column split from `lg` to `xl` |
| Problem / Ownership | Ownership says "yours at final payment", never "day one". The "What you own" eyebrow on the two dark sheets failed AA contrast (2.4–2.7:1). It now uses the on-dark brand text token on those sheets only |
| Transparency | Moved right after Ownership. Primary goes to the estimator anchor |
| Services | Buyer-language names. Each row has a next step |
| Trust | Rebuilt as "Proof you can check before you sign". Testimonials removed. `lib/data/testimonials.ts` deleted (no importers left) |
| FAQ | Own title key: "Questions to ask before you start a website." |
| Removed claims | No reply time, no free session, no founder-on-every-project, no "still maintain" anywhere in messages, MDX or server responses |

## CTA table (page-end pair)

| Page | Primary CTA | Secondary CTA | Destination | Intent | Problem |
|---|---|---|---|---|---|
| Home (end) | Start a project | Schedule a consultation | /contact · /schedule | commit | — |
| /services | Start a project | View our work | /contact · /work | commit / proof | — |
| /services/interface-design | Start a project | Schedule a consultation | /contact · /schedule | commit | — |
| /services/development | Start a project | Architecture link | /contact · /approach | commit / depth | — |
| /services/consulting | Start with a technical audit | Schedule a consultation | audit form · /schedule | commit (audit) | — |
| /services/maintenance | Maintenance enquiry | Schedule a consultation | /contact?type=maintenance · /schedule | commit | AR labels need confirming |
| /pricing | Estimate your project | Schedule a consultation | /transparency · /schedule | price | — |
| /transparency | Scroll to the result | Start a project | in-page · /contact | price → commit | — |
| /work, /work/[slug] | Start a project | Estimate your project / Schedule a consultation | /contact · /transparency, /schedule | commit | — |
| /process, /how-we-work, /approach | Start a project | Estimate your project | /contact · /transparency | commit | — |
| /standards | Start with a technical audit | Start a project | audit · /contact | commit | Leads with the audit, not Start a project. Kept on purpose (standards readers are judging an existing site); say if you want it flipped |
| /about, /faq | Start a project | Schedule a consultation | /contact · /schedule | commit | — |
| /writing, articles | Estimate your project | Start with a technical audit | /transparency · audit | reading → price | Audit form only on the audit, debt and WordPress articles |
| Header | Estimate your project | — | /transparency | price | — |

## SEO table

| Route | Search intent | Primary topic | Primary keyword/theme | Secondary themes | Metadata (EN title) | Internal links | Issue |
|---|---|---|---|---|---|---|---|
| / | commercial | the overall offer | custom websites Arabic English | web apps, bilingual, price first | Custom Websites & Web Apps in Arabic and English | services, transparency, work | — |
| /services | commercial | services index | web design & development services | maintenance, audit | Web Design, Development & Maintenance Services | 4 services, work | — |
| /services/interface-design | commercial | website design | website design Arabic English | RTL, UX | Website Design in Arabic and English | pricing, work | — |
| /services/development | commercial | custom development | custom web app development | Next.js, ecommerce | Custom Website & Web App Development (Next.js) | approach, transparency | — |
| /services/consulting | commercial | technical audit | website technical audit | rebuild vs repair | Website Technical Audit in 5 Business Days | articles, pricing | AR searchers may use تدقيق تقني; we use مراجعة تقنية |
| /services/maintenance | commercial | maintenance | website maintenance plans | support, security | Website Maintenance & Support Plans | pricing, contact | — |
| /pricing | commercial-investigational | website cost | website design cost | payment terms, inclusions | Website Design Cost & Custom Web Pricing | transparency, FAQ | — |
| /transparency | transactional tool | project estimate | website cost calculator | timeline | Website Cost Calculator: Price Range & Timeline | pricing, contact | Now server-rendered (was a client-only "Loading" shell) |
| /work, /work/[slug] | investigational | portfolio | web design portfolio | ecommerce, bilingual | Web Design Portfolio: Websites & Online Stores | case studies, contact | — |
| /process | informational | development process | website development process | phases | Website Development Process: 5 Phases | how-we-work, pricing | HowTo JSON-LD removed (not a how-to) |
| /how-we-work | informational | working rules | communication, changes, ownership | — | How We Work: Communication, Changes, Ownership | process, terms | — |
| /approach | informational | method | data-first build | architecture | Our Approach: Data First, Page Last | development | — |
| /standards | investigational | quality bar | website quality standards | CWV, a11y, security | Quality Standards: Speed, Accessibility, Security | audit, contact | Gate copy is limited to what CI actually does |
| /faq | informational | buyer questions | website project FAQ | cost, timeline, ownership | Web Design FAQ: Cost, Timeline, Ownership | answers link out | — |
| /writing (+16) | informational | guides | choosing a developer, rebuilds | WordPress, Next.js | Writing: Guides to Building & Choosing a Website | one soft CTA per article | Dates come from git (2026-03-25 for the 4 former 2024 articles) |
| /contact, /schedule | transactional | inquiry / booking | contact web design agency / consultation | — | Contact a Web Design Agency · Book a Website Consultation (30 min) | — | /schedule now server-rendered; 9:00–18:00 has no timezone |

Structured data: there is no Review or AggregateRating schema. Service names match the renames. The HowTo schema was removed.

## Transparency QA

- The label stays "Transparency" / "الشفافية". The function hint is "Cost estimator" / "حاسبة التكلفة".
- Desktop nav: Pricing → Transparency · Cost estimator; header button Estimate your project.
- Mobile: same item, plus the full-width button.
- It is also reachable from the footer, the command palette ("transparency cost estimator calculator…" and AR keywords), the home section after Ownership, the /pricing CTA pair after the price table, and the estimator page itself.

## Language QA

- Key parity holds in every namespace (enforced by the new `tests/www/messages-parity.test.ts`).
- AR uses مراجعة تقنية, مراحل المشروع, قواعد العمل, and باقات for maintenance plans. It never uses a bare النطاق.
- Arabic figures use Latin digits.
- The admin "Revisions" label changed too: the pricing-schema copy is shared with admin proposals and contracts.

## Design-preservation QA

- No new colours, fonts, radii, motion literals or dependencies.
- Two token-level changes, both fixes:
  - Ownership dark sheets use the existing on-dark accent token, for AA.
  - `[locale]/loading.tsx` deleted. It was an English-only full-screen "Loading" page, also on AR. It caused soft-404s and was the Suspense boundary that hid /schedule and /transparency from server HTML. Slug routes now use `dynamicParams = false`; /schedule and /transparency are `force-dynamic`, like /contact. Pricing stays cached.
- Reorders done (approved): /pricing prices-first, /about Founder above Fit, /standards performance first, /approach chapters, home Transparency after Ownership.
- /work: the "run it through PageSpeed" check was removed, leaving four checks. Local Lighthouse on the live builds measured performance 69–75, so the page should not invite that test yet.

## Quality gate (Standards Option B)

- What CI does is recorded in `docs/quality-gate.md`.
- **Blocking jobs:**
  - `checks`: lint, check-types, validate, tests with a 99% line/function coverage threshold on pricing-schema and the tested www libs only (not app-wide), offline verify scripts, font checks.
  - `build-and-lighthouse`: www build, then LHCI with accessibility ≥ 0.95, SEO ≥ 0.90, and 15 a11y audits that must score 1.
- **Advisory only:** performance, best practices, LCP, CLS, TBT, knip.
- **It does not stop anything yet.** Ali must add the required checks in GitHub (Rules → `main` → require `checks` and `build-and-lighthouse`) and in Vercel (www → Settings → Deployment Checks).
- /standards therefore says only:
  - checks run before launch, with the results in the handover;
  - this site's own code runs the automated version on every push;
  - accessibility below 95 or SEO below 90 fails the run.
- It does not say "every deploy", "deployment is blocked" or "80% coverage".
- **Known flake:** Lighthouse can capture the initial loader mark mid-fade (aria-hidden overlay) as a contrast failure. It happened in 1 of 3 runs. Not touched, because the loader is an approved motion device.
- **Doc conflict:** CLAUDE.md says `computeAddonPrice` throws on `costBasis: null`. The code returns `null` instead, and the tests assert `null`.

## Decision patch 2026-10-05 (Ali, final): applied

| Decision | Done |
|---|---|
| /services plate below the four cards, eyebrow + new h2 "Four commitments that hold, whichever service you choose." | yes (CSS sticky + scrub, not a GSAP pin; sticky motion not seen in a browser yet) |
| /services/interface-design StackedRows | 6 → 4 rows, sticky height 78vh → 64vh; `rows-02.webp`, `rows-03.webp` now unreferenced |
| /services/development | StudioWords, StudioTiles and their motion hooks removed; order: builds → fit → investment → steps → handover → statement → facts → FAQ |
| /services/consulting | Hero → Offer → Curve → Areas → Fit → Steps → Terms (new ServiceTerms ledger: fee, 5 business days, full credit, "not the free call") → FAQ → CTA; eyebrow "Technical audit" |
| Home hero highlight | `Highlight tone="iris"` (existing `.accent-iris`); no new colour |
| /about founder | one-line bio, no "answers for the standards"; **no photo — no founder asset exists** |
| Reply time | "We reply within 24 hours on business days." once, /contact (`contactPage.lines.replyTime`) |
| /schedule | "Schedule a 30-minute project consultation.", "Initial project consultation call", "No charge", separate from the paid audit |
| Revisions | `{revisionRounds}` in interface-design, development steps, FAQ Q16 |
| Maintenance | incident block, support row, WhatsApp/email feature, "priority incident handling", custom SLA removed; overage at `{revisionRate}` |
| /standards | "launch waits for the fix" removed; gate copy = this repo's checks only |
| Work / nav | "Live work you can inspect"; no build count |
| /terms | §2 uses the four current service names; obligations unchanged; legal review still required |
| Errors | routes return codes (`lib/api-errors.ts`, `lib/server/api-error.ts`); copy in `validations.json` `errors.*` / `errorPage.*`; error.tsx localized; 429 + Retry-After |
| Bug found | exit-intent refused `article_audit_cta:<slug>` → every article audit request failed with 500; fixed |

Checks after the patch: tsc, lint, knip, build, validate, 179 tests pass. Browser: hero iris on /ar, reply line on
/ar/contact, AR heading order on /services, development, consulting, interface-design, schedule; API error bodies
carry codes only for known fields (zod's default English for a missing field is never rendered: the client shows
its own localized line when a code has no key).

## Second decision set 2026-10-05 (Ali, final): applied

| Item | Done |
|---|---|
| Founder photo | Bio ships; `FOUNDER_PHOTO: string \| null = null` in `founder-route.tsx` renders nothing until a real photo path is set. No mood image, no placeholder. |
| USD note | `usdLabel`/`usdNote` removed from pricing-schema TermsCopy/TermsView and copy; parity report asserts no rate or review cadence is published. The internal conversion (`USD_EXCHANGE_RATE` → `egpToUsd`, admin `usdEgpRate`) still runs. |
| /standards | "Targets we build to"; CI copy describes this repository only (a11y < 95 or SEO < 90 fails the run, performance reported). No launch gating. Metadata no longer hand-types the count. |
| /about | Direct-to-engineering / no-sales-layer / no-account-manager / no-subcontractor principle replaced by "Decisions are agreed in writing". |
| Case studies | `year` removed from type, records, display, JSON-LD and sitemap; unverifiable Art Lighting / NewLight details removed. |
| Maintenance | Quarterly health summary, cadence/reporting rows, daily/weekly/monthly hero items and monthly-report clauses removed. Turnaround row → "Request priority" (`requestCapPriority`). |
| Unused assets | `interface-design/rows-02.webp`, `rows-03.webp` deleted. |
| Schedule timezone | `lib/config/business-hours.ts` is the one source (Africa/Cairo, 9–18, 15-min slots, DST-aware offset label via Intl). Used by /contact, /schedule and `/api/schedule` (off-hours times refused with `contact.scheduled-time-outside-hours`). |
| Contact email | Required on the form + API (`contact.email-required/-invalid/-max`), stored in `ContactSubmission.email` (nullable for old rows), linked to `Client.email`, in the notification, shown/searchable in admin. Reply copy: call, WhatsApp or email. |
| Privacy | Per-form list of what is actually stored (contact, schedule, estimator, call-back); analytics = Vercel Analytics + Speed Insights only. |
| Terms | "The included revision rounds: {revisionRounds}" (renders 3). |
| Copy review | All changed EN/AR copy reviewed: 60-minute session → 30-minute initial project consultation call everywhere; "thresholds" → "targets"; team-implying lines removed; AR terminology unified (باقات، جولات التعديل، نطاق العمل، النطاق السعري). |

Verification (lead, after all agents): www tsc, admin check-types, `bun run lint`, knip, `bun run validate`,
`bun test` (179 pass), `turbo run build --filter=www` all clean. Browser: /ar/contact email field (LTR,
aria-required, invalid on blur, localized form error on submit); `/api/contact` returns
`{"code":"validation","fields":{"email":"contact.email-invalid"}}`; /ar/schedule shows "9:00–18:00 بتوقيت القاهرة
(GMT+3)"; /ar/terms "جولات التعديل المشمولة: 3"; no unfilled tokens or removed claims on the checked pages.

### Quality checks are not required in GitHub yet

`.github/workflows/quality.yml` is not on `main` yet: it has never been pushed, so it has never run.
Requiring its checks now would block every push to `main`.

`main` has no branch protection. The only ruleset on the repository, "Code Quality Copilot review", is disabled.

After the workflow is pushed and has passed once, add a branch ruleset on `main` that requires the `checks` and
`build-and-lighthouse` status checks. Then turn on Vercel Deployment Checks in the Vercel console. Until then the
quality checks do not block anything, and the copy does not say they do.

## Still open for Ali

- **Migrations (not applied):** `packages/database/prisma/migrations/20261005120000_contact_submission_email`
  (and the older pending `20261004180000_product_existing_site`). From `packages/database`: `bun run db:deploy`,
  then `bun run db:deploy:prod`.
- **Founder photo:** set the path in `FOUNDER_PHOTO` when a real photo exists.
- **Case-study tech stack:** confirm "PostgreSQL + Prisma" and the image pipeline (not verifiable from the live sites).
- **Rate-limit IPs:** `RateLimitBucket` keeps raw IPs with no pruning; privacy §7 states no retention period.
  Decide: a cleanup job or a stated retention period.
- **Homepage problem item 05** ("No developer you can reach" / "A coordinator relays…") implies direct developer
  access by contrast. Kept; reword if that implication is unwanted.
- **Terms:** "Start payment … begins discovery" — confirm intent now that the first call is free.
- **Pricing-schema copy** writes "EGP" beside the revision/overage rate (pre-existing); international clients see USD elsewhere.
- **Counsel:** terms and privacy still need legal review.
- **Console:** GitHub required checks + Vercel Deployment Checks (see above).

## Multilingual system pass (2026-10-05)

Rule: `docs/multilingual-system.md` (Ali, binding). Applied:

- **Locale table** `apps/www/i18n/locale-meta.ts` — `LOCALE_META: Record<Locale, …>` (dir, Intl tag, OG locale,
  script, native name, list separator); a new locale fails type-check until it has a row. ~30 files moved off
  `locale === "ar" ? … : …` branches and hard-coded `["en","ar"]` lists onto the table / `routing.locales`.
- **Hero matrix** (18 pages × en/ar × 320/390/768/1280/1920, headless): fixed home h1 overflowing the gutter at
  ≤390 (lines may wrap below md), SectionHeading second-title orphans (stays a block, each part balances), and the
  home h1 colliding with the lede/CTA at 1920 (size capped at its value when the container stops growing:
  `clamp(3.25rem,7.2vw,6.25rem)`, unchanged below 1384px). Same cap on /services/interface-design
  (`clamp(3.25rem,7.4vw,6.5rem)`, container 1408px): AR @1920 went from one word per line with the CTA at 1191px to
  4 lines with the CTA at 678px. Home re-measured clean at all widths in both locales.

Open for Ali (scale / layout / copy decisions):
- Arabic headings run at the brand 1.3 line-height (EN 0.96–1.02): /pricing AR CTA falls below the fold at
  1280×800 and 1920.
- /services/maintenance: EN title 7 lines vs AR 4 at 320 (EN CTA below fold) — copy length or column width.
- /contact: AR h1 is deliberately 0.77× EN (`rtl:text-[clamp(...)]`) — breaks "one hero scale".
- 320px: 44–52px minimum sizes give 1–2 words per line on several AR heroes (7→4 line jump to 390).
- RTL rules (~150 utilities + globals.css) mean "Arabic script"; a Hebrew/Persian locale needs them keyed by script.
- Two-way language toggles now cycle; a list is better at 3+ locales. English-only by choice: llms.txt, feed.xml,
  manifest lang, Organization JSON-LD description. `footer.otherLanguage` key now unused.

## No place or language targeting (Ali, 2026-10-06)

Altruvex no longer positions itself by place (Cairo, Egypt, the Gulf) or by language ("in Arabic & English", "bilingual"). This applies in every locale.

The hero now reads "Custom websites / and web applications." (AR "مواقع مخصصة / وتطبيقات ويب.").

Place and language were also removed from:
- the about page, footer, services, service details, FAQ, schedule and contact copy;
- metadata titles, descriptions and keywords;
- JSON-LD `areaServed` (now Worldwide);
- llms.txt and the OG image.

Times now show the zone offset (GMT+3), not "Cairo time". The contact page no longer shows the city.

Kept on purpose, because they are facts rather than positioning:
- the legal statements in privacy and terms;
- the EGP/USD billing notes;
- the case studies (those projects really were Arabic and English);
- the JSON-LD postal address;
- `knowsLanguage`;
- the llms.txt line pointing to /ar.

Removing place keywords gives up local-search terms such as "web design cairo". That trade-off was Ali's call.

Verified:
- EN/AR key parity is 0;
- both locales grep clean outside the kept list;
- tsc, eslint and knip pass;
- `turbo build --filter=www` succeeds;
- h1 checked on /, /about, /contact, /schedule and /services in EN and AR.

### Hero message (Ali, 2026-10-06)

The hero keeps its composition; only the content changed.

- **Title:** "Custom websites / and digital products."
- **Sub:** "We design and engineer digital experiences for established businesses, from interface to production."
- **CTAs:** unchanged.
- **Note under the CTAs (new):** "Tell us what you're building. We reply within 24 hours on business days."
- **AR version:** written to match.
- **Message flow:** the hero says what Altruvex does; the sections after it say how Altruvex works differently.

The reply-time line now appears on the hero as well as on /contact. This supersedes the earlier "once, on /contact" decision, at Ali's request. The wording is the same /contact sentence, so the promise stays "business days".

From xl, where the title sits beside the side column, the title is capped at `clamp(3.25rem,6.25vw,5.5rem)`. At 6.25rem the English line measured about 875px against a column of about 800px, so it overlapped the side column.

Checked with headless measurements in EN and AR at 320–2560px:
- the title is clear of the side column (gap 88–332px);
- there is no horizontal overflow;
- the note stays inside the first viewport.
