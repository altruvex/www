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

/**
 * The slice of the resolved pricing the estimator actually reads.
 *
 * The engine prices from `services` only and the result panel quotes
 * `terms` (VAT, validity, warranty). The page hands the browser just these
 * two rather than the whole `ResolvedPricing`: a server-to-client prop is
 * serialised into the page payload, and the full object carries maintenance
 * margin planning that must never reach a client surface.
 */
export type EstimatorPricing = Pick<ResolvedPricing, "services" | "terms">;

/** Rebuilds a full pricing set around the slice, for the schema's views. */
export function resolveEstimatorPricing(
  slice: EstimatorPricing | undefined,
): ResolvedPricing {
  return slice
    ? { ...DEFAULT_PRICING, services: slice.services, terms: slice.terms }
    : DEFAULT_PRICING;
}

/**
 * The widest range still possible given the answers so far.
 *
 * A thin adapter over the schema's `estimateSpan`: it maps the estimator's
 * question keys onto the engine's input and passes the resolved pricing
 * through, so a surface with admin overrides quotes the same numbers
 * `/pricing` publishes.
 */
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
