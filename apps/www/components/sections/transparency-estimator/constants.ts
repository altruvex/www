import { COMPLEXITY_TO_LEGACY_BAND } from "@repo/pricing-schema";
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

export const KNOWN_TIERS = new Set([
  "essential",
  "professional",
  "commerce",
  "flagship",
]);

export const COMPLEXITY_TIER = COMPLEXITY_TO_LEGACY_BAND;
export const STICKY_OFFSET = 72;
