import { LEAD_SCORE_THRESHOLDS } from "@repo/pricing-schema";
/**
 * §4 — lead score.
 *
 * Deliberately a transparent additive model out of 100, not a black box. An
 * operator has to be able to look at a score of 72 and reconstruct why, or they
 * will stop trusting the ordering — which is the only thing the score is for.
 * `reasons` is returned alongside the number and shown in the UI tooltip.
 */
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
}

const BUDGET_POINTS: Record<string, number> = {
  OVER_50K: 30,
  B_25K_50K: 24,
  B_10K_25K: 15,
  UNDER_10K: 6,
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

  if (input.budget && BUDGET_POINTS[input.budget] != null)
    add(BUDGET_POINTS[input.budget], `budget ${input.budget.replace(/_/g, " ").toLowerCase()}`);
  else if (input.estimatorPriceMax) {
    // No declared budget, but the estimator produced a number — use it.
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
