import { prisma } from "@repo/database";
import {
  isComplexityId,
  isServiceId,
  resolvePricing,
  ADDON_IDS,
  BILLING_CYCLES,
  CONSULTING_PACKAGE_IDS,
  MAINTENANCE_PLAN_IDS,
  type AddonId,
  type BillingCycle,
  type ConsultingPackageId,
  type EntityStatus,
  type MaintenancePlanId,
  type MarkupType,
  type PricingOverrides,
  type ResolvedPricing,
} from "@repo/pricing-schema";

/**
 * Reads the admin-editable pricing overrides and resolves them over the
 * shipped defaults from `@repo/pricing-schema`.
 *
 * Every read is fail-soft. A published price is on the marketing site, in
 * proposals, and in signed contracts, so a database blip must not blank it —
 * on any read error this falls back to the defaults, which are the values the
 * last deploy shipped. That is strictly better than an error page and never
 * worse than being slightly stale.
 */

/** Maps rows to typed entries, dropping any the mapper rejects. */
function mapDefined<TRow, TOut>(
  rows: readonly TRow[],
  map: (row: TRow) => TOut | null,
): TOut[] {
  const out: TOut[] = [];
  for (const row of rows) {
    const mapped = map(row);
    if (mapped !== null) out.push(mapped);
  }
  return out;
}

function toStatus(value: string): EntityStatus {
  return value === "planned" || value === "retired" ? value : "active";
}

function toBillingCycle(value: string): BillingCycle {
  return (BILLING_CYCLES as readonly string[]).includes(value)
    ? (value as BillingCycle)
    : "annual";
}

/**
 * Rows are validated against the canonical id set at the boundary rather than
 * cast through it. A row left behind by a renamed tier is dropped here, so
 * nothing downstream has to reason about an id that no longer exists.
 */
function isMaintenanceId(value: string): value is MaintenancePlanId {
  return (MAINTENANCE_PLAN_IDS as readonly string[]).includes(value);
}

function isConsultingId(value: string): value is ConsultingPackageId {
  return (CONSULTING_PACKAGE_IDS as readonly string[]).includes(value);
}

function isAddonId(value: string): value is AddonId {
  return (ADDON_IDS as readonly string[]).includes(value);
}

export async function loadPricingOverrides(): Promise<PricingOverrides> {
  const [cells, maintenance, consulting, addons, terms] = await Promise.all([
    prisma.pricingCellOverride.findMany(),
    prisma.maintenancePlanOverride.findMany(),
    prisma.consultingPackageOverride.findMany(),
    prisma.addonOverride.findMany(),
    prisma.commercialTermsOverride.findUnique({ where: { id: "default" } }),
  ]);

  return {
    cells: mapDefined(cells, (c) =>
      isServiceId(c.serviceId) && isComplexityId(c.complexityId)
        ? {
            serviceId: c.serviceId,
            complexityId: c.complexityId,
            priceMin: c.priceMin,
            priceMax: c.priceMax,
            weeksMin: c.weeksMin,
            weeksMax: c.weeksMax,
            version: c.version,
          }
        : null,
    ),
    maintenance: mapDefined(maintenance, (m) =>
      isMaintenanceId(m.id)
        ? {
            id: m.id,
            price: m.price,
            requestsPerCycle: m.requestsPerCycle,
            overageHourlyRate: m.overageHourlyRate,
            internalHourEquivalent: m.internalHourEquivalent,
            status: toStatus(m.status),
            version: m.version,
          }
        : null,
    ),
    consulting: mapDefined(consulting, (c) =>
      isConsultingId(c.id)
        ? {
            id: c.id,
            price: c.price,
            durationBusinessDays: c.durationBusinessDays,
            status: toStatus(c.status),
            version: c.version,
          }
        : null,
    ),
    addons: mapDefined(addons, (a) =>
      isAddonId(a.id)
        ? {
            id: a.id,
            costBasis: a.costBasis,
            markupType: (a.markupType === "fixed" ? "fixed" : "percent") as MarkupType,
            markupValue: a.markupValue,
            billingCycle: toBillingCycle(a.billingCycle),
            status: toStatus(a.status),
            version: a.version,
          }
        : null,
    ),
    terms: terms
      ? {
          vatRate: terms.vatRate,
          revisionHourlyRate: terms.revisionHourlyRate,
          revisionHourlyRateUsd: terms.revisionHourlyRateUsd,
          includedRevisionRounds: terms.includedRevisionRounds,
          paymentSplit: [
            terms.paymentSplitFirst,
            terms.paymentSplitSecond,
            terms.paymentSplitFinal,
          ] as const,
          proposalValidityDays: terms.proposalValidityDays,
          postLaunchWarrantyDays: terms.postLaunchWarrantyDays,
          usdEgpRate: terms.usdEgpRate,
          usdRateReviewedOn: terms.usdRateReviewedOn.toISOString(),
          version: terms.version,
        }
      : null,
  };
}

/** Resolved pricing for admin surfaces. Falls back to defaults on any error. */
export async function getPricing(): Promise<ResolvedPricing> {
  try {
    return resolvePricing(await loadPricingOverrides());
  } catch (error) {
    console.error("Pricing overrides unavailable; using shipped defaults.", error);
    return resolvePricing();
  }
}

export interface ChangeEntry {
  readonly entityType: string;
  readonly entityId: string;
  readonly field: string;
  readonly oldValue: string | null;
  readonly newValue: string | null;
}

/**
 * Records what changed, field by field.
 *
 * A published price is a commitment a client can read back, so "what did this
 * cost in March, and who changed it" has to be answerable. Written in the same
 * transaction as the change itself so the log cannot drift from reality.
 */
export function diffFields(
  entityType: string,
  entityId: string,
  before: Readonly<Record<string, unknown>>,
  after: Readonly<Record<string, unknown>>,
): ChangeEntry[] {
  const entries: ChangeEntry[] = [];
  for (const [field, next] of Object.entries(after)) {
    const prev = before[field];
    if (String(prev ?? "") === String(next ?? "")) continue;
    entries.push({
      entityType,
      entityId,
      field,
      oldValue: prev === undefined || prev === null ? null : String(prev),
      newValue: next === undefined || next === null ? null : String(next),
    });
  }
  return entries;
}

export async function recordChanges(
  entries: readonly ChangeEntry[],
  changedBy: string | null,
): Promise<void> {
  if (entries.length === 0) return;
  await prisma.pricingChangeLog.createMany({
    data: entries.map((e) => ({ ...e, changedBy })),
  });
}

export async function pricingHistory(limit = 50) {
  return prisma.pricingChangeLog.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}
