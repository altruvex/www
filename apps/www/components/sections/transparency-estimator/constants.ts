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

/**
 * The estimator's numbered steps, in the order they render: the build
 * questions (01 type, 02 complexity), then scope notes, the conditions block
 * and the result. The /pricing cost split reads it to point each driver at the
 * step that carries it, so the two never disagree.
 */
export const ESTIMATOR_STEP = {
  projectType: 1,
  complexity: 2,
  scopeNotes: BUILD_QUESTIONS.length + 1,
  conditions: BUILD_QUESTIONS.length + 2,
  result: BUILD_QUESTIONS.length + 3,
} as const;

/** Complexity → the band its deliverable list is filed under. The schema map
 * never yields the legacy "enterprise" band, so it narrows to three. */
export const COMPLEXITY_TIER = COMPLEXITY_TO_LEGACY_BAND as Readonly<
  Record<ComplexityId, DeliverableBand>
>;
export const STICKY_OFFSET = 72;
