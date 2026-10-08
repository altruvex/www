# Website conversion intelligence — audit, plan, change log

Started 2026-10-08. Builds on `docs/sales-machine.md` (attribution, funnel events, qualification
step, estimator read, pre-call brief, stages, score, follow-ups). Nothing here replaces that
infrastructure; every item below extends a file that already exists.

Constraints carried from the brief: not a redesign; no popups, chatbots, urgency, scarcity,
banners or card grids; no AI; no second CRM, lead, score, pipeline, attribution or schedule
record; server components and minimal hydration; EN + AR in one system; SEO preserved; lead
score never public; no PII in analytics payloads.

## 1. Phase A — audit (2026-10-08)

Mapped against intent → awareness → proof → qualification → conversion.

### What already works

| Stage | Exists | Where |
|---|---|---|
| Awareness | Per-page H1 + metadata, EN + AR, one H1 per page | `lib/metadata.ts` `PAGE_METADATA` |
| Proof | Case studies with live URLs, figures, services list | `work/[slug]`, `lib/data/case-studies.ts` |
| Proof → estimate | "Estimate a similar build" → `/transparency?projectType=` | `work/[slug]/page-client.tsx:306` |
| Fit | "Who it is for / not for" on all four service pages | `serviceDetails.*.brief.fit` via `ServiceFit` |
| Qualification | Estimator (5 answers) + its preliminary read (interpretation, drivers, next step) | `transparency-estimator/recommend.ts`, `result-panel.tsx:151-228` |
| Qualification | Optional contact second step (situation, budget, timeline, decision role) | `contact/qualify-step.tsx`, `api/contact/qualify` |
| Conversion | Schedule sentence form + pre-call brief; contact form | `schedule/page-client.tsx`, `precall-brief.tsx` |
| Measurement | First-touch attribution on every lead POST; 11 funnel events | `lib/attribution.ts`, `lib/analytics.ts` |
| Admin | Stage, score + reasons, Before-the-call card, follow-up sweep | `lib/lead-score.ts`, `lib/precall.ts`, `before-the-call.tsx` |

### Gaps (each verified in code unless marked)

**CTA architecture**
- G1. Every conversion label comes from the 15-key registry (`lib/config/commercial.ts:23-52`);
  "Start a project" + "Schedule a consultation" repeat on home, services, interface design,
  about, FAQ, contact. Headlines above the pair are per-page; the action pair is not.
- G2. The registry returns `{href}` only; query params are appended by hand in four places. There
  is no typed way to say "this CTA carries service X / projectType Y".
- G3. `cta_clicked` is defined but fired only from the command palette. No page CTA is measured.
- G4. `/contact` reads `service`, `plan`, `billing` only. `package=audit` and `track=architecture`
  (emitted by the registry itself) and `projectType` (case studies) are dropped on arrival.

**Intent**
- G5. No intent entry point. The closest existing models are the services-index life moments
  (before / build / live) and the qualify `situation` (new-build / replace-existing /
  improve-existing). Three service id spaces coexist (contact `service`, services-index ids,
  pricing ids).

**Recommendation / estimator**
- G6. The estimator result links only to `/schedule` and WhatsApp — no link to the matching
  service page or a case study of the chosen type. (`docs/sales-machine.md` item 12 is open.)
- G7. The read (next step, drivers) is computed client-side and never sent or stored, so sales
  cannot see that a lead was steered to a call, or why.
- G8. No events for the result's own actions (proposal vs consultation vs WhatsApp vs PDF).

**Connectivity**
- G9. Development, consulting and maintenance pages have no link to `/work`; no service page
  links to a specific case study. Case-study end CTA never points at its service.
- G10. Work index has no link to services or pricing. Services index has no direct estimator link.
- G11. `/schedule` links only to `/privacy` and `/contact`; "what to prepare" exists only as an
  FAQ item and after submit; the explanatory sections render below the form.
- G12. Writing articles share one end CTA; no per-article service mapping.

**Admin context**
- G13. **Estimator timeline never scores.** The estimator stores `urgent/standard/flexible`;
  `TIMELINE_POINTS` keys are `IMMEDIATE/SOON/PLANNING/EXPLORING` (`lead-score.ts:60`), fed by
  `precall.ts:60`. Verified.
- G14. Estimator and exit-intent leads raise no notification; contact/schedule notifications
  carry name/email/date only — no project type, range or source.
- G15. Exit-intent leads are stored as `WEBSITE_CONTACT_FORM` with name "Exit Intent Lead"; the
  real source is only in the message text.
- G16. Stored but not shown on the client page: contact `serviceInterest`, estimator timeline,
  company, reference, locale. Estimator panel shows raw ids ("webapp", "premium").
- G17. `precall.ts:275` reads attribution as `sub ?? lead`: when a client has both, the
  estimator's attribution is never shown even when it was the earlier touch.
- G18. A second estimate from a known phone is not linked (`transparencyLeadId` set once);
  company is never copied to the client.

**Stop condition found: duplicate clients (G19).** `linkClientToLead` matches on
`normalizePhone` = strip non-digits (`packages/database/index.ts:42`). www phone fields are free
text, so `+20 100 000 0000` → `20100…` and `0100 000 0000` → `0100…` become two clients for one
person. Pre-existing, not introduced by this phase. Not fixed yet: the matcher is shared by both
apps and existing rows are stored in both shapes, so a fix needs a decision (§3, D1).

## 2. Plan (phases B–I)

Ordered so plumbing that needs no new visible module ships first. Every visible new module gets
prototypes before it is built in the repo.

| Phase | Item | Visible? | Migration? |
|---|---|---|---|
| B | Registry gains a typed context: `ctaHref(key, { service, projectType, source })`, replacing the four hand-appended query strings | no | no |
| B | One tracked link wrapper fires `contextual_cta_clicked { key, page, context }` — no PII | no | no |
| B | `/contact` reads `package`, `track`, `projectType` and pre-selects the matching service | small | no |
| B | Per-page action pairs: replace the generic repeat where the page has a clearer next step (copy) | yes — copy | no |
| C | Intent model mapped onto `situation` + life moments (below); intent kept with attribution in storage, sent with every lead POST | no | see D2 |
| C | Intent entry point (where and what it looks like) | yes — prototypes | no |
| D/E | Estimator result: "related" row → matching service page + case studies of the same `projectType` | yes — prototypes | no |
| D/E | Send `nextStep` + driver ids with the lead POST; server recomputes them (shared pure `recommend`) and stores them | admin only | D2 |
| D/E | Events: `recommendation_viewed`, `recommendation_accepted { nextStep, action }` | no | no |
| F | Case study end: "Facing a similar problem?" adds the case study's service as a third route | small | no |
| G | Service pages → their case studies; work index → services; services index → estimator; pricing already links | yes — small links | no |
| H | `/schedule`: visible "what to prepare" + links to estimator/consulting; keep form first | yes — prototypes | no |
| I | Admin: estimator timeline maps into the score (G13); labels instead of ids (G16); earliest touch wins in attribution (G17); notification text with project type / range / source (G14) | admin | no |
| I | Exit-intent source made explicit (G15) | admin | D3 |

### Intent model (proposal)

Visitor-language choices, each mapped to vocabulary that already exists — no new taxonomy:

| Visitor sees (EN) | Stored as | Next action (low → high readiness) |
|---|---|---|
| Starting something new | `situation = new-build`, moment `build` | explore work → estimate → schedule |
| Replacing a site that is not working | `situation = replace-existing`, moment `build` | work → estimate → schedule |
| Improving a site that is live | `situation = improve-existing`, moment `live` | maintenance → audit → schedule |
| Not sure yet | no situation, moment `before` | technical audit → schedule |

Readiness is never asked; it is read from what the visitor does (reading work = low, finishing the
estimator = medium, opening schedule = high) and is never shown or scored publicly.

## 3. Decisions for Ali

### Ruled 2026-10-08

- D1 → normalise and match both shapes: new leads stored in one canonical digits form, matched
  against the canonical and the legacy shapes so existing clients still link.
- D2 → migration: `TransparencyLead.situation` (reuses `ProjectSituation`, + `UNSURE`),
  `nextStep`, `drivers[]`; the server recomputes the read, never trusts the client.
- D3 → new `ClientSource.EXIT_INTENT`.
- D4/D5 → prototypes first for every visible module and the per-page CTA copy; plumbing and admin
  fixes proceed meanwhile.

Migration `20261008120000_conversion_intelligence` (additive: two enum values, three columns)
applied to scratch, local Neon and production Neon 2026-10-08.

### Original questions

- D1. Duplicate clients (G19): normalise phones to one shape before matching. Proposal: match on
  the E.164 form using the same rule as `whatsappNumber` (`01[0125]…` reads as Egypt, `+`/`00`
  keep their code, other local numbers stay as typed), and match both the new and the old stored
  shape so existing rows still link. Touches both apps' lead intake.
- D2. Storing intent + the estimator's next step: `ContactSubmission.situation` already holds
  intent with no migration; `TransparencyLead` has no column for intent or next step. Options:
  a migration (two nullable columns, both Neon DBs), or recompute next step in admin from the
  stored answers (no migration, intent not stored for estimator leads).
- D3. Exit-intent source: a new `ClientSource` value (migration) or keep it in the message text.
- D4. Copy direction for per-page action pairs (sales-machine phase 3 was waiting on this).
- D5. Prototypes for the intent entry point, the estimator "related" row and the schedule
  preparation block.

## 4. Change log

Entries use CHANGE / REASON / CONVERSION IMPACT / DATA IMPACT / UX IMPACT / ADMIN IMPACT.

### 2026-10-08 · C1 — one client per phone (G19, D1)
- CHANGE: `canonicalPhone` + `phoneMatchKeys` in `packages/database/index.ts`; `linkClientToLead`
  stores the canonical form and matches every legacy shape (`in`), oldest client first. Admin search
  uses the same keys. Pinned by `verify:phone-match` (no database).
- REASON: `+20 100…` and `0100…` created two clients for one person.
- CONVERSION IMPACT: none visible. DATA IMPACT: new leads stored canonical; existing rows keep their
  shape (still matched); no backfill run. UX IMPACT: none. ADMIN IMPACT: one client, full history.

### 2026-10-08 · C2 — exit-intent source (G15, D3)
- CHANGE: exit-intent leads link with `ClientSource.EXIT_INTENT`; the "Exit Intent Lead" placeholder
  stays on the submission only (its `name` is required) and never reaches the client.
- REASON: these leads read as contact-form leads. DATA IMPACT: new enum value (migration).
- ADMIN IMPACT: labelled "Exit-intent capture"; scores +5 (contact form +8).

### 2026-10-08 · C3 — typed CTA context + measurement (G2, G3, G4)
- CHANGE: `getCommercialCta(key, context?, hash?)` + `ctaContextQuery`; the four hand-built query
  strings use it (rendered hrefs unchanged). `TrackedCtaLink` (client leaf) inside the server
  `CtaButtonGroup`/`SectionEndCta` fires `contextual_cta_clicked { key, page, context }` — context is
  the query string, because Vercel track takes primitives only. `/contact` now reads `package=audit`,
  `track=architecture`, `projectType`.
- REASON: no page CTA was measured; registry context was dropped on arrival.
- CONVERSION IMPACT: an audit/architecture/case-study link lands on the right service.
- DATA IMPACT: event carries no PII. UX IMPACT: none beyond the pre-selected service. ADMIN: none.

### 2026-10-08 · C4 — intent + recommendation stored (G7, G8, D2)
- CHANGE: `lib/intent.ts` (`altruvex.intent`, 30 days, like attribution) sent with contact, schedule
  and estimator POSTs; `situationFromBody` validates it server-side. The estimator route recomputes the
  read with the shared pure `recommend` and stores `situation`, `nextStep` ("consultation" | "review"),
  `drivers` ("complexity" | "brand" | "timeline" | bare scope-note id). Events
  `recommendation_viewed`, `recommendation_accepted { nextStep, action }`, `intent_selected` (fired by
  the intent UI once built).
- REASON: sales could not see that a lead had been steered to a call, or why.
- DATA IMPACT: three TransparencyLead columns (migration); nothing trusted from the client.
- UX IMPACT: none (no intent UI yet — prototypes pending). ADMIN IMPACT: see C5.

### 2026-10-08 · C5 — admin lead context (G13, G14, G16, G17)
- CHANGE: estimator pace scores (urgent → IMMEDIATE, standard → PLANNING, flexible → EXPLORING; a
  contact timeline still wins); +4 when the read pointed to a consultation; situation from either
  source. `firstTouch()` picks the earlier record and says which. Client page estimator panel shows
  labels, pace, situation, company, locale, reference, next step and drivers. Leads list takes utm
  and project type from estimator-only leads. Estimator leads raise a NEW_CONTACT notification
  (no name/phone/email in its text); contact notifications gain service, timeline and source.
  Pinned by `verify:lead-context`.
- REASON: estimator answers were stored but unused or shown as raw ids; the earliest touch was hidden.
- ADMIN IMPACT: score is still admin-only. Open: contact `serviceInterest` not yet on the client page;
  admin /transparency still shows raw ids.

Visible modules below follow Ali's prototype pick "1A 2A 3A 4C"
(`docs/prototypes/2026-10-conversion/`). Copy in all four is unreviewed.

### 2026-10-08 · C6 — page-end CTA: one button + one text link (4C)
- CHANGE: `SectionEndCta` renders the secondary as an underline `ActionLink` (`CtaButtonGroup`
  `secondaryAs="link"`) labelled from `commercial.ctasAlternative` ("or estimate it first", "or talk it
  through first", "or see the work first") when a key has one. Page ends re-keyed (primary / secondary):
  home projectRange / technicalCall; services describeTheBuild / projectRange; interface-design
  startDesign / realBuild; development startDevelopment / projectRange; maintenance maintenanceEnquiry /
  projectRange; work index projectRange / technicalCall; work/[slug] estimate-similar (projectType
  context) / technicalCall; about describeTheBuild / realBuild; faq technicalCall / projectRange; writing
  index + article describeTheBuild / projectRange. Bodies rewritten to match (commercial.cta,
  common.endCta.pages.{work,about,faq}, caseStudies.endCta). Consulting, pricing, transparency, approach,
  how-we-work, process and standards unchanged.
- REASON: two equal buttons at every page end split attention; the pair now reads as one step plus a
  softer alternative suited to where the reader is.
- CONVERSION IMPACT: one dominant action per page end; the alternative catches readers not ready for it.
- DATA IMPACT: none new — both still fire `contextual_cta_clicked` with their registry key.
- UX IMPACT: one brand pill, one underline link; no new motion. Deviation from the prototype table: the
  work index uses the standard "Estimate your project" label.
- ADMIN IMPACT: none.

### 2026-10-08 · C7 — intent line under the home hero (1A)
- CHANGE: `components/interactive/intent-links.tsx` — "Where are you?" plus four links (new build and
  replacement → estimator, improving a live site → /services/maintenance, not sure → technical audit).
  A click calls `setIntent` and fires `intent_selected { situation }`. Copy in `hero.intent`.
- REASON: G7 — the site had no way to say which situation a visitor is in.
- CONVERSION IMPACT: a one-click route for each situation from the first screen.
- DATA IMPACT: the situation rides with later estimator/contact/schedule POSTs (C4); no PII.
- UX IMPACT: one text line in the hero's existing arrival; links wrap by phrase (`whitespace-nowrap`).
- ADMIN IMPACT: situation shows on the lead (C5).

### 2026-10-08 · C8 — "Built like this before" row in the preliminary read (2A)
- CHANGE: `result-panel.tsx` PreliminaryRead gains a fourth hairline row: every case study whose
  `projectType` matches the read, then "Development in detail" → /services/development. A type with no
  case study shows only the service link. Copy in `pricingModel.result.read.related`.
- REASON: G9 — the estimator ended without proof or a related path.
- CONVERSION IMPACT: proof at the moment a price is on screen.
- DATA IMPACT: `contextual_cta_clicked` keys relatedCaseStudy / relatedService, context projectType +
  source=estimator-read.
- UX IMPACT: same row idiom as the read; no new component.
- ADMIN IMPACT: none.

### 2026-10-08 · C9 — call preparation beside the schedule form (3A)
- CHANGE: `/schedule` gains an aside (contact-page grid, sticky from lg): three numbered things worth
  having, "A rough brief is enough.", and two exits — "Not ready to talk?" → estimator, "Reviewing a
  live build?" → technical audit. Copy in `schedule.prep`.
- REASON: G11 — the form gave no context for what the call needs or what to do if a call is too early.
- CONVERSION IMPACT: fewer abandoned bookings from unprepared visitors; two lower-commitment routes.
- DATA IMPACT: exits fire `contextual_cta_clicked` with source=schedule-prep.
- UX IMPACT: hairline list with mono indexes; mirrors in RTL.
- ADMIN IMPACT: none.

### 2026-10-08 · C10 — Technical Audit and Maintenance stored as themselves
- CHANGE: `ServiceType` gains `TECHNICAL_AUDIT` and `MAINTENANCE` (migration
  `20261008130000_service_type_audit_maintenance`, `ADD VALUE … BEFORE 'OTHER'`). The contact schema
  accepts `technical-audit` / `maintenance`; the contact page maps its consulting and maintenance keys to
  them; `handle-contact-submission.ts` maps them to the enum and names them in the notification. Admin
  labels them in `status.ts` (`serviceType`); the leads list and the client page's Qualification
  answers ("Interested in") read through `statusOf`. On the client page `BeforeTheCall` takes
  `showEstimate={false}`, because the aside already shows the estimator record; the submission page
  keeps the panel.
- REASON: audit and maintenance inquiries were stored as `OTHER`, so admin could not tell them apart;
  the client page printed the range and next step twice.
- CONVERSION IMPACT: none visible. DATA IMPACT: two enum values; existing `OTHER` rows unchanged, no
  backfill (old rows cannot be told apart after the fact). UX IMPACT: none on www.
- ADMIN IMPACT: "Technical audit" / "Maintenance" on leads and client pages; one estimator block per
  client page. Scoring and filtering unchanged: `lead-score.ts` does not score service interest.

## 5. Verification

### 2026-10-08 · plumbing on scratch (`altruvex_scratch`, browser + psql)
Run beside the real dev servers with a temporary `distDir` (reverted). Test rows deleted afterwards;
fixtures kept.

| Check | Result |
|---|---|
| First touch from `/?utm_source=…` survives to estimator, contact and schedule rows | pass |
| Estimator (web app, extensive, fresh brand, urgent, sign-in) reads "consultation" on screen | pass |
| TransparencyLead stores `situation` UNSURE, `nextStep` consultation, `drivers` {complexity, auth, brand, timeline} | pass |
| "New Estimate Lead" notification per admin; text carries no name, phone or email | pass |
| `/contact?package=audit` preselects Technical Audit | pass |
| Phone typed as `0100…`, `+20 100…`, `0020100…` across three forms → one client, stored `20100…` | pass |
| Schedule booking links the meeting to that client and stores `situation` | pass |
| Admin pre-call brief (`loadPreCall`, server-side): stage CALL_BOOKED, score 77 with "+4 estimator pointed them to a consultation" and "pace urgent (read as immediate)", first touch = estimator | pass |

Not yet checked: the admin client page in a browser (needs a scratch admin sign-in), paths 1–5 as
full journeys (they depend on the visible modules awaiting the prototype pick), Arabic and dark mode
of anything new (nothing visible is new yet).

### 2026-10-08 · visible modules (C6–C9, dev server :3010, read-only, no submits)

| Check | Result |
|---|---|
| Home intent line, EN + AR at 1440; AR at 375 inside the 88svh hero, wraps by phrase | pass |
| Intent click "Improving a live site" → /services/maintenance, `altruvex.intent` = improve-existing | pass |
| Estimator read row: e-commerce → 2 studies + service link; website → 1 + link; web app / PWA → link only | pass |
| /schedule prep aside EN + AR (mirrored), exits → /transparency and the audit contact | pass |
| 11 re-keyed page ends each carry exactly one "or …" link with the planned target; EN development end screenshot | pass |
| Console errors | none |

Checks: `tsc --noEmit` (www) clean, eslint on changed files clean, `bun run validate` pass, knip only the
pre-existing `hooks/use-media-query.ts`. Not checked: light mode of the new pieces, 768 width.

### 2026-10-08 · final pass (scratch servers :3013 admin / :3014 www, `altruvex_scratch`)

| Check | Result |
|---|---|
| `/contact?package=audit` submission → `contact_submissions.serviceInterest = TECHNICAL_AUDIT` | pass |
| `/contact` Maintenance submission → `MAINTENANCE`; existing `OTHER` rows untouched (enum only grew) | pass |
| Admin client page (audit lead): "Interested in · Technical audit" | pass |
| Admin client page (estimator → schedule lead): stage Call booked, score 56/100 with reasons, qualification, the call (awaiting approval, 12 Oct 09:30), first touch + UTM + landing page, aside estimator record with range, pace, situation, next step | pass |
| Range / next step no longer printed twice on that page (C10) | pass |
| End-to-end: hero intent → estimator (lead stores situation, next step, type, complexity, UTM) → schedule (same client, one meeting, no duplicate client) | pass |
| First-touch attribution persists from `/?utm_*` to the estimator and schedule rows | pass |
| Visual: hero intent line, estimator read row, case-study end pair, schedule prep aside, about end pair × 1440/1024/768/375 × light/dark × EN/AR (80 cases, headless) — no page or element overflow, `dir` correct, RTL mirrored | pass |
| Contrast: muted text in the read row and prep aside 5.50:1 light, 6.18:1 dark; links 16–18:1 | pass |

Situation can appear twice on a client page: once in the aside (what the estimator run stored) and
once under Qualification answers (what the contact/schedule form stored). They are two records and
may differ, so both stay; each is labelled by its panel.

### Migrations

| Migration | Scratch | Local Neon | Prod |
|---|---|---|---|
| `20261008120000_conversion_intelligence` | yes | yes | yes |
| `20261008130000_service_type_audit_maintenance` | yes | yes | yes |

All applied 2026-10-08; `prisma migrate status` reads "up to date" on both Neon databases.

### Open
Known and outside this phase (not regressions):
- Admin `/transparency` still shows raw ids.
- Audit-lead capture and the exit-intent modal send no intent (their routes take no situation).
- Existing clients keep their stored phone shape (matched, not backfilled);
  `packages/database/scripts/backfill-clients.ts` and the WhatsApp `to:` still use `normalizePhone`.
- The existing DatePicker behaviour is unchanged by this phase.

Notes:
- `lead-score.ts` does not score `serviceInterest` (it never did), so the new values change no score.
- All copy in §6 is unreviewed.

## 6. Copy introduced (unreviewed)

Established voice kept: no line below rewrites existing copy outside the page-end bodies C6 re-keyed.

| Key | EN | AR |
|---|---|---|
| `hero.intent.question` | Where are you? | أين أنت الآن؟ |
| `hero.intent.new-build` | Starting something new | أبدأ مشروعًا جديدًا |
| `hero.intent.replace-existing` | Replacing a site that isn’t working | أستبدل موقعًا لا يؤدي دوره |
| `hero.intent.improve-existing` | Improving a live site | أطوّر موقعًا يعمل بالفعل |
| `hero.intent.unsure` | Not sure yet | لست متأكدًا بعد |
| `pricingModel.result.read.related.label` | Built like this before | بنينا مثله من قبل |
| `pricingModel.result.read.related.service` | Development in detail | تفاصيل خدمة التطوير |
| `schedule.prep.heading` | Worth having to hand | يفيد أن يكون بين يديك |
| `schedule.prep.items[0]` | The business goal, in a sentence. | هدف العمل، في جملة واحدة. |
| `schedule.prep.items[1]` | The current site or system, if there is one. | الموقع أو النظام الحالي، إن وُجد. |
| `schedule.prep.items[2]` | Any deadline or budget limit. | أي موعد نهائي أو حدّ للميزانية. |
| `schedule.prep.enough` | A rough brief is enough. | ملخص بسيط يكفي. |
| `schedule.prep.notReady` | Not ready to talk? | لست مستعدًا للحديث بعد؟ |
| `schedule.prep.liveBuild` | Reviewing a live build? | تراجع نظامًا يعمل بالفعل؟ |
| `commercial.ctasAlternative.projectRange` | or estimate it first | أو قدّر تكلفته أولًا |
| `commercial.ctasAlternative.technicalCall` | or talk it through first | أو ناقشه معنا أولًا |
| `commercial.ctasAlternative.realBuild` | or see the work first | أو شاهد الأعمال أولًا |

The prep exits reuse existing registry labels ("Estimate your project", "Start with a technical audit").

Rewritten bodies (old → new):

| Key | EN | AR |
|---|---|---|
| `commercial.cta.body` | Tell us what it must do, who uses it and when it needs to be live. If it fits what we build, the next step is a consultation to scope it. → Put your answers into the estimator for a price range in a few minutes. If it fits what we build, the next step is a consultation to scope it. | أخبرنا بما يجب أن يفعله، ومن سيستخدمه، ومتى يجب أن يكون جاهزًا. … → أدخل إجاباتك في أداة التقدير لتحصل على نطاق سعري خلال دقائق. إن كان ضمن ما نبنيه، فالخطوة التالية استشارة لتحديد نطاق العمل. |
| `common.endCta.pages.about.body` | Describe what you need, or schedule a consultation. The first conversation … → Describe what you need. The first conversation is about your project and what it needs, not about us. | صف ما تحتاجه، أو احجز استشارة. … → صف ما تحتاجه. المحادثة الأولى عن مشروعك وما يحتاجه، لا عنّا. |
| `common.endCta.pages.faq.body` | Describe the project and add your question. You get a direct answer, not a sales script. → Bring your question to a consultation. You get a direct answer, not a sales script. | صف مشروعك وأضف سؤالك، … → اطرح سؤالك في استشارة، وتصلك إجابة مباشرة، لا نص مبيعات جاهز. |
| `common.endCta.pages.work.body` | Describe what you need. We reply with whether it fits what we build, and what the next step is. → The estimator gives a price range for a build like these in a few minutes, with no call and no contact details. | صف ما تحتاجه، ونرد عليك: … → تعطيك أداة التقدير نطاقًا سعريًا لمشروع مثل هذه خلال دقائق، دون مكالمة ودون بيانات تواصل. |
| `caseStudies.endCta.body` | Same process, same standards. Describe what you are building, or see what a similar build costs in the estimator first. → Same process, same standards. The estimator shows what a similar build costs before any call. | العملية نفسها والمعايير نفسها. صف ما تبنيه، … → العملية نفسها والمعايير نفسها. تُظهر لك أداة التقدير تكلفة مشروع مشابه قبل أي مكالمة. |

Admin labels (English only): "Interested in", "Technical audit", "Maintenance", "Exit-intent capture",
"Next step" (values "A consultation first", "A written scope review"), "Situation" (values "New build",
"Replacing an existing system", "Improving an existing system", "Not sure yet"), "Range shown", "Pace",
"Reference", "Project", "Complexity", "Company", "Locale", "Preliminary read · what their result
showed", "Where they came from", "First touch: the …", "No estimator run is linked to this lead.";
hints "What the public estimator showed this visitor, not a stated budget", "The preliminary read their
result showed", "What they chose before the estimate".
