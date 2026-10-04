import "server-only";

import { prisma } from "@repo/database";
import {
  ADDON_IDS,
  BILLING_CYCLES,
  CONSULTING_PACKAGE_IDS,
  MAINTENANCE_PLAN_IDS,
  isComplexityId,
  isServiceId,
  resolvePricing,
  type AddonId,
  type BillingCycle,
  type ConsultingPackageId,
  type EntityStatus,
  type MaintenancePlanId,
  type MarkupType,
  type PricingOverrides,
  type ResolvedPricing,
} from "@repo/pricing-schema";
import { unstable_cache } from "next/cache";

const REVALIDATE_SECONDS = 300;
export const PRICING_CACHE_TAG = "pricing";

function toStatus(value: string): EntityStatus {
  return value === "planned" || value === "retired" ? value : "active";
}

function toBillingCycle(value: string): BillingCycle {
  return (BILLING_CYCLES as readonly string[]).includes(value)
    ? (value as BillingCycle)
    : "annual";
}

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

const isMaintenanceId = (v: string): v is MaintenancePlanId =>
  (MAINTENANCE_PLAN_IDS as readonly string[]).includes(v);
const isConsultingId = (v: string): v is ConsultingPackageId =>
  (CONSULTING_PACKAGE_IDS as readonly string[]).includes(v);
const isAddonId = (v: string): v is AddonId =>
  (ADDON_IDS as readonly string[]).includes(v);

async function readOverrides(): Promise<PricingOverrides> {
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

const cachedOverrides = unstable_cache(readOverrides, ["pricing-overrides"], {
  revalidate: REVALIDATE_SECONDS,
  tags: [PRICING_CACHE_TAG],
});

export async function getPublicPricing(): Promise<ResolvedPricing> {
  try {
    return resolvePricing(await cachedOverrides());
  } catch (error) {
    console.error("Pricing overrides unavailable; serving shipped defaults.", error);
    return resolvePricing();
  }
}
