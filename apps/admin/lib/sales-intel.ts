/**
 * Sales intelligence: the deterministic reading of one lead's records into
 * a priority, one next action, a health state, blockers, the reply-promise
 * clock and proposal readiness. Pure — no Prisma, no server-only import, and
 * `now` is always passed in — so the action centre, the pipeline, the work
 * queue and verify:sales-intel all read the same rules.
 *
 * Every output carries plain-English reasons. There is no score here beyond
 * the existing lead score (docs/sales-os.md R5): priority and health are
 * qualitative, and each one says why.
 */
import { LEAD_SCORE_THRESHOLDS } from "@repo/pricing-schema";

import type { DerivedStage } from "@/lib/dashboard-data";
import type { ScoreBand } from "@/lib/lead-score";
import { startOfBusinessDay } from "@/lib/payment-overdue";
import {
  addWorkingHours,
  businessDayKey,
  isDueByWorkingDay,
  isOverdueByWorkingDay,
  workingDaysSince,
} from "@/lib/working-days";

const HOUR = 3_600_000;
const DAY = 86_400_000;

/**
 * Mirrors REPLY_PROMISE_HOURS in lib/lead-follow-up.ts, which cannot be
 * imported here (it is server-only and loads Prisma). verify:sales-intel
 * fails if the two drift.
 */
export const REPLY_PROMISE_HOURS = 24;

/** The reply clock reads "approaching" this long before the promise lapses. */
const REPLY_APPROACHING_HOURS = 6;

/**
 * A call is "past" this long after its start: long enough for the call
 * itself to run, short enough that the outcome is recorded the same day.
 */
export const MEETING_OUTCOME_GRACE_HOURS = 2;

/** A proposal read with no movement for this many working days earns a follow-up. */
const PROPOSAL_READ_FOLLOW_UP_DAYS = 3;

/** A sent proposal nobody has opened for this many working days: check it arrived. */
const PROPOSAL_UNREAD_FOLLOW_UP_DAYS = 2;

/** A proposal expiring within this many days is called out. */
const PROPOSAL_EXPIRY_WARNING_DAYS = 3;

/** A contract out for signature this many working days without a signature is chased. */
const CONTRACT_CHASE_DAYS = 5;

/**
 * Working days (Friday and Saturday not counted) without meaningful activity
 * before a stage reads AT_RISK; twice this
 * (STALLED_MULTIPLIER) reads STALLED. Early stages are short because the site
 * promises a fast reply; a booked call is long because waiting for the date is
 * normal (and a call still ahead is never counted stale at all).
 */
const STALE_DAYS: Record<DerivedStage, number | null> = {
  NEW: 1, // the reply promise is a day; past it the lead is cooling
  VIEWED: 1, // opened but not answered: same promise
  CONTACTED: 5, // a working week to get an answer to the first reply
  QUALIFYING: 7, // qualification questions can take a week
  QUALIFIED: 7, // a qualified lead should have a call booked within a week
  CALL_BOOKED: 14, // only counts once the call date has passed
  CALL_COMPLETED: 3, // a proposal should follow a call within days
  PROPOSAL_SENT: 5, // a week of silence after sending is a warning
  PROPOSAL_READ: 5, // read and silent for a week: the deal is cooling
  CONTRACT_SENT: 5, // a signature owed for a week needs a chase
  SIGNED: null, // closed: no staleness
  NURTURE: null, // parked on purpose; the review date governs instead
  LOST: null,
  SPAM: null,
};

/** STALE_DAYS × this = STALLED. */
const STALLED_MULTIPLIER = 2;

/** R7 call outcomes. Typed as strings until the enum lands in Prisma. */
type MeetingOutcome =
  | "PROPOSAL_REQUIRED"
  | "FOLLOW_UP"
  | "NURTURE"
  | "LOST"
  | "NO_FURTHER_ACTION";

export interface SalesSignals {
  stage: DerivedStage;
  /** Client.status as stored. */
  status: string;
  /** Client.source; MANUAL leads were entered by us and carry no reply promise. */
  source?: string | null;
  score: number;
  band: ScoreBand;
  createdAt: Date;
  /** Evidence of a first reply: the newest outbound message, if any. */
  lastOutboundAt: Date | null;
  /** True when the record shows contact by any other route (status, a call). */
  contacted: boolean;
  /** Newest meaningful event either way (message, call, document); null = none since creation. */
  lastMeaningfulActivityAt: Date | null;
  ownerId: string | null;
  viewerId?: string | null;
  nextActionAt: Date | null;
  nextActionNote: string | null;
  proposal: {
    status: string;
    sentAt: Date | null;
    readAt: Date | null;
    total?: number | null;
    expiresAt?: Date | null;
  } | null;
  contract: { status: string; sentAt: Date | null } | null;
  /** The meeting that matters most: the next live one, else the latest. */
  meeting: {
    status: string;
    scheduledAt: Date;
    outcome?: MeetingOutcome | string | null;
  } | null;
  /** Estimator range, in the estimator's own unit (TransparencyLead.priceMin/Max). */
  estimate: { min: number; max: number } | null;
  /** The contact form's start answer, else the estimator's pace; null = not asked. */
  timeline: string | null;
  hasBudget: boolean;
  /** A project type, service interest or written brief is on file. */
  hasScope: boolean;
  /** ContactSubmission.decisionRole (DECIDES | SHARED | ADVISES); null = unknown. */
  decisionRole?: string | null;
  /** The decision the stage derivation says is owed (R1), if any. */
  stageBlocker: string | null;
}

export type Priority = "HIGH" | "MEDIUM" | "LOW";
export type HealthState = "HEALTHY" | "NEEDS_ATTENTION" | "AT_RISK" | "STALLED" | "CLOSED";
export type ReplySlaState = "WITHIN" | "APPROACHING" | "OVERDUE" | "MET" | "N_A";
export type NextActionKind =
  | "NONE"
  | "REPLY"
  | "RECORD_OUTCOME"
  | "FOLLOW_UP"
  | "GENERATE_CONTRACT"
  | "REVISE_OR_CLOSE"
  | "CHASE_SIGNATURE"
  | "CHASE_PROPOSAL"
  | "WAIT"
  | "PREPARE_CALL"
  | "SEND_PROPOSAL"
  | "WRITE_PROPOSAL"
  | "CLARIFY"
  | "BOOK_CALL"
  | "QUALIFY"
  | "REVIEW_NURTURE"
  | "CLOSE";

export interface NextAction {
  kind: NextActionKind;
  label: string;
  why: string[];
  due: Date | null;
}

// ── small readers ────────────────────────────────────────────────────────

const LIVE_MEETING = new Set(["PENDING", "APPROVED", "RESCHEDULED"]);
const CLOSED_STAGES = new Set<DerivedStage>(["SIGNED", "SPAM", "LOST"]);

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;
const MINUTE = 60 * 1000;

export { businessDayKey };
const day = businessDayKey;

/**
 * When a call starts: Meeting.scheduledTime ("HH:MM") is business wall-clock
 * time on the business day of Meeting.scheduledDate. The date is read on the
 * business calendar because it is written two ways — server-local midnight by
 * the admin form, the slot's own instant by the public booking page — and both
 * land on the same business day whatever zone the server runs in.
 * (A DST switch inside that day can shift the result by its one hour.)
 */
export function meetingStartAt(m: { scheduledDate: Date; scheduledTime: string }): Date {
  const start = startOfBusinessDay(new Date(m.scheduledDate));
  const [h, min] = m.scheduledTime.split(":").map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(min)) return start;
  return new Date(start.getTime() + h * HOUR + min * MINUTE);
}

/** SIGNED, SPAM and LOST are closed; NURTURE is parked, not closed. */
function isClosed(s: SalesSignals): boolean {
  return CLOSED_STAGES.has(s.stage);
}

/**
 * Working days since the newest meaningful activity (creation when there is
 * none) — Friday and Saturday are not counted (lib/working-days.ts).
 */
export function daysSinceActivity(s: SalesSignals, now: Date): number {
  return workingDaysSince(s.lastMeaningfulActivityAt ?? s.createdAt, now);
}

/**
 * Due today or earlier, by the working day — the same rule the follow-up sweep
 * uses. A date on a Friday or Saturday is due the next working day.
 */
function isDue(at: Date | null, now: Date): boolean {
  return isDueByWorkingDay(at, now);
}

/** Effectively due before today's working day (lib/working-days.ts). */
export function isOverdue(at: Date | null, now: Date): boolean {
  return isOverdueByWorkingDay(at, now);
}

/**
 * A call whose time has passed without an outcome on record. The outcome is
 * owed only while the deal has not moved past the call: once a proposal has
 * gone out or a contract is live, the stage itself says how the call went
 * (calls completed before outcomes existed carry none, and are not backfilled).
 */
function pastMeetingWithoutOutcome(s: SalesSignals, now: Date): boolean {
  const m = s.meeting;
  if (!m || m.outcome) return false;
  if (sentProposal(s) || liveContract(s)) return false;
  if (!LIVE_MEETING.has(m.status) && m.status !== "COMPLETED") return false;
  return now.getTime() >= m.scheduledAt.getTime() + MEETING_OUTCOME_GRACE_HOURS * HOUR;
}

function meetingAhead(s: SalesSignals, now: Date): boolean {
  const m = s.meeting;
  return (
    !!m &&
    LIVE_MEETING.has(m.status) &&
    now.getTime() < m.scheduledAt.getTime() + MEETING_OUTCOME_GRACE_HOURS * HOUR
  );
}

function callHappened(s: SalesSignals): boolean {
  return s.meeting?.status === "COMPLETED" || Boolean(s.meeting?.outcome);
}

/** A proposal that has left the building (not a draft). */
function sentProposal(s: SalesSignals) {
  return s.proposal && s.proposal.status !== "DRAFT" ? s.proposal : null;
}

function liveContract(s: SalesSignals) {
  const c = s.contract;
  return c && (c.status === "SENT" || c.status === "SIGNED") ? c : null;
}

/** High value: the score band says so, or the estimate reaches the large threshold. */
function isHighValue(s: SalesSignals): boolean {
  return (
    s.band === "High intent" || (s.estimate?.max ?? 0) >= LEAD_SCORE_THRESHOLDS.large
  );
}

function highValueReason(s: SalesSignals): string {
  return s.band === "High intent"
    ? `High-intent lead (score ${s.score})`
    : "Estimate reaches the large-project threshold";
}

/** The call ended with nothing more to do: only closing the lead remains, and nothing is owed. */
function nothingFurther(s: SalesSignals): boolean {
  return s.meeting?.outcome === "NO_FURTHER_ACTION";
}

function staleness(s: SalesSignals, now: Date): "STALLED" | "AT_RISK" | null {
  const limit = STALE_DAYS[s.stage];
  if (limit == null || meetingAhead(s, now) || nothingFurther(s)) return null;
  const days = daysSinceActivity(s, now);
  if (days >= limit * STALLED_MULTIPLIER) return "STALLED";
  if (days >= limit) return "AT_RISK";
  return null;
}

function staleReason(s: SalesSignals, now: Date): string {
  return `No activity for ${plural(daysSinceActivity(s, now), "working day")} at this stage`;
}

// ── reply SLA ────────────────────────────────────────────────────────────

/**
 * The first-reply promise the public contact page makes. Clock starts at
 * creation; met by any outbound message or recorded contact. Manual leads and
 * closed or parked leads carry no promise.
 */
export function replySla(
  s: SalesSignals,
  now: Date,
): { state: ReplySlaState; dueAt: Date | null } {
  if (s.source === "MANUAL" || isClosed(s) || s.stage === "NURTURE")
    return { state: "N_A", dueAt: null };
  // Working-hour clock: Friday and Saturday hours do not count (lib/working-days.ts).
  const dueAt = addWorkingHours(s.createdAt, REPLY_PROMISE_HOURS);
  if (s.contacted || s.lastOutboundAt) return { state: "MET", dueAt };
  const left = dueAt.getTime() - now.getTime();
  if (left <= 0) return { state: "OVERDUE", dueAt };
  if (left <= REPLY_APPROACHING_HOURS * HOUR) return { state: "APPROACHING", dueAt };
  return { state: "WITHIN", dueAt };
}

function replyOverdueReason(s: SalesSignals, now: Date): string {
  const hours = Math.floor((now.getTime() - s.createdAt.getTime()) / HOUR);
  return `No first reply ${plural(hours, "hour")} after arrival (promised within ${REPLY_PROMISE_HOURS} working hours)`;
}

// ── proposal readiness ───────────────────────────────────────────────────

/** What a proposal needs on file before it can be written honestly. */
export function proposalReadiness(s: SalesSignals): { ready: boolean; missing: string[] } {
  const missing: string[] = [];
  if (!s.hasBudget) missing.push("Budget");
  if (!s.hasScope) missing.push("Project scope or type");
  if (!s.timeline) missing.push("Timeline");
  if (!callHappened(s)) missing.push("A completed call");
  if (s.decisionRole === "ADVISES") missing.push("The person who makes the decision");
  return { ready: missing.length === 0, missing };
}

// ── blockers ─────────────────────────────────────────────────────────────

/** What stands between this lead and its next stage, in plain words. */
export function blockers(s: SalesSignals, now: Date): string[] {
  if (s.stage === "SIGNED" || s.stage === "SPAM") return [];
  const out: string[] = [];
  if (s.stageBlocker) out.push(s.stageBlocker);
  if (s.stage === "LOST") return out;

  if (replySla(s, now).state === "OVERDUE") out.push(replyOverdueReason(s, now));
  if (pastMeetingWithoutOutcome(s, now))
    out.push(`Call on ${day(s.meeting!.scheduledAt)} has no recorded outcome`);
  if (!s.ownerId) out.push("No owner assigned");
  if (s.stage === "NURTURE" && !s.nextActionAt) out.push("Nurture has no review date");
  if (isOverdue(s.nextActionAt, now))
    out.push(`Follow-up set for ${day(s.nextActionAt!)} is overdue`);

  // The stage derivation names these decisions when it carries a blocker;
  // only spell them out here when it did not.
  if (!s.stageBlocker) {
    const c = s.contract;
    const p = sentProposal(s);
    if (c && (c.status === "DECLINED" || c.status === "EXPIRED"))
      out.push(`Contract ${c.status.toLowerCase()}: revise it or close the lead`);
    else if (!liveContract(s) && p?.status === "ACCEPTED")
      out.push("Proposal accepted: the contract is owed");
    else if (!liveContract(s) && (p?.status === "REJECTED" || p?.status === "EXPIRED"))
      out.push(`Proposal ${p.status.toLowerCase()}: revise it or close the lead`);
  }

  if (
    !sentProposal(s) &&
    callHappened(s) &&
    s.meeting?.outcome !== "NURTURE" &&
    !nothingFurther(s)
  ) {
    const { missing } = proposalReadiness(s);
    if (
      missing.length > 0 &&
      (s.stage === "CALL_COMPLETED" || s.meeting?.outcome === "PROPOSAL_REQUIRED")
    )
      out.push(`Proposal blocked: missing ${missing.join(", ").toLowerCase()}`);
  }
  return out;
}

// ── next action ──────────────────────────────────────────────────────────

const action = (
  kind: NextActionKind,
  label: string,
  why: string[],
  due: Date | null = null,
): NextAction => ({ kind, label, why, due });

/**
 * One action, from a fixed ladder: closed → nothing; then anything overdue or
 * blocking (reply promise, a call with no outcome, a contract or proposal
 * decision owed, a due hand-set follow-up); then a hand-set future follow-up,
 * which wins over the stage's default; then the stage's default step.
 */
export function nextAction(s: SalesSignals, now: Date): NextAction {
  const note = s.nextActionNote?.trim() || null;

  // 1. Closed.
  if (s.stage === "SIGNED") return action("NONE", "Won — deliver the work", ["Contract signed"]);
  if (s.stage === "SPAM") return action("NONE", "No action — marked spam", ["Marked as spam"]);
  if (s.stage === "LOST") {
    // A win-back date a person set still counts once it arrives.
    if (isDue(s.nextActionAt, now))
      return action(
        "FOLLOW_UP",
        note ?? "Win-back follow-up",
        [`Closed as lost; a follow-up was set for ${day(s.nextActionAt!)}`],
        s.nextActionAt,
      );
    return action("NONE", "No action — closed as lost", ["Closed as lost"]);
  }

  // 2. Nurture: the review date governs (R8).
  if (s.stage === "NURTURE") {
    if (!s.nextActionAt)
      return action("REVIEW_NURTURE", "Set a nurture review date", ["Nurture has no review date"]);
    if (isDue(s.nextActionAt, now))
      return action(
        "REVIEW_NURTURE",
        note ?? "Review this nurture lead",
        [`Nurture review set for ${day(s.nextActionAt)} has arrived`],
        s.nextActionAt,
      );
    return action(
      "WAIT",
      `Review on ${day(s.nextActionAt)}`,
      ["Parked in nurture until the review date"],
      s.nextActionAt,
    );
  }

  // 3. Overdue or blocking — these beat a hand-set future date.
  const sla = replySla(s, now);
  if (sla.state === "OVERDUE")
    return action("REPLY", "Send the first reply", [replyOverdueReason(s, now)], sla.dueAt);

  if (pastMeetingWithoutOutcome(s, now))
    return action(
      "RECORD_OUTCOME",
      "Record the call outcome",
      [`Call on ${day(s.meeting!.scheduledAt)} has passed with no outcome recorded`],
      s.meeting!.scheduledAt,
    );

  const c = s.contract;
  if (c && (c.status === "DECLINED" || c.status === "EXPIRED"))
    return action("REVISE_OR_CLOSE", "Revise the contract or close the lead", [
      `Contract ${c.status.toLowerCase()}`,
    ]);

  if (isDue(s.nextActionAt, now)) {
    const overdue = isOverdue(s.nextActionAt, now);
    return action(
      "FOLLOW_UP",
      note ?? "Follow up",
      [`Follow-up set for ${day(s.nextActionAt!)} ${overdue ? "is overdue" : "is due today"}`],
      s.nextActionAt,
    );
  }

  const p = sentProposal(s);
  if (!liveContract(s) && p?.status === "ACCEPTED")
    return action("GENERATE_CONTRACT", "Generate the contract", ["Proposal accepted"]);
  if (!liveContract(s) && (p?.status === "REJECTED" || p?.status === "EXPIRED"))
    return action("REVISE_OR_CLOSE", "Revise the proposal or close the lead", [
      `Proposal ${p.status.toLowerCase()}`,
    ]);

  // 4. A hand-set future follow-up wins over the stage default.
  if (s.nextActionAt)
    return action(
      "WAIT",
      note ?? `Follow up on ${day(s.nextActionAt)}`,
      [`Follow-up set for ${day(s.nextActionAt)}`],
      s.nextActionAt,
    );

  // 5. The stage's default step.
  if (c?.status === "SENT") {
    const from = c.sentAt ?? s.lastMeaningfulActivityAt ?? s.createdAt;
    const due = addWorkingHours(from, CONTRACT_CHASE_DAYS * 24);
    if (now >= due)
      return action(
        "CHASE_SIGNATURE",
        "Chase the signature",
        [`Contract unsigned ${plural(workingDaysSince(from, now), "working day")} after sending`],
        due,
      );
    return action("WAIT", "Wait for the signature", ["Contract out for signature"], due);
  }

  if (p) {
    const why: string[] = [];
    if (p.expiresAt) {
      const left = Math.ceil((p.expiresAt.getTime() - now.getTime()) / DAY);
      if (left >= 0 && left <= PROPOSAL_EXPIRY_WARNING_DAYS)
        why.push(`Proposal expires in ${plural(left, "day")}`);
    }
    if (p.readAt) {
      const quiet = Math.max(p.readAt.getTime(), s.lastMeaningfulActivityAt?.getTime() ?? 0);
      const due = addWorkingHours(new Date(quiet), PROPOSAL_READ_FOLLOW_UP_DAYS * 24);
      if (now >= due)
        return action(
          "CHASE_PROPOSAL",
          "Follow up on the proposal",
          [
            `No reply ${plural(workingDaysSince(p.readAt, now), "working day")} after the proposal was read`,
            ...why,
          ],
          due,
        );
      return action("WAIT", "Wait for questions on the proposal", ["Proposal read", ...why], due);
    }
    const from = p.sentAt ?? s.lastMeaningfulActivityAt ?? s.createdAt;
    const due = addWorkingHours(from, PROPOSAL_UNREAD_FOLLOW_UP_DAYS * 24);
    if (now >= due)
      return action(
        "CHASE_PROPOSAL",
        "Check the proposal reached them",
        [`Proposal unopened ${plural(workingDaysSince(from, now), "working day")} after sending`, ...why],
        due,
      );
    return action("WAIT", "Wait for the proposal to be read", ["Proposal sent", ...why], due);
  }

  if (s.proposal?.status === "DRAFT")
    return action("SEND_PROPOSAL", "Send the drafted proposal", ["A proposal is drafted but not sent"]);

  if (meetingAhead(s, now))
    return action(
      "PREPARE_CALL",
      "Prepare for the call",
      [`Call booked for ${day(s.meeting!.scheduledAt)}`],
      s.meeting!.scheduledAt,
    );

  const outcome = s.meeting?.outcome ?? null;
  if (outcome === "FOLLOW_UP")
    return action("FOLLOW_UP", "Set a follow-up date", [
      "The call ended with a follow-up and no date is set",
    ]);
  if (outcome === "NURTURE")
    return action("CLOSE", "Move to nurture with a review date", ["The call outcome was nurture"]);
  if (outcome === "LOST")
    return action("CLOSE", "Close the lead as lost", ["The call outcome was lost"]);
  if (outcome === "NO_FURTHER_ACTION")
    return action("CLOSE", "Close the lead", ["The call ended with no further action"]);

  if (s.stage === "CALL_COMPLETED" || outcome === "PROPOSAL_REQUIRED") {
    const ready = proposalReadiness(s);
    const why = [outcome === "PROPOSAL_REQUIRED" ? "The call asked for a proposal" : "Call completed, no proposal yet"];
    if (ready.ready) return action("WRITE_PROPOSAL", "Write the proposal", why);
    return action("CLARIFY", `Clarify ${ready.missing.join(", ").toLowerCase()}`, [
      ...why,
      `Missing before a proposal: ${ready.missing.join(", ").toLowerCase()}`,
    ]);
  }

  if (s.stage === "QUALIFIED")
    return action("BOOK_CALL", "Book a call", ["Qualified, no call booked"]);

  if (s.stage === "CONTACTED" || s.stage === "QUALIFYING") {
    const missing = proposalReadiness(s).missing.filter((m) => m !== "A completed call");
    return action(
      "QUALIFY",
      missing.length ? `Ask about ${missing.join(", ").toLowerCase()}` : "Offer a call",
      [missing.length ? "Qualification answers are missing" : "Qualification answers are on file"],
    );
  }

  // NEW / VIEWED (and anything not covered above).
  if (sla.state === "WITHIN" || sla.state === "APPROACHING")
    return action(
      "REPLY",
      "Send the first reply",
      [sla.state === "APPROACHING" ? "The reply promise lapses soon" : "New lead waiting on a first reply"],
      sla.dueAt,
    );
  return action("QUALIFY", "Make first contact", ["No contact recorded yet"]);
}

// ── priority ─────────────────────────────────────────────────────────────

/**
 * HIGH: something is owed now on a live deal (reply lapsed, a signature or
 * contract owed, a read proposal gone quiet) or a high-value lead is going
 * stale. MEDIUM: a live deal with a step due or approaching. LOW: closed,
 * parked, or waiting with nothing due.
 */
export function priority(s: SalesSignals, now: Date): { level: Priority; why: string[] } {
  if (isClosed(s)) return { level: "LOW", why: ["Closed"] };

  const high: string[] = [];
  const medium: string[] = [];
  const sla = replySla(s, now);
  const next = nextAction(s, now);
  const stale = staleness(s, now);

  if (s.stage === "NURTURE") {
    if (isDue(s.nextActionAt, now)) medium.push("Nurture review is due");
    return medium.length
      ? { level: "MEDIUM", why: medium }
      : { level: "LOW", why: ["Parked in nurture"] };
  }

  // NO_FURTHER_ACTION: closing the lead is tidy-up, not work owed now.
  if (next.kind === "CLOSE" && nothingFurther(s))
    return { level: "LOW", why: ["The call ended with no further action"] };

  if (sla.state === "OVERDUE") high.push(replyOverdueReason(s, now));
  if (next.kind === "GENERATE_CONTRACT") high.push("Proposal accepted, contract not yet sent");
  if (next.kind === "CHASE_SIGNATURE") high.push(next.why[0]);
  if (next.kind === "CHASE_PROPOSAL" && s.proposal?.readAt) high.push(next.why[0]);
  if (isHighValue(s) && (stale || isOverdue(s.nextActionAt, now)))
    high.push(`${highValueReason(s)} is going quiet`);

  if (sla.state === "APPROACHING") medium.push("The reply promise lapses soon");
  if (sla.state === "WITHIN") medium.push("New lead waiting on a first reply");
  if (next.kind === "RECORD_OUTCOME") medium.push(next.why[0]);
  if (next.kind === "FOLLOW_UP") medium.push(next.why[0]);
  if (next.kind === "REVISE_OR_CLOSE") medium.push(next.why[0]);
  if (s.stage === "CONTRACT_SENT") medium.push("Contract out for signature");
  if (s.stage === "PROPOSAL_SENT" || s.stage === "PROPOSAL_READ") medium.push("Proposal in play");
  if (s.stage === "CALL_BOOKED" || s.stage === "CALL_COMPLETED") medium.push("Call stage");
  if (isHighValue(s)) medium.push(highValueReason(s));
  if (stale) medium.push(staleReason(s, now));
  if (!s.ownerId) medium.push("Nobody owns this lead");

  const owner =
    s.viewerId && s.ownerId === s.viewerId ? ["Assigned to you"] : [];
  if (high.length) return { level: "HIGH", why: [...high, ...owner] };
  if (medium.length) return { level: "MEDIUM", why: [...medium, ...owner] };
  return { level: "LOW", why: ["Nothing due", ...owner] };
}

// ── health ───────────────────────────────────────────────────────────────

/**
 * Worst state wins: CLOSED > STALLED > AT_RISK > NEEDS_ATTENTION > HEALTHY.
 * `why` lists every reason found, worst first.
 */
export function health(s: SalesSignals, now: Date): { state: HealthState; why: string[] } {
  if (s.stage === "SIGNED") return { state: "CLOSED", why: ["Signed"] };
  if (s.stage === "SPAM") return { state: "CLOSED", why: ["Marked as spam"] };
  if (s.stage === "LOST") return { state: "CLOSED", why: ["Closed as lost"] };

  if (s.stage === "NURTURE") {
    if (!s.nextActionAt) return { state: "NEEDS_ATTENTION", why: ["Nurture has no review date"] };
    if (isDue(s.nextActionAt, now))
      return { state: "NEEDS_ATTENTION", why: ["Nurture review date has arrived"] };
    return { state: "HEALTHY", why: [`Parked in nurture until ${day(s.nextActionAt)}`] };
  }

  const stalled: string[] = [];
  const atRisk: string[] = [];
  const attention: string[] = [];
  const stale = staleness(s, now);
  if (stale === "STALLED") stalled.push(staleReason(s, now));
  if (stale === "AT_RISK") atRisk.push(staleReason(s, now));

  const sla = replySla(s, now);
  if (sla.state === "OVERDUE") atRisk.push(replyOverdueReason(s, now));
  if (sla.state === "APPROACHING") attention.push("The reply promise lapses soon");

  const c = s.contract;
  if (c && (c.status === "DECLINED" || c.status === "EXPIRED"))
    atRisk.push(`Contract ${c.status.toLowerCase()}`);
  const p = sentProposal(s);
  if (!liveContract(s) && (p?.status === "REJECTED" || p?.status === "EXPIRED"))
    atRisk.push(`Proposal ${p.status.toLowerCase()}`);
  if (p?.expiresAt && !liveContract(s) && p.status !== "ACCEPTED") {
    const left = Math.ceil((p.expiresAt.getTime() - now.getTime()) / DAY);
    if (left >= 0 && left <= PROPOSAL_EXPIRY_WARNING_DAYS)
      attention.push(`Proposal expires in ${plural(left, "day")}`);
  }

  if (pastMeetingWithoutOutcome(s, now))
    attention.push(`Call on ${day(s.meeting!.scheduledAt)} has no recorded outcome`);
  if (isOverdue(s.nextActionAt, now))
    attention.push(`Follow-up set for ${day(s.nextActionAt!)} is overdue`);
  const next = nextAction(s, now);
  if (next.kind === "CHASE_PROPOSAL" || next.kind === "CHASE_SIGNATURE" || next.kind === "GENERATE_CONTRACT")
    attention.push(next.why[0]);
  if (!s.ownerId) attention.push("No owner assigned");

  const why = [...stalled, ...atRisk, ...attention];
  if (stalled.length) return { state: "STALLED", why };
  if (atRisk.length) return { state: "AT_RISK", why };
  if (attention.length) return { state: "NEEDS_ATTENTION", why };
  return { state: "HEALTHY", why: ["On track"] };
}
