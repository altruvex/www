/**
 * The canonical identifier set.
 *
 * Everything downstream references the ids declared here, and nothing else
 * may declare its own: an id enumerated in two places is one missed rename
 * away from a wrong price.
 *
 * Two independent axes:
 *
 *   ServiceId     — WHAT is being built (the product line)
 *   ComplexityId  — HOW MUCH scope it carries (the band within a service)
 *
 * A price is a (service, complexity) cell and nothing else names one.
 */

export const SERVICE_IDS = ["website", "webapp", "ecommerce", "pwa"] as const;
export type ServiceId = (typeof SERVICE_IDS)[number];

export const COMPLEXITY_IDS = ["basic", "standard", "premium"] as const;
export type ComplexityId = (typeof COMPLEXITY_IDS)[number];

export const MAINTENANCE_PLAN_IDS = [
  "essential",
  "professional",
  "enterprise",
] as const;
export type MaintenancePlanId = (typeof MAINTENANCE_PLAN_IDS)[number];

export const CONSULTING_PACKAGE_IDS = ["technical-audit"] as const;
export type ConsultingPackageId = (typeof CONSULTING_PACKAGE_IDS)[number];

/**
 * Scope notes a buyer can attach to an estimate.
 *
 * Unpriced by design: a note is reviewed with the buyer in scope review and
 * never becomes a multiplier. The estimator stores the ticked ids on the lead
 * (`TransparencyLead.scopeNotes`) so the admin sees what was asked for.
 */
export const SCOPE_NOTE_IDS = [
  "cms",
  "auth",
  "payments-integrations",
  "bilingual",
  "performance-seo",
  "maintenance",
] as const;
export type ScopeNoteId = (typeof SCOPE_NOTE_IDS)[number];

export const ADDON_IDS = [
  "domain",
  "hosting",
  "business-mail",
  "managed-bundle",
] as const;
export type AddonId = (typeof ADDON_IDS)[number];

/**
 * Legacy band keys, kept in exactly one place.
 *
 * The estimate PDF's deliverables tables are keyed by
 * `small|medium|large|enterprise`, so those keys survive as a presentation
 * alias of `ComplexityId` rather than as a second identifier set. No surface
 * may declare this mapping again — import it.
 */
export const LEGACY_BAND_IDS = [
  "small",
  "medium",
  "large",
  "enterprise",
] as const;
export type LegacyBandId = (typeof LEGACY_BAND_IDS)[number];

export const COMPLEXITY_TO_LEGACY_BAND: Readonly<
  Record<ComplexityId, LegacyBandId>
> = {
  basic: "small",
  standard: "medium",
  premium: "large",
};

export function isServiceId(value: string): value is ServiceId {
  return (SERVICE_IDS as readonly string[]).includes(value);
}

export function isComplexityId(value: string): value is ComplexityId {
  return (COMPLEXITY_IDS as readonly string[]).includes(value);
}
