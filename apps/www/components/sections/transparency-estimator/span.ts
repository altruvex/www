import {
  BRAND_IDENTITY_IDS,
  COMPLEXITY_IDS,
  CONTENT_READINESS_IDS,
  ContentReadinessId,
  SERVICE_IDS,
  TIMELINE_IDS,
  calculateEstimate,
  type BrandIdentityId,
  type ComplexityId,
  type EstimateResult,
  type ServiceId,
  type TimelineId,
} from "@repo/pricing-schema";
import type { AnswerMap } from "./types";

export function spanFor(answers: AnswerMap): EstimateResult {
  const services = answers.projectType
    ? [answers.projectType as ServiceId]
    : SERVICE_IDS;
  const complexities = answers.complexity
    ? [answers.complexity as ComplexityId]
    : COMPLEXITY_IDS;
  const timelines = answers.timeline
    ? [answers.timeline as TimelineId]
    : TIMELINE_IDS;
  const brands = answers.brandIdentity
    ? [answers.brandIdentity as BrandIdentityId]
    : BRAND_IDENTITY_IDS;
  const contents = answers.contentReadiness
    ? [answers.contentReadiness as ContentReadinessId]
    : CONTENT_READINESS_IDS;

  let minPrice = Number.POSITIVE_INFINITY;
  let maxPrice = 0;
  let minWeeks = Number.POSITIVE_INFINITY;
  let maxWeeks = 0;

  for (const serviceId of services)
    for (const complexityId of complexities)
      for (const timeline of timelines)
        for (const brandIdentity of brands)
          for (const contentReadiness of contents) {
            const cell = calculateEstimate({
              serviceId,
              complexityId,
              timeline,
              brandIdentity,
              contentReadiness,
            });
            minPrice = Math.min(minPrice, cell.minPrice);
            maxPrice = Math.max(maxPrice, cell.maxPrice);
            minWeeks = Math.min(minWeeks, cell.minWeeks);
            maxWeeks = Math.max(maxWeeks, cell.maxWeeks);
          }
  return { minPrice, maxPrice, minWeeks, maxWeeks };
}
