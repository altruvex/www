import {
  LEAD_SCORE_THRESHOLDS,
  budgetAnswerFromDb,
  type BudgetAnswerId,
} from "@repo/pricing-schema";

export interface ScoreInput {
  budget?: string | null;
  timeline?: string | null;
  source: string;
  serviceInterest?: string | null;
  hasCompany: boolean;
  hasEmail: boolean;
  messageLength?: number;
  estimatorPriceMax?: number | null;
  proposalCount: number;
  readProposal: boolean;
  inboundMessages: number;
  /** ContactSubmission.decisionRole — DECIDES | SHARED | ADVISES. */
  decisionRole?: string | null;
  /** ContactSubmission.situation — NEW_BUILD | REPLACE_EXISTING | IMPROVE_EXISTING. */
  situation?: string | null;
  /** Answered the qualification step (ContactSubmission.qualifiedAt is set). */
  qualified?: boolean;
  /** Derived from Meeting rows: a call ahead, or one that happened. */
  call?: "BOOKED" | "COMPLETED" | null;
}

/** Legacy fixed-currency answers, kept at their original weight. */
const LEGACY_BUDGET_POINTS: Record<string, number> = {
  OVER_50K: 30,
  B_25K_50K: 24,
  B_10K_25K: 15,
  UNDER_10K: 6,
};

/** Answers relative to the published build floor (see budgetBands). */
const BUDGET_ANSWER_POINTS: Record<BudgetAnswerId, number> = {
  "over-10x": 30,
  "5x-10x": 24,
  "2x-5x": 16,
  "floor-2x": 10,
  unsure: 3,
};

const BUDGET_ANSWER_WORDS: Record<BudgetAnswerId, string> = {
  "over-10x": "over 10× the floor",
  "5x-10x": "5–10× the floor",
  "2x-5x": "2–5× the floor",
  "floor-2x": "floor to 2×",
  unsure: "not sure",
};

const DECISION_POINTS: Record<string, number> = { DECIDES: 12, SHARED: 6 };
const SITUATION_POINTS: Record<string, number> = {
  REPLACE_EXISTING: 6,
  IMPROVE_EXISTING: 6,
};

const TIMELINE_POINTS: Record<string, number> = {
  IMMEDIATE: 20,
  SOON: 15,
  PLANNING: 8,
  EXPLORING: 3,
};

const SOURCE_POINTS: Record<string, number> = {
  REFERRAL: 15,
  TRANSPARENCY_ESTIMATOR: 12,
  WEBSITE_CONTACT_FORM: 8,
  WHATSAPP_INBOUND: 8,
  MANUAL: 5,
};

export function scoreLead(input: ScoreInput): { score: number; reasons: string[] } {
  const reasons: string[] = [];
  let score = 0;

  const add = (points: number, why: string) => {
    if (points <= 0) return;
    score += points;
    reasons.push(`+${points} ${why}`);
  };

  const answer = input.budget ? budgetAnswerFromDb(input.budget) : null;
  if (answer) add(BUDGET_ANSWER_POINTS[answer], `budget ${BUDGET_ANSWER_WORDS[answer]}`);
  else if (input.budget && LEGACY_BUDGET_POINTS[input.budget] != null)
    add(
      LEGACY_BUDGET_POINTS[input.budget],
      `budget ${input.budget.replace(/_/g, " ").toLowerCase()}`,
    );
  else if (input.estimatorPriceMax) {
    const points =
      input.estimatorPriceMax >= LEAD_SCORE_THRESHOLDS.large
        ? 26
        : input.estimatorPriceMax >= LEAD_SCORE_THRESHOLDS.medium
          ? 18
          : 10;
    add(points, "estimator quote size");
  }

  if (input.timeline && TIMELINE_POINTS[input.timeline] != null)
    add(TIMELINE_POINTS[input.timeline], `timeline ${input.timeline.toLowerCase()}`);

  add(SOURCE_POINTS[input.source] ?? 4, `source ${input.source.replace(/_/g, " ").toLowerCase()}`);

  if (input.hasCompany) add(6, "named company");
  if (input.hasEmail) add(4, "email on file");
  if ((input.messageLength ?? 0) > 220) add(6, "wrote a detailed brief");
  else if ((input.messageLength ?? 0) > 60) add(3, "wrote a real message");

  if (input.decisionRole && DECISION_POINTS[input.decisionRole] != null)
    add(
      DECISION_POINTS[input.decisionRole],
      input.decisionRole === "DECIDES" ? "makes the decision" : "shares the decision",
    );
  if (input.situation && SITUATION_POINTS[input.situation] != null)
    add(SITUATION_POINTS[input.situation], "has an existing system to replace or improve");
  if (input.qualified) add(4, "answered the qualification step");
  if (input.call === "COMPLETED") add(10, "call completed");
  else if (input.call === "BOOKED") add(8, "call booked");

  if (input.proposalCount > 0) add(8, "proposal already issued");
  if (input.readProposal) add(6, "opened the proposal");
  if (input.inboundMessages > 0) add(Math.min(input.inboundMessages * 2, 8), "replies on WhatsApp");

  return { score: Math.min(100, score), reasons };
}

export function scoreTone(score: number): "success" | "warning" | "neutral" {
  if (score >= 65) return "success";
  if (score >= 35) return "warning";
  return "neutral";
}

export type ScoreBand = "High intent" | "Qualified" | "Nurture" | "Poor fit";

/**
 * The label shown next to every score. "Poor fit" is reserved for the one
 * legacy answer that sat under the floor (UNDER_10K); a low score alone is
 * "Nurture", not a judgement on fit.
 */
export function scoreBand(score: number, budget?: string | null): ScoreBand {
  if (budget === "UNDER_10K") return "Poor fit";
  if (score >= 65) return "High intent";
  if (score >= 35) return "Qualified";
  return "Nurture";
}

export function bandTone(band: ScoreBand): "success" | "warning" | "neutral" | "danger" {
  if (band === "High intent") return "success";
  if (band === "Qualified") return "warning";
  if (band === "Poor fit") return "danger";
  return "neutral";
}

/** Stages where a consultation already happened or is on the calendar. */
const CALL_STAGES = new Set(["CALL_BOOKED", "CALL_COMPLETED"]);

/**
 * One line telling the operator what to do next, from the band and the
 * derived stage. Never a promise: it reads only what the record holds.
 */
export function recommendedAction(band: ScoreBand, stage: string): string {
  if (stage === "SIGNED") return "Won — deliver the work";
  if (stage === "CONTRACT_SENT") return "Chase the signature";
  if (stage === "PROPOSAL_READ") return "Answer questions on the proposal";
  if (stage === "PROPOSAL_SENT") return "Follow up on the proposal";
  if (stage === "SPAM") return "Marked as spam";
  if (stage === "LOST") return "Closed as lost";
  if (stage === "NURTURE") return "Nurture";
  if (stage === "CALL_BOOKED") return "Prepare for the booked call";
  if (stage === "CALL_COMPLETED") return "Send a proposal";
  if (CALL_STAGES.has(stage)) return "Prioritise for consultation";
  if (band === "High intent") return "Prioritise for consultation";
  if (band === "Qualified") return "Qualify by phone";
  return "Nurture";
}
