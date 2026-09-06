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

/**
 * Server-side pricing for the public site.
 *
 * The admin screen is the only place a price is edited; this is the read path
 * that carries those edits to a visitor. Three properties matter here and are
 * deliberate:
 *
 * 1. **Fail-soft.** Any read error falls back to the values this deploy
 *    shipped. A database blip must not blank `/pricing` — a slightly stale
 *    price is strictly better than an error page on the page whose entire
 *    claim is that nothing is hidden.
 * 2. **Cached.** Pricing changes rarely and is read on every marketing page
 *    view, so it is cached and revalidated on a timer rather than queried per
 *    request.
 * 3. **Server-only.** `server-only` makes importing this from a client
 *    component a build error rather than a runtime surprise.
 */

/**
 * Upper bound only. An admin price change pushes a revalidation immediately
 * (see `app/api/revalidate-pricing`), so this is the floor for the case where
 * that call does not land — not the normal latency of a price change.
 */
const REVALIDATE_SECONDS = 300;
/** Exported so the revalidation endpoint drops exactly this cache. */
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
            // Margin data is deliberately not read here. The public site has no
            // use for it, and not loading it means it cannot leak from this
            // process even if something downstream starts serialising pricing.
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

/**
 * Resolved pricing for a public page.
 *
 * Never throws. On any failure the shipped defaults are returned, which is what
 * every page rendered before admin overrides existed.
 */
export async function getPublicPricing(): Promise<ResolvedPricing> {
  try {
    return resolvePricing(await cachedOverrides());
  } catch (error) {
    console.error("Pricing overrides unavailable; serving shipped defaults.", error);
    return resolvePricing();
  }
}
