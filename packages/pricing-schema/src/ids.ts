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
 * Budget bands a lead can pick, as multiples of the published minimum
 * engagement (see `budgetBands`). Never a fixed currency figure, so the bands
 * move with the schema and no band sits below the floor.
 */
export const BUDGET_BAND_IDS = [
  "floor-2x",
  "2x-5x",
  "5x-10x",
  "over-10x",
] as const;
export type BudgetBandId = (typeof BUDGET_BAND_IDS)[number];

/** A budget answer: one of the bands, or "unsure". */
export const BUDGET_ANSWER_IDS = [...BUDGET_BAND_IDS, "unsure"] as const;
export type BudgetAnswerId = (typeof BUDGET_ANSWER_IDS)[number];

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

export function isBudgetAnswerId(value: string): value is BudgetAnswerId {
  return (BUDGET_ANSWER_IDS as readonly string[]).includes(value);
}
