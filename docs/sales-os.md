# Altruvex Sales OS — lead-to-opportunity intelligence

Status: in progress (started 2026-10-08). This file is the record for the "Lead-to-Opportunity
Intelligence" brief: the Phase A audit, the rulings taken, the plan for phases B–J, and the
change log. Code is the source of truth once a phase lands; this file says why.

Ground rules carried from the brief: deterministic rules only (no AI scoring, forecasting,
sentiment or autonomous follow-up); no new CRM, no new Opportunity table, no second numeric
score, no weighted forecast; every recommendation carries its reasons; one scheduler (the
existing follow-up sweep); analytics events carry no PII and are separate from the audit log.

---

## 1. Phase A — audit

### 1.1 State model today

- One opportunity = one `Client`. Its stage is derived by `deriveClientStage`
  (`apps/admin/lib/dashboard-data.ts`) from documents (contract, proposal), projects, the
  stored `Client.status` and the latest live meeting (`callState`).
- Consumers of the derived stage: /clients, /pipeline, /leads, intake tabs, `hub-data`,
  `precall`, analytics (qualified count; "won" is computed separately in `analytics-data`).
- Writes to `Client.status`: `_actions/records.ts` (`setClientStatus`, bulk, `moveClientStage`),
  `api/admin/clients/[id]` PATCH, `api/admin/clients/[id]/follow-up`. All guarded by
  `WRITABLE_STATUSES` (`lib/status.ts`).
- `ContactSubmission.status` is a second, unsynced copy. Submission triage allows
  PROPOSAL_SENT / WON, offers no QUALIFYING / NURTURE and asks for no lost reason.
- Stage lists are duplicated in ~10 places (clients page, intake tabs, next-steps, analytics,
  pipeline board, settings, records actions, clients PATCH route, clients actions).

### 1.2 Contradictions (verified in code)

1. A SPAM or LOST lead with a sent proposal derives PROPOSAL_SENT / PROPOSAL_READ — documents
   outrank status — so it vanishes from /leads (both the working list and the Lost filter).
2. REJECTED / EXPIRED / ACCEPTED proposals still read PROPOSAL_SENT or "Negotiation".
3. DECLINED / EXPIRED contracts still read CONTRACT_SENT.
4. A CANCELLED project still makes the client SIGNED.
5. Proposal creation does not refuse SPAM / LOST clients.
6. `handleContractSigned` never clears `nextActionAt`, so the action centre keeps saying
   "Follow up" on a signed client.
7. The action centre skips only LOST / SPAM; the sweep uses `followUpClosedReason`
   (spam, WON, any project, a signed contract). They disagree on what is closed.
8. `lostReason` / `lostNote` survive a lead leaving LOST.
9. NURTURE has no reason and no review date.
10. A past APPROVED meeting never marked completed silently drops the stage back to the
    pre-call stage and is surfaced nowhere.
11. A returning lead booking through /schedule can get a meeting with `clientId = null`.
12. Manual client create / PATCH and `convertSubmission` / `convertEstimate` match phones with
    `normalizePhone` or an exact match, not `canonicalPhone` → duplicates.
13. Three owner fields (`Client.ownerId`, `ContactSubmission.assignedToId`,
    `Meeting.assignedToId`); only `Client.ownerId` is the opportunity owner.

### 1.3 Terminology drift

Signed vs Won · PROPOSAL_READ labelled "Negotiation" · CALL_COMPLETED "Call done" · "Nurture"
used for both a stage and a score band · Status and Stage shown side by side ·
`derivedStatusMessage` wrong for CALL_*.

### 1.4 Meeting completion

"Mark completed" is a confirm only (`setMeetingStatus`): overwrites `completedAt`, revalidates
only /calendar, records no outcome and no next action. The action centre lists PENDING
meetings only. There is no `Meeting.outcome`.

### 1.5 Surfaces

- **Home**: a strip of 10 counts duplicating the action centre; action centre top 8; fixed
  scores per kind; no reasons; not owner-scoped; cold-lead rows link to `#conversations`;
  several unbounded queries.
- **/leads**: loads every client in the prefilter with no `take`, filters stage in JS;
  `?inspect=` reloads everything; no Owner / Next action / Stage / Age columns; the inspector
  has no follow-up sheet.
- **/pipeline**: loads all non-spam clients; "Weighted value" = arbitrary
  `STAGE_PROBABILITY` × proposal total; win rate all-time won/(won+lost), which differs from
  analytics' accepted/non-draft proposals.
- **Client page**: four next-action sources disagree (`planNextSteps`, `recommendedAction`,
  `nextActionAt`/`nextActionNote`, Needs attention); several facts shown twice;
  `proposal.sent`, `contract.sent`, `meeting.status_changed` audit events carry no `clientId`,
  so they never reach the client's History.
- **Notifications**: NEW_CONTACT from the estimator has no dedupe; FOLLOW_UP_DUE is never
  marked read after the follow-up; no alert on proposal read or contract signed.
- **Search**: client results show no stage, owner or next action.
- **Mobile**: the bottom bar has no /leads or /pipeline.
- **Analytics**: no period filter, no lost-reason breakdown, UTM tables ignore `firstTouch`,
  sales cycle reads `respondedAt` which only manual records set.

---

## 2. Rulings (taken by the lead, open to Ali's review)

**R1 — Stage precedence.** In order:
1. Signed contract, `WON`, or a project that is not CANCELLED → SIGNED. A signed contract or a
   linked project also writes `Client.status = WON` deliberately, through `markClientWon`
   (`lib/client-won.ts`), with an audited `client.status_changed` — so a LOST / NURTURE / SPAM
   status never sits silently under a signed deal (Ali, 2026-10-09).
2. SPAM → SPAM.
3. Hand-set LOST or NURTURE → that stage, even with open documents. Closing is a person's
   decision and documents do not overrule it.
4. Contract sent (not DRAFT, DECLINED, EXPIRED) → CONTRACT_SENT.
5. A DECLINED / EXPIRED contract, or a REJECTED / EXPIRED / ACCEPTED proposal with no live
   contract → NEGOTIATION (PROPOSAL_READ slot), with a blocker naming the decision owed.
6. Proposal read → PROPOSAL_READ; proposal sent → PROPOSAL_SENT.
7. Calls, then QUALIFIED / QUALIFYING / CONTACTED / VIEWED / NEW as today.

**R2 — Re-opening.** Creating a proposal for a LOST / NURTURE client re-opens it to QUALIFIED
with an audit event and clears `lostReason`/`lostNote`. Proposal creation is refused for SPAM.

**R3 — One "closed" test.** The action centre, the sweep and the work queue all ask
`followUpClosedReason` (plus LOST / NURTURE as not-actionable-now for the queue, except a due
NURTURE review).

**R4 — Signing clears the chase.** `handleContractSigned` clears `nextActionAt` /
`nextActionNote`.

**R5 — No second score.** Priority (HIGH/MEDIUM/LOW) and health (Healthy / Needs attention /
At risk / Stalled / Closed) are qualitative, derived, and carry reasons. The existing lead
score stays the one number.

**R6 — No weighted forecast.** The pipeline shows quoted value (proposal totals) and estimator
ranges separately, each labelled with its source. `STAGE_PROBABILITY` is removed. "Quoted" counts
one opportunity per client — its latest live proposal version — never each version (Ali, 2026-10-09).

**R7 — Call outcome is recorded, not inferred.** `Meeting.outcome` (enum) + `outcomeAt`;
outcomes: proposal required · follow up · nurture · lost · no further action.

**R8 — Nurture has a reason and a review date.** `Client.nurtureReason` reuses `LostReason`;
the review date is `nextActionAt`, required when moving to NURTURE.

---

## 3. Plan

| Phase | What lands |
|---|---|
| B | R1–R4; one stage-list module; `canonicalPhone` in create/convert paths; `clientId` on proposal/contract/meeting audit events |
| C | `/leads` = sales work queue: group chips (Due today, Overdue, New high-intent, Calls, Proposals, Stalled, Unassigned, Mine, Recently won), server-side bounded queries, Owner / Next action / Stage columns, follow-up sheet in the inspector |
| D | Client page: one next action (from `lib/sales-intel.ts`) with its Why list; duplicates removed; "Record the call" sheet (R7) |
| E | Health on queue rows, pipeline cards, client header |
| F | Proposal readiness: READY / NOT READY + missing list, before "New proposal" |
| G | Stale / blocker detection in the engine; overdue APPROVED meetings surfaced; FOLLOW_UP_DUE marked read on follow-up |
| H | Pipeline: R6, bounded queries, health per card |
| I | Home: owner-scoped "Mine" action centre with reasons; count strip trimmed |
| J | check-types, lint, validate, verify:*, browser scenarios 1–12 on `altruvex_scratch`, 1440/1024/768/375 × dark/light |

Engine: `apps/admin/lib/sales-intel.ts`, pure (no Prisma import), input = the client shape the
queue already selects. Outputs priority, next action (label, why[], due), health, blockers,
reply SLA, proposal readiness, days since last meaningful activity.

## 4. Decisions waiting for Ali

- Sales OS migrations: done. `20261009120000_sales_os_call_outcome` and
  `20261009140000_nullable_lead_phone` are recorded as finished on both Neon databases
  (local endpoint 11:01 UTC, production 11:07 UTC, 2026-10-09; columns checked on 2026-10-09
  after Ali's approval, `prisma migrate status` up to date on both, no empty-string phones).
- R1 and R6 were confirmed by Ali on 2026-10-09 (with the WON-transition and one-quote-per-client
  additions above). Mine/Unassigned, the working week and the analytics window were ruled the
  same day — see "Final rulings" in §5.

---

## 5. Change log

Format: CHANGE / REASON / SALES IMPACT / DATA IMPACT / ADMIN IMPACT.

### 2026-10-09 — Phase B (state consistency)

**B1 — Stage precedence (R1).**
CHANGE: `deriveClientStage` (`apps/admin/lib/dashboard-data.ts`) follows R1: signed (signed contract, WON, or a non-cancelled project) → SPAM → LOST → NURTURE → contract sent → blocked documents → read → sent → calls → stored status. The latest *non-draft* proposal decides. New export `stageBlocker` names the decision owed (contract declined/expired, proposal rejected/expired, accepted proposal with no contract sent).
REASON: §1.2 items 1–4: closed leads with documents vanished from /leads, dead documents read as live, a cancelled project read as signed.
SALES IMPACT: LOST/NURTURE leads stay in their filters; dead proposals and contracts show as Negotiation with a named blocker instead of "sent".
DATA IMPACT: none (derived only).
ADMIN IMPACT: /clients, /pipeline, /leads, intake tabs, precall and analytics all see the same stage; `uncontactedWhere` ignores cancelled projects.

**B2 — No weighted forecast (R6).**
CHANGE: `STAGE_PROBABILITY` and the "Weighted value" tile removed. /pipeline shows "Quoted" (latest sent proposal per open deal, per currency) and "Live deals"; the old "Open value" tile was identical to Quoted and is gone.
REASON: R6; the probabilities were arbitrary.
SALES IMPACT: pipeline value is what was actually quoted; drafts no longer count.
DATA IMPACT: none.
ADMIN IMPACT: card values come from the latest non-draft proposal.

**B3 — One closed test in the action centre (R3).**
CHANGE: `lib/action-center.ts` filters due follow-ups through `followUpClosedReason` (`lib/lead-follow-up.ts`, now ignoring CANCELLED projects; `CLOSED_FIELDS` exported) and skips LOST/SPAM/WON. Cold-lead rows link to `#lead-record`.
REASON: §1.2 item 7: the action centre and the sweep disagreed on "closed".
SALES IMPACT: no "Follow up" on signed or closed clients; cold-lead rows open the right section.
DATA IMPACT: none.
ADMIN IMPACT: home action centre matches the follow-up sweep.

**B4 — Signing clears the chase (R4).**
CHANGE: `handleContractSigned` (`lib/contract-signing.ts`) clears `nextActionAt`/`nextActionNote` and marks the client's unread FOLLOW_UP_DUE notifications read, inside a try/catch so it can never fail the signing; the cleared values ride on the `contract.signed` audit metadata (`clearedFollowUp`).
REASON: §1.2 item 6.
SALES IMPACT: a signed client stops asking to be chased.
DATA IMPACT: two client fields nulled and notifications marked read at signing; old values kept in the audit event.
ADMIN IMPACT: none beyond the cleaner queue.

**B5 — Proposal creation re-opens or refuses (R2).**
CHANGE: `POST /api/admin/proposals` refuses a SPAM client with 409. For a LOST/NURTURE client it moves the status to QUALIFIED, clears `lostReason`/`lostNote`, and writes `client.status_changed` (metadata `{proposalId, automatic: true}`).
REASON: §1.2 item 5.
SALES IMPACT: drafting a proposal for a returning lead puts it back in the pipeline visibly.
DATA IMPACT: client status and lost fields change with an audit event.
ADMIN IMPACT: spam leads cannot receive proposals until re-classified.

**B6 — Lost fields follow the status.**
CHANGE: every status write to anything other than LOST (`_actions/records.ts`, clients PATCH, follow-up route) clears `lostReason`/`lostNote`; the audit before/after carry them.
REASON: §1.2 item 8.
SALES IMPACT: a re-opened lead no longer shows an old lost reason.
DATA IMPACT: lost fields nulled on leaving LOST; previous values kept in the audit event.
ADMIN IMPACT: none.

**B7 — One stage-list module.**
CHANGE: `lib/status.ts` holds `CLIENT_STATUSES`, `PIPELINE_STAGES`, `ALL_STAGES`, `DERIVED_ONLY_STAGES`, `LEAD_STAGES`, `LOST_REASON_VALUES`; consumers import them. Labels: SIGNED "Won", PROPOSAL_READ "Negotiation", CALL_COMPLETED "Call completed". `derivedStatusMessage` handles CALL_*. Intentional subsets stay local: `LEAD_STATUS_PREFILTER` (intake query), `DERIVED_REASON` (board), the board's writable set (no Spam column).
REASON: §1.2/§1.3: ~10 duplicated lists and drifting labels.
SALES IMPACT: one vocabulary across screens.
DATA IMPACT: none.
ADMIN IMPACT: a new stage is added in one place.

**B8 — Phone de-duplication.**
CHANGE: manual create, PATCH, `convertSubmission` and `convertEstimate` match on `phoneMatchKeys` (oldest first) and store `canonicalPhone`.
REASON: §1.2 item 12.
SALES IMPACT: fewer duplicate clients for the same person.
DATA IMPACT: new/edited phones stored in canonical form; existing rows untouched.
ADMIN IMPACT: PATCH refuses a phone that matches another client in any format.

**B9 — Audit events reach the client History.**
CHANGE: `proposal.sent`, `contract.sent` and `meeting.status_changed` (records action and meetings PATCH) carry `metadata.clientId`. `setMeetingStatus` keeps an existing `completedAt` and revalidates /calendar, /pipeline, /leads, / and the client page.
REASON: §1.4 and §1.5 (client page).
SALES IMPACT: the client History shows sends and meeting changes; completing a meeting refreshes the pipeline and queue at once.
DATA IMPACT: audit metadata only; `completedAt` no longer overwritten.
ADMIN IMPACT: none.

**E1 — Sales-intelligence engine**
- CHANGE: Added the pure engine `apps/admin/lib/sales-intel.ts` (priority, next action, health, blockers, reply SLA, proposal readiness, days since activity), pinned by `bun run verify:sales-intel` (12 brief scenarios + SLA and past-meeting edges).
- REASON: §3 Engine; R3, R5 (no second score), R7 (outcome owed after a call), R8 (nurture review date).
- SALES IMPACT: Every lead can get one next action with plain-English reasons; the reply promise reads as a clock; stale high-value deals rise to HIGH.
- DATA IMPACT: None — read-only derivation.
- ADMIN IMPACT: None until phases C–I wire it in.

**M1 — Call outcome and nurture reason (schema)**
- CHANGE: Migration `20261009120000_sales_os_call_outcome`: enum `CallOutcome`, `Meeting.outcome`, `Meeting.outcomeAt`, `Client.nurtureReason` (reuses `LostReason`). Additive, nullable.
- REASON: R7, R8.
- SALES IMPACT: A call can end with a recorded decision instead of a bare "completed".
- DATA IMPACT: Applied to `altruvex_scratch` only. Neon (local + prod) waits for Ali: `bun run db:deploy` and `bun run db:deploy:prod` from `packages/database`.
- ADMIN IMPACT: None until the "Record the call" sheet ships.

**B10 — Review fixes on Phase B**
- CHANGE: The stage reads the newest *issued* contract (a newer draft no longer hides one already sent) and every stage-feeding select loads all contracts; pipeline "Quoted" leaves out rejected/expired quotes; proposal creation and the LOST/NURTURE re-open run in one transaction and the re-open also clears `nurtureReason`.
- REASON: Independent review of B1–B9 (two consistency gaps between screens, one partial-write risk).
- SALES IMPACT: /pipeline, /leads and /clients agree on CONTRACT_SENT; the quoted total no longer counts dead quotes.
- DATA IMPACT: None beyond clearing `nurtureReason` on re-open.
- ADMIN IMPACT: Labels: "Latest live proposal on N open deals".

**D1 — Record the call (R7/R8)**
- CHANGE: "Mark completed" opens the Record-the-call sheet (`components/os/record-call-sheet.tsx`); `recordCallOutcome` (`_actions/call-outcome.ts`) stores `Meeting.outcome`/`outcomeAt` and moves the client by outcome in one transaction. The meeting sheet shows the outcome, or that one is owed.
- REASON: §1.4; R7 (outcome recorded, not inferred), R8 (nurture needs a reason and a review date).
- SALES IMPACT: Every completed call leaves a next action (proposal date, follow-up date, nurture review) or an explicit lost / no further action. Signed and spam clients are never moved; the outcome is still recorded.
- DATA IMPACT: Writes Meeting.outcome, outcomeAt, adminNotes (appended); Client.status, nextActionAt, nextActionNote, lostReason/lostNote, nurtureReason; marks the client's FOLLOW_UP_DUE alerts read.
- ADMIN IMPACT: New audit actions `meeting.outcome_recorded`, `client.call_outcome_applied` (not in Slack). A meeting can no longer be completed without an outcome, or before its day. Prefill assumes a Friday–Saturday weekend (no working week is defined in the repo yet — open for Ali).

**C1 — /leads is the sales work queue**
- CHANGE: /leads ranks every open lead and deal by engine priority, then due date, under nine group chips with counts; columns Lead, Stage, Priority, Health, Next action + due, Owner, Reply SLA, Value, Last activity, Score; the inspector shows next action, priority and health with their reasons, blockers, proposal readiness and the follow-up sheet. New `lib/sales-signals.ts` is the one loader (bounded select, activity times, `toSalesSignals`, groups) the client page, pipeline and home reuse.
- REASON: Phase C. One reading of each lead, shared by every screen.
- SALES IMPACT: Deals past the proposal stage are on /leads too; each row says why it is ranked where it is. "Quoted" counts only a live or accepted proposal; otherwise the estimate range shows.
- DATA IMPACT: None. No schema change; queries are bounded (200 rows, count queries, 3 groupBys).
- ADMIN IMPACT: The stored Status and Priority columns are gone from the list; manual priority is read-only in the inspector and still editable on the client page. Limits: when the list is capped, group counts cover the loaded rows (the page says so); a client marked WON with no signed contract or project in 30 days is not under "Recently won"; Contract has no `sentAt`, so contract chasing reads last activity; IntakeTabs counts are still unbounded (shared with /submissions and /transparency).

**H1 — Pipeline intelligence (R5, R6)**
- CHANGE: /pipeline reads through `SALES_SIGNALS_SELECT` with a 400-deal cap (newest updated first, every contract kept); each card runs through the engine and shows a health chip (word + why on hover/focus), the next action with its due date, and the owner. An "At risk or stalled" filter narrows the board; a capped board names its cap.
- REASON: §1 audit — the board's query was unbounded and its cards carried no next step; plan item H.
- SALES IMPACT: Every deal on the board says what to do next, by when, and who owns it. No new score (R5), no weighting (R6); "Quoted" unchanged.
- DATA IMPACT: None (derived). Bounded read plus three grouped activity queries.
- ADMIN IMPACT: Pipeline and /leads read health and next action from the same engine. Drag, stage menu, locked derived columns and the Lost dialog unchanged. When capped, the tiles count only the loaded deals (the page says so). The why tooltip is a local copy of the /leads one (to fold into one shared component in review).

**A1 — Sales analytics, mobile Leads, search stage/owner**
- CHANGE: /analytics gets a period filter (30/90/365 days, default 90), current-stage counts from the derived stage, a lost-reason breakdown and a first-touch split; queries rebuilt on groupBy/count with a period-bounded cohort capped at 2000 (flagged when hit). The mobile bottom bar opens /leads (falls back to /clients). Search client results show the derived stage and the owner.
- REASON: §1.5 audit — no period, no lost reasons, first touch ignored; search had no stage/owner; mobile had no /leads. R5/R6: counts only, no odds or forecast.
- SALES IMPACT: Why deals are lost and where leads first came from, per window; a client's stage and owner straight from search; Leads one tap away on a phone.
- DATA IMPACT: None; read-only, counts and sums only (no PII; `lostNote` is not read). First touch is now the earlier of the submission and the estimator run (before, the submission always won).
- ADMIN IMPACT: Sales figures are per period (default 90 days, previously all-time), so most will read lower. Monthly charts stay 12 months; client, delivery and website totals stay all-time. "Sales cycle" still relies on `respondedAt`, which only manual records set — noted under the tile, unchanged.

**I1 — Home "Needs you" is owner-scoped and engine-ranked; stale calls surface (Phases I + G)**
- CHANGE: Home lead items come from the engine through `loadSalesQueue` (bounded, 200): an item only when priority is HIGH/MEDIUM and the next action is doable now and due by end of today (covers overdue next actions and reply-SLA OVERDUE). Each row carries a why line (3 reasons + "more") and the owner. The view defaults to Mine, with an All toggle for roles that `view team`. Agreed calls whose start + grace has passed with no outcome surface as "Record the call" (capped at 25) linking to the meeting. The lead/proposal/contract/meeting counts left the strip for links to /leads groups (owner-scoped in Mine).
- REASON: §1.5 Home audit — counts duplicated the action centre, fixed scores, no reasons, no owner scope, unbounded queries. R3, R7.
- SALES IMPACT: Each operator opens on their own owed work in the engine's order and with its reasons; lapsed reply promises, overdue follow-ups and missing call outcomes cannot hide.
- DATA IMPACT: None; read-only. Two unbounded dashboard queries removed (`openProposals`, `signedThisMonth`); new loads are capped.
- ADMIN IMPACT: SUPERSEDED by "Final rulings — F2" below: Mine is now owned by the viewer only (plus team duties with no owner by nature), and Unassigned is its own view. /actions, the Slack digest and the badge were brought onto the same scope. The finance figure under "Awaiting reply" (open proposal value) went with that cell; "Quoted" on /pipeline carries it.

**D2 — Client page: one next action, health, readiness, alerts that clear**
- CHANGE: The client page shows one next-action block from `loadSalesRow` (label, due, why — 3 + "more", engine priority, blockers, one `can()`-gated control) under the header, which gains a health chip and a reply-SLA chip with reasons on hover/focus. Leads get a proposal-readiness list beside an outline "New proposal" link — it states what is missing and never blocks. FOLLOW_UP_DUE alerts are marked read (best-effort, `clients/[id]/follow-up-alerts.ts`) when a follow-up is sent, when the client moves to LOST/SPAM/WON (status PATCH, `setClientStatus`, `moveClientStage`, bulk), and when the next-action date is moved or cleared (`updateLeadRecord`).
- REASON: The client page and /leads said different things; the page had two next-step surfaces; alerts stayed unread after the work was done.
- SALES IMPACT: One action and its reason on every client; a proposal states what is missing before it goes out; the alert list holds only open chases.
- DATA IMPACT: None in schema. Writes only `Notification.read`/`readAt`, caught.
- ADMIN IMPACT: The header primary button is gone; the aside list is "More steps"; one follow-up sheet per page. The empty Deals tab's "Build a proposal" link shows no readiness (the block above covers it).

**R1 — Review fixes (wave 2 review: 2 high, 16 medium, 6 low)**
- CHANGE:
  - **Engine.** A past call owes an outcome only until the deal passes the call (a sent proposal, or a contract that is SENT or SIGNED). There is no backfill, so calls completed before the outcome field existed no longer bury CHASE_PROPOSAL / CHASE_SIGNATURE.
  - **Meeting start.** It is built in `BUSINESS_TIME_ZONE` (`meetingStartAt`), so "Record the call" and PREPARE_CALL no longer run 2–3h late on a UTC host. Date keys use `businessDayKey`, never the UTC `toISOString` date.
  - **NO_FURTHER_ACTION.** It now gives CLOSE at LOW priority, with no blocker or staleness. The client page offers the status menu for it.
  - **FOLLOW_UP with no date.** It opens the date editor.
  - **Queue order.** It loads owed work that has no date first (uncontacted, outcome owed, accepted proposal with no contract, dead proposal or contract), then the rest. Both queries are bounded.
  - **Action centre.** It uses a lean loader (no scope or won counts on every navigation). callsOwed filters closed and past-the-call clients in SQL and says when more than 25 are waiting.
  - **Completing a meeting.** It goes only through "Record the call": `setMeetingStatus("COMPLETED")` and the meetings PATCH refuse it.
  - **R8.** It is enforced on every path into NURTURE (status menu, board, bulk, PATCH, follow-up route): a reason and a review date of today or later are required, asked for in a dialog on the client page and the board. Leaving NURTURE clears `nurtureReason`. The call-outcome date check runs on the server, in business days.
  - **Pipeline cards.** They show the engine priority, with reasons. "Overdue" is computed on the server by the business-day rule on /pipeline and /leads (no `Date.now()` in render). One `isLiveQuote` (lib/quotes.ts) serves /leads value and /pipeline Quoted.
  - **/leads counts.** The "All open work" chip shows the true total, and group counts are recounted after a post-cap filter. `owner=mine` now means owned by the viewer only, with `owner=unassigned` beside it (superseded by F2).
  - **Shared components.** There is one `WhyHint` (components/os/why-hint.tsx): a labelled button that opens on hover, focus, tap or click. It replaces three copies. `sales-display.ts` moved to components/os. The duplicate `WhyList` is gone. Action-centre reasons are printed, not hover-only.
  - **Analytics.** "Won" by source uses the derived SIGNED stage, the same as the stage count. Lead months are a SQL group-by (counts only). Cohort meetings are capped per client.
  - **Lost reasons.** `LOST_REASON_VALUES` is the one list: the registry is checked against it at compile time, with an `isLostReason` guard. The `LOST_REASONS` alias is gone.
  - **Cleanup.** Unused exports were dropped from sales-intel, sales-signals and next-steps.
- REASON: An opus review of the wave 2 diff.
- SALES IMPACT: Real next actions for deals that predate outcomes. Call prompts at the right hour. One priority and one overdue rule on every screen. Parked leads always have a reason and a review date.
- DATA IMPACT: No schema change. NURTURE writes `nurtureReason` plus `nextActionAt` (note "Review nurture"). Leaving NURTURE nulls `nurtureReason`.
- ADMIN IMPACT:
  - "Mark completed" opens the call-outcome sheet. A plain status change to COMPLETED is refused with a pointer to it.
  - Moving a lead to Nurture asks why and when to review.
  - The records.ts actions still throw their refusals; the `_actions/clients.ts` wrappers return `{ok,message}` (the existing pattern).
  - The "All open work" chip shows no count while the Won group is open.

**J1 — DB-backed integrity check (`verify:sales-db`)**
- CHANGE: Added `apps/admin/scripts/verify-sales-db.ts`. It seeds the 12 brief scenarios, plus a nurture lead whose review date is due and the two call-outcome edge cases, on a local database. It reads them back through the real `loadSalesRow`, `loadSalesQueue` and `getActionCentre`, and asserts stage, next action, priority, health, group membership and counts, owner filter and action-centre items. It cleans up in `finally` and refuses a remote host unless `VERIFY_ALLOW_REMOTE=1` is set. It found one bug, now fixed: `callsOwed` raised a LOST client's unrecorded call. LOST now joins SPAM and WON in that query.
- REASON: The brief's Phase J asks for integrity tests against a real database, not a mocked one.
- SALES IMPACT: A lost deal no longer asks for its call to be recorded.
- DATA IMPACT: The script writes prefixed records to the scratch database and deletes them again.
- ADMIN IMPACT: Run `bun run verify:sales-db` against `altruvex_scratch` only.

### 2026-10-09 — Final rulings (Ali) and browser verification

**F1 — One working week (Friday and Saturday off)**
- CHANGE: `lib/working-days.ts` is the one rule for every sales day count: engine due/overdue, staleness, the reply SLA (24 working hours), the follow-up sweep, the call-outcome date prefill and its server check, action-centre overdue days, and the sales due chip (`workingDueLabel` on the client page, /pipeline and /leads). A date on Friday/Saturday is due Sunday; on Friday/Saturday "today" is Thursday, so a Thursday follow-up reads "Due today" until Sunday, when it reads "1d overdue".
- REASON: Ali's ruling; the browser pass found the client page still counting calendar days ("1d overdue" on a Friday).
- SALES IMPACT: Nothing goes overdue over the weekend; every screen gives the same count.
- DATA IMPACT: None.
- ADMIN IMPACT: Payments, tasks and projects keep the calendar-day `dueLabel` on purpose (payments have their own overdue rule). A far date reads in working days ("Due in 65d" for ~91 calendar days).

**F2 — Mine is mine; Unassigned is its own view**
- CHANGE: Home, /actions, /leads (`owner=mine|unassigned`), the Actions badge and the Slack digest use one scope (`scopeActions`/`resolveActionView` in `lib/action-center.ts`, `ownerWhere` in `lib/sales-signals.ts`). Mine = owned by the viewer, plus team duties (payments, incidents, renewals, failed sends — nothing to own). Unassigned = owner-scoped items with no owner. All needs `view team`. The badge counts Mine; the digest adds a "whole team: X owned, Y unassigned" line.
- REASON: Ali's ruling; it reverses I1's "Mine or unassigned".
- SALES IMPACT: No unowned lead lands in every operator's list; unowned work is visible in one place.
- DATA IMPACT: None. The /leads tab counts are now a database count, not the length of a capped list.
- ADMIN IMPACT: Inside Mine, the /leads Unassigned chip reads 0 (chips are owner-scoped). Team duties do not appear under Unassigned.

**F3 — Signed means WON, written once and audited**
- CHANGE: `markClientWon` (`lib/client-won.ts`) is the only writer of `Client.status = WON` from evidence. `handleContractSigned` (system and hand-recorded signatures) calls it with cause `contract_signed`, and linking or recording a non-cancelled project calls it with `project_linked`. It writes `client.status_changed` with `{ from, cause, automatic: true }` and clears `lostReason`/`lostNote`/`nurtureReason`. Supersedes B1's "derived only" for WON.
- REASON: R1 as confirmed: closed statuses beat old proposals, but a real signature beats a closed status.
- SALES IMPACT: A lost deal that signs on paper reads WON everywhere, with its audit trail.
- DATA IMPACT: Writes `Client.status` at signing/linking time only; no backfill.
- ADMIN IMPACT: None beyond the audit row.

**F4 — Analytics window, one quote per client, no invented history**
- CHANGE: Sales analytics default to 90 days with a visible range line and 30d / 90d / 12mo / All time. Quoted, win rate and average deal count one proposal per client (latest live version). Sales cycle reads "Not enough data" with the count of won deals that have both a sent and an answer date. The operational pipeline and queues ignore the window.
- REASON: Ali's rulings 3, 4 and 6.
- SALES IMPACT: Rates no longer double-count a re-quoted deal.
- DATA IMPACT: None; read-only.
- ADMIN IMPACT: Metrics not reliably computable today: contract-sent dates (Contract has no `sentAt`, none invented), sales cycle (`respondedAt` set only by manual records), average client value (sums every accepted version), and project average duration (recorded projects can carry dates that make it negative).

**F5 — Action centre: one row per document, parked clients not chased**
- CHANGE: The separate proposal/contract loops left the action centre; the engine's chase links to the latest proposal (`#engagement`) or the first non-draft contract (`#signature`). An expiry row appears only for the latest live proposal expiring within 7 days, never for LOST / SPAM / NURTURE / closed clients. The "Sent Nd ago" line went.
- REASON: The browser pass showed a two-version deal listed twice and a re-won client chased with "Sent 0d ago".
- SALES IMPACT: One row per deal; parked clients are not chased.
- DATA IMPACT: None. Pinned by `verify:sales-db` s15/s16.
- ADMIN IMPACT: None.

**F6 — A spam client is offered no proposal step**
- CHANGE: `clients/[id]/next-steps.ts` omits "New proposal" for SPAM, matching the 409 from `POST /api/admin/proposals`.
- REASON: The browser pass showed it as the spam client's main action.
- SALES IMPACT: No dead-end button.
- DATA IMPACT: None.
- ADMIN IMPACT: The /new-proposal page itself still opens for a spam client by URL; only the POST refuses.

**Verification (scratch only).** Browser scenarios 1–12 on `localhost:3013` against `altruvex_scratch` with integrations blanked, all passing after F1/F5/F6. check-types, lint, `bun run validate` and all 16 `verify:*` scripts exit 0. `20261009140000_nullable_lead_phone` was already in effect on scratch. Nothing was applied to Neon during this verification; the migrations were later found already applied to both (see §4).

**F7 — Limitations pass (Ali: "fix the open-ended limitations list")**
- CHANGE:
  - **Analytics.** Average client value takes the latest accepted proposal per won client ("N of M won clients"). Average duration leaves out recorded projects (their `createdAt` is entry time, not a start) and any span that is not positive. It shows "based on N of M launched projects", or "Not enough data".
  - **Client header.** The header shows the engine priority with its reasons, and no priority when the engine has no row. The stored `Client.priority` stays only as the "Set priority" menu value.
  - **Score band.** "Nurture" is now "Low intent", so it no longer reads like the NURTURE stage.
  - **Spam.** `/clients/[id]/new-proposal` shows a notice for a SPAM client instead of the builder.
  - **Due chips.** `workingDueLabel` prints the date ("Due 20 Oct", with the year if it is a different year) beyond 7 working days.
  - **/pipeline.** It reads "1 open deal" or "N open deals". "Live deals" counts every stage except Signed, Nurture and Lost.
  - **/leads.** Group chips that read 0 by construction are hidden: Unassigned inside Mine, and Mine inside Unassigned.
  - **Manual client create.** It needs a phone or an email (400 when it has neither). A phone that is given must be valid, and an absent one is stored as null.
  - **FOLLOW_UP_DUE alerts.** These are now cleared by `recordPastProject` and by the R2 re-open in `POST /api/admin/proposals`.
  - **Menu badges.** Each badge has a scope label, "N assigned to you" (Actions) or "N across the team" (the rest), declared once in `BADGE_SCOPE` (`lib/nav.ts`).
- REASON: The limitations recorded in F1–F6 and the browser pass.
- SALES IMPACT: Figures no longer double-count or go negative. One priority per client. No contradictory chips or dead-end pages. Email-only clients can be recorded by hand.
- DATA IMPACT: No schema change. Writes only `Notification.read`/`readAt` (best-effort) on the two new clearing paths.
- ADMIN IMPACT: Still open by design or by data:
  - Contract has no `sentAt` (Ali: none added or invented).
  - Sales cycle depends on `respondedAt` from manual records.
  - Payments, tasks and projects keep calendar-day due labels.
  - The /pipeline "Average deal" averages proposed work including Signed (labelled "Across proposed work").
  - `recommendedAction()` still says "Nurture" as an action for the low band.

### 2026-10-10 — Final verification (scratch)

**V1 — Two verify fixes**
- CHANGE: `POST /api/admin/proposals` clears follow-up alerts with the cause `proposals.reopen` (was `proposal.reopen`, which `verify:security` read as an unregistered audit action). `verify:sales-db` s14 seeds its call two *working* days back (`lastWorkingDayKey` + `addCalendarDaysKey`), since `addWorkingDaysKey` only counts forward.
- REASON: Both scripts failed for reasons in the scripts' assumptions, not in the sales logic.
- SALES IMPACT: None.
- DATA IMPACT: None.
- ADMIN IMPACT: None.

**V2 — A lead with no phone**
- CHANGE: `verify:sales-db` section [8] creates an email-only client through `linkClientToLead` (phone stored as null), re-links it by the same email in another case (same client), refuses a lead with neither (null), and loads its sales row.
- REASON: `20261009140000_nullable_lead_phone`, applied to `altruvex_scratch` for this pass (schema diff empty afterwards). Not applied to either Neon database in this step.
- SALES IMPACT: Email-only estimate requests become clients and enter the queue.
- DATA IMPACT: Scratch only.
- ADMIN IMPACT: None.

**Browser pass (scratch, `localhost:3013`, integrations blanked).** All 12 scenarios pass: new lead with no phone (Unassigned, "Send the first reply"), qualified (Book a call), booked (Prepare for the call), call held (outcome "Proposal required" through Record the call; next action prefilled to the next working day; `meeting.outcome_recorded` + `client.call_outcome_applied`), proposal sent (in Proposals), win (hand-recorded signature → WON with cause `contract_signed`, project created, nothing sent), lose (LOST, reason Competitor), nurture (NURTURE, reason Timing), spam, assign (owner set → leaves Unassigned, enters Mine, `client.lead_record_updated`), another owner's lead (not in Mine), high-value stale (High priority, Stalled). /leads group counts match a database count by owner. /actions: Mine 7 + Unassigned 3 = All 10, and the Actions badge reads 7 (Mine). The Slack digest is the team's All list with an owned/unassigned split. Those seed rows were later removed (see Hardening below).

**Hardening (same day).**

- **H1 — Nurture review date lands on a working day.** `workingDayAfterKey` + `NURTURE_REVIEW_DAYS = 90` (`lib/working-days.ts`) now set the default in both the calendar outcome sheet and the client status menu. A 90-day default that lands on a Friday or Saturday moves to the following Sunday. Checked by `verify:sales-intel` ("Nurture review default"). This resolves the earlier open finding.
- **H2 — "Average deal" split in two.** `/pipeline` shows "Average open quote" from `lib/pipeline-metrics.ts` `openQuoteMetrics`: the latest live proposal per open deal, excluding Signed, Lost, Spam and Nurture, skipping null values and non-live quotes, averaged per currency and never probability-weighted. `/analytics` shows "Average won deal", the latest accepted quote per won client. Limitation: the pipeline figure covers the capped `PIPELINE_TAKE` set, and the page says so when capped.
- **H3 — Score bands renamed.** The bands are now High intent, Medium intent, Low intent and Poor fit. The old "Nurture" band read as a lifecycle stage. Thresholds stay at 35 and 65. `verify:sales-intel` checks that no band label equals a stage label.
- **Neon.** Both databases are migrated through `20261009140000_nullable_lead_phone`, with no drift. Nothing was re-run.
- **Scratch cleanup.** Run 1 removed 25 test clients ("BTNN", "SOS-browser NN") and their proposals, contracts, projects, payments (none paid), meetings, WhatsApp rows, transparency leads, events and notifications. It was not one transaction: a truncated statement made each delete autocommit, though the end state was verified correct. Run 2 removed the 12 clients reseeded for the rerun, in one `begin … commit`. Fixtures kept: 2 clients and 5 users. Audit events written by the `verify:*` scripts (actor "verify") stay by design.
- **Scenario rerun.** All 12 pass again with the H1–H3 behaviour: the Nurture default is Sun 10 Jan 2027 from Sat 10 Oct, the pipeline shows the open-quote average with no double count, and leads show the new band labels.
- **Checks.** check-types, lint, `bun run validate`, and every `verify:*` with and without a database (against `altruvex_scratch`) pass. The open-quote fixture values were changed so the price-literal guard passes on its own terms.
