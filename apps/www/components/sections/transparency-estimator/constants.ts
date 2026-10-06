import { COMPLEXITY_TO_LEGACY_BAND, type ComplexityId } from "@repo/pricing-schema";
import type { DeliverableBand } from "@/lib/utils/transparency-utils";
import type { QuestionDef } from "./types";

export const BUILD_QUESTIONS: readonly QuestionDef[] = [
  {
    key: "projectType",
    msg: "projectType",
    options: ["website", "webapp", "ecommerce", "pwa"],
  },
  {
    key: "complexity",
    msg: "complexity",
    options: ["basic", "standard", "premium"],
  },
] as const;

export const CONDITION_QUESTIONS: readonly QuestionDef[] = [
  {
    key: "brandIdentity",
    msg: "brand",
    options: ["complete", "partial", "scratch"],
  },
  {
    key: "contentReadiness",
    msg: "content",
    options: ["provide", "need-help", "unsure"],
  },
  {
    key: "timeline",
    msg: "timeline",
    options: ["urgent", "standard", "flexible"],
  },
] as const;

export const QUESTIONS = [...BUILD_QUESTIONS, ...CONDITION_QUESTIONS] as const;
export const TOTAL = QUESTIONS.length;

export const ESTIMATOR_STEP = {
  projectType: 1,
  complexity: 2,
  scopeNotes: BUILD_QUESTIONS.length + 1,
  conditions: BUILD_QUESTIONS.length + 2,
  result: BUILD_QUESTIONS.length + 3,
} as const;

export const COMPLEXITY_TIER = COMPLEXITY_TO_LEGACY_BAND as Readonly<
  Record<ComplexityId, DeliverableBand>
>;
export const STICKY_OFFSET = 72;

/** Anchor of the "How an estimate is calculated" section on /transparency. */
export const ESTIMATE_METHOD_ID = "how-estimates-are-calculated";
