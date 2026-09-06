import { ADDONS, type Addon, type AddonCategory, type MarkupType } from "./addons";
import { CONSULTING_PACKAGES, type ConsultingPackage } from "./consulting";
import type {
  AddonId,
  ComplexityId,
  ConsultingPackageId,
  MaintenancePlanId,
  ServiceId,
} from "./ids";
import { MAINTENANCE_PLANS, type MaintenancePlan } from "./maintenance";
import { COMMERCIAL_TERMS, USD_EXCHANGE_RATE, type CommercialTerms, type ExchangeRate } from "./modifiers";
import { SERVICES, type Service } from "./services";
import type { BillingCycle, EntityStatus } from "./types";

/**
 * Admin-editable overrides layered over the shipped defaults.
 *
 * The constants in this package stay the source of truth for *shape* and for
 * the last-deployed values; a row here is what an operator has actually
 * changed. Resolution is `override ?? default` throughout, which buys three
 * things: an empty store renders exactly what the last deploy shipped, a
 * datastore outage degrades to those values instead of taking prices off the
 * marketing site, and the CI literal guard keeps working because the numbers
 * still live in this package.
 *
 * This module is deliberately pure — no database, no I/O. Each app reads its
 * own store and hands the result to `resolvePricing`, so `apps/www` does not
 * inherit a database dependency it does not otherwise need.
 */

export interface CellOverride {
  readonly serviceId: ServiceId;
  readonly complexityId: ComplexityId;
  readonly priceMin: number;
  readonly priceMax: number;
  readonly weeksMin: number;
  readonly weeksMax: number;
  readonly version: number;
}

export interface MaintenanceOverride {
  readonly id: MaintenancePlanId;
  readonly price: number | null;
  readonly requestsPerCycle: number | null;
  readonly overageHourlyRate: number | null;
  /**
   * Internal margin planning. Optional on purpose: a consumer with no business
   * reading margin data — the public site — omits it entirely, so the figure
   * never enters that process at all rather than merely going unrendered.
   *
   * `undefined` means "not supplied, keep the default"; `null` means an
   * operator explicitly cleared it.
   */
  readonly internalHourEquivalent?: number | null;
  readonly status: EntityStatus;
  readonly version: number;
}

export interface ConsultingOverride {
  readonly id: ConsultingPackageId;
  readonly price: number;
  readonly durationBusinessDays: number;
  readonly status: EntityStatus;
  readonly version: number;
}

export interface AddonOverride {
  readonly id: AddonId;
  readonly costBasis: number | null;
  readonly markupType: MarkupType;
  readonly markupValue: number;
  readonly billingCycle: BillingCycle;
  readonly status: EntityStatus;
  readonly version: number;
}

export interface TermsOverride {
  readonly vatRate: number;
  readonly revisionHourlyRate: number;
  readonly revisionHourlyRateUsd: number;
  readonly includedRevisionRounds: number;
  readonly paymentSplit: readonly [number, number, number];
  readonly proposalValidityDays: number;
  readonly postLaunchWarrantyDays: number;
  readonly usdEgpRate: number;
  readonly usdRateReviewedOn: string;
  readonly version: number;
}

export interface PricingOverrides {
  readonly cells?: readonly CellOverride[];
  readonly maintenance?: readonly MaintenanceOverride[];
  readonly consulting?: readonly ConsultingOverride[];
  readonly addons?: readonly AddonOverride[];
  readonly terms?: TermsOverride | null;
}

/** The fully resolved pricing world: defaults with any overrides applied. */
export interface ResolvedPricing {
  readonly services: Readonly<Record<ServiceId, Service>>;
  readonly maintenance: Readonly<Record<MaintenancePlanId, MaintenancePlan>>;
  readonly consulting: Readonly<Record<ConsultingPackageId, ConsultingPackage>>;
  readonly addons: Readonly<Record<AddonId, Addon>>;
  readonly terms: CommercialTerms;
  readonly exchangeRate: ExchangeRate;
  /** True when at least one override was applied. */
  readonly overridden: boolean;
}

function isoDate(value: string): `${number}-${number}-${number}` {
  // Callers pass an ISO date; the branded type is presentational only.
  return value.slice(0, 10) as `${number}-${number}-${number}`;
}

/**
 * Applies overrides to the shipped defaults.
 *
 * Nothing is mutated and unknown ids are ignored rather than throwing: a row
 * left behind by a renamed tier must not be able to break a pricing page.
 */
export function resolvePricing(
  overrides: PricingOverrides = {},
): ResolvedPricing {
  let overridden = false;

  const services: Record<ServiceId, Service> = { ...SERVICES };
  for (const cell of overrides.cells ?? []) {
    const base = services[cell.serviceId];
    if (!base) continue;
    overridden = true;
    services[cell.serviceId] = {
      ...base,
      version: Math.max(base.version, cell.version),
      price: {
        ...base.price,
        [cell.complexityId]: { min: cell.priceMin, max: cell.priceMax },
      },
      weeks: {
        ...base.weeks,
        [cell.complexityId]: { min: cell.weeksMin, max: cell.weeksMax },
      },
    };
  }

  const maintenance: Record<MaintenancePlanId, MaintenancePlan> = {
    ...MAINTENANCE_PLANS,
  };
  for (const row of overrides.maintenance ?? []) {
    const base = maintenance[row.id];
    if (!base) continue;
    overridden = true;
    maintenance[row.id] = {
      ...base,
      price: row.price,
      requestsPerCycle: row.requestsPerCycle,
      overageHourlyRate: row.overageHourlyRate,
      internalHourEquivalent:
        row.internalHourEquivalent === undefined
          ? base.internalHourEquivalent
          : row.internalHourEquivalent,
      status: row.status,
      version: Math.max(base.version, row.version),
    };
  }

  const consulting: Record<ConsultingPackageId, ConsultingPackage> = {
    ...CONSULTING_PACKAGES,
  };
  for (const row of overrides.consulting ?? []) {
    const base = consulting[row.id];
    if (!base) continue;
    overridden = true;
    consulting[row.id] = {
      ...base,
      price: row.price,
      durationBusinessDays: row.durationBusinessDays,
      status: row.status,
      version: Math.max(base.version, row.version),
    };
  }

  const addons: Record<AddonId, Addon> = { ...ADDONS };
  for (const row of overrides.addons ?? []) {
    const base = addons[row.id];
    if (!base) continue;
    overridden = true;
    addons[row.id] = {
      ...base,
      costBasis: row.costBasis,
      markupType: row.markupType,
      markupValue: row.markupValue,
      billingCycle: row.billingCycle,
      status: row.status,
      version: Math.max(base.version, row.version),
    };
  }

  let terms = COMMERCIAL_TERMS;
  let exchangeRate = USD_EXCHANGE_RATE;
  if (overrides.terms) {
    overridden = true;
    const t = overrides.terms;
    terms = {
      ...COMMERCIAL_TERMS,
      vatRate: t.vatRate,
      revisionHourlyRate: t.revisionHourlyRate,
      revisionHourlyRateUsd: t.revisionHourlyRateUsd,
      includedRevisionRounds: t.includedRevisionRounds,
      paymentSplit: t.paymentSplit,
      proposalValidityDays: t.proposalValidityDays,
      postLaunchWarrantyDays: t.postLaunchWarrantyDays,
      version: Math.max(COMMERCIAL_TERMS.version, t.version),
    };
    exchangeRate = {
      ...USD_EXCHANGE_RATE,
      egpPerUsd: t.usdEgpRate,
      reviewedOn: isoDate(t.usdRateReviewedOn),
      version: Math.max(USD_EXCHANGE_RATE.version, t.version),
    };
  }

  return { services, maintenance, consulting, addons, terms, exchangeRate, overridden };
}

/** Category is fixed by the add-on's identity and is never overridden. */
export function addonCategory(id: AddonId): AddonCategory {
  return ADDONS[id].category;
}
