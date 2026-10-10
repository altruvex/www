/**
 * Pins the sales-intelligence engine (lib/sales-intel.ts) against the twelve
 * Sales OS scenarios plus the reply-promise edges and a past call with no
 * outcome. Needs no database. Run: bun run verify:sales-intel
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { LEAD_SCORE_THRESHOLDS } from "@repo/pricing-schema";

import {
  REPLY_PROMISE_HOURS,
  blockers,
  businessDayKey,
  meetingStartAt,
  daysSinceActivity,
  health,
  nextAction,
  priority,
  proposalReadiness,
  replySla,
  type SalesSignals,
} from "../lib/sales-intel";
import {
  NURTURE_REVIEW_DAYS,
  addWorkingDaysKey,
  addWorkingHours,
  isWorkingDayKey,
  effectiveDueKey,
  isDueByWorkingDay,
  isOverdueByWorkingDay,
  startOfBusinessDayKey,
  workingDaysSince,
  workingDayAfterKey,
  workingDueLabel,
} from "../lib/working-days";
import { recommendedAction, scoreBand, type ScoreBand } from "../lib/lead-score";
import { submissionStatus } from "../lib/status";
import { openQuoteMetrics, type QuoteCard } from "../lib/pipeline-metrics";

let failures = 0;
const addCalendarKey = (key: string, days: number): string => {
  const d = new Date(`${key}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};
const check = (ok: boolean, what: string) => {
  console.log(`  ${ok ? "✓" : "✗"} ${what}`);
  if (!ok) failures++;
};

const HOUR = 3_600_000;
const DAY = 86_400_000;
// Midday in Cairo on a Thursday (a working day), so "today" by the business
// day is unambiguous. Friday and Saturday are off (lib/working-days.ts): the
// working days before it run Wed 14, Tue 13, Mon 12, Sun 11, Thu 8, Wed 7 …
const now = new Date("2026-10-15T10:00:00.000Z");
const ago = (ms: number) => new Date(now.getTime() - ms);
const ahead = (ms: number) => new Date(now.getTime() + ms);

const base = (over: Partial<SalesSignals> = {}): SalesSignals => ({
  stage: "NEW",
  status: "NEW",
  source: "WEBSITE_CONTACT_FORM",
  score: 40,
  band: "Medium intent",
  createdAt: ago(2 * HOUR),
  lastOutboundAt: null,
  contacted: false,
  lastMeaningfulActivityAt: null,
  ownerId: "u1",
  viewerId: "u1",
  nextActionAt: null,
  nextActionNote: null,
  proposal: null,
  contract: null,
  meeting: null,
  estimate: null,
  timeline: "SOON",
  hasBudget: true,
  hasScope: true,
  decisionRole: "DECIDES",
  stageBlocker: null,
  ...over,
});

const all = (s: SalesSignals) => ({
  p: priority(s, now),
  n: nextAction(s, now),
  h: health(s, now),
  r: replySla(s, now),
  b: blockers(s, now),
});

console.log("\nDrift guard");
{
  const src = readFileSync(fileURLToPath(new URL("../lib/lead-follow-up.ts", import.meta.url)), "utf8");
  const m = src.match(/export const REPLY_PROMISE_HOURS = (\d+);/);
  check(m != null && Number(m[1]) === REPLY_PROMISE_HOURS, "REPLY_PROMISE_HOURS matches lead-follow-up.ts");
}

console.log("\n1. New lead");
{
  const x = all(base());
  check(x.r.state === "WITHIN", "reply SLA within");
  check(x.n.kind === "REPLY" && x.n.due?.toISOString() === "2026-10-18T08:00:00.000Z", "next = first reply, due at the promise (Thu 11:00 + 24 working hours = Sun 11:00)");
  check(x.p.level === "MEDIUM", `priority MEDIUM (${x.p.level})`);
  check(x.h.state === "HEALTHY", `health HEALTHY (${x.h.state})`);
  check(x.p.why.includes("Assigned to you"), "viewer owns it → 'Assigned to you'");
}

console.log("\n2. Qualified");
{
  const s = base({ stage: "QUALIFIED", status: "QUALIFIED", contacted: true, lastMeaningfulActivityAt: ago(2 * DAY) });
  const x = all(s);
  check(x.r.state === "MET", "reply SLA met");
  check(x.n.kind === "BOOK_CALL", `next = book a call (${x.n.kind})`);
  check(x.h.state === "HEALTHY", `health HEALTHY (${x.h.state})`);
  // Quiet since Wed 7: 8 calendar days but 6 working days, under the 7-day limit.
  const weekend = all({ ...s, lastMeaningfulActivityAt: ago(8 * DAY) });
  check(weekend.h.state === "HEALTHY", `8 calendar / 6 working quiet days → HEALTHY (${weekend.h.state})`);
  // Quiet since Mon 5: 8 working days.
  const stale = all({ ...s, lastMeaningfulActivityAt: ago(10 * DAY) });
  check(stale.h.state === "AT_RISK", `8 working quiet days → AT_RISK (${stale.h.state})`);
  // Quiet since Fri Sep 25: 15 working days, past twice the limit.
  const stalled = all({ ...s, lastMeaningfulActivityAt: ago(20 * DAY) });
  check(stalled.h.state === "STALLED", `15 working quiet days → STALLED (${stalled.h.state})`);
}

console.log("\n3. Call booked");
{
  const s = base({
    stage: "CALL_BOOKED",
    status: "QUALIFIED",
    contacted: true,
    lastMeaningfulActivityAt: ago(20 * DAY),
    meeting: { status: "APPROVED", scheduledAt: ahead(2 * DAY), outcome: null },
  });
  const x = all(s);
  check(x.n.kind === "PREPARE_CALL" && x.n.due?.getTime() === s.meeting!.scheduledAt.getTime(), "next = prepare for the call, due at the call");
  check(x.h.state === "HEALTHY", `a call ahead is never stale (${x.h.state})`);
}

console.log("\n4. Call completed");
{
  const done = { status: "COMPLETED", scheduledAt: ago(2 * DAY), outcome: "PROPOSAL_REQUIRED" };
  const ready = base({ stage: "CALL_COMPLETED", status: "QUALIFIED", contacted: true, lastMeaningfulActivityAt: ago(DAY), meeting: done });
  check(proposalReadiness(ready).ready, "readiness READY with budget, scope, timeline, call");
  check(nextAction(ready, now).kind === "WRITE_PROPOSAL", "next = write the proposal");
  const thin = { ...ready, hasBudget: false, timeline: null, decisionRole: "ADVISES" };
  const r = proposalReadiness(thin);
  check(!r.ready && r.missing.join("|") === "Budget|Timeline|The person who makes the decision", `missing = ${r.missing.join(", ")}`);
  const n = nextAction(thin, now);
  check(n.kind === "CLARIFY" && n.label === "Clarify budget, timeline, the person who makes the decision", `next = ${n.label}`);
  check(blockers(thin, now).some((b) => b.startsWith("Proposal blocked: missing budget")), "blocker names what is missing");
  check(!proposalReadiness(base()).ready && proposalReadiness(base()).missing.includes("A completed call"), "no call → not ready");
}

console.log("\n5. Proposal sent");
{
  const sent = base({
    stage: "PROPOSAL_SENT",
    status: "QUALIFIED",
    contacted: true,
    lastMeaningfulActivityAt: ago(DAY),
    meeting: { status: "COMPLETED", scheduledAt: ago(5 * DAY), outcome: "PROPOSAL_REQUIRED" },
    proposal: { status: "SENT", sentAt: ago(DAY), readAt: null },
  });
  check(nextAction(sent, now).kind === "WAIT", "fresh, unread → wait");
  const unread = { ...sent, proposal: { status: "SENT", sentAt: ago(3 * DAY), readAt: null } };
  check(nextAction(unread, now).label === "Check the proposal reached them", "unread 3 days → check it reached them");
  const read = {
    ...sent,
    stage: "PROPOSAL_READ" as const,
    lastMeaningfulActivityAt: ago(4 * DAY),
    proposal: { status: "READ", sentAt: ago(5 * DAY), readAt: ago(4 * DAY), expiresAt: ahead(2 * DAY) },
  };
  const x = all(read);
  check(x.n.kind === "CHASE_PROPOSAL" && x.n.why[0] === "No reply 4 working days after the proposal was read", `why: ${x.n.why[0]}`);
  check(x.n.why.includes("Proposal expires in 2 days"), "expiry called out");
  check(x.p.level === "HIGH", `read + quiet → HIGH (${x.p.level})`);
  const accepted = { ...read, proposal: { status: "ACCEPTED", sentAt: ago(5 * DAY), readAt: ago(4 * DAY) } };
  check(nextAction(accepted, now).kind === "GENERATE_CONTRACT", "accepted → generate contract");
  check(priority(accepted, now).level === "HIGH", "accepted → HIGH");
  const rejected = { ...read, proposal: { status: "REJECTED", sentAt: ago(5 * DAY), readAt: ago(4 * DAY) } };
  check(nextAction(rejected, now).kind === "REVISE_OR_CLOSE", "rejected → revise or close");
  check(health(rejected, now).state === "AT_RISK", "rejected → AT_RISK");
  const blocked = { ...rejected, stageBlocker: "Proposal rejected: decide whether to revise or close" };
  check(blockers(blocked, now).filter((b) => b.includes("rejected")).length === 1, "stage blocker not duplicated");
  const contract = {
    ...read,
    stage: "CONTRACT_SENT" as const,
    proposal: { status: "ACCEPTED", sentAt: ago(9 * DAY), readAt: ago(8 * DAY) },
    contract: { status: "SENT", sentAt: ago(7 * DAY) },
    lastMeaningfulActivityAt: ago(2 * DAY),
  };
  const c = nextAction(contract, now);
  // Sent Thu 8 13:00: 11h that day + Sun–Wed + 13h today = 5 working days.
  check(c.kind === "CHASE_SIGNATURE" && c.why[0] === "Contract unsigned 5 working days after sending", `contract 5 working days → ${c.why[0]}`);
}

console.log("\n6. Won");
{
  const x = all(base({ stage: "SIGNED", status: "WON", contacted: true, nextActionAt: ago(3 * DAY) }));
  check(x.n.kind === "NONE" && x.h.state === "CLOSED" && x.p.level === "LOW", "closed: no action, CLOSED, LOW");
  check(x.r.state === "N_A" && x.b.length === 0, "no SLA, no blockers (stale follow-up date ignored)");
}

console.log("\n7. Lost");
{
  const x = all(base({ stage: "LOST", status: "LOST", contacted: true }));
  check(x.n.kind === "NONE" && x.h.state === "CLOSED" && x.p.level === "LOW", "lost: no action, CLOSED, LOW");
  const winBack = nextAction(base({ stage: "LOST", status: "LOST", nextActionAt: ago(DAY), nextActionNote: "Check budget in Q1" }), now);
  check(winBack.kind === "FOLLOW_UP" && winBack.label === "Check budget in Q1", "a due win-back date still surfaces");
}

console.log("\n8. Nurture");
{
  const parked = all(base({ stage: "NURTURE", status: "NURTURE", contacted: true, nextActionAt: ahead(30 * DAY) }));
  check(parked.n.kind === "WAIT" && parked.h.state === "HEALTHY" && parked.p.level === "LOW", "parked: wait, HEALTHY, LOW");
  check(parked.r.state === "N_A", "nurture carries no reply promise");
  const due = all(base({ stage: "NURTURE", status: "NURTURE", nextActionAt: ago(HOUR), nextActionNote: "Ask if funding closed" }));
  check(due.n.kind === "REVIEW_NURTURE" && due.n.label === "Ask if funding closed", "due review → its note");
  check(due.h.state === "NEEDS_ATTENTION" && due.p.level === "MEDIUM", "due review → NEEDS_ATTENTION, MEDIUM");
  const undated = all(base({ stage: "NURTURE", status: "NURTURE" }));
  check(undated.n.label === "Set a nurture review date" && undated.b.includes("Nurture has no review date"), "no review date → set one (R8)");
}

console.log("\n9. Spam");
{
  const x = all(base({ stage: "SPAM", status: "SPAM", createdAt: ago(5 * DAY) }));
  check(x.n.kind === "NONE" && x.h.state === "CLOSED" && x.r.state === "N_A" && x.b.length === 0, "spam: nothing owed, even past the reply window");
}

console.log("\n10. Unowned");
{
  const x = all(base({ ownerId: null }));
  check(x.b.includes("No owner assigned"), "blocker: no owner");
  check(x.p.why.includes("Nobody owns this lead") && !x.p.why.includes("Assigned to you"), "priority says nobody owns it");
  check(x.h.state === "NEEDS_ATTENTION", `health NEEDS_ATTENTION (${x.h.state})`);
}

console.log("\n11. Owned (by someone else)");
{
  const x = all(base({ ownerId: "u2", viewerId: "u1" }));
  check(!x.b.includes("No owner assigned") && !x.p.why.includes("Assigned to you"), "no owner blocker, not marked as the viewer's");
  check(x.p.level === all(base()).p.level, "priority does not depend on who is looking");
}

console.log("\n12. High-value stale");
{
  const s = base({
    stage: "QUALIFYING",
    status: "QUALIFYING",
    contacted: true,
    score: 72,
    band: "High intent",
    lastMeaningfulActivityAt: ago(10 * DAY),
  });
  const x = all(s);
  check(x.p.level === "HIGH" && x.p.why[0] === "High-intent lead (score 72) is going quiet", `priority HIGH: ${x.p.why[0]}`);
  check(x.h.state === "AT_RISK" && x.h.why[0] === "No activity for 8 working days at this stage", `health ${x.h.state}: ${x.h.why[0]}`);
  // Mon 5 → Thu 15 is 10 calendar days, 8 of them working.
  check(daysSinceActivity(s, now) === 8, "daysSinceActivity = 8 working days");
  const fresh = all({ ...s, lastMeaningfulActivityAt: ago(DAY) });
  check(fresh.p.level === "MEDIUM", "same lead, active → MEDIUM");
  const byEstimate = priority({ ...s, band: "Medium intent", score: 50, estimate: { min: LEAD_SCORE_THRESHOLDS.large, max: LEAD_SCORE_THRESHOLDS.large * 2 } }, now);
  check(byEstimate.level === "HIGH", "a large estimate counts as high value too");
}

console.log("\nReply SLA edges");
{
  const at = (hours: number, over: Partial<SalesSignals> = {}) =>
    replySla(base({ createdAt: ago(hours * HOUR), ...over }), now);
  check(at(17.99).state === "WITHIN", "6h+ left → WITHIN");
  check(at(18).state === "APPROACHING", "exactly 6h left → APPROACHING");
  check(at(23.99).state === "APPROACHING", "minutes left → APPROACHING");
  check(at(24).state === "OVERDUE", "exactly 24h → OVERDUE");
  check(at(30, { lastOutboundAt: ago(HOUR) }).state === "MET", "an outbound message → MET");
  check(at(30, { contacted: true }).state === "MET", "recorded contact → MET");
  check(at(30, { source: "MANUAL" }).state === "N_A", "manual lead → N_A");
  const late = all(base({ createdAt: ago(30 * HOUR), nextActionAt: ahead(2 * DAY), nextActionNote: "Call Tuesday" }));
  check(late.n.kind === "REPLY" && late.n.why[0] === "No first reply 30 hours after arrival (promised within 24 working hours)", `overdue beats a future follow-up: ${late.n.why[0]}`);
  check(late.p.level === "HIGH" && late.h.state === "AT_RISK", "overdue reply → HIGH, AT_RISK");
}

console.log("\nPast meeting without an outcome");
{
  const s = base({
    stage: "CALL_BOOKED",
    status: "QUALIFIED",
    contacted: true,
    lastMeaningfulActivityAt: ago(DAY),
    nextActionAt: ahead(3 * DAY),
    meeting: { status: "APPROVED", scheduledAt: ago(DAY), outcome: null },
  });
  const x = all(s);
  check(x.n.kind === "RECORD_OUTCOME", `next = record the call (${x.n.kind}), beats the future follow-up`);
  check(x.b.some((b) => b.includes("has no recorded outcome")), "blocker names it");
  check(x.h.state === "NEEDS_ATTENTION", `health NEEDS_ATTENTION (${x.h.state})`);
  const justEnded = nextAction({ ...s, meeting: { status: "APPROVED", scheduledAt: ago(HOUR), outcome: null } }, now);
  check(justEnded.kind !== "RECORD_OUTCOME", "within the grace window → not yet");
  const recorded = nextAction({ ...s, nextActionAt: null, meeting: { status: "COMPLETED", scheduledAt: ago(DAY), outcome: "FOLLOW_UP" } }, now);
  check(recorded.label === "Set a follow-up date", "outcome FOLLOW_UP with no date → set one");
}

console.log("\nOld completed call, no outcome, proposal sent");
{
  // Calls completed before outcomes existed carry none (no backfill): once the
  // deal has moved past the call, the outcome is not owed.
  const s = base({
    stage: "PROPOSAL_READ",
    status: "QUALIFIED",
    contacted: true,
    lastMeaningfulActivityAt: ago(4 * DAY),
    meeting: { status: "COMPLETED", scheduledAt: ago(30 * DAY), outcome: null },
    proposal: { status: "READ", sentAt: ago(5 * DAY), readAt: ago(4 * DAY) },
  });
  const x = all(s);
  check(x.n.kind === "CHASE_PROPOSAL", `next stays CHASE_PROPOSAL (${x.n.kind})`);
  check(!x.b.some((b) => b.includes("no recorded outcome")), "no outcome blocker");
  check(x.p.level === "HIGH", `priority from the proposal, HIGH (${x.p.level})`);
  const signing = nextAction(
    { ...s, stage: "CONTRACT_SENT", contract: { status: "SENT", sentAt: ago(7 * DAY) }, proposal: { status: "ACCEPTED", sentAt: ago(9 * DAY), readAt: ago(8 * DAY) } },
    now,
  );
  check(signing.kind === "CHASE_SIGNATURE", `live contract → CHASE_SIGNATURE (${signing.kind})`);
  const before = nextAction({ ...s, stage: "CALL_COMPLETED", proposal: null }, now);
  check(before.kind === "RECORD_OUTCOME", `no proposal yet → outcome still owed (${before.kind})`);
}

console.log("\nNo further action");
{
  const s = base({
    stage: "CALL_COMPLETED",
    status: "QUALIFIED",
    contacted: true,
    score: 72,
    band: "High intent",
    hasBudget: false,
    lastMeaningfulActivityAt: ago(10 * DAY),
    meeting: { status: "COMPLETED", scheduledAt: ago(10 * DAY), outcome: "NO_FURTHER_ACTION" },
  });
  const x = all(s);
  check(x.n.kind === "CLOSE", `next = close (${x.n.kind})`);
  check(x.p.level === "LOW", `priority LOW, not owed now (${x.p.level})`);
  check(x.b.length === 0, `no blockers (${x.b.join("; ")})`);
  check(x.h.state === "HEALTHY", `not stale (${x.h.state})`);
}

console.log("\nCall start in the business time zone");
{
  // 14:00 Cairo on 2026-10-09 (UTC+3) = 11:00Z, however the date was stored.
  const want = Date.parse("2026-10-09T11:00:00.000Z");
  const stored = [
    ["UTC-server midnight (admin form on prod)", "2026-10-09T00:00:00.000Z"],
    ["Cairo-local midnight (admin form on a Cairo host)", "2026-10-08T21:00:00.000Z"],
    ["the slot instant (public booking page)", "2026-10-09T11:00:00.000Z"],
  ] as const;
  for (const [how, iso] of stored)
    check(meetingStartAt({ scheduledDate: new Date(iso), scheduledTime: "14:00" }).getTime() === want, how);
  check(businessDayKey(new Date("2026-10-08T22:30:00.000Z")) === "2026-10-09", "day key is the business date, not UTC");
}

console.log("\nHand-set follow-up");
{
  const s = base({ stage: "QUALIFIED", status: "QUALIFIED", contacted: true, lastMeaningfulActivityAt: ago(DAY) });
  const future = nextAction({ ...s, nextActionAt: ahead(2 * DAY), nextActionNote: "Send case studies" }, now);
  check(future.kind === "WAIT" && future.label === "Send case studies", "a future date wins over the stage default");
  const due = nextAction({ ...s, nextActionAt: ago(2 * DAY), nextActionNote: "Send case studies" }, now);
  check(due.kind === "FOLLOW_UP" && due.why[0].endsWith("is overdue"), "an overdue date → follow up, marked overdue");
}

console.log("\nWorking week (Friday and Saturday off)");
{
  // Midday Cairo on Thu 8, Fri 9, Sat 10, Sun 11 October 2026.
  const at = (d: string) => new Date(`2026-10-${d}T10:00:00.000Z`);
  const thu = at("08"), fri = at("09"), sat = at("10"), sun = at("11");
  const dueThu = startOfBusinessDayKey("2026-10-08");
  check(!isOverdueByWorkingDay(dueThu, fri) && isDueByWorkingDay(dueThu, fri), "due Thursday: due, not overdue, on Friday");
  check(!isOverdueByWorkingDay(dueThu, sat), "due Thursday: not overdue on Saturday");
  check(isOverdueByWorkingDay(dueThu, sun), "due Thursday: overdue on Sunday");

  const dueFri = startOfBusinessDayKey("2026-10-09");
  check(effectiveDueKey(dueFri) === "2026-10-11", "a Friday due date rolls to Sunday");
  check(!isDueByWorkingDay(dueFri, fri) && !isDueByWorkingDay(dueFri, sat), "due Friday: not due on Friday or Saturday");
  check(isDueByWorkingDay(dueFri, sun) && !isOverdueByWorkingDay(dueFri, sun), "due Friday: due today on Sunday, not overdue");
  check(isOverdueByWorkingDay(dueFri, at("12")), "due Friday: overdue on Monday");

  check(workingDaysSince(thu, sat) === 0, "Thursday → Saturday counts no working days");
  check(workingDaysSince(thu, sun) === 1, "Thursday → Sunday counts one working day");
  check(workingDaysSince(new Date("2026-10-11T20:00:00.000Z"), new Date("2026-10-11T21:30:00.000Z")) === 0, "a lead from Sunday 23:00 is not a day old at Monday 00:30");
  check(addWorkingDaysKey("2026-10-08", 2) === "2026-10-12" && addWorkingDaysKey("2026-10-09", 2) === "2026-10-12", "2 working days from Thursday or Friday is Monday");
  check(workingDueLabel(at("08"), fri) === "Due today" && workingDueLabel(at("08"), sat) === "Due today", "due chip: a Thursday call reads Due today on Friday and Saturday");
  check(workingDueLabel(at("08"), sun) === "1d overdue" && workingDueLabel(at("06"), sun) === "3d overdue", "due chip: overdue counts working days (Tue → Sun is 3)");
  check(workingDueLabel(at("09"), thu) === "Due in 1d" && workingDueLabel(at("11"), sat) === "Due tomorrow", "due chip: a Friday date is due Sunday");
  // Thu 8 Oct 2026 → Sun 18 Oct is 7 working days (Sun 11 … Thu 15 = 5, Sun 18 = 6, Mon 19 = 7).
  check(workingDueLabel(new Date("2026-10-19T10:00:00.000Z"), thu) === "Due in 7d", "due chip: 7 working days ahead still counts");
  check(workingDueLabel(new Date("2026-10-20T10:00:00.000Z"), thu) === "Due 20 Oct", "due chip: 8 working days ahead prints the date");
  check(workingDueLabel(new Date("2027-01-10T10:00:00.000Z"), thu) === "Due 10 Jan 2027", "due chip: a date in the next year carries the year");
  check(workingDueLabel(new Date("2026-12-31T10:00:00.000Z"), thu) === "Due 31 Dec", "due chip: a date months ahead in this year prints day and month");

  // The engine reads the same rule.
  const lead = base({ stage: "CONTACTED", status: "CONTACTED", contacted: true, nextActionAt: dueThu, nextActionNote: "Send case studies" });
  const onFri = nextAction(lead, fri);
  check(onFri.kind === "FOLLOW_UP" && onFri.why[0].endsWith("is due today"), `engine on Friday: due, not overdue (${onFri.why[0]})`);
  check(blockers(lead, sat).every((b) => !b.includes("overdue")), "engine on Saturday: no overdue blocker");
  const onSun = nextAction(lead, sun);
  check(onSun.why[0].endsWith("is overdue"), `engine on Sunday: overdue (${onSun.why[0]})`);
  // The reply promise runs on working hours only (Cairo is UTC+3 in October).
  check(addWorkingHours(new Date("2026-10-08T12:00:00.000Z"), 24).toISOString() === "2026-10-11T12:00:00.000Z", "reply promise: Thursday 15:00 arrival is due Sunday 15:00");
  check(addWorkingHours(new Date("2026-10-09T12:00:00.000Z"), 24).toISOString() === "2026-10-11T21:00:00.000Z", "reply promise: Friday arrival is due Monday 00:00");
  check(addWorkingHours(new Date("2026-10-11T12:00:00.000Z"), 24).toISOString() === "2026-10-12T12:00:00.000Z", "reply promise: Sunday 15:00 arrival is due Monday 15:00");
  const web = base({ createdAt: new Date("2026-10-08T12:00:00.000Z") });
  check(replySla(web, sat).state === "WITHIN", `Thursday lead on Saturday: within the promise (${replySla(web, sat).state})`);
  check(replySla(web, sun).state === "APPROACHING", `Thursday lead on Sunday 13:00: approaching (${replySla(web, sun).state})`);
  check(replySla(web, at("12")).state === "OVERDUE", "Thursday lead on Monday: overdue");
  // A NEW lead's one-day staleness waits out the weekend.
  const quiet = base({ stage: "NEW", contacted: true, source: "MANUAL", createdAt: thu });
  check(health(quiet, sat).state === "HEALTHY" && health(quiet, sun).state === "AT_RISK", "NEW lead from Thursday: quiet over the weekend, at risk on Sunday");
}

console.log("\nNurture review default (shared working-day rule)");
{
  // 2026-10-10 + 90 days = Fri 2027-01-08; 2026-10-11 + 90 = Sat 2027-01-09.
  check(addCalendarKey("2026-10-10", NURTURE_REVIEW_DAYS) === "2027-01-08", "fixture: Oct 10 + 90 calendar days is Friday Jan 8");
  check(workingDayAfterKey("2026-10-10", NURTURE_REVIEW_DAYS) === "2027-01-10", "a default landing on Friday moves to Sunday");
  check(workingDayAfterKey("2026-10-11", NURTURE_REVIEW_DAYS) === "2027-01-10", "a default landing on Saturday moves to Sunday");
  check(workingDayAfterKey("2026-10-12", NURTURE_REVIEW_DAYS) === "2027-01-10", "a default landing on a working day stays");
  for (let d = 0; d < 7; d += 1) {
    const from = addCalendarKey("2026-10-10", d);
    check(isWorkingDayKey(workingDayAfterKey(from, NURTURE_REVIEW_DAYS)), `nurture default from ${from} is a working day`);
  }
}

console.log("\nScore band labels (lead quality, never a stage)");
{
  const bands: ScoreBand[] = [scoreBand(90), scoreBand(50), scoreBand(10), scoreBand(90, "UNDER_10K")];
  check(bands.join("|") === "High intent|Medium intent|Low intent|Poor fit", `bands by score: ${bands.join(", ")}`);
  const stageLabels = new Set(Object.values(submissionStatus).map((def) => def.label.toLowerCase()));
  check(bands.every((band) => !stageLabels.has(band.toLowerCase())), "no band label equals a lifecycle stage label");
  check(scoreBand(64) === "Medium intent" && scoreBand(65) === "High intent" && scoreBand(34) === "Low intent" && scoreBand(35) === "Medium intent", "band thresholds unchanged (35 / 65)");
  const low = recommendedAction("Low intent", "NEW");
  check(!/nurture|park/i.test(low), `low band's action does not suggest a stage move ("${low}")`);
  check(recommendedAction("Medium intent", "NEW") === "Qualify by phone", "medium intent with a phone is qualified by phone");
  check(recommendedAction("Medium intent", "NEW", false) === "Qualify by email", "medium intent with no phone is qualified by email");
  check(recommendedAction("Low intent", "NURTURE").startsWith("Parked"), "a lead actually in NURTURE still reads as parked");
}

console.log("\nPipeline open-quote average (active opportunities only)");
{
  const card = (id: string, stage: string, value: number | null, currency = "EGP"): QuoteCard => ({ id, stage, value, currency });
  const cards = [
    card("open-a", "PROPOSAL_SENT", 100),
    card("open-b", "CONTRACT_SENT", 300),
    card("signed", "SIGNED", 900),
    card("lost", "LOST", 900),
    card("spam", "SPAM", 900),
    card("nurture", "NURTURE", 900),
    card("lapsed", "PROPOSAL_SENT", 900),
    card("no-quote", "QUALIFIED", null),
    card("usd", "PROPOSAL_READ", 50, "USD"),
  ];
  const live = new Set(cards.map((c) => c.id).filter((id) => id !== "lapsed"));
  const m = openQuoteMetrics(cards, live);
  check(m.open.map((c) => c.id).join(",") === "open-a,open-b,usd", `only open, live, priced deals count (${m.open.map((c) => c.id).join(",")})`);
  check(m.quoted.EGP === 400 && m.average.EGP === 200, `EGP: quoted 400, average 200 (got ${m.quoted.EGP}, ${m.average.EGP})`);
  check(m.average.USD === 50, "each currency averages over its own deals");
  const empty = openQuoteMetrics([card("signed", "SIGNED", 5), card("x", "LOST", 5)], new Set(["signed", "x"]));
  check(Object.keys(empty.average).length === 0 && empty.open.length === 0, "no open deals: empty average (renders \"—\"), never 0 or NaN");
}

console.log(failures ? `\n${failures} check(s) failed\n` : "\nAll sales-intel checks passed\n");
process.exit(failures ? 1 : 0);
