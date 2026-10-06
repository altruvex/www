# Research-first content build, 2026-10-04

Permanent record of the content pass on `apps/www` (EN + AR). It follows the
[communication audit](./communication-audit-2026-10.md) (previous pass) and is built from eight
section agents plus the lead's fixes afterwards. All new copy is unreviewed by Ali unless stated.

## 1. Purpose

Ali's instruction was: "in every section, research what should be there and put it there", for the
whole site, not "keep the good parts". Each section was researched (what the visitor needs at that
point, what strong studios and NN/g / Baymard / Google guidance put there, how people search it in
EN and AR), compared with what existed, and the gap was filled. New elements are built from existing
system components (SectionHeading, Eyebrow, Num, FaqSectionView, DirectionalLink, the ledger and
hairline-row idioms). Colours, fonts, motion and layouts are unchanged: the look is the same.

## 2. Rules the pass held to

- Invent nothing. Facts come only from `packages/pricing-schema`, `lib/process-phases.ts`, terms
  already published (`pricingModel`, `pricing`, `faq`), what the codebase demonstrates, and live
  checks. A missing fact (testimonial, metric, address, SLA) became an honest substitute plus an
  item in section 7.
- No price literal outside `packages/pricing-schema`; copy uses tokens (`{revisionRate}`,
  `{warrantyDays}`, `{auditCredit}`, `{deliveryWeeksMin}`...). `bun run validate` guards it.
- EN/AR key parity in every namespace; Modern Standard Arabic; Latin digits 0-9 only in Arabic.
- CTAs through the registry `lib/config/commercial.ts` (`CommercialCtaKey`), no hard-coded
  conversion hrefs.
- One h1 per page (from the hero), h2/h3 in order, no nested `<main>`.
- No Review / AggregateRating schema. No new dependencies, colours, radii or motion literals.
- MagneticButton untouched. RTL by logical properties. Agents did not build, run a browser, stage
  or commit.

## 3. Per page, per section

### 3.1 Homepage (`/`, `/ar`)

Files: `lib/config/commercial.ts`; `components/sections/{services-section,trust-section,home-faq-section(new)}.tsx`;
`app/[locale]/(main)/home-client.tsx`; messages `hero, problem, ownershipStack, services, commercial`.

| Section | Should contain | Added / changed (keys) |
|---|---|---|
| Hero | What you make, for whom, a differentiator, one next step | `hero.badge` "Web design & development · Cairo"; `hero.sub` names Arabic + English, Egypt and the Gulf, public price range, code yours at final payment. H1 and CTAs unchanged (L4) |
| Problem | Buyer pain in their own words, no attack on rivals | Subtitle rewritten as recognition; unused `closingPre/closingHighlight` removed; 5 rows unchanged |
| Ownership stack | What "custom" means, who owns each layer | New subtitle; all 5 `layers.*.detail` and `ownership` rewritten plainly at equal or shorter length (sheets have fixed height); infrastructure says monitoring/backups run on a maintenance plan; unused `closing`, `layers.*.spec` removed |
| Services | Named services in buyer words, one standard, per-row action | `services.title` "Four services. One delivery standard."; subtitle names design, development, consulting, maintenance; row actions via registry (`ROW_ACTION`); `services.action.*` removed |
| Trust | Verifiable proof without testimonials | New "What you can check before you sign" register `commercial.trust.checks` (4 numbered items linking /transparency, /standards, /pricing#terms, /work). Testimonials and founder quote left as they were (Ali's decision) |
| FAQ (new) | Top objections before a call | `home-faq-section.tsx` reads `faq.questions` 03, 04, 11, 09, 07 through `FaqSectionView`; mounted after pricing, before the final CTA. No FAQPage schema |
| Final CTA, work, pricing block | Already correct | Unchanged (`commercial.cta.footnote` removed as unused) |

New registry CTAs: `startDesign` (`/contact?service=interface-design`), `startDevelopment`
(`/contact?service=development`), `viewStandards` (`/standards`), `paymentTerms` (`/pricing#terms`).

Sources: nngroup.com "homepage first impressions" and credibility / trustworthiness guidance;
thoughtbot, Clearleft and 3hand hero and trust patterns (no URLs beyond these names were given by
the agent).

### 3.2 Services (`/services` and four sub-pages)

Layouts kept. New shared parts: `components/sections/services-index/service-brief.tsx`
(ServiceFit, ServiceSteps, ServiceTerms); `services-index/service-section.tsx` (hairline section,
moved from consulting-audit); `technical-section.tsx` is now `ServiceFaqSection`;
`services/_shared/service-faq-schema.ts` builds FAQPage JSON-LD from the keys the visible FAQ
renders. Messages `servicesPage`, `serviceDetails` (462 keys per locale), `servicesPage` (79).

| Page | Should contain | Added (keys) |
|---|---|---|
| /services | Which service first, single-service hire, sites we did not build, pricing basis, ownership, after launch | `servicesPage.faq.{title,items[6]}` before end CTA, with FAQPage JSON-LD |
| interface-design | Fit, process with your part, deliverables, drivers, what you provide, after launch, FAQ, close | `webDesign.brief.fit` (4 for / 3 not for), `brief.steps.items[4]` (live phase lengths via `usePhaseLength`), `brief.terms.items[4]`, `webDesign.faq` (5), `webDesign.close.*` |
| development | What we build, fit, handover steps, drivers, provide, after, FAQ, close | `development.brief.builds.items[4]`, `brief.fit`, `brief.steps.items[5]` (all 5 phases), `brief.terms.items[4]`, `development.faq` (6), `development.close.*` |
| consulting | Fit, how the 5 days run, access needed, FAQ, close | `consulting.brief.fit` (eyebrow 04), `brief.steps.items[5]` (eyebrow 05, `{auditCredit}`), `audit.offer.forkEyebrow` fixed to "03 -", `audit-offer.tsx` href from `getCommercialCta("technicalAudit")`, `consulting.seo.faq.items[5]` added (6 total), `consulting.close.*` |
| maintenance | Covers sites we did not build, onboarding, request definition, rollover, annual billing, exclusions, incidents | `maintenance.brief.fit`, `brief.steps.items[4]` ("we look first, then recommend"), `maintenance.faq.items[6]`; accent world kept |

Bug fixed in build: section descriptions carry tokens, so they are read with `t.raw` and filled
(plain `t()` throws an ICU error).

Sources (structure only, no copy taken): thoughtbot.com/services; nngroup.com/articles/show-price;
sayenkodesign.com/web-design-faq; growth.halo-lab.com/services/technical-audit; forasoft (code audit);
anadea.info (code review); seclgroup (tech audit); thundertech; websitemaintenanceservices.org;
shompton.com; blacksmith.agency; jkcwebsitedesign.com; azadadigital.com/service/ui-ux;
quickdigitals.ae/ar; aeen.sa/web-development; iconve.com; alshohab-eg.com/website-maintenance;
kemetova.com.eg.

### 3.3 Work (`/work`, `/work/[slug]`, homepage work section)

Files: `work/page-client.tsx`, `work/[slug]/page-client.tsx`, `lib/data/case-studies.ts`; messages
`work`, `caseStudies`.

| Section | Should contain | Added / changed (keys) |
|---|---|---|
| /work stages | Client, sector, build type, headline, link | Eyebrow `client · industry · year` (`caseStudies.<slug>.industry`); one scope line `caseStudies.<slug>.scope` ("Online store · Arabic and English · Next.js"). Stages kept sparse (Ali, 2026-10-01) |
| /work check (new) | Proof a sceptic can run | `CheckSection`: five checks on the live builds (phone on mobile data, switch to Arabic, land from search, PageSpeed Insights, Tab through). `work.check.{eyebrow,title,titleAccent,description,items[5]}` |
| case: at a glance | Client, sector, services, outcome | Unverified metrics strip replaced by a `<dl>` of verifiable facts: Build / Languages / Platform / Status (`caseStudies.<slug>.glance.*`, `work.labels.glance*`) |
| case: client, decisions, delivered, services | Context, decisions and why, deliverables, related services | `context`, `decisions[3]{title,why}` (numbered rows, h3), `delivered[]`, "Services involved" linking `/services/<slug>`; `services` = interface-design + development on all three |
| case: outcome | No unverified numbers | Rewritten; removed altruvex-site TTI/RTL ms; NewLight "payments" now "structured checkout"; Art Lighting "synchronized inventory" now "one inventory source"; AR grammar fixes; AR client name "نيو لايت" |
| Homepage work | 2-3 named projects, link to all | Unchanged (Ali's sparse D decision) |

New facts verified by curl of the live sites on 2026-10-04: newlight-eg.com and artlighting-eg.com
are Next.js on Vercel with `/en` (ltr) and `/ar` (rtl) plus hreflang; NewLight has cart, checkout,
accounts, wishlist, compare, PWA manifest; Art Lighting has cart, accounts, categories. Altruvex
facts come from this repo. The global request `common.endCta.pages.caseStudy` (body and accent
without the removed figures) is in place.

Sources: nngroup.com/videos/ux-design-portfolio-case-study/ ; nngroup.com/reports/b2b-websites-usability/ ;
thestory.is/en/journal/credibility-of-a-b2b-website/ ; thoughtbot.com/case-studies ;
thoughtbot.com/case-studies/british-business-bank ; clearleft.com/work ;
typza.com/insights/creative-agency-website-case-studies ; verlua.com/blog/website-case-study-examples ;
upbeat.digital/ar/نماذج-تصميم-مواقع ; aburaghad.com/projects_category/Examples-of-our-web-design-work.

### 3.4 Method (`/faq`, `/process`, `/how-we-work`, `/approach`, `/standards`)

| Page | Should contain | Added / changed (keys) |
|---|---|---|
| /faq | Real "people also ask": inputs, revisions, domain/hosting, foreign clients, cancellation, reply time, staging | `faq.questions.15-21` (inputs, revisions, domain/hosting, outside Egypt, cancellation, who/reply, staging review). Q05 rewritten with terms §3 bands. Q01 now "ownership passes at final payment". Q04 invented "6 weeks, not 12" replaced by what moves the date plus `{deliveryCeilingWeeks}`. `FAQ_GROUPS` lists all 21 keys, so page = FAQPage JSON-LD |
| /process | Per phase: inputs, outputs, sign-off, drivers | `process.phases.inputs` ("What you bring") and `phases.<key>.inputs` for all 5 phases; `process/phase-chapters.tsx` renders them beside deliverables; `launch.description` now staging first, production after final payment; `flexibility.description` fixed to match terms; AR discovery deliverables typo fixed. Phases, durations, order untouched |
| /how-we-work | Reply time, client's part, staging gate, changes clause | New clauses `reply`, `yourPart`, `launch`; `changes` rewritten; `hero.description` updated; `CLAUSES` grows 6 to 9 |
| /approach | Proof of what you get per chapter | `approach.handover.{label,items.{data,architecture,features,page}}` from terms §5; new `Handover` component at end of each chapter |
| /standards | Honest gate | "Reduced-motion support" added to accessibility requirements (true in `lib/motion`). Gate unchanged; unbacked claims flagged in section 7 |

Sources: selworthy.com; becleardesign.com; connectivewebdesign.com; godaddy.com/ar-ae; khelj.com;
bowwe.com; NN/g FAQ report; ramotion; brambla; invinciblebrands; thoughtbot.com/playbook;
web.dev/articles/vitals; www `next.config` (CSP, HSTS, X-Frame-Options present).

### 3.5 Pricing and transparency

Files: `commercial-terms.tsx`, `pricing/page.tsx`, `transparency/{page,page-client}.tsx`; messages
`pricing`, `pricingModel`, `transparency`. No schema, math, figure or term changed.

| Section | Should contain | Added / changed (keys) |
|---|---|---|
| /pricing hero | Search phrase above the h1 | `pricingModel.hero.eyebrow` "Website & web app pricing" / "أسعار تصميم وتطوير المواقع". H1 unchanged |
| How a price forms, cost drivers, investment register | Drivers, a common scenario, ranges | No change (already complete) |
| Terms (#terms) | Currency, included, billed separately | `terms.currency` / `currencyNote` (EGP for Egypt, USD international, terms §4); two columns `terms.included.{title,lead,items[6]}` and `terms.separate.{title,lead,items[6]}` in cost-split's layout |
| Pricing FAQ (#faq) | Fixed price? Hosting/domain? Why not a template? | Q01 question reworded; Q03 adds currency; new 06 (is the price fixed, `{proposalValidityDays}`, `{revisionRate}`), 07 (hosting, domain, email), 08 (why not a template, says a template is right when it fits). `PRICING_FAQ_KEYS` 01-08 |
| /transparency header | Cost intent in h1, "range not quote" | `transparency.title` EN "Estimate what your project will cost" / AR "احسب تكلفة مشروعك"; AR mistranslation `fallbackDeliverables[3]` ("guarantee") fixed to QA |
| Method (#method) | Assumptions | New second item "What the estimate assumes" |
| Transparency FAQ | Why a range; VAT/hosting/domain | a1 notes no contact details needed; new q5/a5, q6/a6 (`{vatRate}`); keys 1-6 in page and JSON-LD |

Sources: nngroup.com/articles/show-prices-for-common-scenarios/ ; nngroup.com/reports/b2b-websites-usability/ ;
baymard.com/blog/reduce-cart-abandonment ; baymard.com/learn/ux-statistics ; deutrix.com/custom-website-cost/ ;
sayenkodesign.com/how-much-does-a-website-cost/ ; newmedia.com/blog/web-design-cost ;
hostinger.com/tutorials/website-maintenance-cost/ ; webfx.com/web-development/pricing/website-maintenance/ ;
geexar.com/ar/تكلفة-تصميم-موقع-الكتروني-في-مصر/ ; tahwal.com/website-cost/ ; iketch.com/website-design-cost-calculator/ ;
wppit.com/store-price-estimate/.

### 3.6 About, contact, schedule

Files: new `about/studio-facts.tsx`, `contact/inquiry-guide.tsx`; edited `about`, `contact`,
`schedule` `page-client.tsx`; messages `about, contactPage, schedule`.

| Section | Should contain | Added / changed (keys) |
|---|---|---|
| About hero | What the org does and where, in one line | `about.description` opens with custom websites and web apps, EN + AR, from Cairo; altr- name story kept |
| About studio facts (new) | One factual summary | `about.facts.{title,titleItalic,standardsLink,processLink,items.{what,languages,build,process,pricing,where}.{term,value}}`, a `dl` after PhotoStage; links via registry. Every fact sourced from the site |
| About fit register | Self-qualification | +1 fit item (a team that can review and approve each phase), +1 not-fit (a fixed price before anyone looked at the problem) |
| About founder route, team, story | Faces, story | Not touched, nothing invented (section 7) |
| Contact form | Few fields, honest reply time, privacy at point of entry | `contactPage.letter.{privacy,privacyLink}` mirroring the privacy policy. **Bug fixed:** `errorFix/errorGeneric/errorNetwork` read root keys that do not exist (they live under `letter.`), so raw keys showed; 4 call sites corrected |
| Contact guide (new) | What to write, what happens next | `contactPage.guide.{title,titleItalic,includeLabel,include.{what,today,users,deadline},includeNote,after}`; reuses `contactPage.receipt.*` so the guide and receipt cannot drift |
| Contact motion hygiene | Tokens only | 6 `duration-300` / untokened transitions to `duration-(--motion-hover)`; `transition-all` narrowed |
| Schedule | Plain eyebrow, readable confirmation, privacy, alternative, call format | Eyebrow "Consultation call" / "مكالمة استشارية" (orphan "14 -" numbering removed); redirect-home-after-2s removed, success stays and inputs lock; `schedule.{privacy,privacyLink,writeLead}` plus link to `describeTheBuild`; new first SEO section "How the call runs" |

Sources: nngroup.com/articles/about-us-information-on-websites ; nngroup.com/reports/about-us-presenting-company-information ;
nngroup.com/articles/contact-us-pages ; blendb2b.com/blog/contact-page-design ; huemor.rocks/blog/contact-page-design ;
blog.hubspot.com/service/best-contact-us-pages ; clearleft.com/contact ; thoughtbot.com/hire-us ;
manyrequests.com/templates/discovery-call-template ; close.com/blog/discovery-call ; Google Search Quality
Rater Guidelines (PDF); blog.khamsat.com/how-to-write-professional-about-us-page ; AR competitors 7loll.net,
art4muslim.com.

### 3.7 Global chrome, legal, utility, SEO

| Part | Should contain | Added / changed |
|---|---|---|
| Nav | Registry CTAs, honest descriptions | `CALL_HREF = technicalCall`, `CTA_HREF = projectRange`; all 6 `nav.desc.*` rewritten (EN + AR) |
| Footer | Method pages, call line, language switch | Columns Services / Method / Company; "Call" row (`footer.callLabel`) to schedule; legal row = privacy, terms, other-language link (`footer.otherLanguage`, hrefLang); `footer.resourcesTitle` removed; AR approach/standards labels aligned with nav |
| 404 | Recovery routes, search | "Popular pages" (services, work, pricing, transparency, writing), search button opening the command palette with Ctrl K hint (`notFound.{body,popularLabel,search,searchHint}`); `end-0` replaces the physical pair |
| Offline | Copy matches the PWA cache | Pages opened in the last 24h may load; hard-coded string moved to `offline.stillOffline` |
| Command palette | Every live route reachable | "Estimate" action (projectRange); schedule from `technicalCall`; privacy and terms entries |
| Exit intent | | `exitIntent.stats.noPitch` now "One technical call" |
| Privacy | Describe only what the site does | Rewritten data-driven over 13 sections (controller, collection per form, legal basis, analytics/device storage, recipients, transfers, retention, rights, complaints, security, client projects, payments, changes). Names Vercel Analytics + Speed Insights (no cookies), Neon, email transport, WhatsApp, GitHub, Slack, rate-limit IP rows; complaint routes PDPC (Egypt), SDAIA, UAE Data Office, EU DPAs. Removed Stripe/Fawry/SendGrid/Sentry/Fathom/DPA claims. `lastModified 2026-10-04` |
| Terms | Match the real services | 12 sections, EN/AR parity; four real services; changes in writing priced from published ranges or `{revisionRate}`/h; three payments by token; EGP for Egypt, USD international; handover list from the FAQ; "applicable data protection law" replaces GDPR/CCPA. Page code unchanged. `lastModified 2026-10-04` |
| `lib/schema.ts` | Correct page types | `WEB_PAGE_TYPES`: about to AboutPage, contact and schedule to ContactPage, services/work/writing to CollectionPage; duplicate `buildAboutPageSchema` removed; no Review/Rating |
| `sitemap.ts`, `robots.ts` | | `x-default` alternate added; robots adds Claude-SearchBot, Claude-User, Applebot-Extended |
| `llms.txt` | Every live route | Added /approach, /how-we-work, /standards, /faq, /privacy, /terms; one-line summaries from metadata; AR URL list; engagement facts without figures; points to /pricing |

Sources: Egypt PDPL 151/2020 and Executive Regulations; KSA PDPL (SDAIA); UAE FDL 45/2021; GDPR Arts
6, 13-15, 44-49, 77; schema.org AboutPage / ContactPage; Google hreflang x-default; llmstxt.org;
Anthropic and Apple crawler docs; repo: `docs/slack.md`, `next.config.ts`, `enforceRateLimit`, `faq.json`,
`schedule.json`, case studies. **Privacy and terms text has not been seen by counsel.**

### 3.8 Writing (`/writing`, `/writing/[slug]`, 16 MDX articles)

| Part | Should contain | Added / changed |
|---|---|---|
| Index intro | Who it is for, what it covers | `intro.paragraph1/2` rewritten (reader named, topics, sources linked, prices live on /pricing); `featured` now shows "Start here" / "ابدأ من هنا" (MENA partner, technical audit); filters unchanged |
| Article template | Byline, dates, contents on mobile, tables, locale-safe links | "Written by Ali Abdelhadi, {jobTitle}" with `<time>` Published / Updated; metadata `modifiedTime = updated ?? date`; mobile `<details>` contents below 1100px; new `components/mdx/compare.tsx` (`<Compare head caption><Row cells/></Compare>`, semantic table); MDX `a` uses the i18n `Link` for `/` hrefs (AR links stay AR), external links `noopener`; `ul/ol` use `ms-6`; `lib/utils/mdx.ts` strips fenced code before extracting headings; `types/mdx.ts` adds `updated?` |
| All 8 topics x EN + AR | Short answer, compare table, steps, questions people ask, next step | Every article has all five; `updated: 2026-10-04`; author "Altruvex Team" changed to the founder; `coverImage` removed (files did not exist; schema falls back to the OG image); AR is native MSA with Latin digits (one intentional Arabic-Indic example in `ar/multilingual-architecture.mdx:87`); no price in any article; each links to at least two other articles; data-protection mentions carry a "not legal advice" caveat |

Article titles (EN): WordPress vs a Custom Website: How to Decide; What Is Technical Debt? Causes,
Costs and How to Manage It; Multilingual Website Architecture for Arabic and English; Questions to Ask
Before Hiring a Web Developer; How to Choose a Web Development Company in MENA; Custom Web Development
in Cairo: What to Expect; Next.js Development Agency: When to Hire One, What to Ask; Website Audit
Before a Redesign: What to Check First. Slugs, dates and topics unchanged.

External sources per article: W3Techs share and Patchstack 2025 (why-not-wordpress); Fowler, two pages
(technical-debt); Google localized-versions and multi-regional docs, W3C dir (multilingual-architecture);
Saudi PDPL via securiti, UAE 45/2021 via u.ae, Egypt 151/2020 regulations via Baker McKenzie (MENA
partner); Egypt PDPL via Kennedys (Cairo); nextjs.org docs and deploying, web.dev, Google site move
(Next.js agency); Google site move, web.dev, OWASP Secure Headers (audit before rebuild). Research
guidance: Google "people-first content" (who / how / why), NN/g on tables of contents, Google on bylines
and dates. (The agent listed these by site and page title, not full URLs.)

## 4. Keyword map per route

| Route | EN primary / secondary | AR primary / secondary |
|---|---|---|
| `/` | web design and development studio Cairo, custom website development / bilingual Arabic English website, web application development, custom website vs template, website cost, who owns the code | شركة تصميم وبرمجة مواقع، تصميم مواقع / تطوير مواقع القاهرة، موقع بالعربية والإنجليزية، تطبيق ويب، تصميم مخصص، قالب جاهز، تكلفة تصميم موقع، ملكية الكود |
| `/services` | web design and development services / website maintenance services | خدمات تصميم وبرمجة المواقع / خدمات تطوير المواقع |
| `/services/interface-design` | website design company / website interface design, arabic rtl design | تصميم واجهات المواقع / شركة تصميم مواقع، تصميم واجهات عربية |
| `/services/development` | custom web development / web application development, client portal | برمجة مواقع مخصصة / تطوير تطبيقات ويب، بوابة عملاء |
| `/services/consulting` | website technical audit / code audit, rebuild or repair | مراجعة تقنية للموقع / تدقيق تقني للموقع |
| `/services/maintenance` | website maintenance plans / maintain a site we did not build | صيانة المواقع / باقات صيانة المواقع |
| `/work` | web design portfolio / website case studies, ecommerce website examples | نماذج تصميم مواقع / أعمال تصميم مواقع، سابقة أعمال شركة تصميم مواقع، نماذج متاجر إلكترونية |
| `/work/newlight-lighting-store` | bilingual online store case study / lighting ecommerce website, Next.js online store | متجر إلكتروني ثنائي اللغة / تصميم متجر إلكتروني، متجر عربي إنجليزي |
| `/work/art-lighting-store` | custom ecommerce storefront / Next.js ecommerce, product image zoom | تصميم متجر إلكتروني مخصص / متجر إضاءة |
| `/work/altruvex-site` | bilingual Next.js website / RTL website, Arabic website development | موقع ثنائي اللغة / برمجة مواقع عربي إنجليزي |
| `/process` | web design process, website development phases / how long to build a website | مراحل تصميم المواقع / مدة تصميم موقع |
| `/how-we-work` | working with a web development agency / change requests | كيف تعمل شركة تصميم مواقع / طلبات التعديل |
| `/approach` | custom web development approach / bilingual RTL engineering | منهجية تطوير المواقع / موقع عربي إنجليزي |
| `/standards` | Core Web Vitals standards / WCAG AA website, security headers | معايير جودة المواقع / سرعة الموقع |
| `/faq` | web design FAQ / who owns my website code, domain and hosting ownership, website revisions | أسئلة شائعة تصميم مواقع / ملكية الدومين والاستضافة، كم يستغرق تصميم موقع |
| `/pricing` | website design cost, custom website pricing / how much does a website cost, web app development cost | تكلفة تصميم موقع، أسعار تصميم المواقع / تكلفة إنشاء موقع إلكتروني، سعر تصميم موقع، أسعار برمجة المواقع |
| `/transparency` | website cost calculator, website cost estimator / website price estimate | حاسبة تكلفة موقع، احسب تكلفة موقعك / تقدير تكلفة موقع، مدة تصميم موقع |
| `/about` | about / (name story) | من نحن |
| `/contact` | contact web design agency | تواصل مع شركة تصميم مواقع |
| `/schedule` | book a website consultation | استشارة تصميم موقع |
| `/privacy` | privacy policy Egypt, PDPL Egypt website, data protection Cairo studio | (metadata only) |
| `/terms` | web development terms, code ownership contract, payment milestones website build | (metadata only) |
| `/writing` | web development blog, website guides for businesses | مقالات تطوير المواقع، دليل برمجة المواقع |
| why-not-wordpress | wordpress vs custom website | ووردبريس أم موقع مخصص |
| technical-debt | what is technical debt | ما هو الدين التقني، الدين الفني |
| multilingual-architecture | multilingual website architecture, hreflang arabic | موقع ثنائي اللغة عربي إنجليزي |
| evaluating-developers | questions to ask a web developer | أسئلة قبل التعاقد مع مطور مواقع |
| best-web-development-partner-mena | choose web development company MENA | كيف تختار شركة برمجة مواقع |
| custom-web-development-cairo | custom web development Cairo, web development company Egypt | شركة برمجة مواقع في القاهرة، تصميم وبرمجة مواقع مصر |
| nextjs-development-agency | next.js development agency | شركة تطوير Next.js |
| technical-audit-before-rebuild | website audit before redesign | تدقيق تقني للموقع قبل إعادة التصميم |
| `llms.txt` | bilingual Arabic English web development, custom web engineering Cairo, RTL Next.js | |

## 5. Metadata applied per route

Read from `apps/www/lib/metadata.ts` (`PAGE_METADATA`) on 2026-10-04. `formatTitle` appends
" | Altruvex" unless the title already contains "|". Description lengths are in characters; full
descriptions and keyword arrays are in the file. Descriptions are all within 155 (EN) / 147 (AR).

| Route | EN title (chars) / desc | AR title (chars) / desc |
|---|---|---|
| `/` | Custom Web Design & Development Studio in Cairo (47) / 152 | شركة تصميم وبرمجة مواقع مخصصة في القاهرة (40) / 125 |
| `/services` | Web Design, Development & Maintenance Services (46) / 154 | خدمات تصميم وتطوير وصيانة المواقع (33) / 147 |
| `/services/interface-design` | Website & Interface Design in Arabic and English (48) / 142 | تصميم واجهات المواقع بالعربية والإنجليزية (41) / 136 |
| `/services/development` | Custom Website & Web App Development (Next.js) (46) / 150 | برمجة وتطوير مواقع وتطبيقات ويب مخصصة (37) / 127 |
| `/services/consulting` | Website Technical Audit in 5 Business Days (42) / 153 | مراجعة تقنية للموقع خلال 5 أيام عمل (35) / 129 |
| `/services/maintenance` | Website Maintenance & Support Plans (35) / 149 | باقات صيانة المواقع والدعم الفني (32) / 127 |
| `/work` | Web Design Portfolio: Websites & Online Stores (46) / 149 | أعمالنا: نماذج تصميم مواقع ومتاجر إلكترونية (43) / 122 |
| `/work/[slug]` | from case study (below) | from case study (below) |
| `/process` | Website Development Process: 5 Phases (37) / 137 | مراحل تصميم وتطوير المواقع: خمس مراحل (37) / 114 |
| `/how-we-work` | How We Work: Replies, Changes, Ownership (40) / 136 | كيف نعمل: التواصل والتعديلات والملكية (37) / 120 |
| `/approach` | Our Approach: Data First, Page Last (35) / 130 | منهجيتنا: البيانات أولًا والصفحة أخيرًا (39) / 99 |
| `/standards` | Quality Standards: Speed, Accessibility, Security (49) / 112 | معايير الجودة: السرعة والإتاحة والأمان (38) / 104 |
| `/faq` | Web Design FAQ: Cost, Timeline, Ownership (41) / 126 | أسئلة شائعة: التكلفة والمدة والملكية (36) / 105 |
| `/pricing` | Website Design Cost & Custom Web Pricing (40) / 150 | تكلفة تصميم موقع وأسعار تطوير المواقع (37) / 136 |
| `/transparency` | Website Cost Calculator: Price Range & Timeline (47) / 152 | حاسبة تكلفة موقع: احسب السعر والمدة (35) / 121 |
| `/about` | About Altruvex \| Custom Web Design & Development, Cairo (55) / 153 | من نحن \| Altruvex لتصميم وبرمجة المواقع (39) / 145 |
| `/contact` | Contact a Web Design Agency \| Start a Project – Altruvex (56) / 139 | تواصل مع شركة تصميم مواقع \| Altruvex (36) / 115 |
| `/schedule` | Book a Free Website Consultation (30 min) (41) / 134 | احجز استشارة تصميم موقع مجانية (30) / 125 |
| `/writing` | Writing: Guides to Building & Choosing a Website (48) / 144 | مقالات: أدلة لاختيار شريك التطوير وبناء موقعك (45) / 138 |
| `/privacy` | Privacy Policy (14) / 135 | سياسة الخصوصية (14) / 134 |
| `/terms` | Terms of Service (16) / 141 | شروط الخدمة (11) / 119 |
| `/offline` (noindex) | You are offline (15) / 90 | أنت غير متصل (12) / 80 |

Case studies: the page title is `seoTitle ?? name` (`work/[slug]/page.tsx:48`); the description is
`summary`. `seoTitle` is set for the two titles whose `name` would exceed 60 characters with the
suffix.

| Slug | EN title | AR title |
|---|---|---|
| `newlight-lighting-store` | NewLight: First Online Store for a Lighting Brand (`seoTitle`) | نيو لايت: أول متجر إلكتروني لعلامة إضاءة (`seoTitle`) |
| `art-lighting-store` | Art Lighting: Custom Lighting Store Case Study (`seoTitle`) | آرت لايتنج: دراسة حالة متجر إضاءة مخصص (`seoTitle`) |
| `altruvex-site` | Altruvex.com — a bilingual Next.js studio website (`name`) | Altruvex.com — موقع شركة ثنائي اللغة على Next.js (`name`) |

Articles: title and description come from MDX frontmatter (all 16 titles within 60; excerpts longer
than 155 are truncated by search engines, accepted).

404: the page has no `PAGE_METADATA` entry; it carries a hoisted `<title>` (section 6). The global
agent recommended "Page not found | Altruvex" / "الصفحة غير موجودة | Altruvex". Note the metadata keywords
still target Cairo ("website development cairo", "ui ux design cairo", "website consulting cairo"):
see section 7.

## 6. Lead fixes after the agents

- Terms §3 change-size thresholds restored after an agent removed them: minor (up to 5%) included,
  moderate (5-25%) change order, major (over 25%) new phase.
- The dev-studio speed figure now shows the published LCP threshold "< 2.5s"
  (`serviceDetails development.studio.facts.speed`), instead of an unverified case-study metric.
- Unverified case-study `metrics` arrays and the `CaseStudyMetric` type removed from
  `lib/data/case-studies.ts`.
- `seoTitle` added to case studies whose `name` was too long for a title.
- `loading.tsx` root element changed from `<main>` to `<div>` (it nested inside the layout's `<main>`).
- New `app/[locale]/[...rest]/page.tsx` catch-all, so unknown URLs render the custom 404 instead of
  Next's default.
- The 404 page gets a hoisted `<title>`.
- FAQ Q11 now matches the pricing schema: domain, hosting and business email are billed at cost plus
  a stated margin. The old FAQ said they were included.

## 7. Needs Ali's real data or decisions

Merged from all reports, de-duplicated. Nothing below was invented or claimed.

**Proof and people**
- Testimonials (NewLight, Art Lighting in `lib/data/testimonials.ts`): genuine and approved? They are
  attributed to a company with no person ("NewLight · NewLight") and render in the case "Client
  perspective" and home Trust. Keep with a named person and role, or delete.
- Founder line and photo on /about and in home Trust (communication audit L3 #1, L4): approval pending.
  Team, size, roles, bios, studio photos, founding year and story: none exist on the site. Is "small
  studio" true? (The new metadata drops it.)
- Article byline (founder on all 16 articles), the AR name spelling "علي عبد الهادي", and which two
  articles are featured (current picks: MENA partner, technical audit).
- Measured results per build (the top case-study element in research): Lighthouse, LCP, CLS with a date,
  conversion or enquiry change, time to launch, build duration, team and roles. PageSpeed Insights API
  quota was exhausted on 2026-10-04, so nothing was measured. Removed from display, restore only with a
  dated measurement: "< 1s Mobile TTI", "< 16ms RTL switch", "95+ Lighthouse", "inventory synced live",
  "full checkout/payments" (a payment provider is unverified).
- Case copy still unverified and kept: Art Lighting "old platform compressed images / loaded slowly /
  inventory across several systems", "webhook-synced single source", "static generation + revalidation",
  "operate without engineering support"; NewLight "showroom" background. FAQ Q14 (Altruvex.com 2025,
  NewLight 2024, Art Lighting 2024) unchanged and unverified.
- Art Lighting's live site emits hreflang pointing at `eg-artlighting.vercel.app`: an SEO fault on the
  client's site, worth telling the client.
- Client logos, case metrics, a response-time SLA: none exist.
- Real cover images for articles (none; OG image is the fallback); case evidence that could deepen the
  MENA, Cairo and Next.js articles.

**/standards claims without repo backing**
- "Checked on every deploy" and "deploy pipeline blocks a release": no `.github/workflows` exists.
  Confirm where the gate runs, or soften.
- ">80% coverage": www has no test runner. Confirm it holds for client builds.
- INP is missing (adding it changes STANDARDS and CHECK_COUNT and needs a real measurement).
- WCAG: the site says 2.1; confirm before saying 2.2 AA. Keep `serviceDetails` on 2.1 meanwhile.
- SEO and i18n have no measured gate.

**Market, location, contact**
- "Egypt and the Gulf" as the market (inferred from `AREA_SERVED`), and the Cairo keywords in metadata:
  confirm location targeting is intended.
- `SITE_CONFIG` address, postal code and geo coordinates feed Organization / LocalBusiness schema:
  real, or remove? Is Cairo a street address or only a city?
- "Reply within 24 hours on business days": pre-existing, now repeated in more places (/how-we-work,
  FAQ 20, metadata). Confirm it holds, including mid-project.
- Schedule: timezone and working days for the 09:00-18:45 slots (times are browser-local, no timezone
  sent); call languages and whether video is offered; NDA policy before a project is discussed;
  the phone placeholder "01XXXXXXXXX" is Egypt-only. No confirmation email to the user after contact
  or schedule (functional, not content).

**Privacy and legal (counsel has seen none of it)**
- Egypt PDPL may need explicit consent at collection. Suggested unticked line for the forms, linking
  /privacy: `form.consent` EN "I agree that Altruvex may use these details to reply to my enquiry, as
  described in the Privacy Policy." / AR "أوافق على أن تستخدم Altruvex هذه البيانات للرد على استفساري،
  كما هو موضح في سياسة الخصوصية."; `form.consentRequired` EN "Please confirm so we can reply." / AR
  "يُرجى التأكيد حتى نتمكن من الرد." Not added to the forms.
- The rate-limit table stores plain IPs with no cleanup job: add a TTL or hash the IP.
- Retention: enquiries "2 years" (from old copy); terms §9 post-project backups for 30 days (from old
  copy). Confirm both.
- Egypt PDPC: controller licence, DPO, cross-border transfer licence (Vercel and Neon are outside
  Egypt). Neon region and the production email transport (Resend or SMTP) are named by role only.
- Payment methods actually offered: privacy §12 and terms §4 stay generic. Local integrations (Paymob,
  Fawry, Aramex) are not named; may they be?
- Old terms kept, to confirm: 1.5% monthly late interest (check Egyptian limits), Egyptian law with
  UNCITRAL arbitration, 7-day invoices, 12-month liability cap, start-payment refund rules, 14-day
  cure/pause windows.

**Commercial**
- Revision rounds: the schema has `includedRevisionRounds: 3` but no token in `pricingTokenMap`
  (`views.ts`), so FAQ 16, pricing FAQ 06 and the interface-design copy say "the included rounds" with
  no number. Add `revisionRounds` to the token map if it should show.
- USD publication: `termsView.usdNote` (rate and reviewedOn) exists but is not shown. The currency row
  only says invoices may be in USD. Publish a USD view? Also confirm FAQ 18 (EGP/USD rule from terms §4)
  is wanted publicly.
- Third-party add-on margin: the old FAQ said third-party tools were "not marked up"; the new text is
  silent. `termsView.addonNote` ("billed at what we pay, plus a stated margin") is a commercial
  statement not yet confirmed for publication.
- Whether interface design is sold without the build (copy assumes design hands off to our own build).
- Maintenance: cancellation and notice terms, minimum term, what happens if onboarding finds a broken
  or unsafe site, real turnaround per plan (none promised).
- Audit: does the `{auditCredit}` credit expire; do the 5 days pause while waiting on client answers.
- Per-phase client inputs on /process (especially domain/DNS and third-party access): confirm.
- `transparency.pdfContent` deliverable claims ("Up to 6 core pages", "up to 50 SKUs", "Paymob",
  "Extended support window") are unreviewed and were not touched.

**Technical, pre-existing**
- Unknown URLs return HTTP 200 with noindex (a soft 404), because `app/[locale]/loading.tsx` streams.
- `ARTICLE_CTA_MAP` in `[slug]/page.tsx` still hard-codes hrefs; it could map to `CommercialCtaKey`.
- Sitemap and RSS feed could emit `updated` / `lastmod` (`lib/schema.ts` article `dateModified` should
  use `updated ?? date`; confirm nothing else needs `coverImage`).
- Nested not-found copy (`work.labels.*`, `writing.notFound.*`) could offer the same
  recovery as the global 404 (index link plus Ctrl K hint).
- Nav AR names /process "آلية العمل" while the process hero eyebrow says "مراحل المشروع"; cross-references
  follow the nav name.

## 8. L4/L5 ideas (described, not built)

- **Homepage:** H1 "Engineered, not assembled." carries no keyword; option is a keyword phrase in a
  visually smaller h1 part (the badge already carries one). Section order (audit L3 #8): merge Problem
  into Ownership Stack and move Work up beside Services. New problem row "Arabic added as an
  afterthought" needs a new drawing in `problem-drawings.tsx`. If testimonials are removed, move the
  Trust register directly under the heading.
- **Services:** a "which service" chooser (three questions routing to audit, build or maintenance) in
  the estimator form idiom; on /development a per-type "what it touches" ledger (roles x data x
  integrations); on /consulting a sample findings excerpt (real and anonymised, or clearly labelled);
  on /maintenance link onboarding steps to the month split; per-route `Service` + `Offer` JSON-LD with
  live pricing tokens (no ratings) once each service is confirmed standalone.
- **Work:** a dated "measured on" figure row back in the glance strip once Ali supplies measurements
  (same markup).
- **Method:** /process gate ledger per chapter (inputs, sign-off, next phase); /how-we-work "first
  week" timeline from process-phases data; /faq search filter keeping identical JSON-LD; /standards
  live Lighthouse CI scores once a real pipeline exists.
- **Pricing:** /pricing h1 ("Priced from requirements, not packages.") has no keyword, a hero identity
  call; heading-order pass in CostSplit (h3 rows, h4 columns under a non-heading lead); a template vs
  freelancer vs studio table (FAQ 08 covers it in prose).
- **About / contact / schedule:** About h1 is the name story with no "about" keyword (positioning call;
  facts and metadata cover it); the founder route (`founder-route.tsx`) untouched pending approval;
  "Prefer to write?" on /schedule was added as a low-risk link, flag if Ali wants it out.
- **Global:** 404 inline muted search field filtering palette entries in place; footer two-state locale
  toggle ("EN · العربية"); privacy "at a glance" table (data, purpose, kept for, shared with); terms
  three-step payment strip from the pricing tokens.
- **Writing:** remark-gfm so plain Markdown tables work; FAQPage JSON-LD from each article's questions
  (only if Google eligibility is worth it); a "Start here" reading path (audit, evaluating developers,
  MENA partner); an author page at `/about#founder`; a generated OG image per article; `updated` in
  RSS and sitemap `lastmod`, plus a visible changelog line.

## 9. Checks run

- JSON parity EN/AR: 0 diffs across all touched namespaces; no Arabic-Indic digits in AR files
  (one intentional example in `ar/multilingual-architecture.mdx`).
- `bun run validate`: no price literals outside the schema; parity report and billing-cycle checks pass.
- `eslint`: 0 problems.
- `tsc`: clean.
- `knip`: only the 2 pre-existing config hints.
- Crawl of every route plus 16 articles and 3 case studies, EN and AR: all 200, no `MISSING_MESSAGE`.
- `next build`: exit 0.
- Built pages: one h1 and one `<main>` each.
- Browser pass: AR and EN, light and dark, on home trust and FAQ, services terms, contact guide, about
  facts, pricing lists, and the 404.

## 10. Content audit — keep / edit / rebuild, CTA map, reading format (2026-10-05)

Audit only; nothing in the site was changed. Rubric: `CONTENT-AUDIT-BRIEF` (copied below as 10.0 reference). Per-page audits land here as they finish.

### 10.1 Measured per route (SSR HTML, chrome removed; EN, AR mirrors)

| route | words | h2 | h3 | strong | links to contact/schedule/estimator | paragraphs | paragraphs > 50 words |
|---|---|---|---|---|---|---|---|
| en/ | 2071 | 9 | 26 | 14 | 9 | 96 | 1 |
| en/services | 613 | 3 | 9 | 1 | 1 | 36 | 1 |
| en/services/interface-design | 1118 | 6 | 17 | 0 | 3 | 42 | 0 |
| en/services/development | 1242 | 8 | 16 | 1 | 4 | 60 | 0 |
| en/services/consulting | 1501 | 7 | 14 | 2 | 4 | 64 | 2 |
| en/services/maintenance | 1093 | 6 | 10 | 1 | 5 | 39 | 0 |
| en/work | 367 | 5 | 0 | 1 | 1 | 24 | 0 |
| en/work/art-lighting-store | 422 | 7 | 8 | 1 | 2 | 18 | 0 |
| en/about | 611 | 5 | 4 | 1 | 2 | 29 | 0 |
| en/process | 647 | 3 | 5 | 1 | 1 | 33 | 0 |
| en/how-we-work | 419 | 3 | 9 | 0 | 1 | 27 | 0 |
| en/approach | 627 | 6 | 3 | 7 | 1 | 39 | 0 |
| en/standards | 543 | 6 | 1 | 4 | 1 | 24 | 4 |
| en/faq | 2004 | 5 | 21 | 41 | 2 | 56 | 2 |
| en/pricing | 1504 | 6 | 24 | 8 | 0 | 71 | 0 |
| en/transparency | 925 | 2 | 14 | 7 | 1 | 29 | 0 |
| en/contact | 321 | 1 | 2 | 0 | 1 | 16 | 0 |
| en/schedule | 608 | 2 | 9 | 1 | 1 | 19 | 0 |
| en/writing | 604 | 9 | 0 | 1 | 1 | 16 | 2 |

Readings: /faq carries 41 bold marks (emphasis stops working); service pages carry 0–2 (nothing for the eye to land on); /pricing has no in-body link to contact or booking.

### 10.2 Conversion pages, global chrome, legal

#### Audit: conversion pages, global chrome, legal (audit only, no repo edits)

Scope: contact, schedule, nav, footer, commandPalette, exitIntent, auditLead, notFound, offline, a11y, validations, common (endCta), privacy, terms. EN + AR.
Key paths below are as found in `apps/www/messages/{en,ar}/<ns>.json`; where I name a nested key loosely, grep before editing. AR = MSA, Latin digits.
Source note: the web-fetch quota ran out before any URL could be opened. NN/g and Google claims below are from prior knowledge and are NOT cited as read (see Sources).

#### Cross-cutting findings (read first)
1. Reply promise "24 hours on business days" is unconfirmed and hard-coded in 10+ places (auditLead, common endCta x3, contactPage x2, commercial.cta, faq, exitIntent, privacy x2, how-we-work, serviceDetails x2, about; AR equivalents). "Business days" is ambiguous (Egypt vs Gulf weekends). `endCta.footnote` already exists, is unused (dead), and holds this sentence. Fix once: render the footnote in `SectionEndCta` (L3) and strip it from bodies.
2. Three funnels with inconsistent labels for one action. Call = "Schedule a consultation" (nav, footer, palette, commercial) / "Request a call" (exit-intent) / "Start a project" goes to /contact. Header primary = "Estimate your project" while page-end CTAs lead with "Start a project". For a studio with no track record the estimator (no contact details) is the lowest-risk first step: keep it the header primary, keep "Start a project" as the page-end primary. Ali to confirm.
3. "Transparency" is an insider label for the cost estimator (nav, footer, 404, palette). Page H1 is "Estimate what your project will cost".
4. AR terminology drift: how-we-work has 3 labels (طريقة عملنا / كيف نعمل / آلية العمل) while /process H1 area says "مراحل المشروع"; audit has 3 terms (فحص تقني / مراجعة تقنية / تدقيق تقني). Pick one each.
5. Server-returned form errors are English-only and shown in the AR UI (`lib/server/contact/handle-contact-submission.ts`, `app/api/schedule/route.ts`: "Invalid request origin", "Validation failed", "An unexpected error occurred. Please try again later.").
6. Privacy text conflicts with the forms: form says "We do not sell or share them" but privacy §5 lists six recipients; privacy §2 says the contact form collects budget, timeline and meeting time, which the form does not have.

#### Contact (`/contact`)
Reading pattern now -> right pattern: F-ish (muted long intro, then form, then guide BELOW the form) -> Z/layer-cake: short H1 + one-line promise, then form first, guide as short side/under list; AR mirrors from the right.
CTA map: form — Send an inquiry (submit) -> POST /api/contact [primary] ; Direct lines — Schedule a consultation (technicalCall) -> /schedule [secondary] ; Estimate your project (projectRange) -> /transparency [secondary] ; receipt — Send another inquiry [tertiary] ; gaps: none needed (conversion page, no end CTA); exit-intent still mounts here (see Exit-intent).

| # | section | job | verdict+level | problem |
|---|---|---|---|---|
| 1 | Hero H1 + intro (page-client) | say what to send and what happens | EDIT L1 | H1 is a metaphor with no keyword ("Bring the real problem — not the polished brief."); AR "المنمَّق" literary; intro long and muted |
| 2 | Letter form (sentence) | collect name, service, phone, message | EDIT L2 | labels only as aria-label (invisible), required not marked while privacy says forms mark them; "The problem" heavy; "sales inbox" insider x3; no email field |
| 3 | Direct lines aside | alternative channels | EDIT L1 | AR "خطوط مباشرة" is a calque; "Fastest reply" unsupported |
| 4 | Inquiry guide (inquiry-guide.tsx) | what to write / what happens next | EDIT L3 | rendered below the form, so read after writing; duplicates intro + receipt steps |
| 5 | Receipt (success) | confirm + next steps | KEEP | explicit, 3 steps, honest |
| 6 | Errors | tell how to fix | EDIT L1 | client errors good; server errors English-only; honeypot "Invalid form submission." is jargon |

##### Hero H1 + intro — EDIT (L1)
Why: NN/g first-words principle (not opened) says front-load information-carrying words; H1 carries none. Keep the dim clause as the negative half (emphasis rule §0).
- contactPage hero.title EN: "Tell us what you need built, fixed or rebuilt." | AR: "اكتب لنا ما تحتاج إلى بنائه أو إصلاحه أو إعادة بنائه."
- contactPage hero.intro EN: "Describe your project in a few sentences. A named person at Altruvex reads it and replies by phone, call or WhatsApp. You do not need a finished brief." | AR: "صف مشروعك في بضع جمل. يقرؤها شخص محدد في Altruvex ويردّ عليك بمكالمة أو واتساب. لا تحتاج إلى وثيقة متطلبات جاهزة."
- Title tag: replace en dash pattern -> "Contact a Web Design Agency | Altruvex" (pattern consistency; keep keyword).
Format: one `<strong>` on "named person ... replies" is NOT needed; no bold in hero. Max 2 lines.
##### Letter form — EDIT (L2)
Why: required fields unmarked contradicts privacy §2 after; "sales inbox" is insider.
- letter.assurance EN: "No obligation. No sales team." | AR: "دون أي التزام."  (drop the "inbox")
- letter.recipientNote EN: "Your message goes to the people who would build it." | AR: "تصل رسالتك مباشرة إلى من سيعمل على مشروعك."  (also replaces receipt.steps.read "no sales inbox"; reword to match; grep `sales inbox` in contactPage, endCta about)
- letter message label EN: "Your project" | AR: "مشروعك"  (was "The problem")
- Add visible required marker or a one-line "All fields except the service are required." (L2), and delete dead `letter.optional` (L0 cleanup).
- letter.privacy EN: "We use these details only to reply to this inquiry. See the Privacy Policy." | AR: "نستخدم هذه البيانات للرد على استفسارك فقط. راجع سياسة الخصوصية."  (removes "do not sell or share"; FLAG for counsel, see Needs Ali)
##### Direct lines — EDIT (L1)
- AR heading: "قنوات التواصل المباشر" (EN "Direct lines" stays). Remove "Fastest reply" unless Ali confirms it is true.
##### Inquiry guide — EDIT (L3)
Why: reader meets "what helps us reply" only after writing. Move `InquiryGuideSection` above or beside the form as a 3-bullet list (what to include / what we reply with / when), or fold bullets into the intro. Keep h2 text but front-load: EN "What to include in your message" | AR "ما الذي تكتبه في رسالتك". Keep "What happens next" in the receipt only; delete the duplicate steps from the guide.
##### Errors — EDIT (L1)
- Honeypot message EN: "Something went wrong with this form. Please reload the page and try again." | AR: "حدث خطأ في النموذج. أعد تحميل الصفحة وحاول مجددًا."
- Server errors: return error codes and map to `validations`/`contactPage` keys client-side so AR users get AR text (L2, code). Interim EN: "We could not send your inquiry. Check the fields marked in red, or message us on WhatsApp." | AR: "تعذّر إرسال استفسارك. تحقق من الحقول المعلّمة، أو راسلنا على واتساب."

#### Schedule (`/schedule`)
Reading pattern now -> right pattern: Z (sentence form, short facts) then layer-cake for the SEO sections -> correct as built; fix the vague H2.
CTA map: form — Request a call (submit) -> POST /api/schedule [primary] ; writeLead — Start a project (describeTheBuild) -> /contact [secondary] ; privacy link ; gaps: none (conversion page).

| # | section | job | verdict+level | problem |
|---|---|---|---|---|
| 1 | Hero H1 + subtitle | state the offer | KEEP (L0) | "A free 30-minute call about your project." explicit, keyword-aligned |
| 2 | Facts (Free / No commitment / hours) | reduce risk | EDIT L1 | hours "9:00 AM – 6:00 PM" but TIMES array runs 09:00–18:45; no timezone; slots use the visitor's browser timezone |
| 3 | Sentence form | pick date/time | EDIT L1 | title-case labels; dead `form.message` key ("Message (Optional)") with no field |
| 4 | Success state | confirm | EDIT L1 | no timeframe for the confirmation |
| 5 | SEO sections (guide) | explain the call | EDIT L1 | H2 "A consultation call with a clear purpose" is vague; call named 4 ways |
| 6 | FAQ | answer objections | KEEP | descriptive Qs, 5 items |

##### Facts — EDIT (L1)
- schedule.facts hours EN: "Cairo time, 9:00 AM – 6:00 PM" | AR: "بتوقيت القاهرة، من 9:00 صباحًا إلى 6:00 مساءً"  (needs Ali: real hours + whether slots convert; make TIMES match, or show the slot timezone beside the picker.)
- Labels sentence case: EN "Preferred date" / "Preferred time" | AR "التاريخ المفضل" / "الوقت المفضل".
- Delete dead `schedule.form.message` and `message: ""` payload (L0 cleanup).
##### Success — EDIT (L1)
- EN: "Request received. We will confirm the time by call or WhatsApp." -> keep, append timeframe only once the promise is confirmed (central footnote). AR current text kept.
##### SEO H2 — EDIT (L1)
- schedule guide H2 EN: "What happens on the 30-minute consultation call" | AR: "ما الذي يحدث في مكالمة الاستشارة (30 دقيقة)"
- Unify the name: "consultation call" everywhere on the page (replace discovery / technical call / "free 30-minute consultation call" variants).

#### Navigation (header + Index panel + mobile drawer)
Reading pattern now -> right: spotted (label scanning) -> correct; labels must match destination H1.
CTA map: header — Estimate your project (projectRange) -> /transparency [primary] ; Index panel — Schedule a consultation (technicalCall) -> /schedule [secondary], email ; Estimate again at panel bottom [primary]; mobile drawer repeats both; gaps: no "Start a project" in chrome.

| # | item | verdict+level | problem |
|---|---|---|---|
| 1 | Method -> /how-we-work, `nav.desc.method` "Five phases, from discovery to launch" | EDIT L1 | description describes /process, target is /how-we-work (H1 "The working rules...") |
| 2 | Pricing > Transparency | EDIT L1 | insider label; destination is the estimator |
| 3 | Work desc "Case studies from shipped builds" | EDIT L1 | weak, implies many |
| 4 | AR group/process labels | EDIT L1 | 3 synonyms for "how we work" |
| 5 | Others (Services, About, Contact, Pricing, FAQ, Standards, Approach) | KEEP | match H1s adequately |

##### Nav copy — EDIT (L1)
- nav.desc.method EN: "How a project runs: the rules we agree before you sign" | AR: "كيف يسير المشروع: القواعد التي نتفق عليها قبل التوقيع"  (or move description to the five phases and re-point; Ali's call)
- nav.transparency EN: "Cost estimator" | AR: "حاسبة التكلفة"  (same in footer, notFound popular list, palette; add palette keywords "calculator", "حاسبة")
- nav.desc.work EN: "Three live sites and the decisions behind each" | AR: "ثلاثة مواقع منشورة والقرارات وراء كل منها"
- AR nav `process` and footer `process`: "مراحل المشروع" (matches /process eyebrow and title "مراحل"); keep nav.method group "طريقة عملنا"; how-we-work AR link text "قواعد العمل" (matches H1 "قواعد العمل المتفق عليها قبل التوقيع" idea; Ali to approve exact H1 match).

#### Footer
Reading pattern: spotted columns -> correct.
CTA map: Call — Schedule a consultation (technicalCall) -> /schedule ; email ; WhatsApp ; gaps: none.
| # | part | verdict+level | problem |
|---|---|---|---|
| 1 | `description` | KEEP | explicit |
| 2 | `studioLine` "Web engineering studio · Cairo" | EDIT L1 | not the searched category |
| 3 | `closeLine` "Built to be owned. Every line of it." | EDIT L1 | slogan; ownership passes at final payment, so "built to be owned" is accurate but terse |
| 4 | Company column | EDIT L1 | Pricing + Transparency grouped under Company |
##### Footer — EDIT (L1)
- footer.studioLine EN: "Altruvex · Web design and development studio · Cairo" | AR: "Altruvex · استوديو تصميم وبرمجة مواقع · القاهرة"
- footer.closeLine EN: "You own the code once the final payment is made." | AR: "تنتقل ملكية الشيفرة إليك عند الدفعة الأخيرة."
- Move Pricing and the cost estimator into a "Pricing" or "Work with us" column (L1 order).

#### Command palette
Reading pattern: scan -> correct.
CTA map: Schedule (technicalCall), Estimate (projectRange), copy email ; gaps: no "Start a project" (describeTheBuild), no audit.
Verdict: EDIT (L2). Add actions "Start a project" -> /contact and "Start with a technical audit" -> /contact?service=consulting&package=audit (labels from `commercial.ctas.*`); rename Transparency page entry to "Cost estimator"; add keywords "calculator", "price", "حاسبة", "تكلفة".

#### Exit-intent modal
CTA map: Request a call -> POST /api/exit-intent [primary]. Mounted globally (`layout-effects.tsx`), no route exclusion.
Verdict: EDIT (L2).
Problems: title "Let's pressure-test your scope." is jargon; "Wait - before you go" is a stock phrase; every failure shows `phoneError` ("Please enter a valid phone number") including rate limit and network; shows on /contact and /schedule where the visitor is already converting; reply promise hard-coded.
- exitIntent.title EN: "Not ready to write a brief? Book a free 30-minute call." | AR: "لست جاهزًا لكتابة وصف مشروعك؟ احجز مكالمة مجانية لمدة 30 دقيقة."
- exitIntent.subtitle EN: "Before you leave" | AR: "قبل أن تغادر"
- exitIntent CTA EN: "Schedule a consultation" | AR: "احجز استشارة"  (matches registry label; drops "Request a call")
- New keys `errorNetwork` EN: "We could not reach the server. Check your connection and try again." | AR: "تعذّر الاتصال بالخادم. تحقق من اتصالك وحاول مرة أخرى."; `errorRateLimit` EN: "Too many attempts. Please try again in a few minutes." | AR: "محاولات كثيرة. حاول مجددًا بعد بضع دقائق." Use `phoneError` only for validation.
- Suppress on /contact and /schedule (code, L2).
- Success: replace the hard-coded promise with the central footnote text.

#### Audit lead (inline block, end of articles)
Reading pattern: Z (title, sentence, field, button). Verdict: KEEP (L0) copy: explicit, price-token driven, credit stated. Only fix: same single `phoneError` for all failures (reuse the new network/rate-limit keys above, L1).

#### 404 / offline / a11y
- 404: KEEP with one L1 edit: popular-links label "Transparency" -> "Cost estimator"; add Estimate link is optional. Needs status check (curl returned 200 with no h1 on a bad route; confirm real 404 code, and that the not-found `<title>` matches).
- Offline: KEEP (matches 1-day cache). a11y (`skipToContent` only): KEEP.

#### Validations
Verdict: EDIT (L1). Client messages say how to fix: keep. Delete or ignore stale keys for fields the UI does not have (budget, timeline, preferred-date, preferred-time on /contact); keep date/time keys for /schedule only. Add the server-error keys above so AR gets AR.

#### common.endCta (every page end CTA)
Reading pattern: Z (title, one line, two buttons) -> right.
CTA placement map (primary / secondary): Home describeTheBuild / technicalCall ; /services describeTheBuild / realBuild ; interface-design describeTheBuild / technicalCall ; development describeTheBuild / architecture ; consulting technicalAudit / technicalCall ; maintenance maintenanceEnquiry / maintenancePlans ; /process, /how-we-work, /approach describeTheBuild / viewTransparency ; /standards technicalAudit / realBuild ; /faq describeTheBuild / technicalCall ; /pricing projectRange / viewTransparency ; /transparency describeTheBuild / scopeProjects ; /work describeTheBuild / projectRange ; /work/[slug] describeTheBuild / technicalCall ; /about describeTheBuild / technicalCall ; /writing and /writing/[slug] projectRange / technicalAudit. None on contact, schedule, privacy, terms, 404, offline (right).
Competing primaries: /pricing, /writing lead with Estimate; others lead with Start a project. Acceptable if intentional (estimate on price/reading pages), record it as a rule in `commercial.ts`.
Verdict: EDIT (L1 copy, L3 footnote).
Problems: `titleAccent` renders gradient on "not an account manager." (about) and "this page missed." (faq): both are negative/loss phrases, which the emphasis rule §0 says must be dimmed italic (AR bold). Bodies are plain strings, no `<strong>`. Promise hard-coded.
- common.endCta.pages.about: restyle `titleAccent` as dim (`titleAccent="dim"` style in `SectionEndCta`, L3) or swap the sentence so the gradient phrase is the offer: title EN "Talk to the people / who will build it." | AR: "تحدّث مع من سيبني موقعك." (gradient = what the client gets).
- faq: EN title "Still have a question? / Ask it directly." | AR: "لا يزال لديك سؤال؟ / اطرحه مباشرة." (gradient on the invitation).
- endCta.footnote EN: "We reply within [confirmed time]." | AR: "نردّ خلال [المدة المؤكدة]."  (render in SectionEndCta; delete the sentence from every body and from commercial.cta.body.)
- Body bold: one `<strong>` per body on the next action only (e.g. "Start with a short brief" -> bold "short brief"); max 1.

#### Privacy (`/privacy`)
Reading pattern now -> right: layer-cake (summary, contents, numbered sections) -> correct.
CTA map: none (correct). Verdict: KEEP (format, L0). "In short" summary, contents list, bold lead-ins, paragraphs under 65 words (longest §4, 72 words). Headings descriptive.
Legal-review flags (do not rewrite): (a) §2 lists budget/timeline/meeting time collected by the contact form: form has none, so text overstates; (b) form line "do not sell or share" vs §5 recipients; (c) counsel has not reviewed.

#### Terms (`/terms`)
Reading pattern: layer-cake -> correct; payment section (210 words) already bulleted.
Verdict: KEEP, with optional EDIT (L3): add an "In short" summary like privacy: payment in three parts, code ownership at final payment, changes in writing. Copy proposal (token-driven, no literals): EN "In short: you pay in three parts, you own the code once the final payment is made, and any change to scope is agreed in writing first." | AR "باختصار: تدفع على ثلاث دفعات، وتنتقل إليك ملكية الشيفرة عند الدفعة الأخيرة، وأي تغيير في النطاق يُتفق عليه كتابةً أولًا."
Legal-review flags: staging licence "review only until final payment" vs the "code is yours" tone; "1.5% monthly interest" is a fixed literal inside terms; FAQ "day one" wording conflicts with ownership at final payment.

#### Needs Ali
1. Confirm the reply time ("24 hours") and define "business days" (Egypt Sun-Thu? Fri-Sat?). Everything below depends on it.
2. Confirm schedule hours and timezone, and whether slots are shown in Cairo time or the visitor's.
3. Add an email field to /contact? (Now phone/WhatsApp only; some Gulf/international buyers expect email.)
4. Which funnel is primary: estimate, contact, or call. Proposed: Estimate in the header, Start a project at page ends.
5. Exit-intent: suppress on /contact and /schedule (recommended)?
6. 404 status code: verify real 404 on a bad route.
7. Counsel review of privacy and terms; the form privacy line wording; "Fastest reply" claim.
8. AR terminology choices: "مراجعة تقنية" for audit; "مراحل المشروع" for process; "قواعد العمل" for how-we-work.
9. Hero H1 for /contact: new wording is a proposal; Ali picks.

#### Sources
Not opened (web-fetch session limit hit; named only as starting points, not relied on):
- https://www.nngroup.com/articles/first-2-words-a-signal-for-scanning/
- https://www.nngroup.com/articles/f-shaped-pattern-reading-web-content/
- https://developers.google.com/search/docs/fundamentals/creating-helpful-content
Repo sources read: `docs/section-heading-emphasis.md` §0-2, `docs/content-research-2026-10.md` §3.6-3.7, §4, `apps/www/components/layout/nav.tsx`, `components/interactive/{command-palette,exit-intent-modal}.tsx`, `components/sections/{audit-lead-capture,section-end-cta}.tsx`, `contact/page-client.tsx`, `contact/inquiry-guide.tsx`, `schedule/page-client.tsx`, `lib/config/commercial.ts`, messages EN/AR for the 15 namespaces; live dev server curl for titles and H1s.

### 10.3 Work, case studies, about

#### Content audit: Work + About (2026-10-05, audit only, no repo edits)

Read: `work/page-client.tsx`, `work/[slug]/page(.client).tsx`, `about/*.tsx`, `lib/data/case-studies.ts`,
`lib/data/testimonials.ts`, `lib/metadata.ts` (about/work/workCaseStudy), messages `work`, `caseStudies`, `about`,
`common.endCta.pages.{work,caseStudy,about}`, `commercial.ctas` (EN+AR). Live DOM curled from :3000 for all 5 routes x 2 locales
(200, no MISSING_MESSAGE). Heading treatment: SectionHeading `secondTitle` with no `accent` = dimmed italic (soft).

**Main finding.** The work pages are mostly honest. Two things break that, and both are easy to fix:
(1) case pages still show **unverified testimonials** ("Client perspective": Art Lighting and NewLight, each credited to a company with no person behind it);
(2) **the live-site link, the only real proof, sits at the bottom of the side column**.
/about fails "who is behind Altruvex". Its h1 is "Four commitments…", and the founder appears only in the last section, under an eyebrow that reads "Leadership".
That eyebrow suggests a team. The founder's name is 15px text, and the quote above it makes a superiority claim.

---

#### Work index (`/work`)
Reading pattern now → right pattern: spotted on 3 photo stages (eye jumps to white h2 on photo, then the link pair) → right for an index; the check list is layer-cake (ok).
CTA map: stages ×3 — "View case study" → /work/<slug> [secondary text] + "Visit <domain> ↗" → live site [secondary] ; Check — none ; End — "Start a project" (describeTheBuild) → /contact [primary], "Estimate your project" (projectRange) → /transparency [secondary] ; gaps: none needed (stage links are the right action mid-page; header carries the persistent CTA); ~5 screens hero→end CTA is acceptable because every screen ends in a link.

| # | section (component) | job | verdict + level | problem |
|---|---|---|---|---|
| 1 | Hero (`WorkIndexPage` h1 + description) | Say what is here and how many, honestly | EDIT L1 | Eyebrow "Selected work"/"أعمال مختارة" implies a larger pool; count never stated in h1; AR keyword "أعمالنا" missing from page text |
| 2 | Stages ×3 (`WorkStage`) | Name each build, link proof | EDIT L0 | `altruvex-site.client` "Internal / Altruvex" is insider; stage h2 "The site itself had to be the proof" is a slogan (5-sec fail, no keyword) |
| 3 | Check (`CheckSection`) | Let a sceptic verify | EDIT L1 | Heading is a stance, not a description (eyebrow carries the meaning); no caveat that client sites are now run by their owners; PSI check invites a result nobody has measured (Needs Ali) |
| 4 | End CTA (`WorkEndCta`) | Convert after proof | REBUILD L1 | "Every record above started as a scope and a conversation" is false for our own site; "whether it belongs on this list" reads as gatekeeping a portfolio we don't have; "record" metaphor; " - " hyphen-dash |
| 5 | Metadata `work` | Rank for portfolio intent | KEEP | Title EN "Web Design Portfolio: Websites & Online Stores", AR "أعمالنا: نماذج تصميم مواقع ومتاجر إلكترونية" match §4 intent; description honest |

##### 1 Hero — EDIT (L1)
- why: Ali wants it explicit. If the h1 says "three", nobody reads the page as a curated pool. NN/g "first 2 words": the count goes first.
- new copy:
  - `work.selectedWork` EN: "Our work" | AR: "أعمالنا"
  - `work.title` EN: "Websites and online stores we built," | AR: "مواقع ومتاجر إلكترونية بنيناها،"
  - `work.titleItalic` EN: "all three live." | AR: "والثلاثة تعمل الآن." (Gradient stays, since this is proof of a live thing. That is correct per §0.)
  - `work.description` EN: "This is the full list: two online stores for lighting retailers, and the site you are reading. <strong>Each one is public, so you can open it and test it</strong> instead of trusting screenshots. <dim>Each case study sets out the problem, what we built and the stack.</dim>"
    | AR: "هذه القائمة كاملة: متجران إلكترونيان لشركتي إضاءة، والموقع الذي تقرؤه. <strong>كلها متاحة للعامة، فيمكنك فتحها واختبارها</strong> بدل الاعتماد على لقطات الشاشة. <dim>كل دراسة حالة تعرض المشكلة، وما بنيناه، والتقنيات المستخدمة.</dim>"
- format: one strong (the verify action), dim on the meta line; 3 sentences, ~45 words, OK.
- check: `selectedWork` is also used once elsewhere (2 grep hits). Confirm the homepage doesn't want "Selected work" before you change the shared key.

##### 2 Stages — EDIT (L0)
- new copy:
  - `caseStudies.altruvex-site.client` EN: "Altruvex (our own site)" | AR: "Altruvex (موقعنا)". Mirror the same value in `case-studies.ts` `client`: the ts and json copies already drift (ts AR "داخلي / ألتروفيكس", ts industry "Web Engineering / Agency" vs json "Custom web development"; "Lighting & E-Commerce" casing). Make them identical.
  - `work.stages.altruvex-site.title` EN: "Our own site, in Arabic and English" | AR: "موقعنا نفسه، بالعربية والإنجليزية"
- KEEP: the NewLight and Art Lighting stage titles (concrete, front-loaded), the summaries and the scope lines.

##### 3 Check — EDIT (L1)
- why: the heading should say what the section holds (Google people-first: the heading describes the content). Recommending PageSpeed Insights on unmeasured client sites is a risk: Art Lighting has a known hreflang fault (research §7).
- new copy:
  - `work.check.title` EN: "Five checks you can run" | AR: "خمسة فحوص يمكنك إجراؤها"
  - `work.check.titleAccent` EN: "without asking us." | AR: "دون أن تسألنا." (Dimmed italic: how we work. OK.)
  - `work.check.description` EN: "Every build above is public. These checks take a few minutes and work on any studio’s portfolio, ours included. The two stores are run by their owners now, so what you see may include changes made after handover."
    | AR: "كل مشروع أعلاه متاح للعامة. هذه الفحوص تستغرق دقائق، وتصلح لمعرض أعمال أي استوديو، ومنه معرضنا. المتجران يديرهما أصحابهما الآن، فقد ترى تعديلات أُجريت بعد التسليم."
    (Keep the last sentence only if Ali confirms we no longer maintain them.)
  - items[3] keep only once Ali has run PSI on all three and is content with the mobile result; otherwise drop it (4 items).
- format: items are front-loaded imperatives, which is good. There are no bolds, and that is right.

##### 4 End CTA — REBUILD (L1)
- new copy (`common.endCta.pages.work`):
  - title EN: "Want yours built" | AR: "تريد أن نبني مشروعك"
  - titleAccent EN: "the same way?" | AR: "بالطريقة نفسها؟"
  - body EN: "Describe what you need. The engineer who scopes builds reads it and replies with whether it fits what we build, and what the next step is."
    | AR: "صف ما تحتاجه. يقرؤه المهندس الذي يحدد نطاق المشاريع، ويرد عليك: هل يناسب ما نبنيه، وما الخطوة التالية."
    (This matches `contactPage.receipt.steps`.)
  - nextLabel EN: "Your build" | AR: "مشروعك" (keep)
  - nextStatus EN: "Starts with a short description of what you need." | AR: "يبدأ بوصف قصير لما تحتاجه."
- format: no strong; the primary CTA stays `describeTheBuild`.

---

#### Case study (`/work/[slug]` ×3)
Reading pattern now → right pattern: layer-cake left column (h2 Client/Problem/Built/Decisions/Outcome) + spotted on the glance strip, whose huge accent type lands on low-information values ("Next.js", "Live") → right: layer-cake with the spot on the verifiable thing (the domain).
CTA map: aside — "Visit the live site" → external [secondary, last in aside, after tech stack]; services links → /services/<slug>; "Back to all work" → /work; End — "Start a project" (describeTheBuild) → /contact [primary], "Schedule a consultation" (technicalCall) → /schedule [secondary], next case link ; gaps: **no live-site link above the fold**. On mobile it falls after the whole body.

| # | section | job | verdict + level | problem |
|---|---|---|---|---|
| 1 | Header (h1 name, client line, summary) | Say what was built, for whom, where to see it | EDIT L3 | No live link up top; client line mono-uppercase "INTERNAL / ALTRUVEX" |
| 2 | Glance `dl` | 4 verifiable facts | EDIT L1 | Build/Languages/Platform/Status identical across 3 cases except Build; "Status: Live" wastes the biggest type |
| 3 | Client / Problem / What we built | Context | EDIT L0 | Art Lighting problem (old platform, several inventory systems) and NewLight "showroom" are unverified (§7); Art Lighting problem is 55 words in one paragraph |
| 4 | Decisions (h3 rows) | Show judgment | KEEP | Concrete, front-loaded, plain. The best copy on these pages |
| 5 | Outcome | What exists now | EDIT L0 | Art Lighting puts the only `<strong>` on its least verified claim ("without engineering support") |
| 6 | Aside: delivered / services / stack / live site | Inventory | EDIT L0 | Stack items for client builds ("PostgreSQL + Prisma", "Image optimization pipeline") can't be seen from outside (Needs Ali); AR "نظام تحسين الصور" OK |
| 7 | Aside: "Client perspective" (`testimonials.ts`) | — | REBUILD L3 (remove) | Unverified quotes attributed "NewLight · NewLight" / "Art Lighting · Art Lighting", no person; brief: no verifiable testimonials. Art Lighting quote has broken "experience-that" dash |
| 8 | End CTA (`caseStudy`) | Convert at the decision point | EDIT L0 | Fine; " - " should be an em dash |
| 9 | Metadata | Per-case rank | EDIT L0 | `workCaseStudy` fallback promises "commercial outcomes" / "النتائج التجارية" / "نتائج مشاريع Next.js"; `keywords` "digital transformation" is fluff |

##### 1 Header — EDIT (L3)
- structural: under the summary, render the existing `/work` stage link pair: "Visit <domain> ↗" (`work.labels.visitSite`) as a secondary link. The aside "Live site" block stays. It reuses existing markup.
- `caseStudies.altruvex-site.client` as in Work §2.

##### 2 Glance — EDIT (L1)
- `work.labels.glanceStatus` EN: "Live at" | AR: "يعمل على"
- `caseStudies.<slug>.glance.status` EN/AR: "artlighting-eg.com" / "newlight-eg.com" / "altruvex.com" (both locales, inside the existing `<bdi>`). The eye now lands on something a visitor can check.

##### 3 Context/Problem — EDIT (L0)
- `caseStudies.art-lighting-store.problem`: split into two sentences, the second in a new paragraph only if L3 is allowed. Otherwise trim it.
  EN: "Material and finish decide the sale, but the previous platform compressed images heavily and loaded slowly, so customers could not inspect finishes or scale. Inventory was also spread across several systems, with a standing risk of selling stock that was not there."
  AR: "التشطيب والخامة هما ما يحسم البيع، لكن المنصة السابقة كانت تضغط الصور بشدة وتُحمَّل ببطء، فلم يستطع العملاء فحص التشطيب أو الحجم. وكان المخزون موزعاً على عدة أنظمة، فبقي خطر بيع قطع غير متوفرة قائماً."
  This applies only if Ali confirms the old-platform facts. If he cannot, replace the text with what we saw: "The store had to show finish and scale closely enough to sell premium fixtures online, in Arabic and English." | AR: "كان على المتجر أن يُظهر التشطيب والحجم بوضوح يكفي لبيع إضاءة فاخرة عبر الإنترنت، بالعربية والإنجليزية."

##### 5 Outcome — EDIT (L0)
- `caseStudies.art-lighting-store.outcome` EN: "A live storefront in Arabic and English with <strong>product images you can zoom into</strong>, one inventory source, and a catalog the client team runs." | AR: "متجر يعمل بالعربية والإنجليزية فيه <strong>صور منتجات يمكنك تكبيرها</strong>، ومصدر واحد للمخزون، وكتالوج يديره فريق العميل."
  (The bold now marks a claim a visitor can check by zooming. "without engineering support" is dropped until confirmed.)
- KEEP: the altruvex-site and NewLight outcomes. Their bold is on a checkable thing (public estimator; team-run catalog).

##### 7 Client perspective — REBUILD (L3: remove the block)
- The quotes cannot be verified, and no person is named. They show as a `<blockquote>` on 2 of the 3 cases (and in home Trust, which belongs to another agent).
- Remove `testimonials.length > 0 &&` figure, or empty `TESTIMONIALS` until Ali supplies a named person + role + written consent. Also drop `work.labels.clientPersp` if unused.

##### 8 End CTA — EDIT (L0)
- `common.endCta.pages.caseStudy.body` EN: "Same process, same standards. Start with what you are building; the scope decides the rest." | AR: "المنهجية نفسها والمعايير نفسها. ابدأ بما تبنيه، والنطاق يحدد الباقي."

##### 9 Metadata — EDIT (L0)
- `metadata.ts workCaseStudy.en.description`: "Read an Altruvex case study: the client, the problem, the decisions and why, what was built and the live site." | `ar.description`: "اقرأ دراسة حالة من Altruvex: العميل، والمشكلة، والقرارات وأسبابها، وما بنيناه، والموقع المباشر."
- `workCaseStudy.ar.keywords[1]` "نتائج مشاريع Next.js" → "متجر إلكتروني Next.js"; `newlight keywords` drop "digital transformation"/"التحول الرقمي".

---

#### About (`/about`)
Reading pattern now → right pattern: Z hero (huge h1 left, 36ch description right) → layer-cake facts `dl` (good) → accordion (only row 01 open; rows 02-04 unread) → two-column fit → founder buried last → expected: layer-cake that answers **who / what / where / proof** in the first two screens.
CTA map: Facts — "Explore services" (exploreServices) → /services, "See the standards" → /standards, "See the process" → /process, "View pricing" (scopeProjects) → /pricing [all secondary text links] ; Founder — "LinkedIn" → external ; End — "Start a project" (describeTheBuild) → /contact [primary], "Schedule a consultation" (technicalCall) → /schedule [secondary] ; gaps: no link to /work anywhere on /about. The only proof isn't one click away.

| # | section (component) | job | verdict + level | problem |
|---|---|---|---|---|
| 1 | Hero (`AboutHero`, h1) | Who, what, where in 5 s | REBUILD L1 | h1 "Four commitments we hold ourselves to." says nothing about who or what; no keyword; bold is on name trivia ("altr-, as in altruism") |
| 2 | PhotoStage | Mood | KEEP (L4 note) | Caption fine. A founder photo here would do the trust work (L4, Needs Ali) |
| 3 | Studio facts (`studio-facts.tsx`) | Factual summary | EDIT L3 | Best section. Missing rows: **who runs it** and **what has shipped** (3 builds → /work) |
| 4 | Principles (`principle-index.tsx`) | Commitments + cost | EDIT L1 | h2 "What that commits us to": "that" dangles; "We argue you out of scope." / "The number does not move quietly." need inference; " - " dashes |
| 5 | Fit register (`fit-register.tsx`) | Self-qualify | EDIT L0 | "needs a system, not a brochure" contradicts terms/FAQ (we build contained websites); "A rebuild meant to lock you in" describes nobody's request (posture) |
| 6 | Founder route (`founder-route.tsx`) | Who is behind it | REBUILD L1 + move L3 | "Leadership" suggests a team; name only in a 15px route line; the quote ("others can copy the surface of, but not the standard") is a superiority claim with no proof; the section sits last |
| 7 | End CTA (`about`) | Convert | EDIT L0 | Repeats principle 01; ought to name the person you will talk to |
| 8 | Metadata `about` | Rank "about / web studio Cairo" | EDIT L0 | AR keywords lack "شركة تصميم مواقع في القاهرة" / "شركة برمجة في القاهرة" |

##### 1 Hero — REBUILD (L1)
- why: NN/g About-Us research (prior pass §3.6 sources) says visitors come to learn who the company is, what it does and who runs it. The current h1 is a values claim. It also carries no keyword, which the prior pass flagged in §8 as a positioning call. The `facts` section already proves the plain version works.
- new copy:
  - `about.eyebrow` EN: "About Altruvex" | AR: "عن Altruvex" (keep)
  - `about.title` EN: "A web design and development studio" | AR: "استوديو لتصميم وبرمجة المواقع"
  - `about.titleItalic` EN: "in Cairo, for Arabic and English." | AR: "في القاهرة، بالعربية والإنجليزية." (Dimmed italic, an identity claim. OK per §0; AR renders bold.)
  - `about.description` EN: "Altruvex designs and builds custom websites and web applications. <strong>It was founded and is led by Ali Abdelhadi</strong>, who leads the engineering. Three builds are live so far, and each one is public." | AR: "تصمم Altruvex وتبني مواقع وتطبيقات ويب مخصصة. <strong>أسسها ويقودها علي عبد الهادي</strong>، وهو من يقود العمل الهندسي. ثلاثة مشاريع تعمل حتى الآن، وكلها متاحة للعامة."
  - The name story moves to Facts (row `name`, below).
- format: one strong, on the person. 3 sentences, ~35 words: fits the 36ch column in about 6 lines.

##### 3 Studio facts — EDIT (L3: 3 rows added to `FACTS`, same component)
- `about.facts.items.who` term EN: "Who runs it" | AR: "من يديرها" ; value EN: "Ali Abdelhadi, founder and lead engineer. The engineer who scopes your build is the one you speak with through launch." | AR: "علي عبد الهادي، المؤسس والمهندس الرئيسي. المهندس الذي يحدد نطاق مشروعك هو من تتحدث معه حتى الإطلاق." (link: LinkedIn, existing `about.founder.linkedInLabel`). Place it 2nd.
- `about.facts.items.shipped` term EN: "What has shipped" | AR: "ما سُلِّم حتى الآن" ; value EN: "Three live builds: online stores for two lighting retailers, and this site. No client logos or testimonials yet, so every claim on this site points to something you can open." | AR: "ثلاثة مشاريع تعمل: متجران إلكترونيان لشركتي إضاءة، وهذا الموقع. لا شعارات عملاء ولا شهادات بعد، لذلك يشير كل ادعاء في هذا الموقع إلى شيء يمكنك فتحه." (link: `/work`, label new `about.facts.workLink` EN "See the work" | AR "اطّلع على الأعمال"). Place it 3rd.
- `about.facts.items.name` term EN: "The name" | AR: "الاسم" ; value EN: "altr-, as in altruism: when your interest and ours disagree, the decision follows yours." | AR: "altr-، كما في altruism أي الإيثار: حين تختلف مصلحتك عن مصلحتنا، يتبع القرار مصلحتك." Place it last.
- format: no bold inside the `dl`, because the terms do the scanning. Nine rows is the limit, so don't add a tenth.

##### 4 Principles — EDIT (L1)
- `about.principles.title` EN: "Four commitments," | AR: "أربعة التزامات،" + use `secondTitle` (`about.principles.titleItalic` new) EN: "and what each costs us." | AR: "وثمن كل منها علينا." (Dimmed italic. The old h1 idea survives here.)
- `items.scope.title` EN: "We advise cutting scope that won't pay back." | AR: "ننصحك بحذف ما لن يعيد تكلفته."
- `items.pricing.title` EN: "Price changes are agreed before work, never added after." | AR: "أي تغيير في السعر يُتفق عليه قبل العمل، لا يُضاف بعده." (Consistent with terms: written change order, "fixed in the proposal".)
- `items.scope.body` / `items.pricing.body`: replace " - " with " — " (EN) and with "، " (AR).
- KEEP: `direct`, `ownership` titles and all `cost` lines (concrete, honest).

##### 5 Fit — EDIT (L0)
- `about.fit.fitItems[0]` EN: "A business that needs its site to take orders, bookings or inquiries" | AR: "شركة تحتاج موقعاً يستقبل الطلبات أو الحجوزات أو الاستفسارات"
- `about.fit.notItems[2]` ("A rebuild meant to lock you in"): delete. That leaves 3 items, which is enough.

##### 6 Founder route — REBUILD (L1) + move above Fit (L3 reorder)
- why: "who is behind it" is the main trust question for a studio with no track record (Google helpful-content "Who" guidance; Quality Rater E-E-A-T, cited in prior pass §3.6). Right now it is answered last, as a quote.
- new copy:
  - `about.founderRoute.eyebrow` EN: "Who you will work with" | AR: "من ستعمل معه"
  - `from` / `to`: keep ("Founded by … in Cairo" / "أسسها … في القاهرة").
  - `quote` + `quoteItalic` → replace with a third-person statement. No founder "I", no superiority claim:
    EN: "Ali Abdelhadi founded Altruvex and leads the engineering." + italic "He scopes each build and stays on it through launch." | AR: "أسس علي عبد الهادي Altruvex ويقود العمل الهندسي." + "يحدد نطاق كل مشروع ويبقى معه حتى الإطلاق." (Needs Ali: true for every project?)
- structural: section order becomes Hero → Photo → Facts → **Founder** → Principles → Fit → End CTA. Fit then sits right before the CTA, which is the decision point. The h2 is currently the eyebrow text; the new eyebrow string works as that h2.
- L4 note: a founder photo + 2-line bio (education/prior work), only with Ali's approval.

##### 7 End CTA — EDIT (L0)
- `common.endCta.pages.about.title` EN: "Talk to the person" | AR: "تحدّث مع من"
- `titleAccent` EN: "who will build it." | AR: "سيبني مشروعك."
- `body` EN: "Describe what you need, or book a call. The first conversation is about your project and what it needs, not about us." | AR: "صف ما تحتاجه أو احجز مكالمة. المحادثة الأولى عن مشروعك وما يحتاجه، لا عنّا."

##### 8 Metadata — EDIT (L0)
- `metadata.ts about.ar.keywords`: add "شركة تصميم مواقع في القاهرة", "شركة برمجة مواقع في القاهرة"; `en.keywords`: add "web design studio cairo". Title + description: KEEP.

---

##### Typography sweep (L0, all three namespaces)
" - " used as a dash: `common.endCta.pages.work.nextStatus`, `caseStudy.body`, `about.body`, `about.principles.items.{scope,pricing}.body` (EN+AR). Replace with "—" (EN) or restructure (AR), matching `work.json`, which already uses "—". `testimonials.ts` "experience-that" is moot if the block is removed.

##### Dead keys (verify with knip before deleting)
`work.subtitle`, `work.labels.thisSite`, `work.labels.live` show no component hits in this scope. `work.labels.integrity` (trust-section), `work.allLive` / `work.sentence` (home work-section) belong to the home agent.

##### Needs Ali
- Testimonials: real people, roles and consent, or delete. Recommendation: delete from case pages now.
- Do we still maintain NewLight / Art Lighting? This decides the "run by their owners" caveat and whether we can fix Art Lighting's hreflang fault.
- Run PageSpeed Insights on all 3 live sites before /work tells visitors to do it (check item 04).
- Art Lighting: old-platform facts, "several inventory systems", "without engineering support", Postgres/Prisma + image pipeline in the stack. NewLight: "sold through a showroom", Postgres/Prisma. Years 2024/2025 (FAQ Q14).
- Founder: is Ali the engineer on every build (the facts row and the founder statement say so)? Is a photo and short bio allowed? What is the founding year?
- Is it OK to say "Three builds are live so far" / "No client logos or testimonials yet" in the about hero and facts? This is the explicit-honesty move the brief asks for, but it is a positioning call.
- Should `work.selectedWork` change site-wide (it is shared with home)?

##### Sources
- WebFetch hit the session limit this pass, so no URL was re-opened. The citations below come from the brief and from the prior pass (`docs/content-research-2026-10.md` §3.3, §3.6), and were not re-verified:
  nngroup.com/articles/about-us-information-on-websites ; nngroup.com/articles/first-2-words-a-signal-for-scanning/ ;
  nngroup.com/articles/f-shaped-pattern-reading-web-content/ ; nngroup.com/videos/ux-design-portfolio-case-study/ ;
  developers.google.com/search/docs/fundamentals/creating-helpful-content ; Google Search Quality Rater Guidelines (PDF).
- House: `docs/section-heading-emphasis.md` §0 (read); RUL-060 one emphasis per paragraph; RTL-071 AR bold not italic.
- Repo facts: `messages/en/terms.json` (change orders, services), `pricingModel.json` ("Fixed in the proposal"),
  `contactPage.receipt.steps`, `lib/metadata.ts:50` (founder), live curl of all 10 URLs on :3000.

### 10.4 Writing index and articles

#### Writing (`/writing`, `/writing/[slug]`, 16 MDX)
Audited from code + messages + MDX + live DOM (curl EN/AR, `/writing`, `/writing/why-not-wordpress`, `/ar/writing/technical-debt`). Audit only, no repo edits.
Reading pattern now -> right: index = list/layer-cake (right); article = Callout "Short answer" then layer-cake H2s (right); the article END = a stack of 5 competing blocks (wrong, see CTA map).

##### Headline findings
1. Article end stacks 5 asks in a row, two with the same "Next step" heading: MDX `## Next step` (2-3 links) -> AuditLeadCapture phone form (every article) -> template "Next step" eyebrow + 1 link (`ARTICLE_CTA_MAP`) -> next-article block -> Keep reading -> SectionEndCta (projectRange + technicalAudit). Verified in DOM order on technical-debt (two `Next step` headings, maintenance link twice).
2. All 16 bolds-per-article are list lead-ins (+ the "Short answer." label): 10-21 per article, zero on a key fact. The number/rule that matters (7,966 vulns, 96% plugins; "five business days"; "ownership at final payment") is never bold.
3. `/writing` H1 "Who builds it, and how it is built." fails the 5-second test ("it" = ?). Intro p2 puts a trust claim in `<dim>` and over-claims ("Every external fact links to its source").
4. Next-article title is an `<h2>` inside every article page (pollutes the heading outline: `/writing/why-not-wordpress` has an h2 "What Is Technical Debt?...").
5. Dates: 4 articles are dated 2024 (Aug-Nov) but Altruvex.com is 2025 per FAQ Q14 (unverified). Google people-first guidance warns against misleading dates (https://developers.google.com/search/docs/fundamentals/creating-helpful-content). Needs Ali.
6. No in-body CTA anywhere in 1,000-1,550 word articles (desert of 4-6 screens); only contextual links.
7. No client claims, no results, no prices found (grep). Good. All "we" sections point to public pages; "bilingual builds" plural = only Altruvex.com + NewLight are documented bilingual.

##### CTA map
Index: hero none (correct for an index) ; end band `SectionEndCta` "Reading is research. / Scoping is the next step." - projectRange -> /transparency [primary] + technicalAudit -> /contact?service=consulting&package=audit [secondary]. Gaps: none; one closing CTA, fine.
Article (render order): (a) Callout - none ; (b) MDX body - contextual links only ; (c) MDX `## Next step` - 2-3 inline links (pricing/transparency/services/schedule) ; (d) AuditLeadCapture - phone field "Request the audit" -> /api/exit-intent [primary-looking, all 8 articles] ; (e) template Next step - `ctas.<slug>` -> `ARTICLE_CTA_MAP` hard-coded href [secondary link] ; (f) next article + Keep reading [nav] ; (g) SectionEndCta projectRange/technicalAudit [primary+secondary]. Gaps: no CTA between top and end; four primaries after the last paragraph; the audit form is off-intent on 4 of 8 articles (mena, cairo, nextjs, multilingual) and asks for a phone number before any trust step.
`ARTICLE_CTA_MAP` today: why-not-wordpress /pricing ; technical-debt /services/maintenance ; evaluating-developers /services/consulting ; multilingual /services/development ; cairo /services/development ; nextjs /services/development ; audit /services/consulting ; mena /work. Three conflicts: (1) technical-audit article maps to /services/consulting, but its audit CTA key `technicalAudit` is /contact?...package=audit ; (2) technical-debt MDX next step leads with the audit, template link goes to maintenance ; (3) labels say "See what X includes" (informational) while the end band is transactional - two different jobs, one stack.

##### Template (`[slug]/page.tsx`, `article-reader.tsx`) - EDIT (L2, one L3 removal)
| part | problem | fix |
|---|---|---|
| Byline | OK: "Written by Ali Abdelhadi, Founder & Lead Engineer" -> /about, dated `<time>`. Meets Google "who". | KEEP (names pending, see Needs Ali) |
| Tag pills | non-link pills; clutter before the first paragraph; AR shows Latin tags (nextjs, hreflang) | remove from header or link to the filter (L1) |
| Excerpt + Callout | two summaries back to back (30 + 70 words) | KEEP: excerpt = SERP text, Callout = answer; do not add a third |
| Contents rail | sticky >=1100px, `<details>` below, active state, minutes left. Lists "Questions people ask" and "Next step" (8 identical entries across site) | KEEP; unique FAQ H2s (below) make the rail useful |
| Next-article block | `<h2>` of another article | change to `<p>`/`div` with same classes (L1) |
| End stack | see CTA map | target: ONE in-body soft CTA + ONE end CTA + end band. Remove the template "Next step" block + `ctas.*` keys + `ARTICLE_CTA_MAP` (clears the hard-coded href flag in content-research §7 by deletion, L3 removal) ; keep the topic-specific MDX `## Next step`; render AuditLeadCapture only on `technical-audit-before-rebuild`, `technical-debt`, `why-not-wordpress` (L2) |
If Ali prefers to keep the map, drive it from keys, not hrefs (`CommercialCtaKey` has no service-page keys; add `developmentService`, `consultingService`, `maintenanceService` or use action labels):
| slug | key | EN label | AR label |
|---|---|---|---|
| why-not-wordpress | scopeProjects (/pricing) | See what a custom build costs | اطّلع على تكلفة البناء المخصص |
| technical-debt | technicalAudit | Request a technical audit | اطلب مراجعة تقنية |
| evaluating-developers | technicalCall (/schedule) | Book a free 30-minute call | احجز مكالمة مجانية مدتها 30 دقيقة |
| multilingual-architecture | describeTheBuild (/contact) | Describe your bilingual project | صف مشروعك ثنائي اللغة |
| custom-web-development-cairo | projectRange (/transparency) | Get your project's price range | احصل على نطاق سعر مشروعك |
| nextjs-development-agency | technicalCall | Book a call with the engineer who would build it | احجز مكالمة مع المهندس الذي سيبني مشروعك |
| technical-audit-before-rebuild | technicalAudit | Request the technical audit | اطلب المراجعة التقنية |
| best-web-development-partner-mena | realBuild (/work) | See our live projects | شاهد مشاريعنا المنشورة |

##### Index table
| # | section | job | verdict | problem |
|---|---|---|---|---|
| 1 | Hero H1 + description | say what this library is, 5 s | EDIT L1 | H1 abstract; no keyword; `max-w-[14ch]` will force 3+ lines on a longer H1 |
| 2 | Intro p1/p2 | who it is for, what to trust | EDIT L1 | ~140 words of text before the first article (description + p1 + p2); p1 repeats the filter chips; trust claim dimmed; absolute claim; "honest next step" self-praise |
| 3 | Filters + list (`writing-index`) | route to one article | KEEP | h2 = descriptive titles, number + read time + date, "Start here" x2; excerpts hidden on desktop (display:none, hover peek) - titles carry it. Layer-cake right |
| 4 | End band | one closing CTA | KEEP | one primary + one secondary, labels transactional |

##### Index - EDIT (L1)
why: NN/g front-loading: heading's first words must carry the topic (https://www.nngroup.com/articles/first-2-words-a-signal-for-scanning/). "Dim" is for de-emphasis; a trust commitment should be Strong (RUL-060).
- `writing.hero.title` EN: "How to choose a web partner," | AR: "كيف تختار شريك تطوير موقعك،"
- `writing.hero.titleItalic` EN: "and how a website should be built." | AR: "وكيف يجب أن يُبنى الموقع."
- `writing.hero.description` EN: "Plain-language guides for teams planning a custom website or web app: how to choose who builds it, and the technical decisions that decide how it holds up." | AR: "أدلة بلغة واضحة لمن يخطط لموقع أو تطبيق ويب مخصص: كيف تختار من يبنيه، والقرارات التقنية التي تحدد مدى صموده مع الوقت."
- `writing.intro.paragraph1` EN: "<strong>Written for the person who makes the call</strong>: a founder, marketing lead or operations manager planning a custom website or web app, often without an engineer in the room." | AR: "<strong>مكتوبة لمن يتخذ القرار</strong>: مؤسس شركة أو مسؤول تسويق أو مدير عمليات يخطط لموقع أو تطبيق ويب مخصص، وغالباً دون مهندس معه."
- `writing.intro.paragraph2` EN: "Every statistic and legal rule we cite links to its source. <strong>No article quotes a price</strong>: prices live on the pricing page, worked out by the same rules as every quote we send. Each article ends with the questions people ask and one next step." | AR: "كل إحصاء أو قاعدة قانونية نذكرها مربوطة بمصدرها. <strong>ولا يذكر أي مقال سعراً</strong>: الأسعار في صفحة الأسعار، محسوبة بالقواعد نفسها التي نبني عليها كل عرض نرسله. وينتهي كل مقال بالأسئلة الشائعة وبخطوة تالية واحدة."
format: one Strong per paragraph, no Dim; heading emphasis: italic clause = how we think, within the §0 rule. Structural: widen H1 max-width to ~22ch (L1).

##### Per-article audit (EN + AR have 1:1 parity; same structure, native MSA)
Common reading-format result for all 8: Short answer inverted pyramid PASS (53-85 words, answers the title in sentence 1); H2 every 55-165 words PASS (multilingual up to 166, checklist 233 in audit = a list, fine); paragraphs >50 words: 1-4 per article (listed); generic H2 "Questions people ask" and "Next step" on all 8 FAIL (identical, not front-loaded); bold = lead-ins only (counts below, EN = AR). Title tag = title + " | Altruvex" (+11 chars): EN titles of 56-58 chars (multilingual, nextjs, debt) and 52 (audit) will truncate near 60 in SERP.
Rule for bolds across all 8: keep lead-ins only where the label is a short noun phrase (<=4 words) in a parallel list; remove where the lead-in is a full sentence; add exactly ONE bold fact/decision per article, in the body (not in a list). Heading rename for the FAQ H2 on every article (unique, keyword-bearing, quotable): see per-article.

###### 1 why-not-wordpress - EDIT (L1) 
intent: decision comparison; EN "wordpress vs custom website" / AR "ووردبريس أم موقع مخصص". Title KEEP (44). Intro KEEP (Callout answers it; disclosure paragraph is the best trust move on the site).
bold: 14 lead-ins +1 label. Long paras: 51/67/63/61 words (Patchstack paragraph, ownership, migration).
- H2 "Side by side" EN: "WordPress vs custom: cost, speed, security, ownership" | AR: "ووردبريس مقابل الموقع المخصص: التكلفة والسرعة والأمان والملكية"
- H2 "A quick self-check" EN: "Self-check: which side is your project on?" | AR: "اختبار سريع: في أي جانب يقع مشروعك؟"
- H2 "Questions people ask" EN: "WordPress vs custom website: common questions" | AR: "ووردبريس أم موقع مخصص: أسئلة شائعة"
- Claim fix: "a custom build usually costs less over the life of the system" -> EN "a custom build can cost less over the life of the system" | AR "تكون البرمجة المخصصة في بعض الحالات أقل تكلفة على مدى عمر النظام". Reason: unevidenced and self-serving; the FAQ answer already hedges.
- Bold the one fact: the Patchstack sentence "96% of them to plugins" (`**96%**` ... plugins).
- Split Patchstack paragraph into: figures sentence + "no fix available" sentence as a 2-item list.

###### 2 technical-debt - EDIT (L1)
intent: informational "what is technical debt" / AR "ما هو الدين التقني". Title 58 chars too long: EN "What Is Technical Debt? Causes, Costs and Fixes" (47) | AR KEEP. Intro KEEP.
bold: 21 lead-ins (highest; every list item bold = nothing stands out). Long paras: 64/58/91 (the 91-word one is "How we keep debt visible").
- H2 "Where the term comes from" EN: "What technical debt means, and where the term comes from" | AR: "ما معنى الدين التقني ومن أين جاء المصطلح"
- H2 "How we keep debt visible in our own builds" KEEP; turn the 91-word paragraph into 3 bullets (typing/documentation/structure; handover items; maintenance plan).
- H2 FAQ EN: "Technical debt: common questions" | AR: "الدين التقني: أسئلة شائعة"
- Remove bold on the 6 "What it looks like" lead-ins >4 words; keep the 5 numbered symptom lead-ins; bold the sentence "Only the prudent, deliberate kind is a real loan with known terms."
- CTA: MDX next step vs mapped link disagree (audit vs maintenance); see template. Show AuditLeadCapture here (on-intent).

###### 3 multilingual-architecture - EDIT (L2)
intent: informational how-to, mixed audience; EN "multilingual website architecture / hreflang arabic" / AR "موقع ثنائي اللغة عربي إنجليزي". Longest (1,560 w, 12 H2). Audience drift: index promises "without an engineer in the room" but body has CSS, Tailwind, Intl, `dir`, alef normalisation. 
- Title EN (56, truncates): "Arabic and English Website Architecture: URLs, hreflang, RTL" is 60 -> use "Bilingual Arabic-English Website Architecture" (45). AR current "كما ينبغي" is filler -> "بنية موقع ثنائي اللغة عربي وإنجليزي: دليل وقائمة تحقق".
- Intro: add 1 sentence under Callout for the reader: EN "Developer detail is marked 'For your developer'; the checklist at the end is the part to hand over." | AR "التفاصيل التقنية موسومة بعبارة «لمطوّرك»، وقائمة التحقق في النهاية هي ما تسلّمه لمن يبني موقعك." Mark with H3 prefix on sections 5-7 ("For your developer: ..."): L2.
- Order: move "Checklist" before "Doing this in Next.js" (L2 reorder) so the buyer-useful part sits earlier.
- H2 FAQ EN: "Bilingual website: common questions" | AR: "الموقع ثنائي اللغة: أسئلة شائعة"
- Long paras 54/74/63/55 (Do-not-redirect, Content, Next.js, hreflang tail): split each after the first claim.
- Claim check: "look at our work to see bilingual builds in both directions" - 2 documented bilingual projects; EN fix "to see two bilingual builds" | AR "لتطلع على مشروعين ثنائيي اللغة". Keep Arabic-Indic digit example (intentional, documented).

###### 4 evaluating-developers - EDIT (L2)
intent: commercial investigation "questions to ask before hiring a web developer" / AR "أسئلة قبل التعاقد مع مطور مواقع". Title KEEP (46). Intro KEEP. Strong article (lists, red flags, compare table).
Problem (company fit): it tells readers to ask "Can I speak to a client you worked with?" then "How we answer these questions" skips evidence of work and references. A new studio answers this honestly by stating what exists.
- Add to "How we answer these questions" (EN): "Evidence of work: three live projects on the [work page](/work) that you can open on your phone. We have no published client references yet, so ask us what you want to know about them directly." | AR: "الأدلة على العمل: ثلاثة مشاريع منشورة في [صفحة الأعمال](/work) تستطيع فتحها على هاتفك. ليست لدينا مراجع عملاء منشورة بعد، فاسألنا مباشرة عمّا تريد معرفته عنها." (Needs Ali: keep only if the testimonials in `lib/data/testimonials.ts` stay unpublished or are removed.)
- Convert the 77-word "How we answer" paragraph to a 5-item list (process / standards / FAQ topics / who writes code / ownership at final payment). Split the 80-word Agency/freelancer paragraph into 2.
- H2 FAQ EN: "Hiring a web developer: common questions" | AR: "التعاقد مع مطور مواقع: أسئلة شائعة"
- Bold: keep 12 lead-ins (short labels, parallel); add bold on "**Send every candidate the same questions in writing**" in the Callout instead of nothing.
- CTA: end = book a call (technicalCall), no audit form (off-intent).

###### 5 best-web-development-partner-mena - EDIT (L1)
intent: commercial investigation, competitive head term; EN "choose web development company MENA/Egypt" / AR "كيف تختار شركة برمجة مواقع". Featured "Start here". Title KEEP (47); AR title (58) KEEP.
- Callout: one 61-word sentence. EN: "Decide first what kind of partner the work needs (freelancer, studio or agency, or in-house). Then judge each candidate on seven things that matter in this region, and ask all of them the same questions." | AR: "حدّد أولاً نوع الشريك الذي يحتاجه المشروع (مستقل، أو استوديو أو شركة، أو فريق داخلي). ثم قيّم كل مرشح بسبعة معايير تهم في منطقتنا، واطرح على الجميع الأسئلة نفسها." (the seven criteria are the H3s directly below).
- H2 "Seven criteria that matter in this region" EN: "Seven criteria for choosing a web development company in MENA" | AR: "سبعة معايير لاختيار شركة برمجة مواقع في منطقتنا"
- H2 FAQ EN: "Choosing a web development company: common questions" | AR: "اختيار شركة برمجة مواقع: أسئلة شائعة"
- Bold: 10 lead-ins OK (3 country labels + 7 steps); add bold on "you are renting your own website" in criterion 4.
- Long paras 68/56/52 (the "Where we fit" paragraphs, criterion 1 AR): split. "Where we fit" disclosure KEEP.
- CTA: end = See live projects (realBuild); fits (proof before ask).

###### 6 custom-web-development-cairo - EDIT (L1)
intent: local commercial; EN "custom web development Cairo / web development company Egypt" / AR "شركة برمجة مواقع في القاهرة". Title KEEP (47) both.
- Intro (first paragraph under Callout) does not say who is writing. Add EN: "Altruvex is a web studio in Cairo; this guide explains what custom development should include, whoever you hire." | AR: "Altruvex استوديو ويب في القاهرة، وهذا الدليل يشرح ما ينبغي أن يشمله التطوير المخصص، أياً كانت الجهة التي تتعاقد معها." (local-SEO + people-first "who").
- H2 "What drives the cost" EN: "What drives the cost of a custom website in Egypt" | AR: "ما الذي يحدد تكلفة موقع مخصص في مصر؟"
- H2 "What you should receive at handover" KEEP.
- H2 FAQ EN: "Custom web development in Cairo: common questions" | AR: "برمجة المواقع المخصصة في القاهرة: أسئلة شائعة"
- Bold: 15 lead-ins; the 5 "worth it" bullets are sentences-as-lead-ins (OK); bold "**ownership of the code passes to you at final payment**" (the one fact; currently plain). Length 989 w fine. Only long para 52.
- CTA: end = price range (projectRange). Not audit form.

###### 7 nextjs-development-agency - EDIT (L2)
intent: commercial, technical buyer; EN "next.js development agency" / AR "شركة تطوير Next.js". Audience mismatch with index reader (non-technical); keep, it targets a real commercial query. Title 57 -> EN "Next.js Development Agency: When to Hire One" (44) | AR KEEP.
- Callout 85 words. EN: "Next.js suits sites and apps that need fast, search-friendly pages and application features in one codebase. Hire a studio when the work spans architecture, design, development and launch; a freelancer can be enough for a narrow task. Ask how they choose a rendering strategy, who owns the hosting account, and how they handle upgrades." | AR: "يناسب Next.js المواقع والتطبيقات التي تحتاج إلى صفحات سريعة وصديقة لمحركات البحث وميزات تطبيق في كود واحد. اختر استوديو حين يمتد العمل عبر البنية والتصميم والتطوير والإطلاق، ويكفي المستقل للمهمة الضيقة. واسأل كيف يختارون طريقة عرض كل صفحة، ومن يملك حساب الاستضافة، وكيف يتعاملون مع التحديثات الكبرى."
- First paragraph under Callout is meta-commentary about the search term ('"Next.js agency" sounds like a narrow technical search...'). Replace EN: "If you are looking for a Next.js agency, you are usually deciding two things: whether Next.js is the right foundation, and who should build on it. This guide covers both." | AR: "إن كنت تبحث عن شركة تطوير Next.js فأنت في الغالب تقرر أمرين: هل Next.js هو الأساس المناسب، ومن يبني عليه. يتناول هذا الدليل الأمرين."
- H2 FAQ EN: "Next.js agency: common questions" | AR: "شركة تطوير Next.js: أسئلة شائعة"
- "How we work with Next.js" (75-word paragraph): make a 4-item list. Claim to verify: "Performance thresholds are checked on every deploy" (Needs Ali). "This site is one example" is the honest pattern - keep.
- Bold: 16 lead-ins in two long lists (8 numbered questions with full-sentence lead-ins >8 words): shorten lead-ins to the question's first clause or unbold; add one bold: "The account should be yours."
- CTA: end = book a call (technicalCall).

###### 8 technical-audit-before-rebuild - EDIT (L1), the model article
intent: informational + entry offer; EN "website audit before redesign" / AR "تدقيق تقني للموقع قبل إعادة التصميم". Featured. Title EN 52 -> "Website Audit Before a Redesign: What to Check" (46) | AR KEEP.
Facts checked: "five business days", "free 30-minute call", "fee credited" match serviceDetails/schedule/auditLead messages. Price referenced, not typed (good).
- H2 "Why audit before a rebuild" KEEP. "How our technical audit works" KEEP (front-loaded enough).
- H2 FAQ EN: "Website audit: common questions" | AR: "تدقيق الموقع: أسئلة شائعة"
- Checklist (233 w, 9 numbered items) = right format; lead-ins are verbs, good. Bold only the first 3 steps? No: keep as is; add bold on "**fixed-price, fixed-scope**" and "**five business days**" in "How our technical audit works" (the facts a buyer wants).
- Long paras 56/80: the "How our audit works" paragraph (80 w) -> list: scope (six areas) / time (five business days) / you receive (findings, roadmap, one-hour debrief) / credit (fee comes off the build price).
- CTA: only article where AuditLeadCapture belongs; in-body soft CTA after the checklist: EN "Checked the list and found gaps? A fixed-scope audit does the rest in five business days." | AR "فحصت القائمة ووجدت ثغرات؟ المراجعة التقنية بنطاق محدد تُنجز الباقي في خمسة أيام عمل."

##### In-article CTA (new, all 8, L2)
One sentence after the highest-intent H2, as a plain link, not a button: why-not-wordpress after "Side by side" ; evaluating-developers after the Compare sheet ; mena after "A shortlisting process" ; cairo after "What drives the cost" ; nextjs after "Questions to ask" ; multilingual after "Checklist" ; debt after "How to measure it" ; audit after the checklist. Text pattern EN: "Want this applied to your project? [Describe it in the estimator](/transparency)." | AR: "تريد تطبيق هذا على مشروعك؟ [صِفه في المقدّر](/transparency)." (vary per article; target the same key as that article's end CTA).

##### Needs Ali
1. `date` field: 4 articles dated Aug-Nov 2024 (why-not-wordpress, technical-debt, multilingual, evaluating). Real publication dates? If not, set to real first-publish (Google: do not use misleading dates). All 16 `updated: 2026-10-04`.
2. Founder byline on all 16 + AR spelling "علي عبد الهادي" (already in content-research §7).
3. Reference/testimonial stance (affects the evaluating-developers "evidence of work" sentence).
4. Verify as true before they stay: "performance thresholds checked on every deploy" (nextjs, evaluating, standards link); "a written update every week" (cairo, process); warranty/reply times "answered in the FAQ" (evaluating).
5. Ownership timing: articles say final payment; FAQ "day one" conflict still open (memory: altruvex-skills-audit).
6. Template decision: delete the template Next-step block + `ARTICLE_CTA_MAP` (recommended) vs keep keyed (table above); and which 3 articles get AuditLeadCapture.
7. "bilingual builds" plural: confirm Art Lighting is or is not bilingual (case data does not say; its live hreflang fault noted in §7).
8. Audience: keep nextjs and multilingual (technical) in the index with the stated "no engineer in the room" reader, or add a third filter "For your developer"? (L3)
9. Index "Start here" marks two articles (MENA, audit): intended?

##### Sources
- https://www.nngroup.com/articles/first-2-words-a-signal-for-scanning/ (opened: front-load user- and action-oriented terms in links, headings, list items)
- https://developers.google.com/search/docs/fundamentals/creating-helpful-content (opened: who/how/why, bylines, no misleading date changes)
- NN/g F-shaped pattern (https://www.nngroup.com/articles/f-shaped-pattern-reading-web-content/) NOT opened (session limit); cited from the brief only, verify.
- Repo: apps/www/app/[locale]/(main)/(content)/writing/{page-client.tsx,writing-index.tsx,[slug]/page.tsx,[slug]/article-reader.tsx}, apps/www/messages/{en,ar}/writing.json, apps/www/messages/{en,ar}/auditLead.json, apps/www/lib/config/commercial.ts, apps/www/contents/articles/{en,ar}/*.mdx, docs/content-research-2026-10.md (§3.8, §4, §6, §7), docs/section-heading-emphasis.md §0.

### 10.5 Pricing and transparency (estimator)

#### Content audit — /pricing and /transparency (2026-10-05, audit only)

Read: `pricing/page.tsx`, `pricing/page-client.tsx`, `pricing-model/{pricing-spine,cost-split,service-investment-register,commercial-terms,section-head,type}`,
`transparency/{page,page-client}.tsx`, `transparency-estimator/{instrument,result-panel}`, `faq-section.tsx`, `lib/config/commercial.ts`;
messages en+ar `pricing`, `pricingModel`, `transparency`, `commercial`, `common.endCta.pages.transparency`. Live DOM: curl localhost:3000 (en + ar).
No price typed below; figures stay tokens. Payment split, ownership at final payment, audit credit, annual billing untouched.

#### Pricing (`/pricing`)
Reading pattern now → right pattern: layer-cake with spotted figures (healthy), but the answer a buyer came for (the 12-cell price
table) is collapsed inside `<details>` in section 03, after two explainer sections → should be spotted-first: price table in view by screen 2.
CTA map: Hero — "Estimate your project" (projectRange) → /transparency [primary] ; §01–§05 — none (only in-page "Plans in Service
investment" → #investment and "See all 12 published ranges" toggle) ; FAQ — "All questions" → /faq [link] ; End — "Estimate your project"
(projectRange) → /transparency [primary] + "View transparency" (viewTransparency) → /transparency#how-estimates-are-calculated [secondary].
gaps: CTA desert hero → end (~10+ desktop screens at 9–15rem section padding, estimated); no "book a call" anywhere on the page (nav/footer only);
both end CTAs go to the same page; "View transparency" says nothing about what happens next.
Repetition: the floor ("From {floor}") is shown 5x (hero, stage 02, Scope driver, register, FAQ 05); "Every build starts here" 3x; ranges by
type, ranges by band and maintenance plans each appear twice (§02 and §03).

| # | section (component) | job | verdict + level | problem |
|---|---|---|---|---|
| 1 | Hero (`PricingHero`) | Say "website pricing, published" + where it starts + next step | REBUILD copy L1, emphasis L1, secondary CTA L3 | H1 slogan has no keyword (SEO) and needs inference; lead opens with "There are no packages." (repeats H1, wastes first 2 words); `italicWorld` on "not packages." breaks emphasis doc §0 (italicWorld = /services only; a "not" clause = dimmed italic) |
| 2 | 01 How pricing works (`PricingSpine`) | Show how a range becomes one binding figure | KEEP copy; move L3 | Clear, figures spotted; but it answers "how" before "how much". Move after prices/terms |
| 3 | 02 What determines cost (`CostSplit`) | Name what moves the price and what sits outside it | EDIT L1 + dedupe L3 | Lead is arithmetic ("four… two more… one"); "Settled in scope review" never says those items are priced in the proposal; duplicates §03 figures |
| 4 | 03 Service investment (`ServiceInvestmentRegister`) | The price list | EDIT L1 + open/move L3 | Title "investment" is posture, not the searched word; matrix hidden behind a toggle; no CTA after the prices |
| 5 | 04 Commercial terms (`CommercialTerms`) | How you pay, what's included, what's extra, what you own | EDIT L1 + split/move L3 | Payment shares = good spotted pattern. Ownership (strongest commitment) sits 5th in a 6-row grid at equal weight; Included / Billed separately (core buyer question) buried at the end of §04; AR "سعر المراجعة" collides with "المراجعة التقنية" |
| 6 | Pricing FAQ (`FaqSection pricing.faq`) | Answer cost objections; rank for "how much does a website cost" | EDIT L1 | H2 is a generic sentence; Q01 asks "how is the price set" instead of the searched "how much"; Q05 jargon "product-level investment" |
| 7 | End CTA (`SectionEndCta`) | One decision: estimate, or talk | EDIT L1 (+ key swap L2) | Secondary duplicates primary's destination; no call option |
| 8 | AR terminology (all 3 namespaces) | — | EDIT L1 sweep | "النطاق" used bare 77x for scope, price range and domain (pricingModel 27, pricing 7, transparency 43) |

##### 1 Hero — REBUILD (L1; L3 for the secondary CTA)
- why: H1 must summarise the page (Google helpful-content: descriptive main heading); first 2 words carry scanning (NN/g first-2-words).
  research §4 keyword "website design cost / تكلفة تصميم موقع". "Published before any call" is the honest trust claim for a studio with no track record.
- new copy:
  - `pricingModel.hero.eyebrow` EN: "Published prices" | AR: "أسعار منشورة"
  - `pricingModel.hero.titleLead` EN: "Website and web app pricing," | AR: "أسعار تصميم وبرمجة المواقع،"
  - `pricingModel.hero.titleAccent` EN: "published before any call." | AR: "منشورة قبل أي مكالمة."
  - `pricingModel.hero.lead` EN: "Every range is on this page, by project type and complexity, with what a build includes, what is billed separately and how you pay. Your own estimate takes a few minutes; the written proposal fixes one figure." | AR: "كل النطاقات السعرية في هذه الصفحة، حسب نوع المشروع ودرجة تعقيده، مع ما يشمله المشروع وما يُحاسَب عليه منفصلاً وطريقة الدفع. تقديرك الخاص يستغرق دقائق، وعرض السعر المكتوب يثبّت رقماً واحداً."
  - `pricingModel.columns.moves.floorNote` (hero foot label above the floor figure, also under Scope driver) EN: "Any website or web app" | AR: "أي موقع أو تطبيق ويب"
- format: accent clause = Gradient (a price they can trust, §0) via `accent="world"`, not `italicWorld`. AR: same weight (RTL-071). Lead 2 sentences, no bold.
- structural: add secondary to the hero `CtaButtonGroup`: `technicalCall` ("Schedule a consultation" → /schedule) — L3. Hero index list re-ordered to match the new section order (L3).

##### 2–5 Section order — L3 (described)
New order: Hero → Prices by service (§03, matrix open, no toggle) → Included / Billed separately (lifted out of §04) → Payment and terms →
How pricing works (spine) → What changes the price (CostSplit, without its duplicated figure lists) → FAQ → End CTA.
Why: NN/g "show prices for common scenarios": early-stage buyers need a cost level fast to shortlist; the explainer is for the motivated (commitment) reader.
Add one text CTA after the price table: "Estimate your project" (projectRange) + "Schedule a consultation" (technicalCall) — closes the desert (L3, existing CtaButtonGroup).

##### 3 What determines cost — EDIT (L1; dedupe L3)
- `pricingModel.sections.cost.title` EN: "What changes the price" | AR: "ما الذي يغيّر السعر"
- `pricingModel.sections.cost.lead` EN: "Four answers move your estimate. Integrations and performance targets are checked with you and priced in the proposal. Maintenance is billed monthly or yearly, outside the build." | AR: "أربع إجابات تحرّك تقديرك. أما الربط مع الأنظمة الأخرى وأهداف الأداء فنراجعها معك ونسعّرها في عرض السعر. والصيانة تُحتسب شهرياً أو سنوياً، خارج سعر المشروع."
- `pricingModel.columns.review.lead` EN: "A form cannot judge these, so the estimator leaves them out. We check them with you, and the proposal prices them." | AR: "لا يستطيع نموذج إلكتروني تقديرها، لذلك لا تدخل في أداة التقدير. نراجعها معك، ويسعّرها عرض السعر."
- format: `.line` items already front-loaded; no bold needed. dedupe (L3): drop the per-type `Figures` under Scope and the plan prices under Ongoing operation (both shown in Prices by service); keep the band list as the worked example.

##### 4 Service investment — EDIT (L1; open + move L3)
- `pricingModel.sections.invest.title` EN: "Prices by service" | AR: "أسعار الخدمات" (unchanged)
- `pricingModel.sections.invest.lead` EN: "A published figure for every service. Build prices are ranges until the proposal fixes one figure." | AR: "رقم منشور لكل خدمة. أسعار المشاريع نطاقات سعرية حتى يثبّت عرض السعر رقماً واحداً."
- `pricingModel.register.development.more` (only if the toggle stays) EN: "Show all {count} prices by type and complexity" | AR: "اعرض الأسعار كلها ({count}) حسب النوع ودرجة التعقيد"
- format: the matrix is the spotted target; the worked cell is already brand-tinted (keep). Audit credit line is explicit — keep.

##### 5 Commercial terms — EDIT (L1; order L2; split L3)
- `pricingModel.sections.terms.title` EN: "Payment and terms" | AR: "الدفع والشروط"
- `pricingModel.sections.terms.lead` EN: "How you pay, what the warranty covers and when the code becomes yours. The same terms apply to every project." | AR: "كيف تدفع، وما يغطيه الضمان، ومتى يصبح الكود ملكك. الشروط نفسها تنطبق على كل مشروع."
- `pricingModel.terms.separate.title` AR: "يُحاسَب عليه منفصلاً" (replaces "يُفوتر بشكل منفصل")
- `pricingModel.terms.separate.items[1]` AR: "الدومين والاستضافة والبريد المؤسسي، كلٌّ في بند مستقل"
- order (L2): rows → Ownership, Warranty, Proposal validity, VAT, Revisions, Currency (commitments first). Ownership value is schema copy (`schedule.ownership`) — unchanged.
- schema copy (not a price; `packages/pricing-schema` copy): `terms.revisionLabel` EN "Revision rate" → "Revisions"; AR "سعر المراجعة" → "التعديلات" (avoids clash with "المراجعة التقنية" / "مراجعة النطاق"). Needs Ali (schema file).

##### 6 Pricing FAQ — EDIT (L1)
- why: FAQ H2 and Q01 are the natural slot for the "how much does a website cost / كم تكلفة تصميم موقع" query (research §4); AI answers quote Q+first sentence.
- `pricing.faq.subtitle` (renders as H2) EN: "Questions about website and web app cost" | AR: "أسئلة عن تكلفة تصميم المواقع وتطبيقات الويب"
- `pricing.faq.questions.01.q` EN: "How much does a website or web app cost?" | AR: "كم تكلفة تصميم موقع أو تطبيق ويب؟"
- `pricing.faq.questions.01.a` EN: "<strong>A contained website costs {essentialRange}</strong>; larger websites, web apps and stores sit in higher published ranges. <span class=\"text-foreground/60\">Scope and complexity set the range; content, brand readiness and timeline adjust it. Integrations and performance targets are confirmed with you in scope review, and the proposal fixes one figure.</span>" | AR: "<strong>تكلفة تصميم موقع بدرجة تعقيد «محدود» {essentialRange}</strong>، والمواقع الأكبر وتطبيقات الويب والمتاجر لها نطاقات سعرية منشورة أعلى. <span class=\"text-foreground/60\">نطاق العمل ودرجة التعقيد يحددان النطاق السعري، وجاهزية المحتوى والهوية والجدول الزمني تعدّله. أما الربط مع الأنظمة الأخرى وأهداف الأداء فنؤكدها معك في مراجعة نطاق العمل، ثم يثبّت العرض رقماً واحداً.</span>"
  (`essentialRange` is already in `pricingTokens`; page and JSON-LD both fill via `fillPricingTokens` — no code change.)
- `pricing.faq.questions.05.a` EN: "<strong>Yes.</strong> Builds start from {minimumEngagement}, for companies that need custom work before they need a large system. <span class=\"text-foreground/60\">Larger systems can be built in phases, so the cost follows the stage of the business.</span>" | AR: "<strong>نعم.</strong> تبدأ المشاريع من {minimumEngagement}، للشركات التي تحتاج عملاً مخصصاً قبل أن تحتاج نظاماً كبيراً. <span class=\"text-foreground/60\">الأنظمة الأكبر يمكن بناؤها على مراحل، فتتبع التكلفة مرحلة نمو الشركة.</span>"
- `pricing.faq.questions.04.a` EN: "<strong>Yes.</strong> Sign-in, payments or dashboards can be added later as their own scoped change. <span class=\"text-foreground/60\">Each addition is priced from the same published ranges and agreed in writing before work starts.</span>" | AR: "<strong>نعم.</strong> يمكن إضافة تسجيل الدخول أو المدفوعات أو لوحات التحكم لاحقاً كتغيير له نطاق عمل خاص. <span class=\"text-foreground/60\">تُسعَّر كل إضافة من النطاقات السعرية المنشورة نفسها، ويُتفق عليها كتابياً قبل بدء العمل.</span>" (drops the unprovable "engineered to grow")
- format: one Strong per answer, first clause, then Dim — matches RUL-060. Keep 02, 03, 06, 07, 08 as written (08 is honest and good).

##### 7 End CTA — EDIT (L1 + L2 key swap)
- `pricingModel.close.title` EN: "Get your range, or talk it through." | AR: "اعرف نطاقك السعري، أو ناقشه معنا."
- `pricingModel.close.lead` EN: "The estimator gives an indicative range in a few minutes, with no contact details. A call is for when you'd rather describe the project out loud. Either way, the proposal is the only binding figure." | AR: "تعطيك أداة التقدير نطاقاً سعرياً استرشادياً خلال دقائق، دون بيانات تواصل. والمكالمة لمن يفضّل أن يشرح مشروعه بالحديث. وفي الحالتين، عرض السعر هو الرقم المُلزِم الوحيد."
- structural (L2): `secondary="viewTransparency"` → `secondary="technicalCall"`. Primary stays projectRange. No gradient needed (plain heading; §0).

##### 8 AR terminology — EDIT (L1 sweep, all keys in pricingModel / pricing / transparency)
- rule: price range = "النطاق السعري" (or "نطاقك السعري"); scope = "نطاق العمل"; scope review = "مراجعة نطاق العمل"; domain = "الدومين"; revisions = "التعديلات"; never bare "النطاق".
- examples: `pricingModel.hero.lead` covered above; `pricingModel.columns.moves.lead` AR: "هذه العوامل الأربعة تسعّرها أداة التقدير. يبدأ النطاق السعري واسعاً ويضيق مع كل إجابة."; `pricingModel.stages.estimate.does` AR: "جاهزية المحتوى والهوية والجدول الزمني تعدّل النطاق السعري. تقدير استرشادي، وليس عرض سعر."; `pricingModel.stages.proposal.does` AR: "مراجعة نطاق العمل تؤكد الربط مع الأنظمة الأخرى وأهداف الأداء، ثم رقم واحد مكتوب صالح لمدة {days} يوماً."
- the full sweep is mechanical (77 hits); do it key-by-key in one pass with an EN/AR parity check.

#### Transparency (`/transparency`)
Reading pattern now → right pattern: Z in the header (H1 → live range figure at end) then commitment (form) through Q1–Q4, then layer-cake (method,
FAQ) → right for a tool page; the live range is the spotted anchor and works.
CTA map: Header — "See how pricing works" → /pricing, "Payment and proposal terms" → /pricing#terms [links] ; Result panel (after 5 answers) —
"Request a formal proposal" (opens inline form) [primary] + "Schedule a consultation" (technicalCall) → /schedule + "How is this estimate calculated?"
→ #method + "Start over" [secondary] ; after submit — "Download PDF" [primary], "Schedule a consultation", "Talk on WhatsApp" ; FAQ aside —
"View pricing" (scopeProjects), "All questions" → /faq ; End — "Start a project" (describeTheBuild) → /contact [primary] + "View pricing" [secondary].
gaps: the end CTA sends a visitor who has a range to /contact, where the answers are lost — a competing second proposal path; the result panel already does it right.
Format inconsistency (code, L2): estimator shows "EGP 22,000 – 385,000" / "ج.م.‏", pricing shows "22,000 EGP" / "جنيه" — same price, two formats.

| # | section (component) | job | verdict + level | problem |
|---|---|---|---|---|
| 1 | Header (`TransparencyEstimator` pageHeading, `intro-chain`) | Say "website cost calculator, no contact needed" | EDIT L1 | EN H1 good; AR H1 "احسب تكلفة مشروعك" misses "موقع"; subtitle doesn't say "no contact details" (the strongest hook, only in FAQ 1) |
| 2 | Live range (`instrument`) | Show the published range and progress | EDIT L1 | "2 – 12 weeks · Up to 12 weeks with conditions" repeats the same ceiling and reads as a contradiction |
| 3 | Q1–Q3 The build / needs (`questions`) | Two answers set the range; ticks noted | KEEP | Explicit, front-loaded option titles; badge states ticks don't move the range (honest) |
| 4 | Q4 Project conditions | Brand / content / pace adjust | EDIT L1 | "What are you bringing to it?" is vague; pace hint bolds a truism, not the effect |
| 5 | Result panel (`result-panel`) | Range + one next step | KEEP | Right CTA hierarchy (proposal primary, call secondary, WhatsApp after submit). Brand "Starting fresh" promises logo design — see Needs Ali |
| 6 | Method #how-estimates-are-calculated (`TransparencyMeasuresDetailsSection`) | Show the arithmetic and exclusions | EDIT L1 (title only) | Good layer-cake (5 H3 + 4 bullets each); H2 lacks the noun people search |
| 7 | FAQ (`TransparencyFaqSection`) | Objections to the estimate | EDIT L1 | H2 = generic sentence; a2 opens unbolded |
| 8 | End CTA (`SectionEndCta`) | Turn a range into a proposal or a call | REBUILD L1 + L2 targets | Primary goes to /contact, bypassing the estimate request; secondary "View pricing" is a step back |

##### 1 Header — EDIT (L1)
- `transparency.title` EN: "Estimate what your website or web app will cost" | AR: "احسب تكلفة تصميم موقعك أو تطبيقك"
- `transparency.subtitle` EN: "A range from our published prices, on screen as you answer. No contact details needed. The binding figure comes later, in a written proposal." | AR: "نطاق سعري من أسعارنا المنشورة، يظهر على الشاشة أثناء إجابتك. لا نطلب بيانات تواصل. الرقم المُلزِم يأتي لاحقاً في عرض سعر مكتوب."
- format: three short sentences, plain (subtitle renders via `t()`, no marks). Plain H1 (label heading, §0).

##### 2 Live range — EDIT (L1)
- `transparency.live.deliveryCeiling` EN: "Never more than {weeks} weeks; larger builds ship in phases" | AR: "لا يتجاوز {weeks} أسبوعاً، والمشاريع الأكبر تُسلَّم على مراحل"
- `transparency.instrument.publishedNote` AR: "كل سعر منشور يقع داخل هذا النطاق السعري، وكل إجابة بالأسفل تضيّقه نحو مشروعك."

##### 4 Q4 Project conditions — EDIT (L1)
- `transparency.stages.conditionsTitle` EN: "What do you already have?" | AR: "ما الذي لديك بالفعل؟"
- `transparency.steps.timeline.hint` EN: "<strong>Urgent delivery costs more</strong>; <dim>a flexible timeline costs less</dim>." | AR: "<strong>التسليم العاجل يكلّف أكثر</strong>؛ <dim>والجدول المرن يكلّف أقل</dim>."
- format: Strong on the price effect, the thing the buyer scans for (NN/g spotted).

##### 6 Method — EDIT (L1)
- `transparency.seo.title` EN: "How the website cost estimate is calculated" | AR: "كيف تُحسب تكلفة الموقع التقديرية"
- body/points KEEP (explicit; exclusions list matches /pricing).

##### 7 FAQ — EDIT (L1)
- `transparency.faq.subtitle` (H2) EN: "Questions about the cost estimate" | AR: "أسئلة عن تقدير التكلفة"
- `transparency.faq.a2` EN: "<strong>It is indicative, not a quotation.</strong> The range is read from the same published prices as the pricing page. <dim>The binding figure is set in a written proposal after we review the scope with you.</dim>" | AR: "<strong>هو تقدير استرشادي، وليس عرض سعر.</strong> النطاق السعري مأخوذ من الأسعار المنشورة نفسها في صفحة الأسعار. <dim>الرقم المُلزِم يُحدَّد في عرض مكتوب بعد أن نراجع نطاق العمل معك.</dim>"
- format: the answer to "how accurate" is the first clause, so it gets the Strong; one Strong per answer.

##### 8 End CTA — REBUILD (L1 copy; L2 targets)
- `common.endCta.pages.transparency.title` EN: "Have your range?" | AR: "حصلت على نطاقك السعري؟"
- `common.endCta.pages.transparency.titleAccent` EN: "Ask for the written proposal." | AR: "اطلب عرض السعر المكتوب."
- `common.endCta.pages.transparency.body` EN: "Request it from the result above: your answers are attached, and we reply within 24 hours on business days. Prefer to talk first? Book a call." | AR: "اطلبه من نتيجة التقدير أعلاه، فتُرفق إجاباتك بالطلب، ونرد خلال 24 ساعة في أيام العمل. تفضّل الحديث أولاً؟ احجز مكالمة."
- structural (L2): primary → `{ href: "#estimate-result-heading" (or top of estimator if not complete), label: transparency result "Request a formal proposal" }`; secondary → `technicalCall`. Accent clause = Gradient (invitation to act, §0).

#### Needs Ali
- Revisions label/value and VAT row live in `packages/pricing-schema` copy (`termsView`): OK to change "Revision rate" → "Revisions" / "التعديلات"?
- Interface design shows "Scoped per project" with no figure — is there a floor we may publish, or does design only sell with a build?
- Estimator "Starting fresh" says we build the logo, colours and typography inside the project: is brand identity (logo) a real deliverable?
- USD: currency row says international invoices are USD, but every figure is EGP and `usdNote` is unpublished — publish a USD view or say "USD at the rate on the invoice date"?
- Section reorder on /pricing (prices first, explainer later) and opening the matrix by default — approve L3.
- Currency formatter mismatch (estimator Intl vs `formatMoney`) — fix in code so both pages print the same string.
- Pricing FAQ Q01 quotes `{essentialRange}` (contained website) as the common scenario — confirm that is the case to lead with.

#### Sources
- https://www.nngroup.com/articles/show-prices-for-common-scenarios/ (sample prices for typical orders; simple table beats configurator for early research)
- https://www.nngroup.com/articles/text-scanning-patterns-eyetracking/ (spotted, layer-cake, commitment)
- https://www.nngroup.com/articles/first-2-words-a-signal-for-scanning/ (front-load headings, list items, links)
- https://developers.google.com/search/docs/fundamentals/creating-helpful-content (descriptive main heading; answer the searcher's question)
- House: `docs/section-heading-emphasis.md` §0 (italicWorld = /services only), RUL-060 (one Strong/Dim per paragraph), RTL-071/073, `docs/content-research-2026-10.md` §3.5, §4, §7, §8.

### 10.6 Consulting and maintenance

#### Content audit: /services/consulting + /services/maintenance (2026-10-05, audit only)

Read: both `page.tsx` + `page-client.tsx`, `consulting-audit/*`, `service-maintenance/*`, `services-index/service-brief.tsx`, `service-section.tsx`, `technical-section.tsx`, `section-end-cta.tsx`, `section-heading.tsx`; `serviceDetails.{consulting,maintenance}`, `common.endCta.pages.maintenance`, `commercial.ctas`; pricing copy `packages/pricing-schema/src/copy/{en,ar}.ts` (consulting + maintenance), `consulting.ts`, `maintenance.ts`, `views.ts` (`pricingTokens`). Live DOM: localhost:3000 EN + AR, both routes.
Schema facts used (not typed as prices): audit = `{auditPrice}`, `creditedToBuildRate: 1` (so `{auditCredit}` = `{auditPrice}` today), 5 business days; maintenance Essential 2 / Professional 4 requests a month, Enterprise quoted; annual = 10 paid months (`MAINTENANCE_ANNUAL_FREE_MONTHS` = 2); extra requests billed at `overageHourlyRate` **per hour**.

#### Consulting (`/services/consulting`)
Reading pattern now → right pattern: Z hero → spotted chart → 6-row layer-cake ledger → spotted price; the offer (price, what you get, credit) only arrives on screen ~6 → layer-cake with the offer on screen 2 or straight after the ledger.
CTA map: Hero — "Start with the audit" (pricing `ctaLabel`) → `#audit-offer` anchor [primary, label promises a start but scrolls]; "Schedule a consultation" (technicalCall) → /schedule [secondary] ; Curve — none ; Channels — none ; Offer — "Start with the audit" → /contact?service=consulting&package=audit (technicalAudit href) [primary] ; Fit/Steps/FAQ — none ; Close — "Start with a technical audit" (technicalAudit) [primary] + "Schedule a consultation" (technicalCall) [secondary]. Gaps: hero → offer ≈ 5 screens with no real action (curve + 6 rows); two labels for one action ("Start with the audit" / "Start with a technical audit"; AR "ابدأ بالمراجعة" / "ابدأ بفحص تقني").

| # | section (component) | job | verdict + level | problem |
|---|---|---|---|---|
| 1 | Hero (`AuditHero`) | say: fixed-price audit of an existing site, what comes back, how long, fee credited | REBUILD L2 | H1 "Your system is already telling you what is wrong." is a slogan, no keyword ("website technical audit" / "مراجعة تقنية للموقع" only in eyebrow + meta); bad news painted in world gradient (emphasis §0 test 1); hero never says 5 days or the credit; primary CTA is an anchor labelled as a start |
| 2 | Cost curve (`CostCurve`) | argue "check before you build" | EDIT L2 + move/cut L3 (Needs Ali) | metaphor heading "priced four times" (loss clause coloured); insider words in note ("pricing schema", "matrix"); "nothing if you build it with us" / `netValue` "Nothing" are only true while `creditedToBuildRate` = 1 (hard-coded claim); duplicates the offer's price |
| 3 | Six questions (`ScanChannels`) | show exactly what the audit examines and returns | EDIT L1 | strong idiom (h3 questions = layer-cake + AI-quotable); jargon an SMB owner won't parse ("Integration topology", "Environment parity", "Payload weight", "Key-person dependency", "طوبولوجيا التكاملات"); "ship without holding its breath" idiom; abstract description |
| 4 | Offer (`AuditOffer`) | price, credit fork, deliverables, CTA | EDIT L1 + reorder L2 | h2 "Technical Audit - Fixed Scope, Fixed Price." (hyphen as dash, title case); "engagement" insider; deliverables list (5) ≠ the six channels above (search, delivery, ownership missing); AR copy differs between pricing copy ("تعاون أول") and messages ("ارتباط أول") |
| 5 | Fit (`ServiceFit`) | who should / should not buy | KEEP | explicit for / not-for, honest exclusions (no pentest certificate) |
| 6 | Steps (`ServiceSteps`) | how 5 days run, client's part | KEEP | clear, `{auditCredit}` from schema; AR eyebrow digit style only (#9) |
| 7 | FAQ (`ServiceFaqSection`) | answer pre-purchase objections, FAQPage JSON-LD | EDIT L1 | title has no keyword; "Most focused audits take five business days" hedges the fixed window stated 4 times elsewhere; no "how much" question though `{auditPrice}` token exists |
| 8 | Close (`SectionEndCta`) | final action | EDIT L1 | "Ask the question before the build answers it." needs inference; body is good |
| 9 | Eyebrow numbering | — | EDIT L0 | EN "01 —"…"05 —", AR "1 —"…"5 —" |

##### 1 Hero — REBUILD (L2)
- why: Google asks whether "the main heading … provide[s] a descriptive, helpful summary" (people-first content); NN/g first-2-words: front-load the offer. Emphasis §0: clause = what the client gets → world italic is right only for an outcome, not "what is wrong".
- new copy:
  - `serviceDetails.consulting.audit.hero.eyebrow` EN: "Technical consulting" | AR: "استشارات تقنية"
  - `….hero.title` EN: "Website technical audit:" | AR: "مراجعة تقنية لموقعك:"
  - `….hero.titleAccent` EN: "written findings in five business days." | AR: "نتائج مكتوبة خلال 5 أيام عمل."
  - `….hero.description` EN: "<strong>One fixed fee, taken off the build price if you build with us.</strong> We examine your existing website or web app (architecture, speed, search, security, releases and ownership) and hand you ranked findings and a roadmap any developer can follow." | AR: "<strong>مبلغ ثابت يُخصم من سعر البناء إن بنيت معنا.</strong> نفحص موقعك أو تطبيق الويب القائم (المعمار والسرعة والظهور في البحث والأمان والإصدارات والملكية) ونسلّمك نتائج مرتبة حسب الخطورة وخارطة طريق يستطيع أي مطوّر تنفيذها."
  - delete unused `….hero.subtitle` (not rendered; "for engineering teams" contradicts the SMB buyer).
- format: one `<strong>` = the credit (the risk reversal); prose, 2 sentences, ≤ 45 words.
- structural (L2): hero primary → `getCommercialCta("technicalAudit").href` with `tCTAs("technicalAudit")`, not `#audit-offer`.

##### 2 Cost curve — EDIT (L2), placement L3 → Needs Ali
- why: metaphor needs inference; a loss clause must not be coloured (§0 test 1); internal vocabulary leaks into a public note.
- new copy:
  - `….curve.eyebrow` EN: "Why audit first" | AR: "لماذا المراجعة أولاً"
  - `….curve.title` EN: "Check the decision" | AR: "راجع القرار"
  - `….curve.titleAccent` EN: "before you pay to build it." | AR: "قبل أن تدفع لبنائه."
  - `….curve.description` EN: "Changing a decision is cheap while it is on paper and expensive once the site is live. The audit is one fixed fee, paid once, before you commit to a build." | AR: "تغيير القرار رخيص وهو على الورق، ومكلف بعد أن يصبح الموقع منشوراً. المراجعة مبلغ ثابت يُدفع مرة واحدة، قبل أن تلتزم بأي بناء."
  - `….curve.honesty` EN: "Only the fee, the five-day window and the build range are real figures; they come from our published prices. The curve has no numbers on its vertical axis because we have not measured your system yet." | AR: "الأرقام الحقيقية هنا هي المبلغ ونافذة الأيام الخمسة ونطاق البناء فقط، وكلها من أسعارنا المنشورة. المنحنى بلا أرقام على محوره الرأسي لأننا لم نقس نظامك بعد."
  - `….curve.creditLabel` EN: "Credited to the build if you build with us" | AR: "يُخصم من البناء إن بنيت معنا"
  - `….curve.figureAlt` tail EN: "…and a dashed line shows the fee credited against the build if it goes ahead." | AR: "…وخط متقطع يوضح أن المبلغ يُخصم من البناء إن مضى."
- format: claim line stays the one large sentence (spotted on {price}/{range}).
- code note (L2): `figures.netValue` "Nothing" must render only when `creditAmountLabel === priceLabel`, else show the net.
- structural (L3): recommended order Hero → Channels → Offer → Steps → Fit → FAQ → Close, curve removed (its claim is now in hero + curve-less offer). Fallback if Ali keeps the device: place it directly after Offer.

##### 3 Six questions — EDIT (L1)
- `….channels.eyebrow` EN: "What the audit answers" | AR: "ما الذي تجيب عنه المراجعة" (number per final order)
- `….channels.description` EN: "Six areas, each with the question it answers, what we examine and what you receive in writing. The report is yours whether you build with us or not." | AR: "ستة محاور، لكل منها السؤال الذي يجيب عنه وما نفحصه وما تتسلمه مكتوباً. التقرير لك سواء بنيت معنا أم لا."
- `….items.delivery.name` EN: "Releases" | AR: "الإصدارات"; `.question` EN: "Can your team release updates safely?" | AR: "هل يستطيع فريقك نشر التحديثات بأمان؟"
- `….items.architecture.examines[3]` EN: "How it connects to other systems" | AR: "كيف يتصل بالأنظمة الأخرى"
- `….items.performance.examines[2]` EN: "Page weight and third-party scripts" | AR: "حجم الصفحات والنصوص البرمجية الخارجية"
- `….items.delivery.examines[1]` EN: "Whether test and live environments match" | AR: "تطابق بيئة الاختبار مع البيئة المنشورة"
- `….items.ownership.examines[3]` EN: "Whether one person holds the only knowledge" | AR: "هل تتركز المعرفة عند شخص واحد"
- format: keep h3 questions + returns list; `<strong>` none needed (labels already bold).

##### 4 Offer — EDIT (L1; pricing-schema copy, no price literal)
- `serviceDetails.consulting.audit.offer.forkEyebrow` EN: "Price and what you receive" | AR: "السعر وما تتسلمه"
- `….offer.description` EN: "Scope and fee are fixed before we start. You receive ranked findings, the evidence for each, and <strong>a roadmap ordered by what to fix first.</strong>" | AR: "النطاق والمبلغ ثابتان قبل أن نبدأ. تتسلم نتائج مرتبة حسب الخطورة، والدليل على كل منها، و<strong>خارطة طريق مرتبة حسب ما يُصلح أولاً.</strong>"
- `pricing-schema copy consulting["technical-audit"].title/titleItalic` EN: "Technical audit:" / "fixed scope, fixed price." | AR: "مراجعة تقنية:" / "نطاق ثابت وسعر ثابت."; `.description` = same as offer.description (both locales; AR replaces "تعاون أول محدد").
- `.deliverables` EN: ["Written findings in six areas, ranked by risk", "Rebuild-or-repair recommendation", "Speed measured on real devices", "Security review with a severity per item", "Roadmap ordered by what to fix first", "1-hour debrief call"] | AR: ["نتائج مكتوبة في ستة محاور مرتبة حسب الخطورة", "توصية بإعادة البناء أو الإصلاح", "قياس السرعة على أجهزة حقيقية", "مراجعة أمنية بدرجة خطورة لكل بند", "خارطة طريق مرتبة حسب ما يُصلح أولاً", "مكالمة مناقشة مدتها ساعة"]. Sets `deliverableCount` 5 → 6 (check admin use).
- `.ctaLabel` EN: "Start with a technical audit" | AR: "ابدأ بمراجعة تقنية"; and `commercial.ctas.technicalAudit` AR → "ابدأ بمراجعة تقنية" (one term: مراجعة, matches keyword).
- format: one `<strong>` on the roadmap; price block + two arms stay the spotted anchor.

##### 7 FAQ — EDIT (L1)
- `….seo.faq.title` EN: "Website technical audit questions" | AR: "أسئلة عن المراجعة التقنية للموقع"
- `….items[4].q` EN: "How long does the audit take?" | AR: "كم تستغرق المراجعة؟"; `.a` EN: "Five business days, counted from the day access and context arrive. A system with several codebases or integrations is scoped separately before we start." | AR: "خمسة أيام عمل، تُحسب من يوم وصول الصلاحيات والسياق. والنظام الذي يضم أكثر من قاعدة كود أو تكاملات كثيرة يُحدَّد نطاقه منفصلاً قبل أن نبدأ."
- new item (insert at [1]) q EN: "How much does a technical audit cost?" | AR: "كم تكلفة المراجعة التقنية؟"; a EN: "{auditPrice}, fixed before we start. If you go on to build with us, {auditCredit} comes off the project price." | AR: "{auditPrice}، مبلغ ثابت قبل أن نبدأ. وإن أكملت البناء معنا، يُخصم {auditCredit} من سعر المشروع."
- `items[2].a` lead: replace "can cover" with "covers" + list matched to the six areas (EN/AR) — the scope is fixed.

##### 8 Close — EDIT (L1)
- `serviceDetails.consulting.close.title` EN: "Send the site." | AR: "أرسل الموقع."
- `….close.titleAccent` EN: "Get written answers in five business days." | AR: "واحصل على إجابات مكتوبة خلال 5 أيام عمل."
- body KEEP. CTAs KEEP (technicalAudit primary, technicalCall secondary).

##### 9 Eyebrow digits — EDIT (L0)
- AR `curve/channels/offer/brief.fit/brief.steps.eyebrow`: "01 —" … "05 —" to match EN (renumber after any reorder).

#### Maintenance (`/services/maintenance`)
Reading pattern now → right pattern: Z hero → two-column month split (layer-cake) → comparison table (spotted on tokens/prices) → layer-cake fit/steps/FAQ → right; keep.
CTA map: Hero — "View maintenance plans" (maintenancePlans) → `#pricing` [primary] ; "Start a maintenance plan" (maintenanceEnquiry) → /contact?service=maintenance [secondary] ; Month split — none ; Plans — "Start with Essential/Professional/Enterprise" → /contact?service=maintenance&plan=…&billing=… [primary per column, Professional highlighted, billing follows toggle] ; Fit/Steps/FAQ — none ; Close — "Start a maintenance plan" [primary] + "View maintenance plans" → same page `#pricing` [secondary, self-link]. Gaps: none > ~3 screens; close secondary adds nothing.

| # | section (component) | job | verdict + level | problem |
|---|---|---|---|---|
| 1 | Hero (`MaintenanceHero` top) | what is maintained, for whom, how billed | EDIT L1 | H1 keyword good; description omits the main buyer fact "sites we did not build" (most buyers, since we have 3 shipped projects); "engineers who know the codebase" implies a team and is untrue on day 1 for an outside site |
| 2 | Example month (hero `month.*`) | show what happens without the client | EDIT L1 | clear and honest; "the only other thing we will ever ask" overclaims (access, approvals, invoices); "Each goes ahead of other work" vague |
| 3 | Plans table (`MaintenancePlans`) | compare plans, pick, act | EDIT L1 (+ pricing copy) | h2 "Scope is counted in requests — never in hours." contradicts the overage row billed **per hour**; negative clause painted in `mint` gradient (§0 test 1, named alternate without a collision); no keyword in h2; Professional "Support" cell names incident priority, not a channel; outside-note "Optional Altruvex tools" implies a product line (memory: no product); "retainer" ≠ "plan"; AR "بالافتراضي" ungrammatical; AR uses "خطط" while searchers and meta use "باقات" |
| 4 | Fit (`ServiceFit`) | who should / should not buy | KEEP | explicit; covers sites we did not build and post-warranty |
| 5 | Steps (`ServiceSteps`) | how a plan starts | KEEP | "No plan is sold before we have seen the site" = honest risk reversal |
| 6 | FAQ (`ServiceFaqSection`) | objections + JSON-LD | EDIT L1 | annual answer says "some months are free" (number is in the schema); no direct "how much" question for "website maintenance cost / تكلفة صيانة موقع" |
| 7 | Close (`SectionEndCta`, `common.endCta.pages.maintenance`) | final action | EDIT L1 | title fine; body uses "-" as a dash; secondary CTA links to the same page |
| 8 | H1/H2 text nodes | — | technical L2 | `SectionHeading` with `secondTitleBreak` emits `<br>` with no space: DOM text reads "supportthat keeps…", "happenswithout", "requests —never" (crawlers/AI that use textContent). Fix: `{" "}` before the `<br>` |

##### 1 Hero — EDIT (L1)
- `serviceDetails.maintenance.description` EN: "<strong>Maintenance plans for live websites, whether we built them or not</strong>: monitoring, backups, security updates and a set number of edit requests each month, billed monthly or annually." | AR: "<strong>باقات صيانة للمواقع المنشورة، سواء بنيناها أم لا</strong>: مراقبة ونسخ احتياطي وتحديثات أمنية وعدد محدد من طلبات التعديل كل شهر، بفوترة شهرية أو سنوية."
- format: one `<strong>` on the scope sentence (who it covers); keep title/titleItalic.

##### 2 Example month — EDIT (L1)
- `….hero.month.yours.requestNote` EN: "Up to {n} a month: new text, a new image, a small edit. On this plan they are handled with priority." | AR: "حتى {n} في الشهر: نص جديد أو صورة أو تعديل صغير. وفي هذه الخطة تُنفَّذ بأولوية."
- `….hero.month.yours.quiet` EN: "The rest of the month there is nothing for you to remember. If you spot something wrong before we do, tell us." | AR: "باقي الشهر لا شيء عليك أن تتذكّره. وإن لاحظت خللاً قبلنا فأخبرنا."
- `….hero.month.ours.items.incident.what` AR: "يتقدّم على الأعمال المجدولة لدينا." (EN "front of our queue" ≠ AR "every other work").

##### 3 Plans — EDIT (L1; colour rule L1)
- `….pricing.eyebrow` EN: "Maintenance plans" (keep) | AR: "باقات صيانة المواقع"
- `….plans.title` EN: "Three plans," | AR: "ثلاث باقات،"
- `….plans.titleAccent` EN: "counted in edit requests." | AR: "تُحسب بطلبات التعديل."  (outcome clause → world gradient is correct; drop `accent="mint"` for `accent="world"`, no collision on this page)
- `….plans.description` EN: "One request is a content or image swap, or a small edit to one section, so both sides can count it. <strong>Requests beyond the allowance are billed by the hour at the rate shown.</strong>" | AR: "الطلب الواحد هو تبديل محتوى أو صورة، أو تعديل صغير في قسم واحد، فيستطيع الطرفان عدّه. <strong>الطلبات التي تتجاوز الرصيد تُحتسب بالساعة بالسعر الموضح.</strong>" (component change: read with `t.rich`, L1)
- `….plans.cta` AR: "ابدأ بباقة {name}"; `commercial.ctas.maintenancePlans` AR: "اطّلع على باقات الصيانة"; `maintenanceEnquiry` AR: "ابدأ باقة صيانة" (one term on the AR site).
- `….pricing.notes.addons` label EN: "Extra tools" | AR: "أدوات إضافية"; value EN: "Third-party tools or subscriptions can be added when a site needs them. They are not part of any plan and are billed separately." | AR: "يمكن إضافة أدوات أو اشتراكات من جهات خارجية حين يحتاجها الموقع. وهي ليست جزءاً من أي باقة وتُفوتر منفصلة."
- `….plans.table.rows.monitoring` AR: "المراقبة والنسخ الاحتياطي" (EN keep).
- `….pricing.notes.infra.value` EN: "Domain and hosting renewals, SMS and email credits, paid software and third-party subscriptions are billed separately from the plan." | AR: keep (already "تُفوتر بشكل منفصل").
- pricing copy `maintenance.professional.compare.support` EN: needs the channel (Needs Ali); today the row reads as a turnaround claim.
- format: `<strong>` once (overage); table stays the spotted anchor.

##### 6 FAQ — EDIT (L1; one token L2)
- new item [0] q EN: "How much does website maintenance cost?" | AR: "كم تكلفة صيانة الموقع؟"; a EN: "Essential is {maintenanceEssential} a month and Professional is {maintenanceProfessional} a month. Enterprise is priced with you, for several systems or one that cannot go down. Domain, hosting and third-party subscriptions are billed separately." | AR: "الباقة الأساسية {maintenanceEssential} شهرياً، والاحترافية {maintenanceProfessional} شهرياً. أما المؤسسية فتُسعَّر معك، لعدة أنظمة أو لنظام لا يحتمل التوقف. والنطاق والاستضافة واشتراكات الجهات الخارجية تُفوتر منفصلة."
- annual item a: replace "some months are free" with "{annualFreeMonths} months are free" / "تحصل على {annualFreeMonths} شهرين مجاناً" → needs token `annualFreeMonths` in `pricingTokens` (L2, from `MAINTENANCE_ANNUAL_FREE_MONTHS`); never type the number. AR wording must handle the dual (شهرين) → simpler AR: "تدفع السنة مقدماً بسعر أقل من 12 شهراً، والفرق موضح في جدول الباقات" if no plural-aware token.

##### 7 Close — EDIT (L1)
- `common.endCta.pages.maintenance.body` EN: "Send the site you run today. We check its stack and current state first, then recommend the plan that fits it, not the largest one." | AR: "أرسل الموقع الذي تديره اليوم. نفحص تقنياته وحالته الحالية أولاً، ثم نوصي بالباقة المناسبة له، لا الأكبر."
- secondary CTA (L1, page-client): `maintenancePlans` → `technicalCall` ("Schedule a consultation"), since the plans are one scroll up and the self-link adds nothing.

##### Keyword fit (both)
- consulting: EN "website technical audit" now in H1 (rebuild); AR "مراجعة تقنية لموقعك" in H1, "استشارات تقنية" in eyebrow + FAQ title; meta already right.
- maintenance: EN "website maintenance" in H1 + FAQ title ✓; "website maintenance plans" only in meta → plans eyebrow carries "Maintenance plans"; AR "صيانة المواقع" H1 ✓, "باقات صيانة المواقع" added to eyebrow; "تكلفة صيانة موقع" via new FAQ.

##### Needs Ali
- Keep, move or remove the consulting cost curve (it may be the page's signature device; L3/L4).
- Credit rate: copy "Nothing" net cost assumes 100% credit; confirm the credit stays full, and whether it expires (open since 2026-10-04).
- Does the 5-day window pause while waiting for client answers?
- Overage: is an extra request billed per hour (schema) or per request? The old h2 said "never in hours".
- Professional support channel (WhatsApp/email? hours?) and any real turnaround per plan.
- Is the onboarding check of an outside site free? (steps imply yes, never stated).
- Maintenance cancellation / minimum term / notice (still unpublished).
- Approve `annualFreeMonths` token and the AR switch "خطط" → "باقات".
- `commercial.ctas.technicalAudit` AR change touches every page using that key (other agents' scope).

##### Sources
- https://www.nngroup.com/articles/first-2-words-a-signal-for-scanning/ (front-load first 2 words)
- https://www.nngroup.com/articles/text-scanning-patterns-eyetracking/ (layer-cake is the pattern to support)
- https://www.nngroup.com/articles/f-shaped-pattern-reading-web-content/ (front-load, headings, bold keywords)
- https://www.nngroup.com/articles/learn-more-links/ (labels predict the destination; via search result)
- https://developers.google.com/search/docs/fundamentals/creating-helpful-content (descriptive main heading, no sensationalism)
- House: docs/section-heading-emphasis.md §0; docs/content-research-2026-10.md §3.2, §4, §7; RUL-060 (one emphasis per paragraph), RTL-071.

### 10.7 Method pages (process, how-we-work, approach, standards, faq)

#### Content audit: method pages (/process, /how-we-work, /approach, /standards, /faq), 2026-10-05
AUDIT ONLY. Read: page-client.tsx of each route, process/{phase-chapters,scope-bars}.tsx, standards/pass-line.tsx, components/shared/{process-parts,faq-list}.tsx, lib/process-phases.ts, lib/config/commercial.ts, messages/{en,ar}/{process,how-we-work,approach,standards,faq,commercial,common}.json, docs/content-research-2026-10.md §3.4/§4/§7. Live DOM checked with curl on :3000 (EN + /ar, titles + h1-h3).

#### 0. Overlap / cannibalisation (the main finding)
Each page's distinct job, and where it should be the one canonical home:
| page | distinct job (canonical for) | sticks to it? |
|---|---|---|
| /process | WHEN: the 5 phases in order, length, client input + sign-off per phase, where each payment falls | Mostly. Closing restates the changes policy (how-we-work's job) and repeats "fixed order" for the 3rd time |
| /how-we-work | THE RELATIONSHIP: who you talk to, reply time, updates, change pricing, warranty, ownership, at a glance | Yes, but every clause also exists, longer, in FAQ; the "changes" clause contradicts FAQ 05 in precision (no 5% / 25% bands) |
| /approach | WHAT GETS DECIDED FIRST and why (data → architecture → features → page), for technical buyers | Weakly: chapter content is shuffled (see 3.2); refusal #5 and contrast #1 repeat /process discovery |
| /standards | THE MEASURABLE BAR: thresholds per area | Content fits, but the gate story ("pipeline blocks a release") is not true in the repo |
| /faq | LONG-TAIL QUESTIONS, short answer first, linking to the canonical page | Answers repeat canonical pages in full and never link to them (0 `<a>` in 21 answers) |
Topic duplication (count of places a buyer reads the same fact): ownership at final payment ×9 (process launch + payments, hww ownership + launch, approach handover, FAQ 01/02/17/21); changes policy ×4 (process closing, hww changes, FAQ 05, FAQ 16); reply/who ×3 (hww, FAQ 20, FAQ end CTA); client inputs ×3 (process inputs, hww yourPart, FAQ 15); staging before live ×3 (process launch, hww launch, FAQ 21).
Rule to adopt: repeat a fact in ≤1 line + link to its canonical home; the long version lives once. SEO risk is low (different intents per §4), but the buyer reads the same sentence 4-9 times and every copy must stay in sync (FAQ 05 vs hww changes already drifted).
Voice tic across all five pages: "not X - it is Y" / "X, not Y" appears ≥12 times (approach constraints ×2, multilingual ×2, FAQ 01, 07, 13, 06, standards security "built in - not bolted on", contrasts, etc.). Cut to ≤1 per page.
`commercial.ctas.viewTransparency` label "View transparency" / "اطّلع على الشفافية" says nothing about what happens; used as secondary on /process, /how-we-work, /approach. Shared key: propose EN "See how estimates are calculated" | AR "اطّلع على طريقة حساب التقدير" (coordinate with the pricing auditor).

#### /process (`/process`)
Reading pattern now → right pattern: layer-cake (h1 → h2 → 5 h3 chapters, each with headline + two lists + gate) → right; chapters are min 92svh each, so ~6 screens with no CTA.
CTA map: hero — none ; photo — none ; phases — none (jump nav only) ; scope — "Payment terms" (scopeProjects+"#terms", should be key `paymentTerms`) → /pricing#terms [text link] ; "View transparency" (viewTransparency) → /transparency#how-estimates-are-calculated [text link] ; closing — "Start a project" (describeTheBuild) → /contact [primary] ; "View transparency" (viewTransparency) [secondary] ; gaps: ~6-screen desert across the chapters; viewTransparency used twice; no estimator link although the page is about time.
| # | section (component) | job | verdict + level | problem |
|---|---|---|---|---|
| 1 | Opening (SectionHeading h1) | say what the page is: the website project process | EDIT L0 | H1 "Five phases, in a fixed order." needs inference (phases of what?); keyword "web design process / مراحل تصميم المواقع" missing; AR eyebrow "مراحل المشروع" ≠ nav "آلية العمل" |
| 2 | PhotoBand caption | mood | KEEP L0 | caption repeats H1; harmless |
| 3 | Phases h2 + PhaseChapters | per phase: what you bring, what you get, sign-off | EDIT L0 | 2 slogan headlines (development, launch); discovery deliverable "Technical audit" collides with the paid audit product and is not credible from a 60-min session; wireframe headline abstract |
| 4 | ScopeSection | how scope changes duration; payment order | EDIT L0-L1 | note = 61 words, 4 ideas in one `<p>`; "Both ends come from our published price ranges" unclear; terms link built from the wrong key |
| 5 | Closing (SectionEndCta) | next step | REBUILD L0-L1 | 3rd "order is fixed" heading; body is the changes policy (hww/FAQ 05 job); title does not say what the button does; secondary is vague |

##### 1 Opening — EDIT (L0)
- why: H1 must name the thing (NN/g first-2-words); keyword map §4 EN "web design process", AR "مراحل تصميم المواقع"; dimmed italic = how we work (§0) stays.
- new copy: `process.hero.title` EN: "Web design process:" | AR: "مراحل تصميم وتطوير المواقع:" ; `process.hero.titleItalic` EN: "five phases, in a fixed order." | AR: "خمس مراحل بترتيب ثابت." ; `process.hero.eyebrow` AR: "آلية العمل" (EN unchanged).
- format: description unchanged (one sentence, lists what the page answers: good).
##### 3 Phases — EDIT (L0)
- why: headlines are the big display line each chapter is scanned by; two say nothing concrete.
- new copy: `process.phases.wireframe.headline` EN: "Agree the pages and flows before any visual design." | AR: "نتفق على الصفحات والمسارات قبل أي عمل بصري." ; `process.phases.development.headline` EN: "Build it on a live link you can open any day." | AR: "نبنيه على رابط حي تفتحه في أي يوم." ; `process.phases.launch.headline` EN: "Review it on staging, then it goes live on your domain." | AR: "تراجعه على بيئة الاختبار، ثم يُنشر على نطاقك." ; `process.phases.discovery.deliverables` EN: "Requirements summary | Review of what exists today | Proposal: scope, price, timeline" | AR: "ملخص المتطلبات | مراجعة لما هو قائم اليوم | عرض سعر: النطاق والسعر والمدة".
- format: chapter body is `t()` not `t.rich`, no emphasis possible; fine — the gate line carries the commitment.
##### 4 Scope — EDIT (L0, link key L1)
- new copy: `process.page.scope.note` EN: "A larger scope lengthens every phase after discovery, development most. It never adds, reorders or skips a phase or a sign-off. The bars above show our smallest and largest published scopes; discovery counts as one day. A flexible deadline, or content written from scratch, can stretch a quote to {ceiling} weeks, never further." | AR: "النطاق الأكبر يُطيل كل مرحلة بعد الاستكشاف، والتطوير أكثرها. لا يضيف مرحلة ولا يغيّر ترتيبها ولا يتخطى اعتمادًا. الأشرطة أعلاه تُظهر أصغر وأكبر نطاق في أسعارنا المنشورة، والاستكشاف يُحسب يومًا واحدًا. الموعد المرن أو كتابة المحتوى من الصفر قد يمدّ عرض السعر حتى {ceiling} أسبوعًا، لا أكثر."
- structural: terms link → `getCommercialCta("paymentTerms")` (L1); replace the viewTransparency text link with `projectRange` "Estimate your project" → /transparency (time is this page's topic) (L1).
##### 5 Closing — REBUILD (L0 copy, L1 secondary key)
- why: CTA copy should say what happens next (brief rubric 5); the changes policy belongs to /how-we-work + FAQ 05.
- new copy: `process.flexibility.title` EN: "Start with phase one." | AR: "ابدأ بالمرحلة الأولى." ; `process.flexibility.titleItalic` EN: "Tell us what you are building." | AR: "أخبرنا بما تبنيه." ; `process.flexibility.description` EN: "Describe the project in a few lines. We reply within 24 hours on business days to arrange the discovery session, and <strong>the proposal that follows fixes scope, price and timeline before you sign.</strong>" | AR: "صِف مشروعك في بضعة أسطر. نرد خلال 24 ساعة في أيام العمل لترتيب جلسة الاستكشاف، و<strong>عرض السعر الذي يليها يحدد النطاق والسعر والمدة قبل أن توقّع.</strong>"
- format: one `<strong>` on the commitment. Aside ("Your project starts here" + Discovery) KEEP.
- structural: secondary `viewTransparency` → `projectRange` (L1). Reply time: see Needs Ali.

#### /how-we-work (`/how-we-work`)
Reading pattern now → right pattern: spotted/ledger (h3 question → short value at the row end) → right for a terms sheet.
CTA map: hero — none ; agreement — none ; map — 3 row links Approach/Process/Standards [secondary nav] ; closing — "Start a project" (describeTheBuild) → /contact [primary] ; "View transparency" (viewTransparency) [secondary] ; gaps: no link to /faq (where every clause is expanded) or /pricing#terms; hero mentions "the Process page" as plain text.
| # | section | job | verdict + level | problem |
|---|---|---|---|---|
| 1 | Opening h1 | name the page: the working terms | EDIT L0 | "The working rules" vague; keyword "working with a web development agency / كيف تعمل شركة تصميم مواقع" absent |
| 2 | Agreement h2 + 9 rows | each recurring question answered in 2-5 words | EDIT L0 | "recurs" abstract; "every client asks" implies a client base; 3 values do not answer their question (changes, warranty, ownership "Everything"); changes note drifted from FAQ 05 |
| 3 | Map | route to the long versions | EDIT L0 + L3 | h2 "Each part in full" non-descriptive; FAQ missing from the list |
| 4 | Closing | next step | EDIT L0-L1 | title "Agree the rules" ≠ button "Start a project" |
##### 1 Opening — EDIT (L0)
- new copy: `how-we-work.hero.title` EN: "Communication, changes and ownership," | AR: "التواصل والتعديلات والملكية،" ; `how-we-work.hero.titleItalic` EN: "agreed before you sign." | AR: "متفق عليها قبل التوقيع." (mirrors the title tag "Replies, Changes, Ownership").
##### 2 Agreement — EDIT (L0)
- new copy: `how-we-work.agreement.title` EN: "The questions that come up mid-project," | AR: "الأسئلة التي تظهر في منتصف المشروع،" ; `.titleItalic` EN: "answered before it starts." | AR: "مُجاب عنها قبل أن يبدأ." ; `.description` EN: "Who you talk to, how fast we reply, what a change costs and what you own. Each answer is written into your proposal, so none of it is negotiated once the work is under way." | AR: "مع من تتحدث، ومتى نرد، وكم يكلف التعديل، وما الذي تملكه. كل إجابة مكتوبة في عرض السعر، فلا يُتفاوض على شيء منها بعد بدء العمل."
- `.clauses.who.value` EN: "The engineer who builds it" | AR: "المهندس الذي يبنيه" ; `.clauses.changes.question` EN: "How a change is priced" | AR: "كيف يُسعَّر التعديل" ; `.clauses.changes.value` EN: "Agreed in writing first" | AR: "كتابيًا وقبل التنفيذ" ; `.clauses.changes.note` EN: "Changes within 5% of the agreed effort are included. Anything larger gets a written change order - a fixed price or {revisionRate} an hour - that you approve before work starts." | AR: "التعديلات في حدود 5% من الجهد المتفق عليه مشمولة. وما هو أكبر يصدر له أمر تعديل مكتوب - بسعر ثابت أو {revisionRate} للساعة - توافق عليه قبل بدء العمل." ; `.clauses.warranty.question` EN: "Warranty after launch" | AR: "الضمان بعد الإطلاق" ; `.clauses.ownership.value` EN: "Code, designs, accounts" | AR: "الكود والتصاميم والحسابات" ; `.clauses.ownership.note` EN: "Source code, design files, hosting accounts and documentation pass to you at final payment. No lock-in." | AR: "كود المصدر وملفات التصميم وحسابات الاستضافة والتوثيق تنتقل إليك عند الدفعة الأخيرة. لا تبعية." (designs: matches `process.page.payments.text`).
- format: no `<strong>` needed; the value column is the emphasis (spotted pattern working as intended).
##### 3 Map — EDIT (L0) + L3
- new copy: `how-we-work.map.eyebrow` EN: "The phases, the decisions and the quality bar in full" | AR: "المراحل والقرارات ومعيار الجودة بالتفصيل".
- structural (L3, existing row idiom): add a 4th route `faq` → /faq, label "FAQ" | "الأسئلة الشائعة", line "Every clause above, answered at length." | "كل بند أعلاه بإجابة كاملة." (figure = question count from FAQ_GROUPS).
##### 4 Closing — EDIT (L0, L1)
- new copy: `how-we-work.cta.title` EN: "Get a proposal" | AR: "احصل على عرض سعر" ; `.titleAccent` EN: "with these rules written in." | AR: "مكتوبة فيه هذه القواعد." (description KEEP). Secondary `viewTransparency` → `projectRange` (L1).

#### /approach (`/approach`)
Reading pattern now → right pattern: commitment (long prose chapters with single-word h2s, sticky rail) → layer-cake: needs descriptive headings and content that matches each chapter.
CTA map: hero — none ; order chapters (4 chapters, ~5 screens) — rail anchors only ; refusals — none ; closing — "Start a project" (describeTheBuild) [primary] ; "View transparency" (viewTransparency) [secondary] ; gaps: ~6-screen desert; acceptable for a commitment page only if headings let the reader skip.
| # | section | job | verdict + level | problem |
|---|---|---|---|---|
| 1 | Opening h1 + order strip | state the method in plain words | REBUILD L0 | "We do not design pages first." = negation, needs inference, no keyword (§4 "custom web development approach / منهجية تطوير المواقع") |
| 2 | OrderSection chapters | one layer per chapter + what you receive | REBUILD L1-L2 | h2s are single words ("Data"); content shuffled: features chapter leads with "Architecture precedes implementation", architecture chapter holds the "what will not be built" (scope/features) prose, contrast 1 ("features users asked for") sits under Data; emphasis 7 strong + 3 dim in 6 short paragraphs (RUL-060); AR `decisions.title` "التصميم يسبق البناء" says "design", EN says architecture; AR contrast 2 same error; type note claims Altruvex Sans is "drawn ... as one family" but repo ships Outfit + Vazirmatn (public/fonts/licenses) |
| 3 | Handover (×4) | proof: what you get | KEEP L0 | concrete, verifiable at handover |
| 4 | RefusalsSection | honest boundaries | EDIT L0 | items not front-loaded; #5 repeats /process discovery; #2 vague; #3/#4 are business positions to confirm |
| 5 | Closing | next step | EDIT L0 | 2 marks; "Not every project needs this depth" opens by turning readers away |
##### 1 Opening — REBUILD (L0)
- new copy: `approach.hero.title` EN: "Our web development approach: data first, the page last." | AR: "منهجيتنا في تطوير المواقع: البيانات أولًا والصفحة أخيرًا." (splitHeadline halves by words: EN → "Our web development approach:" / "data first, the page last."; AR → "منهجيتنا في تطوير المواقع:" / "البيانات أولًا والصفحة أخيرًا."). Description KEEP.
##### 2 Order chapters — REBUILD (L1 keys, L2 order)
- structural L2 (page-client.tsx OrderSection): Data = lead `decisions.data.description` + handover. Architecture = lead `decisions.title` + principles scale/handoff/maintenance + contrast 2 + contrast 3 + handover. Features = lead `constraints.title` + `constraints.paragraphs` + contrast 1 + handover. Page = unchanged.
- structural L1: chapter h2 = layer + short descriptor via new keys `approach.chapters.<layer>` EN: "Data: what the system must know" | "Architecture: how it holds up" | "Features: what gets built, and what does not" | "The page: decided last" ; AR: "البيانات: ما يجب أن يعرفه النظام" | "البنية: كيف يصمد النظام" | "الميزات: ما يُبنى وما لا يُبنى" | "الصفحة: تُحسم أخيرًا". Rail keeps the one-word `hero.order.items`.
- new copy: `approach.constraints.paragraphs` EN: "Every project starts by deciding what will not be built: the features out of scope and the use cases excluded. <strong>Your proposal states that scope</strong>, so you can check the build against it.\n\nA system designed for everyone serves no one well. Fewer, deliberate features are faster to build, test and change." | AR: "يبدأ كل مشروع بتحديد ما لن يُبنى: الميزات خارج النطاق وحالات الاستخدام المستبعدة. <strong>عرض السعر يحدد هذا النطاق</strong>، فتستطيع أن تراجع البناء على أساسه.\n\nالنظام المصمم للجميع لا يخدم أحدًا جيدًا. الميزات القليلة المقصودة أسرع في البناء والاختبار والتعديل."
- `approach.multilingual.paragraphs` EN: "Right-to-left is decided in the architecture, not added at the end by flipping the layout. <strong>Every component, layout and interaction is built and checked in both directions.</strong>\n\nArabic is adapted, not translated: navigation, alignment and reading order are reconsidered for an Arabic reader rather than mirrored." | AR: "يُحسم الاتجاه من اليمين إلى اليسار في البنية، ولا يُضاف في النهاية بقلب التخطيط. <strong>كل مكوّن وتخطيط وتفاعل يُبنى ويُختبر في الاتجاهين.</strong>\n\nالعربية تُكيَّف ولا تُترجم: التنقل والمحاذاة وترتيب القراءة يُعاد التفكير فيها لقارئ عربي، لا تُعكس آليًا."
- `approach.decisions.title` AR: "البنية تسبق التنفيذ." ; `approach.contrasts.2.altruvex` AR: "حدّد القيود المعمارية قبل فتح أي محرر" ; `approach.multilingual.specimen.notes.face.value` EN: "Altruvex Sans: one family that pairs a Latin face and an Arabic face at matching weights." | AR: "Altruvex Sans: عائلة واحدة تجمع خطًا لاتينيًا وخطًا عربيًا بأوزان متطابقة."
- format: 1 `<strong>` per paragraph max, no `<dim>` in these blocks (was 7+3).
##### 4 Refusals — EDIT (L0)
- new copy: `approach.boundaries.intro` EN: "Five things we turn down, so you know before you ask:" | AR: "خمسة أمور نعتذر عنها، لتعرفها قبل أن تسأل:" ; `.items.1` EN: "Fixed deadlines set before the scope is known" | AR: "مواعيد نهائية تُفرض قبل فهم النطاق" ; `.items.2` EN: "Systems we could not stand behind technically" | AR: "أنظمة لا نستطيع الوقوف خلفها تقنيًا" ; `.items.3` EN: "White-label work through another agency" | AR: "العمل من الباطن عبر وكالة وسيطة" ; `.items.4` EN: "Competing on price alone" | AR: "المنافسة على السعر وحده" ; `.items.5` EN: "Building before the problem is mapped" | AR: "البدء في البناء قبل رسم المشكلة". Title KEEP.
##### 5 Closing — EDIT (L0)
- new copy: `approach.closing.description` EN: "Describe what you are building in a few lines. <strong>You get a direct technical answer on scope, cost and fit</strong> from the engineer who would build it, not a sales pitch." | AR: "صِف ما تبنيه في بضعة أسطر. <strong>تحصل على إجابة تقنية مباشرة عن النطاق والتكلفة والملاءمة</strong> من المهندس الذي سيبنيه، لا عرضًا ترويجيًا." Secondary → `projectRange` (L1).

#### /standards (`/standards`)
Reading pattern now → right pattern: spotted (giant numerals 20vw, check rows) → right; the numbers are the proof. Chapter prose (~70-80 words, 1-2 marks each) is skipped; fine if headings are descriptive.
CTA map: chapters ×4 — none ; gate — none ; end CTA — "Start with a technical audit" (technicalAudit) → /contact?service=consulting&package=audit [primary] ; "View our work" (realBuild) → /work [secondary] ; gaps: none needed mid-page; secondary sends a buyer to cases that carry no measurements (removed 2026-10-04), which invites "where are the numbers?".
Unbacked in repo (verified 2026-10-05): no `.github/workflows`, no CI, no test runner in www, no Lighthouse CI, no dependabot/renovate. Present: security headers incl. CSP/HSTS in apps/www/next.config.
| # | section | job | verdict + level | problem |
|---|---|---|---|---|
| 1 | Opening h1 | name the bar | REBUILD L0 | H1 "measured on every deploy" is unbacked; keyword "website quality standards / معايير جودة المواقع" absent |
| 2 | Chapters ×4 (code, performance, accessibility, security) | thresholds per area | EDIT L0 + L2 order | slogan h2s ("Fast by architecture"); "checked on every deploy", "Continuous integration", "Automated testing", "Dependency audits run in the build pipeline" unbacked; ">80% coverage" unbacked; "Edge-first" jargon; security bold on "built in" = decoration; code chapter first, though buyers search speed first |
| 3 | GateSection | how the bar is enforced | REBUILD L0 (or L3 build the gate) | whole section describes a pipeline that does not exist |
| 4 | End CTA | audit offer | EDIT L1 | copy KEEP; secondary realBuild → describeTheBuild |
##### 1 Opening — REBUILD (L0)
- new copy: `standards.hero.title` EN: "Website quality standards:" | AR: "معايير جودة المواقع:" ; `.titleItalic` EN: "the numbers every build must meet." | AR: "الأرقام التي يجب أن يبلغها كل مشروع." ; `.description` EN: "The thresholds every Altruvex build must meet before launch - speed, accessibility, security and code quality - and how each one is checked." | AR: "الحدود التي يجب أن يبلغها كل مشروع من Altruvex قبل الإطلاق - السرعة والإتاحة والأمان وجودة الكود - وكيف يُفحص كل منها."
- heading emphasis: the italic clause becomes "what the client gets" → candidate for Gradient per §0 (≤2 per page).
##### 2 Chapters — EDIT (L0; order L2)
- `standards.categories.<id>.title` EN: performance "Performance: Core Web Vitals" | accessibility "Accessibility: WCAG 2.1 AA" | security "Security" | code "Code quality" ; AR: "الأداء وسرعة الموقع: Core Web Vitals" | "سهولة الوصول: WCAG 2.1 AA" | "الأمان" | "جودة الكود".
- `performance.description` EN: "<strong>Speed is decided by the architecture, not by a late optimisation pass.</strong> Pages are served from a global edge network, images in modern formats, with only the JavaScript a page needs - all chosen before the first screen is built. Each threshold below is measured on a mobile profile before launch." | AR: "<strong>السرعة يحددها تصميم البنية، لا تحسين متأخر.</strong> تُقدَّم الصفحات من شبكة خوادم قريبة من زوارك، والصور بصيغ حديثة، ولا يُحمَّل من JavaScript إلا ما تحتاجه الصفحة - وكل ذلك يُحسم قبل بناء أول شاشة. وكل حد أدناه يُقاس على جهاز محمول قبل الإطلاق." ; `performance.requirements` EN: "Edge delivery | Modern image formats | Minimal JavaScript | Optimised fonts" | AR: "تقديم من خوادم قريبة | صيغ صور حديثة | أقل قدر من JavaScript | خطوط محسّنة".
- `code.description` EN: "<strong>Your codebase is written for the next developer who opens it.</strong> Strict TypeScript catches a class of bugs manual testing misses, and a component-based structure lets a new developer trace a feature from route to page. The code you receive at handover is the code your next hire extends." | AR: "<strong>الكود يُكتب للمطور التالي الذي سيفتحه.</strong> TypeScript الصارم يلتقط فئة من الأخطاء يفوتها الاختبار اليدوي، والبنية القائمة على المكوّنات تتيح لمطور جديد تتبع أي ميزة من المسار إلى الصفحة. والكود الذي تستلمه عند التسليم هو ما سيبني عليه من توظفه بعدنا." ; `code.requirements` EN: "Strict TypeScript | Component-based architecture | Zero lint errors | Documented API endpoints" | AR: "TypeScript صارم | بنية قائمة على المكوّنات | صفر أخطاء lint | توثيق كل نقاط API".
- `security.description` EN: "<strong>Security headers, input sanitisation and dependency audits are in place before anything ships.</strong> Authentication flows are reviewed against current OWASP guidance before launch. For stores and systems that take payments, this is the baseline." | AR: "<strong>ترويسات الأمان وتنقية المدخلات وفحص الاعتماديات قائمة قبل أي إطلاق.</strong> وتُراجع مسارات تسجيل الدخول وفق إرشادات OWASP الحالية قبل الإطلاق. وفي المتاجر والأنظمة التي تستقبل مدفوعات، هذا هو الحد الأدنى."
- `accessibility.description`: drop the `<dim>` clause (keep the one `<strong>`); EN end: "...before it is marked done." | AR equivalent cut.
- structural L2: STANDARDS order → performance, accessibility, security, code. L1 pending Ali: remove `coverage` check (CHECK_COUNT 12→11) unless client builds really carry tests.
##### 3 Gate — REBUILD (L0) — option A (honest now; needs Ali's yes to the commitment)
- `standards.enforcement.eyebrow` EN: "Before launch" | AR: "قبل الإطلاق" ; `.title` EN: "Checked before launch," | AR: "تُفحص قبل الإطلاق،" ; `.titleItalic` EN: "with the results in your handover." | AR: "ونتائجها ضمن ملفات التسليم." ; `.outcomes.fail.result` EN: "Launch waits." | AR: "ينتظر الإطلاق." ; `.description` EN: "Before launch, every check above is run against the finished build on staging. <strong>A build that misses a line is fixed before it goes live</strong>, and the measured results go to you with the handover documents." | AR: "قبل الإطلاق، يُجرى كل فحص أعلاه على النظام المكتمل في بيئة الاختبار. <strong>المشروع الذي لا يبلغ أحد الحدود يُصلَح قبل نشره</strong>، وتصلك النتائج المقاسة مع ملفات التسليم."
- option B (L3, engineering): build a real CI gate (lint, tests, Lighthouse CI, audit) and keep today's wording.
##### 4 End CTA — EDIT (L1)
- secondary `realBuild` → `describeTheBuild`. L3 idea (after a dated measurement only): a line "Run PageSpeed Insights on this site" linking to the public tool = proof a visitor can verify.

#### /faq (`/faq`)
Reading pattern now → right pattern: spotted (scan 21 accordion questions in 4 groups, open one) → right. Answers 37-122 words; 6 answers bury the direct answer.
CTA map: hero — none ; 21 answers — 0 links (mentions "the Process/Pricing/Standards/Work page" as plain text) ; end CTA — "Start a project" (describeTheBuild) → /contact [primary] ; "Schedule a consultation" (technicalCall) → /schedule [secondary] ; gaps: answers should link to their canonical page; end CTA title "Ask the question" ≠ button "Start a project".
Format notes: h3 DOM text is "01Why should I…" (index inside the heading; make the number aria-hidden or move it outside the h3, L1). Dim in answers is a raw `<span class="text-foreground/60">`, not `t.rich` Dim (RUL-060 off-pattern; HTML needed for JSON-LD, so keep but limit to ≤1 per answer). Bold list-item labels (Q03, 05, 11, 13, 15, 19) are labels, acceptable; paragraph bold should be the answer itself ("Yes.", the number).
| # | Q | verdict + level | problem |
|---|---|---|---|
| H | h1 + subtitle | EDIT L0 | "Questions clients ask before they start." implies a client base; keyword missing |
| 01 | trust a new company | EDIT L0 | bold on "That is not a feature" (decoration); answer does not own "new" |
| 14 | experience | EDIT L0 + L1 link | "Recent work:" not an answer; dates unverified (§7) |
| 11 | payment | EDIT L0 | 122 words; split 3rd paragraph |
| 04 | timeline | EDIT L0 | number in 2nd sentence; "depends on scope" twice |
| 13 | success | EDIT L0 | "checked on every deploy" unbacked; 5 bolds |
| 03 | custom vs templates | EDIT L0 | "on every deploy" unbacked |
| 16 | revisions | EDIT L0 (Needs Ali) | no number; first sentence dodges |
| 20 | who/reply | EDIT L0 | 0 bold; key fact not marked |
| 02,17,09,12,10,19,08,15,05,21,07,06,18 | | KEEP L0 | direct first sentence, ≤102 words, consistent with terms (add links L1 where a page is named) |
##### Hero — EDIT (L0)
- `faq.title` EN: "Website project FAQ: cost, timeline and who owns the code." | AR: "أسئلة شائعة عن تصميم المواقع: التكلفة والمدة وملكية الكود." ; `faq.subtitle` EN: "Direct answers on what a custom website costs, how long it takes, who owns it and how we work. The phases are on the Process page; payment terms are on the Pricing page." | AR: "إجابات مباشرة عن تكلفة الموقع المخصص ومدته ومن يملكه وكيف نعمل. المراحل في صفحة آلية العمل، وشروط الدفع في صفحة الأسعار."
##### Answers — EDIT (L0; links L1 = `<a href>` inside the HTML strings, AR with /ar prefix)
- `faq.questions.01.answer` EN: "<p><strong>Because you do not have to rely on us staying involved.</strong> We are a new studio, so the protection is in the terms: you receive the complete source code and documentation, and the accounts pass to you at final payment. If we stopped working together tomorrow, any competent developer could maintain the system.</p><p>Technically: we build on Next.js, deploy to Vercel or your own infrastructure, and structure every project so another developer can read it without us. No proprietary framework, no private tooling.</p>" | AR: "<p><strong>لأنك لا تحتاج إلى بقائنا معك.</strong> نحن استوديو جديد، لذلك الضمان في الشروط: تستلم كود المصدر كاملًا مع التوثيق، وتنتقل إليك الحسابات عند الدفعة الأخيرة. ولو توقفنا عن العمل معًا غدًا، يستطيع أي مطور كفء صيانة النظام.</p><p>تقنيًا: نبني على Next.js، وننشر على Vercel أو على بنيتك التحتية، وننظّم كل مشروع بحيث يقرؤه مطور آخر دون الرجوع إلينا. لا أطر عمل مغلقة ولا أدوات خاصة.</p>"
- `faq.questions.14.answer`: first `<p>` EN: "<strong>Three shipped projects, all live and open to check:</strong>" | AR: "<strong>ثلاثة مشاريع منفذة، كلها تعمل ويمكنك فتحها:</strong>"; list unchanged; last `<p>` link "the Work page" → /work. Dates stay only if Ali confirms (§7).
- `faq.questions.04.answer` first `<p>` EN: "<strong>{deliveryWeeksMin}–{deliveryWeeksMax} weeks</strong>, depending on scope. Every project moves through the same five phases - discovery, wireframe, design, development and launch - and the Process page shows how long each takes." ; 2nd `<p>` EN: "The estimator gives an indicative range in weeks; your proposal sets the delivery window once scope is reviewed." ; 3rd `<p>`: drop its `<strong>` (one per answer). AR: "<strong>من {deliveryWeeksMin} إلى {deliveryWeeksMax} أسابيع</strong> حسب النطاق. كل مشروع يمر بالمراحل الخمس نفسها - الاستكشاف والتصميم الأولي والتصميم والتطوير والإطلاق - وتوضح صفحة آلية العمل مدة كل مرحلة." / "تعطيك أداة التقدير مدى تقريبيًا بالأسابيع، ويحدد عرض السعر مدة التسليم بعد مراجعة النطاق." Links: Process page → /process.
- `faq.questions.11.answer` first line EN: "In three milestone payments, not by the hour:" | AR: "على ثلاث دفعات مرتبطة بالمراحل، لا بالساعة:"; move the 3rd `<p>` (domain/hosting/third-party) to ≤2 sentences + link to /pricing#terms ("No hidden fees" → keep as its first words).
- `faq.questions.13.answer`: Performance item EN: "Core Web Vitals and Lighthouse thresholds, measured before launch (listed on the Standards page)" | AR: "حدود Core Web Vitals وLighthouse، تُقاس قبل الإطلاق (مذكورة في صفحة معايير الجودة)"; un-bold the list labels or the closing line, keep `<strong>We do not promise traffic or sales</strong>` as the one paragraph bold; remove its dim clause.
- `faq.questions.03.answer` Performance item EN: "...checked against published thresholds before launch (see the Standards page)." | AR: "...وتُفحص وفق حدود منشورة قبل الإطلاق (راجع صفحة معايير الجودة)."
- `faq.questions.20.answer` EN: "<p><strong>The engineer who builds your project, within 24 hours on business days.</strong> No account manager or sales layer in between; replies come by call or WhatsApp.</p><p>During development you also get a written update every week and a live preview link you can open at any time.</p>" | AR: "<p><strong>المهندس الذي يبني مشروعك، خلال 24 ساعة في أيام العمل.</strong> لا مدير حساب ولا وسيط مبيعات بينكما، والرد باتصال أو عبر واتساب.</p><p>وأثناء التطوير تصلك تحديثات مكتوبة كل أسبوع، ورابط معاينة حي تفتحه متى شئت.</p>"
- `faq.questions.16.answer` first `<p>` EN (needs a `revisionRounds` token): "<strong>{revisionRounds} rounds per design phase</strong>, written into your statement of work before you sign." | AR: "<strong>{revisionRounds} جولات لكل مرحلة تصميم</strong>، مكتوبة في بيان العمل قبل أن توقّع." Until the token exists: keep current copy.
##### End CTA — EDIT (L0)
- `common.endCta.pages.faq.title` EN: "Your question is not here?" | AR: "لم تجد سؤالك هنا؟" ; `.titleAccent` EN: "Send it with your project." | AR: "أرسله مع تفاصيل مشروعك." ; `.body` EN: "Describe the project and add your question. The engineer who would build it replies within 24 hours on business days." | AR: "صِف مشروعك وأضف سؤالك. يرد المهندس الذي سيبنيه خلال 24 ساعة في أيام العمل." ; `.eyebrow` KEEP.

##### Needs Ali
- /standards gate: choose option A (commit to measuring before launch + results in handover) or B (build CI so "on every deploy" becomes true). Today's H1, gate and FAQ 03/13 claim a pipeline that does not exist.
- Keep ">80% test coverage" and "dependency patching every week" only if true for client builds; INP missing; WCAG 2.1 vs 2.2 (§7).
- "Within 24 hours on business days" now in 5 places (hww, FAQ 20, FAQ end CTA, proposed process closing): confirm it holds mid-project.
- "The engineer who scopes your build writes the code" (hww who, FAQ 20): true if a second developer joins?
- Approach refusals #3 (no white-label/agency work) and #4 (not competing on price): business positions to confirm.
- Is discovery free? Copy avoids saying either way; if free, say so in /process closing (strong trust lever for a new studio).
- Altruvex Sans wording: OK to describe it as a paired Latin + Arabic family (Outfit + Vazirmatn)?
- Add `revisionRounds` to `pricingTokenMap` so FAQ 16 can state the number (§7).
- Case dates in FAQ 14 (2025/2024/2024) unverified.
- Shared label `commercial.ctas.viewTransparency`: rename (affects pages outside this scope).

##### Sources
- In repo: docs/content-research-2026-10.md §3.4, §4, §7; docs/section-heading-emphasis.md §0 (Gradient / dimmed italic / Plain; RTL bold); brief rules RUL-054/059/060, RTL-071/073 as quoted in the shared brief.
- Live DOM: curl http://localhost:3000/{process,how-we-work,approach,standards,faq} and /ar/… (titles, h1-h3) on 2026-10-05.
- Web: WebFetch hit the session limit, so no external page was opened in this pass. Guidance applied from the brief's starting points, not re-verified: https://www.nngroup.com/articles/first-2-words-a-signal-for-scanning/ , https://www.nngroup.com/articles/text-scanning-patterns-eyetracking/ , https://www.nngroup.com/articles/f-shaped-pattern-reading-web-content/ , https://developers.google.com/search/docs/fundamentals/creating-helpful-content .

### 10.8 Home (`/`)

#### Homepage (`/`, `/ar`)
Checked against: `app/[locale]/(main)/page.tsx`, `home-client.tsx`, `components/scene-inversion-wrapper.tsx`, each section's component, and the EN + AR messages. Also curled `localhost:3000/` and `/ar`, and measured headline widths with JS in the Browser pane at 375, 1024 and 1440 px.
**Real render order:** Hero → Problem → Ownership stack → *[inverted scene: Services, Process]* → Work → Trust → Transparent by design → FAQ → Closing CTA. Services and Process are mounted inside `SceneInversionWrapper`, so they are on the homepage even though they are not listed in `home-client.tsx`.
Page height at 1024×768 is about 17.6 screens. Height per section, in screens: hero 0.97, problem 2.24, ownership 3.56, services 2.66, process 2.01, work 0.84, trust 2.71, transparency 1.11, FAQ 0.83, CTA 0.63.

**Reading pattern now → right pattern:** The page reads as a layer-cake (the scanner reads the headings), which is the right pattern for a long page. The hero produces a Z, which is also right, but it fails the 5-second test: neither the H1 nor anything a scanner reads says what you buy. Many section headings are slogans built on contrast ("Engineered / not assembled", "Anyone can skin the surface", "Direct access to engineering"), so a layer-cake scan finds stances, not facts.

**CTA map** (P = primary pill, S = secondary/link):
- **Header (sticky):** Estimate your project (`projectRange`) → /transparency [P].
- **Hero:** Start a project (`describeTheBuild`) → /contact [P]; View our work (`realBuild`) → /work [S].
- **Problem, Ownership:** none.
- **Services:** in the closed accordion rows, Start a design project (`startDesign`) / Start a development project (`startDevelopment`) / Start with a technical audit (`technicalAudit`) / Start a maintenance plan (`maintenanceEnquiry`) [P each, hidden until a row opens] + "{service} in detail" [S]. "Not sure" block: Start a project [P] + Schedule a consultation (`technicalCall`) → /schedule [S].
- **Process:** Read the full phase ×5 → /process#phase-x [S]; See the whole process → /process [S].
- **Work:** 3 inline case-study links [S]; View our work → /work [S].
- **Trust:** View case study ×2 [S]; checks: Estimate your project, View the standards (`viewStandards`), Read the terms (`paymentTerms`), View our work [S]; LinkedIn [S].
- **Transparency:** Estimate your project → /transparency#transparency-estimator [S]; View transparency (`viewTransparency`) [S].
- **FAQ:** none.
- **Closing CTA:** Start a project [P] + Schedule a consultation [S].

**CTA gaps:**
- **Two primaries in the first view.** The header pill says "Estimate your project" and the hero pill says "Start a project". These are two different actions, both styled as primary.
- **About 8.5 screens with no visible CTA.** Problem (2.2) + Ownership (3.6) + Services (2.7) separate the hero from the first visible CTA. The services row actions only appear once a row is opened, so the first visible one is the services "Not sure" block. Only the header pill covers this stretch.
- **Transparency has no button.** It is the strongest decision point for a studio with no track record, but it ends in two plain text links.
- **The rest of the rhythm is right.** The primary "Start a project" appears three times (hero, services "Not sure", closing CTA), and the closing CTA uses the correct pair.

| # | section (component) | job | verdict + level | problem |
|---|---|---|---|---|
| 0 | Header CTA (`nav.tsx`) | one global next step | EDIT (L2), describe only | Competing primary with the hero pill (see the CTA gaps above) |
| 1 | Hero (`hero-section.server.tsx`, `hero`) | Say what you buy, who it is for, and why to trust it. One next step. | **REBUILD (L1 copy; fit fix L2 on an L4 device)** | **Clarity:** the slogan needs inference; "engineered vs assembled" is insider vocabulary. **SEO:** the H1 has no keyword. **Emphasis:** the gradient sits on a "not" clause, which breaks emphasis §1 test 1. **Fit:** the sub is the only clear copy, and it is in the visually weaker column. |
| 2 | Problem (`problem-section.tsx`, `problem`) | Let the buyer recognise a pain that a template causes | EDIT (L1) | **Heading:** "aren't getting engineering" is insider vocabulary and attacks the market. **Row titles:** not front-loaded ("Built for the approval meeting", "No engineer on the line"). **SEO:** the custom-vs-template intent is not in the heading. |
| 3 | Ownership stack (`ownership-stack-section.tsx`, `ownershipStack`) | Show what "custom" includes, and that you own it | EDIT (L1) | **Heading:** "skin the surface" is a metaphor; "Anyone can…" postures. **Emphasis:** the gradient is on "We engineer…", which describes how we work and should be Italic per §1 test 3. **Body jargon:** "typed code", "migration history". |
| 4 | Services (`services-section.tsx`, `services`) | Route the visitor to the service that fits their problem | EDIT (L1) | **Heading:** "One delivery standard." is abstract. The row questions are already excellent (keep them). |
| 5 | Process (`process-section.tsx`, `process`) | Show what happens after you sign, and that you approve each phase | EDIT (L1) | The title is clear. Three phase headlines are abstract ("Build the system behind the idea"). These keys are shared with /process, so coordinate with that agent. |
| 6 | Work (`work-section.tsx`, `work`) | Show real, live proof, honestly sized | EDIT (L1) | The eyebrow "Selected work" implies a larger body of work to select from (posture). The sentence is honest and good. |
| 7 | Trust (`trust-section.tsx`, `commercial.trust`) | Earn trust without a track record, using things the visitor can verify | **REBUILD (L1 copy + L3 order/remove)** | **Testimonials:** attributed to a company, not a named person, and unverifiable (brief: none can be verified). **Founder label:** "Integrity above all" is an empty claim (fails Nielsen's opposite test). **Founder quote:** postures ("not to appear premium"). **Heading:** "engineering" abstract. **Order:** the checks register, which is the real proof, sits below the quotes. |
| 8 | Transparent by design (`transparent-by-design.tsx`, `pricingModel.home`) | Show the price before contact. This is the key differentiator. | EDIT (L1 label + L3) | The copy is the clearest on the page (keep it). "View transparency" is a vague label. Its CTA is only a text link. It sits 7th, too late for the differentiator. |
| 9 | FAQ (`home-faq-section.tsx`, `faq`) | Remove objections before contact | EDIT (L1) | "Questions clients ask…" implies a client base. Answer 11's last paragraph is about 60 words. |
| 10 | Closing CTA (`cta-section.tsx`, `commercial.cta`) | One clear closing ask | **KEEP** | Explicit question, explicit next step, a real reply promise, and the correct CTA pair |

##### Hero — REBUILD (L1 copy; L2/L4 fit fix)

**Why:**
- NN/g homepage principles: "Do not assume visitors to your site know your brand… include a concise tagline". NN/g "Tagline Blues": a tagline must say what the company does and what makes it unique.
- Google helpful content: the main heading should be "a descriptive, helpful summary".
- "Engineered, not assembled" fails all three. A new studio with no clients cannot lean on an attitude line, because nothing behind it yet proves the attitude.
- Emphasis doc §1 test 1: never colour a "not" clause. The hero colours one.

**Fit constraint (measured):** each H1 line is `whitespace-nowrap`.
- **Mobile 375 px:** 45 px type in a 343 px column, about 15 Latin or about 12 Arabic characters per line.
- **lg 1024 px:** 73.7 px type in a 459 px EN / 540 px AR column. "not assembled." measures 438 px, which is why the current H1 fits.
- **Overflow window:** any descriptive line longer than about 14 characters overflows into the sub column between about 1024 and 1240 px.
  - "Custom websites" is +26 px at 1024.
  - "in Arabic & English." is +79 px at 1024 and fits at 1440 (757 / 831).
  - "بالعربية والإنجليزية" is +10 px at 1024 and fits at 343 on mobile without the final period (the version with the period measures 348).
- **Fix every option needs:** at lg, stack the sub under the H1 until xl, or lower the lg type tier. This is a one-line CSS change, but it sits on the CMP-001 / RUL-124 display, so Ali decides.

**Option A — recommended (offer + differentiator + keyword)**
- `hero.title_line1` EN: "Custom websites" | AR: "مواقع مخصصة"
- `hero.title_line2` (keeps the iris gradient; what the client gets, so Colour is correct) EN: "in Arabic & English." | AR: "بالعربية والإنجليزية"
- `hero.sub`
  - EN: "For businesses in Egypt and the Gulf: websites and web applications designed and built in Cairo. See your price range before any call; the code is yours at final payment."
  - AR: "للشركات في مصر والخليج: مواقع وتطبيقات ويب نصمّمها ونبرمجها في القاهرة. اعرف نطاق السعر قبل أي مكالمة، والكود ملكك عند الدفعة الأخيرة."
- `hero.badge`: keep. It carries "Web design & development · Cairo" / "تصميم وتطوير مواقع".
- CTA pair:
  - Primary: Start a project (`describeTheBuild`).
  - Secondary: Estimate your project (`projectRange`, replacing `realBuild`). This matches the header pill, so the first view stops showing two different asks. Work has only 3 projects and gets its own section later.
- **Why recommended:**
  - Bilingual, native-RTL building is the one differentiator a stranger can check on this very site (switch to /ar).
  - It matches the keyword map: "custom website development / bilingual Arabic English website", "موقع بالعربية والإنجليزية".
  - The sub carries "for whom" and "why trust" (a public price and code ownership), which are both verifiable.
- AR variant if Ali prefers the head keyword: line 1 "تصميم مواقع", which is shorter and fits everywhere.

**Option B — trust-led (price as the promise)**
- `title_line1` EN: "Custom websites," | AR: "مواقع مخصصة،"
- `title_line2` (gradient: a price they can trust) EN: "priced in public." | AR: "بسعر معلن."
  - "بسعر معلن مسبقًا." overflows by 2 px on mobile and 25 px at 1024.
- `sub`
  - EN: "Websites and web applications in Arabic and English, for businesses in Egypt and the Gulf. The estimator shows your range before any call, and the code is yours at final payment."
  - AR: "مواقع وتطبيقات ويب بالعربية والإنجليزية، للشركات في مصر والخليج. تعرض لك أداة التقدير نطاق السعر قبل أي مكالمة، والكود ملكك عند الدفعة الأخيرة."
- CTA pair:
  - Primary: Estimate your project (`projectRange`). The H1 promises the price, so the button must keep that promise (NN/g "Get Started" link-promise).
  - Secondary: Start a project.
- Strongest risk-reversal for a studio with no record. Weaker as a search keyword: "custom websites" only.

**Option C — minimal edit (keeps the contrast voice)**
- `title_line1` EN: "Custom websites," | AR: "مواقع مخصصة،"
- `title_line2` EN: "not templates." | AR: "لا قوالب جاهزة."
- `sub` and CTAs: unchanged.
- Not recommended:
  - It still opens on a "not" stance.
  - It pre-empts the Problem section.
  - By §1 the "not" clause must be Italic, so the hero gradient would have to change (L4).

**Format:** the hero sub is plain (no `t.rich`); keep it plain, since the H1 carries the emphasis. Z pattern: H1 at top-start → sub / CTA at bottom-end. This is right, mirrored in AR.

**Also (L4, describe only):** the hero uses `Highlight tone="world"` (World italic). §0 reserves that for /services, and its map lists the hero as Colour `iris`. Align this when the display is next touched.

##### Header CTA — EDIT (L2, describe only)
Once hero Option A or B is in place, the header pill and one of the hero buttons are the same action, so the conflict ends. If Ali keeps the current hero pair instead, restyle the header pill as secondary while the hero is in view.

##### Problem — EDIT (L1)
**Why:** "Engineering" is a word the buyer never searches. "Most businesses…" is an unprovable claim about rivals. NN/g first-2-words: row titles must start with the carrying words.

**New copy:**
- `problem.title` EN: "Signs your website is a template," | AR: "علامات أن موقعك قالب جاهز،"
- `problem.titleItalic` (Italic: a "not" clause) EN: "not a custom build." | AR: "لا موقع مخصص."
- `problem.subtitle` EN: "Five things owners usually find out only after launch." | AR: "خمسة أشياء يكتشفها أصحاب المواقع عادةً بعد الإطلاق."
- Row titles:

| key | EN | AR |
|---|---|---|
| `problem.items[0].title` | "Same theme as your competitors" | "القالب نفسه لدى منافسيك" |
| `problem.items[1].title` | "Slow on phones" | "بطيء على الهاتف" |
| `problem.items[2].title` | "No real handover" | "لا تسليم حقيقي" |
| `problem.items[3].title` | "Every change costs more" | "كل تعديل يكلّف أكثر" |
| `problem.items[4].title` | "No developer you can reach" | "لا مطوّر تصل إليه مباشرة" |

- Descriptions: keep.

**Format:** no bold in rows; the spotted pattern comes from the numbers and drawings, which is right.

##### Ownership stack — EDIT (L1)
**Why:** "skin the surface" is a metaphor. A "custom website" intent belongs in the heading. Under emphasis §1 the gradient may sit only on what the client gets.

**New copy:**
- `ownershipStack.eyebrow` EN: "What you get" | AR: "ما تحصل عليه"
- `ownershipStack.title` EN: "What a custom website includes:" | AR: "ما يتضمنه الموقع المخصص:"
- `ownershipStack.titleAccent` (Colour: what the client gets) EN: "five layers, all in your name." | AR: "خمس طبقات، كلها باسمك."
- `layers.application.detail`
  - EN: "Your business rules, sign-in, payments and integrations, written as your own code, not plugins."
  - AR: "قواعد عملك، وتسجيل الدخول، والمدفوعات، والربط مع الأنظمة الأخرى، مكتوبة ككود خاص بك، لا إضافات جاهزة."
- `layers.data.detail`
  - EN: "A PostgreSQL database designed for your records, documented so another developer can work on it."
  - AR: "قاعدة بيانات PostgreSQL مصمَّمة لسجلاتك، وموثّقة ليستطيع أي مطوّر آخر العمل عليها."

Sheet heights are fixed; both new texts are shorter than the current ones. Other keys: keep.

##### Services — EDIT (L1)
**New copy:** `services.title` (split at the period) EN: "Four services. Choose by the problem you have." | AR: "أربع خدمات. اختر حسب المشكلة التي أمامك."

**Why:** the rows are already questions in the buyer's own words ("Need a site that explains what you sell?"). The title should point at them, not at an abstract "standard". Subtitle: keep; it carries the keywords.

**CTA:** one visible primary at a time (accordion), so this is acceptable. The "Not sure" pair is the right mid-page decision point.

##### Process — EDIT (L1; shared keys with /process)
| key | EN | AR |
|---|---|---|
| `process.phases.wireframe.headline` | "Agree on pages and content before visual design." | "نتفق على الصفحات والمحتوى قبل التصميم المرئي." |
| `process.phases.development.headline` | "Build the site and its back end to the approved design." | "نبني الموقع وأنظمته وفق التصميم المعتمد." |
| `process.phases.launch.headline` | "Go live, then hand over the code and the accounts." | "نطلق الموقع، ثم نسلّمك الكود والحسابات." |

Title and subtitle: keep. The single `<strong>` in the subtitle, on sign-off, is correct (RUL-060).

##### Work — EDIT (L1)
- `work.selectedWork` EN: "Shipped projects" | AR: "مشاريع أطلقناها"
- `commercial.ctas.realBuild` (global label: hero, work, trust) EN: "See the case studies" | AR: "شاهد دراسات الحالة"
  - It says what opens (NN/g "Get Started").

Sentence heading: keep. It names the three projects honestly, and "All three are live" is verifiable.

##### Trust — REBUILD (L1 copy; L3 order + removal)
**Why:**
- The brief says no testimonial can be verified. A quote signed only by a company name is weak proof, and it is risky if challenged.
- Google: "Trust is most important" among E-E-A-T.
- The checks register is the honest proof and should lead.

**Structural changes (L3, existing components):**
1. Move the checks register directly under the heading.
2. Remove the testimonial ledger until Ali has named, consented quotes. See Needs Ali.

**New copy:**
- `commercial.trust.title` EN: "You talk to the engineer" | AR: "تتحدث مع المهندس"
- `commercial.trust.titleAccent` (Colour) EN: "who builds your site." | AR: "الذي يبني موقعك."
- `commercial.trust.body`
  - EN: "No account manager and no sales layer between you and the work. <strong>Replies come within 24 hours on business days</strong>, from the person writing your code."
  - AR: "لا مدير حساب ولا طبقة مبيعات بينك وبين العمل. <strong>يصلك الرد خلال 24 ساعة في أيام العمل</strong>، ممن يكتب كود موقعك."
- `work.labels.integrity` (founder strip label; used only at trust-section.tsx:261) EN: "Written down" | AR: "مكتوب"
- `commercial.trust.founder.body`
  - EN: "Everything this studio promises is written down: the price range on this site, the thresholds on the Standards page, the terms in your contract. <strong>If it is not written, do not rely on it.</strong>"
  - AR: "كل ما تعد به هذه الشركة مكتوب: نطاق السعر على هذا الموقع، والحدود في صفحة المعايير، والشروط في عقدك. <strong>ما لم يُكتب، لا تعتمد عليه.</strong>"
  - This drops the `<dim>`, leaving one emphasis idea per paragraph (RUL-060).

**Format:** one `<strong>` per paragraph, each on a commitment. Checks: keep the copy; layer-cake on the numbered h4s is right.

##### Transparent by design — EDIT (L1) + L3
- `commercial.ctas.viewTransparency` EN: "How estimates are calculated" | AR: "كيف يُحسب التقدير"
  - This is the anchor it opens.
- L3: render "Estimate your project" as the section's primary `CtaButtonGroup`. It is the page's main self-serve decision point, so there is one primary in view.
- L3: move the section up to directly after Ownership, before the inverted scene. This puts the differentiator before 8 screens of services and process and fills the CTA desert. Both sections are blue; the heading is Plain, so there is no same-world Colour clash (§3).
- Copy: keep. "You see the price before you talk to us." is the clearest heading on the page.

##### FAQ — EDIT (L1; `faq.title` is shared with /faq)
- `faq.title` EN: "Questions to ask before you start a website." | AR: "أسئلة تطرحها قبل أن تبدأ موقعك."
- `faq.questions.11.answer`: split the last paragraph after "Pricing page." → two `<p>`s. EN and AR wording unchanged.
- The bold labels in answers 03 and 11 are functional list labels; keep them.

##### Needs Ali
1. **Hero:** pick A, B or C, and approve the lg fit fix (stack the sub until xl, or a smaller lg type tier). This touches the CMP-001 / RUL-124 display.
2. **Testimonials:** remove them, or supply a named person, role and written consent per quote. The NewLight "day one" claim is unverifiable.
3. **Section order:** Transparency after Ownership (L3).
4. **Hero secondary CTA:** Estimate instead of Work (Option A).
5. Shared keys: may the `process.phases.*.headline` changes also land on /process, and should `faq.title` change on /faq too or get a new homepage key (L3)?
6. Site-wide label changes: `realBuild`, `viewTransparency`.

##### Sources
- https://www.nngroup.com/articles/homepage-design-principles/
- https://www.nngroup.com/articles/tagline-blues-whats-the-site-about/
- https://www.nngroup.com/articles/f-shaped-pattern-reading-web-content/
- https://www.nngroup.com/articles/first-2-words-a-signal-for-scanning/
- https://www.nngroup.com/articles/get-started/
- https://developers.google.com/search/docs/fundamentals/creating-helpful-content
- House rules: `docs/section-heading-emphasis.md` §0, §1, §3 and §5; RUL-060; RTL-071; CMP-001 / RUL-124 (hero, L4).

### 10.9 Services: /services, /services/interface-design, /services/development

#### Audit — Services A: /services, /services/interface-design, /services/development (2026-10-05)
Read from: page.tsx/page-client.tsx of the three routes, services-hero-index, services-stage, interface-lab, dev-studio, service-brief, service-section, service-investment-line, technical-section, section-end-cta; messages en/ar servicesPage, services, serviceDetails.{webDesign,development}; live DOM `curl localhost:3000/{,ar/}services{,/interface-design,/development}`.
Live price tokens (default schema): minimumEngagement = 22,000 EGP, auditPrice = 12,000 EGP, maintenanceEssential = 2,500 EGP, delivery 2–8 weeks, warranty 30 days. Never typed below; only `{tokens}`.
Page-wide facts from DOM: body copy never says "Cairo"/"القاهرة" (count 1 = footer only); `<strong>` count: /services 1, interface-design 0, development 1. EN "web design" 0 on all three; AR "برمجة مواقع" 0 on /development.

#### Services index (`/services`)
Reading pattern now → right pattern: Z hero (no CTA) → 250svh pinned photo plate (spotted, one line at a time) → horizontal card track (2 of 3 cards off-screen on desktop) → FAQ layer-cake → Z close. Right: Z hero with CTA → layer-cake comparison of 4 services, all visible, each with price + time + link.
CTA map: hero — none ; plate — none ; stage — 4× "What it includes" → sub-pages [secondary, text] ; "See the project process" → /process [secondary] ; "View pricing" (scopeProjects) → /pricing [secondary] ; FAQ — "All questions" → /faq [secondary] ; close — "Start a project" (describeTheBuild) → /contact [primary] + "View our work" (realBuild) → /work [secondary]. Gaps: no primary until the last section (~6–7 screens incl. the 250svh pin); hero has none.

| # | section (component) | job | verdict + level | problem |
|---|---|---|---|---|
| 1 | Hero (ServicesHeroIndex) | say what is sold, to whom, first step | EDIT L2 + L3 | H1 has no service keyword ("web design/development services"); `<strong>` spans the whole 4-item list (decoration, RUL-060); no CTA |
| 2 | Photo plate (ServicesStage › PhotoLayer) | the 4 guarantees every service carries | EDIT L1 + L3 | strongest trust copy has no heading (eyebrow is a `<p>`), so it can't rank or be quoted; item 4 says "stay in your name" but ownership passes at final payment |
| 3 | Stage heading + 3 moments (ServicesStage) | compare 4 services, route to the right one | EDIT L1 | h2 "Before, during and after the build." is abstract; service names don't match search ("Interface Design", "Custom Development"); big line per card (`leaves`) is a slogan, plain facts sit in small grey |
| 4 | Card engagement lines | cost + time per service | EDIT L1 | website + portal say "priced per scope" although a floor is published ({minimumEngagement}); no delivery time anywhere on the page; maintenance shows no figure |
| 5 | `stage.return` line | — | REMOVE L3 | insider loop ("becomes the brief for the next audit") |
| 6 | Process / cost link rows | secondary routes | KEEP | labels front-load the destination |
| 7 | FAQ (ServiceFaqSection) | which service, price basis, ownership | KEEP | good question set; Q4 "Interface design is scoped per project" depends on Needs Ali #1 |
| 8 | Close (SectionEndCta) | one primary action | EDIT L0 | body lacks the reply time every other close states |

##### 1 Hero — EDIT (L2) + CTA (L3)
- why: heading + first sentence must name the offer (NN/g first 2 words); H1 is the strongest on-page signal for "web design and development services / خدمات تصميم وبرمجة المواقع" (research §4).
- `servicesPage.title` EN: "Web design and development services," | AR: "خدمات تصميم وبرمجة المواقع،"
- `servicesPage.titleItalic` EN: "from first audit to after launch." | AR: "من المراجعة الأولى إلى ما بعد الإطلاق."
- `servicesPage.description` EN: "Website design, custom website and web app development, a fixed-price technical audit and monthly maintenance, in Arabic and English. <strong>Each one is scoped and priced in writing before work starts.</strong>" | AR: "تصميم المواقع، وبرمجة المواقع وتطبيقات الويب المخصصة، ومراجعة تقنية بسعر ثابت، وصيانة شهرية، بالعربية والإنجليزية. <strong>لكل خدمة نطاق وسعر مكتوبان قبل بدء العمل.</strong>"
- format: one bold = the commitment, not the list. 2 sentences, ~35 words.
- structural (L3): add `CtaButtonGroup` under description: primary describeTheBuild, secondary projectRange.

##### 2 Photo plate — EDIT (L1) + heading (L3)
- `servicesPage.chapters.plate.eyebrow` EN: "What every service includes" | AR: "ما تشمله كل خدمة"
- `servicesPage.chapters.plate.items[3]` EN: "Code, designs and accounts pass to you at the final payment." | AR: "الكود والتصاميم والحسابات تنتقل إليك عند الدفعة الأخيرة."
- structural (L3): render the eyebrow as `h2` (visually unchanged). (L4, describe only: the 250svh pin before any service is listed delays the answer; consider placing the plate after the cards.)
- note: same `plate.items` feed the homepage services section — change helps both.

##### 3 Stage heading + card names/leaves — EDIT (L1)
- `servicesPage.stage.title` EN: "Four services," | AR: "أربع خدمات،"
- `servicesPage.stage.titleItalic` EN: "matched to where your project is." | AR: "حسب المرحلة التي بلغها مشروعك."
- `servicesPage.capabilities.interfaceDesign` EN: "Website Design" | AR: "تصميم المواقع"
- `servicesPage.capabilities.development` EN: "Website & Web App Development" | AR: "برمجة المواقع وتطبيقات الويب"
- `servicesPage.capabilities.consulting` EN: "Technical Audit" | AR: "المراجعة التقنية"  (the only thing sold under it is the audit; consulting-page agent to confirm)
- `servicesPage.services.website.leaves` EN: "A custom website in Arabic and English, built around one main action." | AR: "موقع مخصص بالعربية والإنجليزية، مبني حول إجراء رئيسي واحد."
- `servicesPage.services.portal.leaves` EN: "A dashboard, client portal or internal tool built around how your team works." | AR: "لوحة تحكم أو بوابة عملاء أو أداة داخلية مبنية على طريقة عمل فريقك."
- `servicesPage.services.audit.leaves` EN: "A written answer on rebuild or repair, in five business days." | AR: "إجابة مكتوبة: إعادة بناء أم إصلاح، خلال خمسة أيام عمل."
- `servicesPage.services.maintenance.leaves` EN: "Your live site kept secure, backed up and updated every month." | AR: "موقعك المنشور آمن ومنسوخ احتياطياً ومحدَّث كل شهر."
- format: big line now front-loads the deliverable noun; `outcome` lines unchanged. Capabilities + leaves are also read by the homepage services section and nav; homepage agent should see this.

##### 4 Card engagement lines — EDIT (L1)
- `servicesPage.services.website.engagement` EN: "From {minimumEngagement}, fixed in the proposal · {deliveryWeeksMin}–{deliveryWeeksMax} weeks" | AR: "من {minimumEngagement}، ويُثبَّت في العرض · من {deliveryWeeksMin} إلى {deliveryWeeksMax} أسابيع"
- `servicesPage.services.portal.engagement` EN: "Priced from the published range by complexity, fixed in the proposal · {deliveryWeeksMin}–{deliveryWeeksMax} weeks" | AR: "يُسعَّر من النطاق المنشور حسب التعقيد، ويُثبَّت في العرض · من {deliveryWeeksMin} إلى {deliveryWeeksMax} أسابيع"
- `servicesPage.services.audit.engagement` EN: "{auditPrice} fixed, five business days, credited against the build" | AR: "{auditPrice} سعر ثابت، خمسة أيام عمل، يُخصم من البناء إن مضيت فيه"
- `servicesPage.services.maintenance.engagement` EN: "From {maintenanceEssential} a month, three plans" | AR: "من {maintenanceEssential} شهرياً، ثلاث خطط"
- note: `Discipline` already passes pricingTokens to `t()`; `maintenanceEssential` is "" if the plan price is null — guard or keep old text then.

##### 5 `stage.return` — REMOVE (L3); delete key + its `<p>`.
##### 8 Close — EDIT (L0)
- `servicesPage.loop.close.body` EN: "Describe the site, application or problem. We reply within 24 hours on business days with the service that fits and the next step." | AR: "صف الموقع أو التطبيق أو المشكلة، ونرد عليك خلال 24 ساعة في أيام العمل بالخدمة المناسبة والخطوة التالية."
- dead keys (L0 delete): `servicesPage.loop.close.statement`, `chapters.eyebrow`, `chapters.engagementLabel`, `chapters.leftWith` (no reader in app/components/lib).

#### Website design (`/services/interface-design`)
Reading pattern now → right pattern: Z hero → 6 sticky rows at 78vh each (~5 screens of commitment reading) → layer-cake fit/steps/terms → spotted price line → FAQ → Z close. Right: Z hero → layer-cake in buyer order (for whom → what you get + price → how long → method).
CTA map: hero — "Start a project" (describeTheBuild) → /contact [primary] + "View our work" (realBuild) → /work [secondary] ; investment — "Estimate your project" (projectRange) → /transparency [secondary, text] ; FAQ — "All questions" → /faq ; close — "Start a project" [primary] + "Schedule a consultation" (technicalCall) → /schedule [secondary]. Gap: hero → investment ≈ 11 screens with no CTA.

| # | section | job | verdict + level | problem |
|---|---|---|---|---|
| 1 | LabHero | name the service + first step | REBUILD L1–L2 | H1 "Design you can test." needs inference, no keyword (keyword only in eyebrow); "not a taste you have to trust" postures; 0 `<strong>` |
| 2 | StackedRows | how pages are designed (method) | EDIT L1 + order L2 | "Six disciplines, one system." — they are rules, not disciplines; 5 screens before the buyer learns who it's for or the price |
| 3 | ServiceFit | for whom / not | KEEP (+L1 emphasis) | clear, honest "not a fit"; "not a mood board." uses world-italic on a "not" clause → dimmed italic per heading-emphasis §0 rule 1 |
| 4 | ServiceSteps | how long, your part | KEEP | live phase lengths (1 session, 2–5 days, 2–7 days) — good |
| 5 | ServiceTerms | what you get + price drivers | KEEP | |
| 6 | ServiceInvestmentLine | cost | Needs Ali | shows "Scoped per project" — no figure; the build price already includes the design phase, but the page never says so |
| 7 | FAQ | objections | EDIT L0 | no cost question (top intent "تكلفة تصميم موقع / website design cost") |
| 8 | Close | action | KEEP | clear, has reply time |

##### 1 LabHero — REBUILD (L1–L2)
- why: the 5-second test fails; the keyword only sits in the eyebrow (Google helpful-content: descriptive titles/headings — not opened, see Sources); posture against "taste" helps no new studio.
- `serviceDetails.webDesign.lab.hero.title` EN: "Website and interface design," | AR: "تصميم مواقع وواجهات،"
- `serviceDetails.webDesign.lab.hero.titleAccent` EN: "built on rules you can check." | AR: "بقواعد يمكنك التحقق منها."
- `serviceDetails.webDesign.lab.hero.description` EN: "Custom website design in Arabic and English: the sitemap, page structure, responsive screens and a design system your team can extend. <strong>Every page is designed around one action</strong>, and you approve the structure before any visual work starts." | AR: "تصميم مواقع مخصص بالعربية والإنجليزية: خريطة الموقع وبنية الصفحات وشاشات متجاوبة ونظام تصميم يستطيع فريقك البناء عليه. <strong>كل صفحة تُصمَّم حول إجراء واحد</strong>، وتوافق على البنية قبل أن يبدأ أي عمل بصري."
- `serviceDetails.webDesign.lab.hero.card` EN: "Structure first, then screens, and you approve each before the next." | AR: "البنية أولاً ثم الشاشات، وتوافق على كل منهما قبل التالي."
- format: description becomes `t.rich(…, bodyMarks)` (L1 code); one bold. Delete unused `…hero.cardLink`.

##### 2 StackedRows — EDIT (L1) + reorder (L2)
- `serviceDetails.webDesign.lab.rows.eyebrow` EN: "How we design" | AR: "كيف نصمّم"
- `serviceDetails.webDesign.lab.rows.title` EN: "Six rules" | AR: "ست قواعد"
- `serviceDetails.webDesign.lab.rows.titleAccent` EN: "every page is designed by." | AR: "تُصمَّم بها كل صفحة."
- `serviceDetails.webDesign.lab.rows.items[1].title` EN: "The visitor's path comes first." | AR: "مسار الزائر أولاً."
- structural (L2): order → LabHero, ServiceFit, ServiceTerms, investment, ServiceSteps, StackedRows, FAQ, close. (L4: 6×78vh sticky rows could be shorter; describe only.)

##### 3 ServiceFit — emphasis only (L1): drop `italicWorld` for negative second clauses (applies to `ServiceSection`; same on /development "cannot hold.").
##### 7 FAQ — EDIT (L0), new item 2 (after "What does … include?"), pending Needs Ali #1
- `serviceDetails.webDesign.faq.items[+]` q EN: "How much does website design cost?" | AR: "كم تكلفة تصميم موقع؟"
- a EN: "Design is part of every website build, which starts from {minimumEngagement} and is fixed in your proposal. Design ordered on its own, without our build, is scoped per project." | AR: "التصميم جزء من كل بناء موقع، ويبدأ سعره من {minimumEngagement} ويُثبَّت في عرضك. أما التصميم وحده، دون أن نتولى البناء، فيُحدَّد لكل مشروع."

#### Website & web app development (`/services/development`)
Reading pattern now → right pattern: Z hero → word-read statement → 240svh kinetic words → 240svh tile image → layer-cake builds → spotted facts → layer-cake fit/steps/terms → spotted price → FAQ → Z close. ~6 screens of display type before the first list of what is built. Right: Z hero → layer-cake (what → for whom → price → how long → handover).
CTA map: hero — "Start a project" (describeTheBuild) → /contact [primary] + "Talk through the architecture" (architecture) → /contact?service=development&track=architecture [secondary] ; investment — "Estimate your project" (projectRange) → /transparency?projectType=webapp [secondary, text] ; FAQ — "All questions" ; close — "Start a project" [primary] + "Talk through the architecture" [secondary]. Gaps: hero → investment ≈ 15 screens without a CTA; hero's two buttons both open /contact (competing, same next step).

| # | section | job | verdict + level | problem |
|---|---|---|---|---|
| 1 | StudioHero | name the service + first step | REBUILD L1 | H1 "Engineered to outlast the brief." is the same slogan family Ali rejected on the homepage; no keyword (AR "برمجة مواقع" absent from body); cardText vague ("clarity, scale") |
| 2 | StudioStatement | how we build | EDIT L0 | fine idea, abstract wording; eyebrow "About the work" generic |
| 3 | StudioWords | — | REMOVE L3 (L4 signature) | 240svh for 4 verbs + slogan caption; zero information |
| 4 | StudioTiles | announce what we build | EDIT L0 | h2 "Systems, not pages." is a slogan and contradicts the "Websites" row that follows |
| 5 | Builds (ServiceTerms builds) | four kinds of system | KEEP (eyebrow EDIT L0) | explicit, front-loaded labels; "In practice" eyebrow says nothing |
| 6 | StudioFacts | verifiable commitments | EDIT L0 | h2 "Key facts" generic; ownership "100%" omits "at the final payment" |
| 7 | ServiceFit | for whom | KEEP (+L1 emphasis, see above) | |
| 8 | ServiceSteps | how long | KEEP | states {deliveryWeeksMin}–{deliveryWeeksMax} weeks + phase lengths + payment points |
| 9 | ServiceTerms | handover + drivers | KEEP | |
| 10 | Investment line | cost | KEEP copy; label EDIT (other ns) | "From {floor}" good; eyebrow "Service investment" is a euphemism (AR says "أسعار الخدمات") |
| 11 | FAQ | objections | KEEP | covers template vs custom, time, stack, ownership, payment split |
| 12 | Close | action | EDIT L0 | gradient on "not the stack." colours a "not" clause (§0 rule 1; SectionEndCta forces `accent="world"`) |

##### 1 StudioHero — REBUILD (L1)
- `serviceDetails.development.studio.title` EN: "Custom website and" | AR: "برمجة مواقع"
- `…studio.titleAccent` EN: "web app development." | AR: "وتطبيقات ويب مخصصة."
- `…studio.hero.cardLabel` (eyebrow) EN: "Next.js · Arabic and English" | AR: "Next.js · بالعربية والإنجليزية"
- `…studio.hero.cardText` EN: "Websites, client portals, dashboards and integrations, handed over with the code, schema and documentation." | AR: "مواقع وبوابات عملاء ولوحات تحكم وتكاملات، تُسلَّم مع الكود والمخطط والتوثيق."
- `serviceDetails.development.description` KEEP (one bold on what is built).
- CTA (L1, dev-studio.tsx): hero secondary → projectRange + `?projectType=webapp` ("Estimate your project"); keep architecture only in the close.

##### 2 StudioStatement — EDIT (L0)
- `…studio.statement.eyebrow` EN: "How we build" | AR: "كيف نبني"
- `…studio.statement.text` EN: "We plan the data, roles and screens before writing code, so the next developer, yours or ours, can read it, change it and own it." | AR: "نخطط البيانات والأدوار والشاشات قبل كتابة الكود، ليستطيع المطوّر التالي، من فريقك أو فريقنا، أن يقرأه ويعدّله ويمتلكه."

##### 3 StudioWords — REMOVE (L3). If Ali keeps it (L4 signature): `…studio.words.caption` EN: "From scope to handover" | AR: "من النطاق إلى التسليم".
##### 4 StudioTiles — EDIT (L0)
- `…studio.tiles.title` EN: "Websites, portals, dashboards." | AR: "مواقع، بوابات، لوحات تحكم."
##### 5 Builds eyebrow — EDIT (L0)
- `serviceDetails.development.brief.builds.eyebrow` EN: "What each one includes" | AR: "ما يشمله كل نوع"
##### 6 StudioFacts — EDIT (L0)
- `…studio.facts.title` EN: "What every build is held to" | AR: "ما يلتزم به كل بناء"
- `…studio.facts.description` EN: "Written into the scope, and checkable after launch." | AR: "مكتوبة في النطاق، ويمكنك التحقق منها بعد الإطلاق."
- `…studio.facts.ownership.text` EN: "Of the custom source code, schema and documentation, in your repository and yours at the final payment." | AR: "من الكود المصدري المخصص والمخطط والتوثيق، في مستودعك وملكك عند الدفعة الأخيرة."
##### 10 Investment label — EDIT (L0, `pricingModel` namespace, shared — owner's call)
- `pricingModel.sections.invest.title` EN: "What it costs" | AR: "التكلفة"
##### 12 Close — EDIT (L0)
- `serviceDetails.development.close.title` EN: "Describe the system" | AR: "صف النظام"
- `…close.titleAccent` EN: "you need built." | AR: "الذي تحتاج بناءه."
##### Order — structural (L2/L3)
StudioHero → StudioStatement → Builds → ServiceFit → investment → ServiceSteps → ServiceTerms → StudioFacts → FAQ → close; StudioWords removed; StudioTiles optional (L4).

#### Homepage services section (`services.json`, read by components/sections/services-section.tsx)
Layout belongs to the homepage audit; keys only.
| key | verdict | note |
|---|---|---|
| `services.title` "Four services. One delivery standard." | KEEP | the standard list follows directly, so it is literal |
| `services.subtitle` | KEEP | keyword-rich, plain |
| `services.next.description` | EDIT L0 | ASCII hyphen as dash; "discipline" is insider |
- `services.next.description` EN: "Describe the problem in your own words. We name the service that fits, or tell you it isn't us, and why." | AR: "صف المشكلة بكلماتك. نسمّي لك الخدمة المناسبة، أو نخبرك أننا لسنا الخيار المناسب، ولماذا."
- It also reads `servicesPage.capabilities.*`, `services.*.leaves/problem/deliverables` and `chapters.plate.items` — edits in §§2–3 above land on the homepage too.

##### Needs Ali
1. Is website/interface design sold on its own (without our build)? If no: investment line + FAQ should say "included in every build"; the design `how/figure` copy lives in `@repo/pricing-schema` (copy.design), not in messages. If yes: publish a design floor in the schema.
2. Capability renames (Website Design / Website & Web App Development / Technical Audit) change nav, homepage and breadcrumbs labels — approve as a set.
3. Location: add "Cairo / القاهرة" to body copy (keyword "web development Cairo", "شركة برمجة مواقع في القاهرة")? Research §7 still has location targeting unconfirmed — no Cairo line written here until it is.
4. "Within 24 hours on business days" now on every services close — confirm it holds (research §7).
5. Remove StudioWords / StudioTiles (development) and shorten StackedRows (interface-design): these are signature motion devices (L3/L4) — Ali's call.

##### Sources
- NN/g, First 2 words: https://www.nngroup.com/articles/first-2-words-a-signal-for-scanning/ (opened) — front-load headings/labels; avoid made-up terms.
- NN/g, Text scanning patterns: https://www.nngroup.com/articles/text-scanning-patterns-eyetracking/ (opened) — F / spotted / layer-cake / commitment; layer-cake is the effective scan for long pages.
- Not opened (fetch limit hit): Google helpful content https://developers.google.com/search/docs/fundamentals/creating-helpful-content ; NN/g show price https://www.nngroup.com/articles/show-price/ (cited by the 2026-10-04 pass).
- House: docs/section-heading-emphasis.md §0 (opened); RUL-060 / RTL-071 per the brief; docs/content-research-2026-10.md §3.2, §4, §5, §7, §8 (opened).


### 10.10 Synthesis — what to rebuild, CTA map, reading format, decisions

This section pulls together the page audits in §10.2–§10.9. It adds no new copy: every proposed text lives in the § cited on each row. Change levels follow the brief: L0–L2 are copy, emphasis and order; L3 adds or removes an element using existing components; L4/L5 are identity changes, described only.

#### Cross-site patterns

- **Slogan H1s with no keyword.** Most H1s state a stance, not the offer, so they fail the 5-second test and carry no search term. Examples: home "Engineered, not assembled." (§10.8), /services/development "Engineered to outlast the brief." (§10.9), /services/interface-design "Design you can test." (§10.9), /pricing hero (§10.5), consulting "Your system is already telling you what is wrong." (§10.6), /about "Four commitments…" (§10.3), /process, /approach, /standards, /how-we-work and /faq (§10.7), /writing (§10.4), /contact (§10.2) and /services (§10.9).
- **Colour on "not …" or loss clauses (emphasis §0 rule 1).** Affected: the home hero gradient (§10.8); `italicWorld` on "not packages." on /pricing (§10.5); bad news in world gradient on the consulting hero and cost curve (§10.6); the mint gradient on the maintenance plans h2 (§10.6); "not a mood board." and "not the stack." on the design and development pages (§10.9); and the endCta accents "not an account manager." and "this page missed." (§10.2). The home Ownership gradient sits on "We engineer…", which describes how we work, not what the client gets (§10.8). The "not X — it is Y" voice tic appears 12 or more times across the method pages (§10.7).
- **CTA deserts.** Hero to first real action: /services/development about 15 screens and interface-design about 11 (§10.9), /pricing about 10+ (§10.5), home about 8.5 (§10.8), /services about 6–7 (§10.9), /process and /approach about 6 (§10.7), consulting about 5 (§10.6), and 4–6 screens inside each article (§10.4).
- **Competing primaries, or one destination twice.** The home header pill and hero pill ask for different things (§10.8). Both development hero buttons open /contact (§10.9). Both /pricing end CTAs go to /transparency (§10.5). The /transparency end CTA bypasses the result panel (§10.5). Articles end with five asks in a row (§10.4). Three labels exist for "book a call" across the chrome (§10.2). Consulting uses two labels for one action (§10.6).
- **Claims the repo or the facts do not back.** Testimonials with no named person appear on home Trust and on case studies (§10.3, §10.8). "Measured on every deploy" and the CI gate describe a pipeline that does not exist (§10.7). The same claim appears in FAQ 03/13 and the nextjs article (§10.4, §10.7). Several phrases imply a client base or a team: "Questions clients ask" (§10.7, §10.8), "every client asks" (§10.7), "Selected work" (§10.3, §10.8), "Leadership" (§10.3) and "engineers who know the codebase" (§10.6). Also unbacked: "never in hours" next to per-hour overage (§10.6), "stay in your name" and "100%" ownership with no mention of final payment (§10.9), "Fastest reply" (§10.2), 2024 article dates (§10.4) and the Altruvex Sans type note (§10.7).
- **Repeated facts and cannibalisation.** Ownership at final payment appears 9 times and the changes policy 4 times across the method pages, and the FAQ 05 version has drifted from the /how-we-work version (§10.7). The 21 FAQ answers contain no links (§10.7). The /pricing floor is shown 5 times (§10.5). The "24 hours on business days" promise is hard-coded in 10+ places (§10.2).
- **Bold misuse.** Some pages have too much: /faq carries 41 bolds (§10.1, §10.7), articles carry 10–21 list lead-ins with none on a key fact (§10.4), and /approach has 7 strong + 3 dim in 6 paragraphs (§10.7). Service pages have almost none (0–2) (§10.1). Some bolds sit on decoration or weak claims: the whole /services list (§10.9), the name trivia in the /about hero (§10.3), the least-verified Art Lighting claim (§10.3), "built in" on /standards (§10.7) and FAQ 01 (§10.7). One misuse is the reverse: on /writing, a trust claim is set in Dim (§10.4).
- **Arabic terminology drift.** Three labels for how-we-work and three for the audit (فحص / مراجعة / تدقيق) (§10.2). Bare "النطاق" appears 77 times, meaning scope, price range and domain (§10.5). خطط vs باقات (§10.6). AR "التصميم" stands where EN means architecture on /approach (§10.7). AR eyebrows read "1 —" where EN reads "01 —" (§10.6). Server errors show in English on the AR site (§10.2).
- **Insider labels.** "Transparency" names the cost estimator, and "View transparency" names an anchor (§10.2, §10.5, §10.7, §10.8). "Investment" is used for prices (§10.5, §10.9). Other examples: "sales inbox" (§10.2), "engagement" and "Integration topology" (§10.6), "Interface Design" and "Custom Development" (§10.9), "Internal / Altruvex" (§10.3).
- **Proof shown late.** The live-site link is the last item in the case-study aside (§10.3). /about names the founder last and never links to /work (§10.3). The /pricing table is collapsed in section 03 (§10.5). Transparent by design sits 7th on home, and Trust puts its checks below the quotes (§10.8). The consulting offer arrives around screen 6 (§10.6). /services shows no delivery time anywhere (§10.9).

#### Verdict table

| page | REBUILD | EDIT | KEEP | highest L | § |
|---|---|---|---|---|---|
| Home `/` | Hero; Trust | 8: header CTA, Problem, Ownership, Services, Process, Work, Transparent by design, FAQ | Closing CTA | L4 (hero fit, describe only); copy L1, order L3 | §10.8 |
| /services | — (remove `stage.return`, L3) | 5: hero, photo plate, stage heading and names, engagement lines, close | link rows, FAQ | L3 (L4 note: plate position) | §10.9 |
| /services/interface-design | LabHero | 3: StackedRows (+ order L2), ServiceFit emphasis, FAQ | Steps, Terms, Close (investment line: Needs Ali) | L2 (L4 note: rows) | §10.9 |
| /services/development | StudioHero (remove StudioWords, L3) | 6: Statement, Tiles, Builds eyebrow, Facts, investment label, Close | Builds, Fit, Steps, Terms, FAQ | L3 (L4 if StudioWords kept) | §10.9 |
| /services/consulting | Hero (L2) | 6: cost curve, six questions, offer, FAQ, close, eyebrow digits | Fit, Steps | L3 (curve move/cut; L4 if signature) | §10.6 |
| /services/maintenance | — | 6: hero, example month, plans, FAQ, close, h1/h2 text nodes (L2) | Fit, Steps | L2 | §10.6 |
| /work | End CTA | 3: hero, stages, check | metadata | L1 | §10.3 |
| /work/[slug] ×3 | Client perspective (remove, L3) | 7: header (L3), glance, context, outcome, aside, end CTA, metadata | Decisions | L3 | §10.3 |
| /about | Hero; Founder route (+ move, L3) | 5: facts (+3 rows, L3), principles, fit, end CTA, metadata | PhotoStage | L3 (L4: founder photo) | §10.3 |
| /writing | — | 2: hero, intro | filters and list, end band | L1 | §10.4 |
| /writing/[slug] (template + 8 articles) | — | template (L2, removal L3); all 8 articles (L1–L2); new in-article CTA (L2) | byline, excerpt + Callout, contents rail | L3 | §10.4 |
| /pricing | Hero (secondary CTA L3) | 6: what changes the price, prices by service, payment and terms, FAQ, end CTA, AR sweep | How pricing works (copy; move L3) | L3 | §10.5 |
| /transparency | End CTA (L2 targets) | 5: header, live range, Q4, method title, FAQ | Q1–Q3, result panel | L2 | §10.5 |
| /process | Closing | 3: opening, phases, scope | PhotoBand | L1 | §10.7 |
| /how-we-work | — | 4: opening, agreement, map (+ FAQ row L3), closing | — | L3 | §10.7 |
| /approach | Opening; order chapters (L1–L2) | 2: refusals, closing | Handover | L2 | §10.7 |
| /standards | Opening; Gate (option A L0, or option B L3) | 2: chapters (order L2), end CTA | — | L3 (option B) | §10.7 |
| /faq | — | 11: hero, Q01, 03, 04, 11, 13, 14, 16, 20, end CTA, (links L1) | 13 answers | L1 | §10.7 |
| /contact | — | 5: hero, letter form (L2), direct lines, inquiry guide (L3), errors | receipt | L3 | §10.2 |
| /schedule | — | 4: facts, sentence form, success, SEO H2 | hero, FAQ | L1 | §10.2 |
| Chrome (nav, footer, palette, exit-intent, endCta, 404, validations) | — | nav, footer, palette (L2), exit-intent (L2), endCta (copy L1 + footnote L3), validations, 404 label | audit lead, offline, a11y | L3 | §10.2 |
| /privacy, /terms | — | terms "In short" summary (optional, L3) | both (legal flags only) | L3 (optional) | §10.2 |

**Rebuild from scratch (16 sections, plus 3 removals):**
- Home: Hero; Trust (§10.8).
- /services/interface-design: LabHero (§10.9).
- /services/development: StudioHero (§10.9).
- /services/consulting: Hero (§10.6).
- /work: End CTA (§10.3).
- /about: Hero; Founder route (§10.3).
- /pricing: Hero (§10.5).
- /transparency: End CTA (§10.5).
- /process: Closing (§10.7).
- /approach: Opening; Order chapters (§10.7).
- /standards: Opening; Gate (§10.7).
- Removals: case-study "Client perspective" (§10.3), the /services `stage.return` line (§10.9), and development StudioWords (§10.9).

#### Site-wide CTA map

| page | first-view primary | secondary | mid-page CTA points | closing CTA section | gaps found | proposed fix |
|---|---|---|---|---|---|---|
| Home | Header: Estimate your project → /transparency, **and** hero: Start a project → /contact | View our work → /work | Services "Not sure" block (Start a project + Schedule) after the rows; per-service pills hidden until a row opens; text links only in Process, Work, Trust, Transparency | Start a project + Schedule a consultation (KEEP) | Two primaries in first view; about 8.5 screens with no visible CTA; Transparency, the strongest decision point, ends in text links | Hero option A: secondary becomes `projectRange`. Transparency gets a primary button and moves after Ownership (§10.8) |
| /services | none (hero has no CTA) | — | 4× "What it includes" → sub-pages; process and pricing text links; FAQ "All questions" | Start a project + View our work | No primary for about 6–7 screens, including the 250svh pin | Add `describeTheBuild` + `projectRange` under the hero (L3). Put price and time on the cards. Add the reply line to the close (§10.9) |
| /services/interface-design | Start a project → /contact | View our work | Investment line: Estimate your project (text) | Start a project + Schedule | About 11 screens hero → investment | Reorder: Fit, Terms and investment before StackedRows (L2) (§10.9) |
| /services/development | Start a project → /contact | Talk through the architecture → /contact | Investment line: Estimate (`?projectType=webapp`) | Start a project + architecture | About 15 screens; both hero buttons open /contact | Hero secondary becomes `projectRange?projectType=webapp`. Remove StudioWords and reorder (§10.9) |
| /services/consulting | "Start with the audit" → `#audit-offer` (an anchor labelled as a start) | Schedule a consultation | Offer: Start with the audit → `technicalAudit` | Start with a technical audit + Schedule | About 5 screens to the first real action; two labels for one action | Hero primary goes to `technicalAudit`. Use one label. Drop or move the curve (§10.6) |
| /services/maintenance | View maintenance plans → #pricing | Start a maintenance plan | Plans: Start with Essential, Professional or Enterprise (per column) | Start a maintenance plan + View plans (links to its own page) | Close secondary links to its own page | Close secondary becomes `technicalCall` (§10.6) |
| /work | header only | — | Each stage: View case study + Visit domain | Start a project + Estimate | Acceptable: every screen ends in a link | Rebuild the end-CTA copy (§10.3) |
| /work/[slug] | header only | — | Aside: live site (last, after the stack), services links, back to work | Start a project + Schedule | No live-site link above the fold; on mobile it comes after the whole body | Add "Visit <domain>" under the summary (L3). Glance status shows the domain (§10.3) |
| /about | header only | — | Facts text links (services, standards, process, pricing); LinkedIn | Start a project + Schedule | No link to /work anywhere | Add a "What has shipped" facts row linking /work. Move Founder up. The end CTA names the person (§10.3) |
| /writing | none (right for an index) | — | — | Estimate (`projectRange`) + `technicalAudit` | none | KEEP (§10.4) |
| /writing/[slug] | none | — | none in the body; the end stacks MDX Next step, audit form, template Next step, next article, end band | `projectRange` + `technicalAudit` | 4–6 screen desert; four primaries after the last paragraph; audit form off-intent on 4 of 8 articles | One soft in-body link after the highest-intent H2. Delete the template block and `ARTICLE_CTA_MAP`. Audit form on 3 articles only (§10.4) |
| /pricing | Estimate your project → /transparency | none | none (in-page anchors only) | Estimate + View transparency (same page) | About 10+ screen desert; no call option on the page; both end CTAs go to one page | Hero secondary `technicalCall` (L3). CTA pair after the price table. End secondary becomes `technicalCall` (§10.5) |
| /transparency | header links to /pricing | — | Result panel: Request a formal proposal (primary), Schedule, How calculated; after submit: PDF, Schedule, WhatsApp | Start a project → /contact + View pricing | End CTA sends a visitor who has a range to /contact, where the answers are lost | End primary goes to the result's proposal request; secondary becomes `technicalCall` (§10.5) |
| /process | none | — | Scope: Payment terms (wrong key), View transparency | Start a project + View transparency | About 6-screen desert; `viewTransparency` used twice; no estimator link | `paymentTerms` key; `projectRange` link in Scope; close secondary becomes `projectRange` (§10.7) |
| /how-we-work | none | — | Map rows: Approach, Process, Standards | Start a project + View transparency | No /faq or /pricing#terms link; title "Agree the rules" does not match the button | Add an FAQ row (L3). New close title. Secondary becomes `projectRange` (§10.7) |
| /approach | none | — | Rail anchors only | Start a project + View transparency | About 6-screen desert (acceptable only with descriptive headings) | Descriptive chapter h2s; secondary becomes `projectRange` (§10.7) |
| /standards | none | — | none | Start with a technical audit + View our work | Secondary sends buyers to cases that carry no measurements | Secondary becomes `describeTheBuild` (§10.7) |
| /faq | none | — | 0 links in 21 answers | Start a project + Schedule | Answers name pages without linking; end-CTA title does not match the button | Add links inside answers (L1). New end-CTA copy (§10.7) |
| /contact | Send an inquiry (submit) | Schedule; Estimate (Direct lines) | — | none (right) | The exit-intent modal still mounts here | Suppress exit-intent here (§10.2) |
| /schedule | Request a call (submit) | Start a project | — | none (right) | none | Unify the call's name only (§10.2) |
| Chrome | Header: Estimate (primary) | Index panel: Schedule | Palette: Schedule, Estimate | endCta on every content page | No "Start a project" in the chrome; exit-intent says "Request a call" | Add Start a project + audit to the palette; exit-intent uses "Schedule a consultation" (§10.2) |

**Placement rules the audit applied**
1. One primary per view. Two different asks styled as primary in one screen is a defect (home header vs hero, development hero) (§10.8, §10.9).
2. Place a CTA right after proof or at a decision point: after the price table, after the estimator result, after the audit offer, with the live-site link (§10.3, §10.5, §10.6, §10.8).
3. No CTA desert longer than about 2 screens on long pages. Two exceptions were accepted: an index where every screen ends in a link (/work), and commitment pages whose headings let the reader skip (/approach) (§10.3, §10.7).
4. Every content page ends in one closing CTA section. Conversion, legal and utility pages have none. The closing pair must not send both buttons to one destination or link back to the same page (§10.2, §10.5, §10.6).
5. Labels say what happens next and match the destination's H1. A section title must match its button: "View transparency" and "Transparency" fail this, as do the /how-we-work and /faq closes (§10.2, §10.7).
6. One action gets one label site-wide: "Schedule a consultation", not "Request a call"; "Start with a technical audit", not "Start with the audit" (§10.2, §10.6).
7. The reply time is stated once, in `endCta.footnote`, and removed from the bodies (§10.2).
8. Pages about price or reading lead with Estimate; the other pages lead with Start a project. This should be recorded as a rule in `commercial.ts` (§10.2).

#### Reading format

| page | pattern now | right pattern | strong/bold verdict | paragraph/length issues | § |
|---|---|---|---|---|---|
| Home | Z hero + layer-cake | same; a scan should find facts, not stances | Trust: one strong per paragraph, on a commitment; Problem rows unbolded (right); Process subtitle's single strong is correct | Hero sub, the only clear copy, sits in the weaker column; FAQ answer 11's last paragraph is about 60 words | §10.8 |
| /services | Z hero → 250svh pinned plate (spotted) → horizontal track, 2 of 3 cards off-screen | Z hero with CTA → layer-cake of 4 services, all visible | 1 strong, spanning the whole list → move it to the commitment | Slogan is the big line on each card; the facts sit in small grey text | §10.9 |
| /services/interface-design | Z → 6 sticky rows, about 5 screens of commitment reading | Z → layer-cake in buyer order | 0 → one in the hero description | 6 × 78vh rows | §10.9 |
| /services/development | Z → statement → 2 × 240svh display blocks | Z → layer-cake (what, for whom, price, time, handover) | 1 (keep) | About 6 screens of display type before the first list | §10.9 |
| /services/consulting | Z → chart → 6-row ledger → price on screen 6 | layer-cake with the offer by screen 2 | Hero strong on the credit; offer strong on the roadmap | 2 paragraphs > 50 words (§10.1) | §10.6 |
| /services/maintenance | Z → month split → table → layer-cake | same (keep) | One on the hero scope sentence, one on overage | `<br>` with no space merges words in the h1/h2 text | §10.6 |
| /work | spotted stages + layer-cake check | same | One, on the verify action; check list unbolded | — | §10.3 |
| /work/[slug] | layer-cake + glance spotted on low-information values | layer-cake, with the spot on the domain | Bold moves from the least-verified claim to a checkable one | Art Lighting problem is one 55-word paragraph | §10.3 |
| /about | Z → facts → accordion (rows 02–04 unread) → founder last | layer-cake: who, what, where and proof in 2 screens | Bold moves from name trivia to the person; none inside the `dl` | — | §10.3 |
| /writing | list / layer-cake | same | One Strong per paragraph; no Dim on trust claims | About 140 words before the first article | §10.4 |
| Articles | Callout + layer-cake, then a 5-block end stack | same, with one end CTA | Lead-in bolds only for short parallel labels, plus ONE bold fact per article | 1–4 paragraphs > 50 words each; generic "Questions people ask" / "Next step" H2s | §10.4 |
| /pricing | layer-cake + spotted; table collapsed | spotted-first, table in view by screen 2 | FAQ: one Strong on the first clause, then Dim | Floor repeated 5 times; figures duplicated in §02 and §03 | §10.5 |
| /transparency | Z header → form (commitment) → layer-cake | same (keep) | Q4 hint bolds the price effect, not a truism; FAQ a2 strong first | — | §10.5 |
| /process | layer-cake | same | One strong, on the closing commitment | Scope note is 61 words with 4 ideas; chapters ≥ 92svh each | §10.7 |
| /how-we-work | spotted ledger | same | None needed (the value column is the emphasis) | — | §10.7 |
| /approach | commitment (prose, one-word h2s) | layer-cake with descriptive h2s | 7 strong + 3 dim → at most 1 strong per paragraph, no dim | Chapter content does not match chapter headings | §10.7 |
| /standards | spotted (20vw numerals) | same | One bold per chapter, on the commitment; drop the accessibility dim | 4 paragraphs > 50 words (§10.1) | §10.7 |
| /faq | spotted accordion | same | 41 → one per answer, on the answer itself; list labels allowed; at most 1 Dim span | Answers run 37–122 words; 6 bury the answer; h3 reads "01Why…" | §10.7 |
| /contact | F-ish (long muted intro, guide below the form) | Z / layer-cake, guide beside or above the form | No bold in the hero | Intro too long | §10.2 |
| /schedule, chrome, legal | Z / spotted / layer-cake | same (keep) | endCta bodies: at most 1 strong, on the next action | Privacy longest paragraph 72 words (KEEP) | §10.2 |

**Emphasis rules as applied**
1. One `<strong>` per paragraph, on the fact, number, commitment or next action. Never on a whole list, a sentence-length label or decoration (RUL-060) (§10.2, §10.4, §10.5, §10.7, §10.8, §10.9).
2. Bold lead-ins are kept only for short parallel list labels (4 words or fewer). Full-sentence lead-ins lose their bold (§10.4, §10.7).
3. Dim is for de-emphasis only, at most one per answer, and never on a trust claim (§10.4, §10.7).
4. Arabic uses bold, not italic, at the same weight as EN (RTL-071/073) (§10.3, §10.5).
5. Heading emphasis follows §0. Gradient goes only on what the client gets. "Not", loss and warning clauses use dimmed italic. `italicWorld` is for /services only (§10.5, §10.6, §10.8, §10.9).

#### Decisions for Ali (consolidated)

##### A. Facts only Ali knows

| # | question | options | audit recommends | § |
|---|---|---|---|---|
| 1 | Reply promise: is "24 hours on business days" true, including mid-project? Which business days apply (Egypt or Gulf)? | confirm / change the time | State it once, in `endCta.footnote` | §10.2, §10.7, §10.9 |
| 2 | Schedule hours and timezone | Cairo time / the visitor's time | Show the slot timezone | §10.2 |
| 3 | Is the discovery session free? | yes (say so on the /process close) / no | — | §10.7 |
| 4 | Revision rounds per design phase | a number → `revisionRounds` token for FAQ 16 | Keep the current copy until the token exists | §10.7 |
| 5 | Is design sold without our build? | yes → publish a floor in the schema / no → "included in every build" | — | §10.9, §10.5 |
| 6 | Is a logo/brand identity a real deliverable ("Starting fresh")? | yes / no | — | §10.5 |
| 7 | Cairo targeting in body copy | add "Cairo / القاهرة" / leave it out | No Cairo line until confirmed | §10.9 |
| 8 | Who you talk to: is Ali the engineer on every build, and does that stay true if a second developer joins? Founding year? | confirm / reword | — | §10.3, §10.7 |
| 9 | Testimonials | remove / named person + role + written consent | Remove now (case pages and home Trust) | §10.3, §10.8, §10.4 |
| 10 | Case facts: Art Lighting old platform, "several inventory systems", "without engineering support", Postgres/Prisma; NewLight "showroom"; years 2024/2025; is Art Lighting bilingual? | confirm / replace with what we saw | Fallback copy is in §10.3 | §10.3, §10.4, §10.7 |
| 11 | Do we still maintain NewLight and Art Lighting? | yes / no (adds the "run by their owners" caveat) | — | §10.3 |
| 12 | Run PageSpeed Insights on all 3 sites before /work invites visitors to | run it, then keep check 04 / drop check 04 | — | §10.3, §10.7 |
| 13 | Real first-publish dates for the 4 articles dated 2024 | real date / current date | No misleading dates | §10.4 |
| 14 | Claims to confirm: "checked on every deploy", "weekly written update", ">80% coverage", "weekly dependency patching"; INP; WCAG 2.1 vs 2.2 | keep if true / cut | — | §10.4, §10.7 |
| 15 | Audit credit: does it stay at 100%, and does it expire? Does the 5-day window pause while we wait on the client? | — | Render "Nothing" only while the credit equals the fee | §10.6 |
| 16 | Maintenance: overage billed per hour or per request? Professional support channel and turnaround? Is the onboarding check free? Cancellation, minimum term, notice? | — | — | §10.6 |
| 17 | USD invoices | publish a USD view / "USD at the rate on the invoice date" | — | §10.5 |
| 18 | Ownership timing: FAQ "day one" vs final payment | — | Final payment (matches the terms) | §10.2, §10.4 |
| 19 | Add an email field to /contact? | yes / no | — | §10.2 |
| 20 | "Fastest reply" claim; counsel review of privacy, terms and the form privacy line | — | Remove "Fastest reply" unless true | §10.2 |
| 21 | Refusals #3 (no white-label work) and #4 (not competing on price) | confirm as positions / drop | — | §10.7 |
| 22 | Positioning: may the site say "Three builds are live so far" and "No client logos or testimonials yet"? | yes / no | The explicit-honesty move the brief asks for | §10.3 |

##### B. Design and identity calls (L3–L4)

| # | question | options | audit recommends | § |
|---|---|---|---|---|
| 23 | Home hero | A: offer + bilingual + keyword / B: price-led / C: minimal edit; plus the lg fit fix (stack the sub until xl, or a smaller lg type tier) on CMP-001/RUL-124; the hero `world` tone vs the iris map | A, with Estimate as the hero secondary | §10.8 |
| 24 | Home order: Transparent by design after Ownership; Trust with checks first and quotes removed | approve / keep | Approve | §10.8 |
| 25 | Motion devices: development StudioWords (and optionally StudioTiles); interface-design StackedRows length; consulting cost curve; /services plate position | keep / shorten / remove | Remove StudioWords; remove the curve (fallback: after Offer) | §10.9, §10.6 |
| 26 | Section reorders: /pricing (prices first, matrix open); interface-design; development; consulting; /about (Founder above Fit); /approach chapter content; /standards (performance first); multilingual article (checklist earlier) | approve each / keep | Approve (each § gives the order) | §10.5, §10.9, §10.6, §10.3, §10.7, §10.4 |
| 27 | Founder photo and 2-line bio | allow / not | — | §10.3 |
| 28 | Article template: remove the template "Next step" block and `ARTICLE_CTA_MAP`, or keep them keyed? Which 3 articles get the audit form? A "For your developer" filter? Two "Start here" marks intended? | — | Delete the block; audit form on the audit, debt and WordPress articles | §10.4 |
| 29 | Exit-intent on /contact and /schedule | suppress / keep | Suppress | §10.2 |
| 30 | Describe Altruvex Sans as a paired Latin + Arabic family (Outfit + Vazirmatn)? | yes / reword | — | §10.7 |

##### C. Engineering commitments

| # | question | options | audit recommends | § |
|---|---|---|---|---|
| 31 | /standards gate | A: check before launch, results in the handover (copy L0) / B: build real CI (lint, tests, Lighthouse CI, audit) and keep "every deploy" | A is the honest-now copy; it needs Ali's yes to the commitment | §10.7 |
| 32 | Tokens `annualFreeMonths` and `revisionRounds` in `pricingTokens` | add / keep vague wording | Add; never type the numbers | §10.6, §10.7 |
| 33 | Currency format differs between the estimator and /pricing | one formatter for both | Fix in code | §10.5 |
| 34 | Does a bad route return a real 404 status? | verify | — | §10.2 |

##### D. Shared-key changes (touch several pages; some §§ disagree)

| # | question | options | audit recommends | § |
|---|---|---|---|---|
| 35 | Funnel: which action leads | Estimate in the header, Start a project at page ends / other | As stated; record the rule in `commercial.ts` | §10.2 |
| 36 | Service renames as a set: Website Design / Website & Web App Development / Technical Audit | approve / keep | Approve as a set (nav, home, breadcrumbs) | §10.9 |
| 37 | `faq.title` (shared by home and /faq) | §10.8 "Questions to ask before you start a website." / §10.7 "Website project FAQ: cost, timeline and who owns the code." / a new homepage key | Pick one, or split the key (L3) | §10.7, §10.8 |
| 38 | `process.phases.*.headline` (shared by home and /process) | §10.7 set / §10.8 set (they differ) | Pick one set | §10.7, §10.8 |
| 39 | `work.selectedWork` (shared) | §10.3 "Our work / أعمالنا" / §10.8 "Shipped projects / مشاريع أطلقناها" | Pick one | §10.3, §10.8 |
| 40 | CTA labels: `viewTransparency` | "See how estimates are calculated" (§10.7) / "How estimates are calculated" (§10.8) | Rename (pick a wording) | §10.7, §10.8 |
| 41 | Other CTA and nav labels: `realBuild` → "See the case studies"; nav "Transparency" → "Cost estimator"; `technicalAudit` AR "ابدأ بمراجعة تقنية"; maintenance AR خطط → باقات; nav method description re-point | approve each | Approve | §10.8, §10.2, §10.6 |
| 42 | AR terms: audit "مراجعة تقنية"; how-we-work "قواعد العمل"; /process "مراحل المشروع" (§10.2) vs "آلية العمل" (§10.7); never bare "النطاق" | pick one per concept | One term each | §10.2, §10.5, §10.7 |
| 43 | `pricingModel.sections.invest.title` | "Prices by service" (§10.5) / "What it costs" (§10.9) | Pick one | §10.5, §10.9 |
| 44 | Schema copy "Revision rate" → "Revisions" / "التعديلات" | approve / keep | Approve (avoids the مراجعة clash) | §10.5 |
| 45 | Pricing FAQ Q01 leads with `{essentialRange}` (contained website) | confirm the lead scenario | — | §10.5 |

#### Suggested order of work after review

1. **Home first view and trust.** Hero rebuild, Trust rebuild, Transparent by design moved up with a primary button, header/hero CTA pair. Blocked on #23, #24, #9, #1.
2. **Honesty removals.** Testimonials on case pages and home; the /standards opening and gate; "every deploy" in FAQ 03/13 and the articles; "clients ask" / "Selected work" wording. Blocked on #9, #31, #14, #39.
3. **Services H1s and the /services hero CTA, price and time on cards.** Interface-design, development and consulting heroes; service names. Blocked on #36, #5, #7, #25.
4. **Pricing and estimator.** /pricing hero, prices-first order, CTA after the table, end secondary; /transparency end CTA. Blocked on #26, #44, #17, #43, #45.
5. **About and work.** About hero, Founder route, facts rows, /work end CTA, live link on case pages. Blocked on #8, #10, #11, #12, #22, #27.
6. **Consulting and maintenance details.** Offer, curve, FAQ "how much" items, plans h2. Blocked on #15, #16, #25, #32.
7. **Method pages and /faq.** /process and /approach rebuilds, links inside FAQ answers, deduped facts. Blocked on #3, #4, #21, #37, #38.
8. **Site-wide sweeps.** Reply footnote, CTA labels, AR terminology, bold/emphasis pass, article template and dates. Blocked on #1, #35, #40–#42, #13, #28.
