# Sales machine — audit, architecture, plan

Started 2026-10-07. This is the record for turning the site + admin into a qualification, attribution
and follow-up system **on top of** the existing design. Nothing here changes the visual identity,
page architecture or pricing logic; anything that would is listed under "Decisions for Ali".

## 1. Audit — what exists today

The short version: most of the machine already exists in pieces. The admin has a derived pipeline,
a lead score, an action centre and per-source analytics. What is broken is the **plumbing between
www and admin** (attribution, notifications, one lead type never becoming a client) and the absence
of any **intent / recommendation layer** on www.

### www conversion surfaces
| Surface | Writes | Gaps found |
|---|---|---|
| `/contact` → `POST /api/contact` (`lib/server/contact/handle-contact-submission.ts`) | ContactSubmission + Client (`linkClientToLead`) + in-app Notification | Never sent UTM (server read it, form didn't send) · budget/timeline exist in DB but are not collected, so priority is always MEDIUM · `?package=audit`, `?track=architecture` dropped · consulting + maintenance collapse to `OTHER` · receipt has no next step (no schedule link) |
| `/schedule` → `POST /api/schedule` | ContactSubmission (HIGH) + Meeting + Notification | **No `linkClientToLead`** → bookings never reach `/leads` or `/pipeline` · no UTM · NEW_MEETING notification pointed at the submission id · success is inline text only (no pre-call brief) · name/phone readable from the query string |
| Estimator `/transparency` → `POST /api/transparency-lead` | TransparencyLead + Client | Output is a range only — no interpretation, drivers or next step · UTM only survives if the visitor landed on `/transparency` · email not passed to the client link · no notification |
| Exit-intent modal + article audit capture → `POST /api/exit-intent` | ContactSubmission "Exit Intent Lead" + Client | locale hardcoded `en` · audit intent only in free text · source mapped to WEBSITE_CONTACT_FORM |

### Measurement
- Vercel Analytics (pageviews) + Speed Insights only. `trackEvent` called `window.gtag`, which is
  never loaded → **every custom event was a no-op**.
- No first-touch, landing page or external referrer anywhere; the stored `referrer` was the form page.

### Admin (already built — extend, do not duplicate)
- **Stage:** `deriveClientStage` (`apps/admin/lib/dashboard-data.ts`) — contract > proposal > `Client.status`.
  Writable by hand: NEW, VIEWED, CONTACTED, QUALIFIED, LOST, SPAM.
- **Score:** `scoreLead` (`apps/admin/lib/lead-score.ts`) — computed on read, with reasons, shown on `/leads`.
- **Follow-up:** action centre (`apps/admin/lib/action-center.ts`) derives "Follow up with X", "Chase proposal",
  "Proposal expires"; client hub `planNextSteps`. No due dates, no owner on Client, no snooze.
- **Analytics:** real queries for leads/month, qualified, proposals, win rate, cycle, per-source and
  per-project-type. UTM selected but never broken down. No stage-to-stage funnel.
- **Messaging:** email (Resend/SMTP) with templates for proposal/contract/renewal/payment, none for
  leads. WhatsApp send API + wa.me links. Slack via `recordActivity` → `NOTIFIED_ACTIONS` — but www
  writes no ActivityEvent, so **no www lead ever reaches Slack**.
- **Cron:** only `/api/cron/service-renewals` — the pattern (dedupeKey notifications, fail closed) is the
  template for a follow-up-due sweep.

### Pricing
- The floor is derived (`minimumEngagementFrom`, `packages/pricing-schema/src/compute.ts`), never typed.
  www renders it through `floorLabel` / `figureLabel` / the `{minimumEngagement}` token. Compliant.
- Copy around it: pricing hero label "Any website or web app" (`pricingModel.json` `columns.moves.floorNote`),
  home "The published floor for any build". These are the "any website from…" framing the brief warns about.
- `BudgetRange` enum (`UNDER_10K … OVER_50K`) is hardcoded in three places, carries no currency, and its
  lowest band sits **below the published floor**. Not derived from the schema.

### Proof
- Case studies: 3 (`lib/data/case-studies.ts` + `caseStudies.json`): context, problem, solution,
  decisions, delivered, outcome. No metrics (correct — none are verified). Every study ends with
  Start a project / Schedule; none links to the estimator with its project type.
- Fit / not-fit copy already exists: About `FitRegisterSection`, each service `ServiceFit`.

## 2. Architecture — one funnel, one vocabulary

### Stages (admin, on `Client`)
```
NEW → QUALIFYING → QUALIFIED → CALL_BOOKED → CALL_COMPLETED → PROPOSAL_SENT → NEGOTIATION → WON
                                                                                       ↘ LOST → NURTURE
```
- **Stored (hand-set):** NEW, VIEWED, CONTACTED, QUALIFYING*, QUALIFIED, NURTURE*, LOST, SPAM.
- **Derived (never stored):** CALL_BOOKED (a live Meeting), CALL_COMPLETED (a COMPLETED Meeting, no proposal),
  PROPOSAL_SENT / READ, NEGOTIATION (proposal read, no answer, or a change requested), CONTRACT_SENT, WON.
  This follows the existing rule "derived states stay derived".
- `*` = needs a migration (enum values). See §4.

### Score
Keep `scoreLead` pure and on-read; it already returns reasons. Extend its inputs, don't replace it:
need (project type / complexity), authority (decision-maker answer), budget (bands relative to the floor),
timeline, fit (company, existing system), engagement (meeting booked, proposal opened, replies).
Bands: **≥ 65 High intent · 35–64 Qualified · < 35 Nurture · explicit Poor fit** when the stated budget is
below the published floor. The score and reasons stay admin-only.

### Funnel events (stable names, `apps/www/lib/analytics.ts`)
`estimator_started · estimator_completed · estimator_submitted · contact_started · contact_submitted ·
schedule_started · schedule_completed · exit_intent_shown · exit_intent_submitted · audit_lead_submitted · cta_clicked`
Admin-side milestones are not client events — they come from records (`proposal.sent`, `contract.signed`,
stage changes in ActivityEvent). Props never carry name/phone/email.

### Attribution
First touch is captured once on the visitor's first page (`apps/www/lib/attribution.ts`): landing path,
external referrer, utm source/medium/campaign. Every lead POST carries it; the server prefers it over the
Referer header. `landingPath` is stored on ContactSubmission and TransparencyLead.

### Page → stage map
| Stage | Pages |
|---|---|
| Intent / problem | home, services index, writing |
| Education | approach, process, standards, how-we-work, faq, writing articles |
| Proof | work + case studies, about, standards |
| Qualification / estimate | transparency (estimator), contact, pricing |
| Consultation | schedule |
| Proposal → retention | admin + client portal |

## 3. Plan and status
| Phase | What | Status |
|---|---|---|
| 1–2 | Audit + architecture (this file) | done 2026-10-07 |
| 11a | Attribution capture, real funnel events, www lead plumbing fixes (schedule → client, meeting ids, exit-intent locale, estimator email) | done 2026-10-07; browser pass on the scratch DB passed (see §5) |
| — | Migration `20261007120000_sales_machine` + schema budget bands | done 2026-10-07 on the local scratch DB; applied to both Neon DBs (local `.env.local` + production `.env.production`) 2026-10-07 |
| 3 | Contextual CTA wording per page (copy keys, both locales) | waiting on copy direction (§4) |
| 4 | Contact → qualification: progressive second step (situation, timeline, budget band, decision maker) | done 2026-10-07; browser-verified EN + AR |
| 5 | Estimator result → interpretation + drivers + next step (derived from schema ids, "preliminary" wording) | done 2026-10-07; browser-verified AR |
| 6 | Case study → "Facing a similar problem?" + estimator deep link with project type | done 2026-10-07; browser-verified AR |
| 8 | Schedule success → 3-question pre-call brief; pre-call view in admin | done 2026-10-07; www browser-verified; admin view renders on :3011 (empty states only, see §5) |
| 9 | Stages QUALIFYING / NURTURE + derived CALL_* / NEGOTIATION; score inputs; owner | done 2026-10-07; checks pass, admin screens render on :3011 (see §5) |
| 10 | `nextActionAt` / note on Client, follow-up sweep cron (renewal pattern), lead templates; never auto-send | done 2026-10-07: sweep + cron + lead drafts + "Send a follow-up" sheet; sweep tested on the scratch DB; migration `20261007180000_follow_up_due` applied to scratch only — must go to both Neon DBs before deploy (§4 rule 1); sheet not yet seen in a browser |
| 12 | Internal links: pricing → services/work, estimator result → service/case study, services → work | pricing → services/work done 2026-10-07 |
| 13 | Project Advisor (LLM) | deferred (Ali, 2026-10-07) |
| 14 | Website diagnostic | deferred (Ali, 2026-10-07) |
| 15 | QA: both locales × 5 widths, keyboard, dark mode | after each phase |

## 4. Decisions for Ali

### Ruled 2026-10-07
1. Migration batch — **approved**, additive and nullable (`20261007120000_sales_machine`). Apply to
   both Neon databases (`bun run db:deploy` and `bun run db:deploy:prod` from `packages/database`)
   **before** the code that reads the new columns/enum values ships.
2. Budget bands — **approved**, derived from `minimumEngagementFrom` (`packages/pricing-schema/src/budget.ts`):
   floor–2×, 2×–5×, 5×–10×, 10×+ and "not sure yet". No band below the floor. The legacy
   `UNDER_10K…OVER_50K` values stay in the enum for old rows and are never written.
3. Floor framing — **approved**: "Custom engagements start here." The figure stays derived.
4. Multilingual/RTL intent path — **dropped**. Multilingual stays a capability and an estimator scope note.
5. Contact — the approved form stays as it is; qualification is an optional short second step after a
   successful submit (step token in the response body, never in a URL).
6. Project Advisor and website diagnostic — **deferred**, not built.
7. Case-study ending, case study → estimator deep link, pricing → services/work links, estimator
   interpretation + next step — **approved**.

### Original proposals
1. **Migration batch** (additive, nullable): `SubmissionStatus` + QUALIFYING, NURTURE; `Client.ownerId`,
   `nextActionAt`, `nextActionNote`, `lostReason`; first-touch `landingPath` on ContactSubmission +
   TransparencyLead; qualification answers (`decisionMaker`, `currentSituation`) on ContactSubmission;
   `preCallBrief` JSON on Meeting. Must go to both Neon DBs before the code ships.
2. **Budget bands:** replace the hardcoded `UNDER_10K…OVER_50K` with bands derived from the schema floor
   (below floor / floor–2× / 2×–5× / above) so the form and the score can never drift from pricing.
3. **Floor framing:** "Any website or web app" / "The published floor for any build" → e.g. "Custom
   engagements start here". Copy change only; the figure stays derived.
4. **Intent paths:** the brief asks for a "multilingual / RTL system" path. Saved ruling (2026-10-06): never
   position on language/place. Proposal: drop that path; multilingual stays a scope note in the estimator.
5. **Contact page:** add a second, optional step after the current form (progressive disclosure) instead of
   lengthening the form you approved on 2026-10-04.
6. **Project Advisor + diagnostic tool:** build or not; both need an external API key and spend.

## 4b. Lead follow-ups (phase 10, 2026-10-07)
- **Sweep:** `sweepLeadFollowUps` (`apps/admin/lib/lead-follow-up.ts`), daily from `GET /api/cron/lead-follow-ups`
  (06:00 UTC, `CRON_SECRET`, fails closed; listed in `lib/cron-jobs.ts`). It writes `FOLLOW_UP_DUE`
  notifications and a Slack `lead.follow_up_due` line for (a) any lead whose `nextActionAt` is today or
  earlier (not LOST/SPAM) and (b) a non-MANUAL lead from the last 7 days still uncontacted — the
  contact page promises a reply within 24 hours on business days (`REPLY_PROMISE_HOURS`). The owner gets
  it; with no owner, every admin. Dedupe keys: `follow-up:<client>:<date>` (moving the date re-arms it)
  and `reply-due:<client>` (once per lead). It never contacts a client.
- **Drafts:** `LEAD_TEMPLATES` / `leadFollowUpDraft` in `lib/email-templates.ts` — First reply, After the
  call, Check in; default picked from the derived stage. English only, no prices, no dates; the schedule
  link appears only when `PUBLIC_SITE_URL` is set.
- **Sending:** client page → Before the call → *Send a follow-up* (`components/os/follow-up-sheet.tsx`) →
  `POST /api/admin/clients/[id]/follow-up`. Email through the configured transport, or WhatsApp from the
  operator's phone recorded as `manual: true`. Sending moves NEW/VIEWED to CONTACTED and sets the next
  follow-up date (default +7 days, clearable). Audit: `lead.follow_up_sent` + `client.lead_record_updated`.

## 5. Browser verification 2026-10-07 (www, local scratch DB)
Passed: first-touch UTM + landing path persist across pages and a locale switch and reach every lead row;
the external-referrer fix stores no same-origin referrer; contact submit → ContactSubmission + Client;
qualification step saves situation/budget/timeline/decision role + `qualifiedAt` (EN and AR, Latin digits);
schedule → Client → Meeting.clientId, NEW_MEETING points at the meeting, pre-call brief saved on the meeting;
estimator email persists; exit-intent stores the page locale; funnel events fire with no personal data;
case study, pricing and estimator CTAs keep the locale and land on the right page.
Admin (localhost:3011, local Neon DB, read-only): pipeline columns incl. Qualifying/Nurture/derived call stages, leads tiles + Nurture/Lost filters, client "Before the call" (score, lead record, answers, call, attribution empty states), analytics UTM + landing tables, submissions all render with no console errors. That DB has no open leads, so populated score/answers/call rows were not seen in a browser. `recommendedAction` returned "Nurture" for a signed client; fixed to read the post-proposal stages.
