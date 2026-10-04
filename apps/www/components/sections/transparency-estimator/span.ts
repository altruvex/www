import {
  DEFAULT_PRICING,
  estimateSpan,
  type BrandIdentityId,
  type ComplexityId,
  type ContentReadinessId,
  type EstimateResult,
  type ResolvedPricing,
  type ServiceId,
  type TimelineId,
} from "@repo/pricing-schema";
import type { AnswerMap } from "./types";

export type EstimatorPricing = Pick<ResolvedPricing, "services" | "terms">;

export function resolveEstimatorPricing(
  slice: EstimatorPricing | undefined,
): ResolvedPricing {
  return slice
    ? { ...DEFAULT_PRICING, services: slice.services, terms: slice.terms }
    : DEFAULT_PRICING;
}

export function spanFor(
  answers: AnswerMap,
  pricing?: ResolvedPricing,
): EstimateResult {
  return estimateSpan(
    {
      serviceId: answers.projectType as ServiceId | null,
      complexityId: answers.complexity as ComplexityId | null,
      timeline: answers.timeline as TimelineId | null,
      brandIdentity: answers.brandIdentity as BrandIdentityId | null,
      contentReadiness: answers.contentReadiness as ContentReadinessId | null,
    },
    pricing,
  );
}
