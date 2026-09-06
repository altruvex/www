/**
 * The canonical identifier set.
 *
 * Before this package, tier identity was enumerated in seven places across
 * three mutually incompatible key sets — `basic|standard|premium`,
 * `small|medium|large|enterprise`, and `essential|professional|ecommerce|
 * flagship` — so renaming a tier meant seven synchronized edits and any missed
 * one shipped a wrong price. Everything downstream now references the ids
 * declared here, and nothing else may declare its own.
 *
 * The three old key sets were conflating two independent axes. They are
 * separated here:
 *
 *   ServiceId     — WHAT is being built (the product line)
 *   ComplexityId  — HOW MUCH scope it carries (the band within a service)
 *   TierId        — a MARKETED package, i.e. one (service, complexity) cell
 *                   given a buyer-facing name and put on /pricing
 *
 * A tier is therefore a presentation of a cell, never a price of its own.
 */

export const SERVICE_IDS = ["website", "webapp", "ecommerce", "pwa"] as const;
export type ServiceId = (typeof SERVICE_IDS)[number];

export const COMPLEXITY_IDS = ["basic", "standard", "premium"] as const;
export type ComplexityId = (typeof COMPLEXITY_IDS)[number];

export const TIER_IDS = [
  "essential",
  "professional",
  "ecommerce",
  "flagship",
] as const;
export type TierId = (typeof TIER_IDS)[number];

export const MAINTENANCE_PLAN_IDS = [
  "essential",
  "professional",
  "enterprise",
] as const;
export type MaintenancePlanId = (typeof MAINTENANCE_PLAN_IDS)[number];

export const CONSULTING_PACKAGE_IDS = ["technical-audit"] as const;
export type ConsultingPackageId = (typeof CONSULTING_PACKAGE_IDS)[number];

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
 * The estimate PDF's deliverables tables and its tier labels are keyed by
 * `small|medium|large|enterprise`. Rewriting those tables would change
 * generated document content, which is explicitly out of scope for a
 * data-layer refactor, so the old keys survive as a presentation alias of
 * `ComplexityId` rather than as a second identifier set. No surface may
 * declare this mapping again — import it.
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

export const LEGACY_BAND_TO_COMPLEXITY: Readonly<
  Record<LegacyBandId, ComplexityId>
> = {
  small: "basic",
  medium: "standard",
  large: "premium",
  // `enterprise` has no cell of its own — it is a premium build that has left
  // the published table and is quoted individually.
  enterprise: "premium",
};

/**
 * Inbound deep-link tokens (`/transparency?tier=…`).
 *
 * These are URLs already in the wild — in sent proposals, in analytics, in
 * links clients have bookmarked — so they are resolved rather than renamed.
 */
export const DEEP_LINK_TIER_TOKENS: Readonly<Record<string, TierId>> = {
  essential: "essential",
  small: "essential",
  professional: "professional",
  medium: "professional",
  commerce: "ecommerce",
  ecommerce: "ecommerce",
  flagship: "flagship",
  large: "flagship",
};

export function isServiceId(value: string): value is ServiceId {
  return (SERVICE_IDS as readonly string[]).includes(value);
}

export function isComplexityId(value: string): value is ComplexityId {
  return (COMPLEXITY_IDS as readonly string[]).includes(value);
}

export function isTierId(value: string): value is TierId {
  return (TIER_IDS as readonly string[]).includes(value);
}

export function resolveTierToken(raw: string | null): TierId | null {
  if (raw === null) return null;
  return DEEP_LINK_TIER_TOKENS[raw] ?? null;
}
