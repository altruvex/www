import { ADDONS, type Addon } from "./addons";
import { computeAddonPrice, type AddonPrice } from "./compute";
import { CONSULTING_PACKAGES } from "./consulting";
import { pricingCopy } from "./copy/index";
import {
  fillTemplate,
  formatFrom,
  formatMoney,
  formatNumber,
  formatPercent,
  formatRange,
  formatWeeks,
} from "./format";
import type {
  AddonId,
  ConsultingPackageId,
  MaintenancePlanId,
  TierId,
} from "./ids";
import {
  MAINTENANCE_PLANS,
  publicMaintenancePlans,
  type MaintenancePlan,
} from "./maintenance";
import { COMMERCIAL_TERMS, USD_EXCHANGE_RATE } from "./modifiers";
import { minimumEngagement } from "./services";
import { ORDERED_TIERS, tierEstimatorQuery, TIERS } from "./tiers";
import { resolvePricing, type ResolvedPricing } from "./overrides";
import {
  MAX_DELIVERY_WEEKS,
  type Locale,
  type PriceRange,
  type WeekRange,
} from "./types";

/**
 * Render-ready view models.
 *
 * Each takes an optional `ResolvedPricing`. Omitted, it is the values this
 * package ships, which is what keeps a page that has no datastore — and every
 * existing call site — working unchanged. A surface that can reach the admin
 * overrides passes the resolved set instead, and the same renderer produces the
 * edited numbers without knowing where they came from.
 *
 * Surfaces consume these rather than reaching for entities and formatting
 * numbers themselves. A page that only ever receives a finished string has no
 * opportunity to invent a price, which is what makes the CI literal guard
 * enforceable rather than aspirational.
 */

export interface TierView {
  readonly id: TierId;
  readonly name: string;
  readonly buyerLabel: string;
  readonly internalLabel: string;
  readonly priceLabel: string;
  /** Wording for the delivery window, e.g. "Delivery". */
  readonly timelineLabel: string;
  /** The window itself, e.g. "3–5 weeks". Always a range, never a "from". */
  readonly timelineValue: string;
  readonly idealFor: string;
  readonly notIncluded: string;
  readonly features: readonly string[];
  readonly nextStep: string;
  readonly ctaLabel: string;
  readonly estimatorHref: string;
  readonly highlight: boolean;
}

/** Shipped defaults, resolved once. The fallback for every view below. */
const DEFAULT_PRICING: ResolvedPricing = resolvePricing();

/** A tier's cell, read out of whichever pricing set the caller supplied. */
export function tierRangeFrom(
  tierId: TierView["id"],
  pricing: ResolvedPricing,
): PriceRange {
  const tier = TIERS[tierId];
  return pricing.services[tier.serviceId].price[tier.complexityId];
}

/**
 * The same cell's delivery window.
 *
 * Read from the resolved set for the same reason the price is: an operator who
 * moves a cell's weeks in the admin app moves the card with it, so the tier a
 * buyer reads and the estimate they get one click later cannot disagree about
 * how long the work takes.
 */
export function tierWeeksFrom(
  tierId: TierView["id"],
  pricing: ResolvedPricing,
): WeekRange {
  const tier = TIERS[tierId];
  return pricing.services[tier.serviceId].weeks[tier.complexityId];
}

/**
 * The published delivery ceiling, as a sentence.
 *
 * Rendered next to the tier cards so the cap is stated where the windows are,
 * not only inside the estimator a click away.
 */
export function deliveryCeilingLabel(locale: Locale): string {
  return fillTemplate(pricingCopy(locale).tierTemplates.ceiling, {
    max: formatNumber(MAX_DELIVERY_WEEKS, locale),
  });
}

export function tierViews(
  locale: Locale,
  pricing: ResolvedPricing = DEFAULT_PRICING,
): readonly TierView[] {
  const copy = pricingCopy(locale);

  return ORDERED_TIERS.map((tier) => {
    const range = tierRangeFrom(tier.id, pricing);
    const weeks = tierWeeksFrom(tier.id, pricing);
    const text = copy.tiers[tier.id];

    return {
      id: tier.id,
      name: text.name,
      buyerLabel: text.buyerLabel,
      internalLabel: text.internalLabel,
      priceLabel:
        tier.display === "from"
          ? formatFrom(range.min, locale)
          : formatRange(range, locale),
      timelineLabel: copy.tierTemplates.timelineLabel,
      timelineValue: fillTemplate(copy.tierTemplates.timelineValue, {
        weeks: formatWeeks(weeks.min, weeks.max, locale),
      }),
      idealFor: text.idealFor,
      notIncluded: text.notIncluded,
      features: text.features,
      nextStep: text.nextStep,
      ctaLabel: text.ctaLabel,
      estimatorHref: `/transparency?${tierEstimatorQuery(tier.id)}`,
      highlight: tier.highlight,
    };
  });
}

export function minimumEngagementLabel(
  locale: Locale,
  pricing: ResolvedPricing = DEFAULT_PRICING,
): string {
  return formatFrom(lowestCell(pricing), locale);
}

/** The engagement floor: the lowest published cell in the matrix. */
function lowestCell(pricing: ResolvedPricing): number {
  return Math.min(
    ...Object.values(pricing.services).map((s) => s.price.basic.min),
  );
}

export interface MaintenanceView {
  readonly id: MaintenancePlanId;
  readonly name: string;
  /** Formatted price, or the locale's "Custom" wording when quote-only. */
  readonly priceLabel: string;
  readonly cycleLabel: string;
  readonly isCustomQuote: boolean;
  /** Descriptive bullets plus the templated scope and portal lines. */
  readonly features: readonly string[];
  /** Published overage term. Null on quote-only plans. */
  readonly overageNote: string | null;
  readonly highlight: boolean;
}

function maintenanceFeatures(
  plan: MaintenancePlan,
  locale: Locale,
): readonly string[] {
  const copy = pricingCopy(locale);
  const tpl = copy.maintenanceTemplates;
  const features = [...copy.maintenance[plan.id].features];

  if (plan.requestsPerCycle !== null) {
    const template = plan.priorityTurnaround
      ? tpl.requestCapPriority
      : tpl.requestCap;
    // Inserted at the position the hand-written lists used, so the card's
    // reading order is unchanged by the migration.
    features.splice(
      2,
      0,
      fillTemplate(template, {
        count: formatNumber(plan.requestsPerCycle, locale),
      }),
    );
  }

  if (plan.clientPortalAccess) features.push(tpl.portal);

  return features;
}

export function maintenanceViews(
  locale: Locale,
  pricing: ResolvedPricing = DEFAULT_PRICING,
): readonly MaintenanceView[] {
  const copy = pricingCopy(locale);
  const tpl = copy.maintenanceTemplates;

  return Object.values(pricing.maintenance)
    .filter((plan) => plan.status === "active")
    .sort((a, b) => a.order - b.order)
    .map((plan) => ({
      id: plan.id,
      name: copy.maintenance[plan.id].name,
      priceLabel:
        plan.price === null ? tpl.customPrice : formatMoney(plan.price, locale),
      cycleLabel: plan.price === null ? "" : tpl.perCycle[plan.billingCycle],
      isCustomQuote: plan.price === null,
      features: maintenanceFeatures(plan, locale),
      overageNote:
        plan.overageHourlyRate === null
          ? null
          : fillTemplate(tpl.overage, {
              rate: formatNumber(plan.overageHourlyRate, locale),
            }),
      highlight: plan.highlight,
    }));
}

export interface ConsultingView {
  readonly id: ConsultingPackageId;
  readonly title: string;
  readonly titleItalic: string;
  readonly name: string;
  readonly description: string;
  readonly priceLabel: string;
  readonly priceLabelCaption: string;
  readonly durationLabel: string;
  readonly duration: string;
  readonly deliverables: readonly string[];
  readonly ctaLabel: string;
  readonly eyebrow: string;
  readonly includedLabel: string;
}

export function consultingView(
  id: ConsultingPackageId,
  locale: Locale,
  pricing: ResolvedPricing = DEFAULT_PRICING,
): ConsultingView {
  const pkg = pricing.consulting[id];
  const text = pricingCopy(locale).consulting[id];

  return {
    id,
    title: text.title,
    titleItalic: text.titleItalic,
    name: text.name,
    description: text.description,
    priceLabel: formatMoney(pkg.price, locale),
    priceLabelCaption: text.priceLabel,
    durationLabel: text.durationLabel,
    duration: text.duration,
    deliverables: text.deliverables,
    ctaLabel: text.ctaLabel,
    eyebrow: text.eyebrow,
    includedLabel: text.includedLabel,
  };
}

export interface AddonView {
  readonly id: AddonId;
  readonly name: string;
  readonly description: string;
  readonly status: Addon["status"];
  /** Null while the supplier cost is not on file — render "pending", not 0. */
  readonly price: AddonPrice | null;
  readonly costBasisLabel: string | null;
  readonly markupLabel: string | null;
  readonly totalLabel: string | null;
  readonly pendingLabel: string;
}

function toAddonView(addon: Addon, locale: Locale): AddonView {
  const copy = pricingCopy(locale);
  const text = copy.addons[addon.id];
  const price = computeAddonPrice(addon);

  return {
    id: addon.id,
    name: text.name,
    description: text.description,
    status: addon.status,
    price,
    costBasisLabel: price ? formatMoney(price.costBasis, locale) : null,
    markupLabel: price ? formatMoney(price.markup, locale) : null,
    totalLabel: price ? formatMoney(price.total, locale) : null,
    pendingLabel: copy.terms.pendingLabel,
  };
}

/** Client-safe: `planned` add-ons, the Managed bundle included, are excluded. */
export function publicAddonViews(
  locale: Locale,
  pricing: ResolvedPricing = DEFAULT_PRICING,
): readonly AddonView[] {
  return Object.values(pricing.addons)
    .filter((addon) => addon.status === "active")
    .map((addon) => toAddonView(addon, locale));
}

/** Admin-only: includes roadmap placeholders so they can carry a SOON badge. */
export function allAddonViews(
  locale: Locale,
  pricing: ResolvedPricing = DEFAULT_PRICING,
): readonly AddonView[] {
  return Object.values(pricing.addons).map((addon) =>
    toAddonView(addon, locale),
  );
}

export interface TermsView {
  readonly vatLabel: string;
  readonly vatNote: string;
  readonly revisionLabel: string;
  readonly revisionNote: string;
  readonly usdLabel: string;
  readonly usdNote: string;
  readonly addonLabel: string;
  readonly addonNote: string;
  readonly costBasisLabel: string;
  readonly markupLabel: string;
  readonly totalLabel: string;
}

/**
 * The commercial terms `/transparency` publishes.
 *
 * VAT and the revision rate were previously first disclosed in the contract.
 * Rendering them here is the point of that page.
 */
export function termsView(
  locale: Locale,
  pricing: ResolvedPricing = DEFAULT_PRICING,
): TermsView {
  const t = pricingCopy(locale).terms;
  const { terms: COMMERCIAL_TERMS, exchangeRate: USD_EXCHANGE_RATE } = pricing;

  return {
    vatLabel: t.vatLabel,
    vatNote: fillTemplate(t.vatNote, {
      rate: formatPercent(COMMERCIAL_TERMS.vatRate, locale),
    }),
    revisionLabel: t.revisionLabel,
    revisionNote: fillTemplate(t.revisionNote, {
      rounds: formatNumber(COMMERCIAL_TERMS.includedRevisionRounds, locale),
      rate: formatNumber(COMMERCIAL_TERMS.revisionHourlyRate, locale),
    }),
    usdLabel: t.usdLabel,
    usdNote: fillTemplate(t.usdNote, {
      rate: formatNumber(USD_EXCHANGE_RATE.egpPerUsd, locale),
      reviewedOn: USD_EXCHANGE_RATE.reviewedOn,
    }),
    addonLabel: t.addonLabel,
    addonNote: t.addonNote,
    costBasisLabel: t.costBasisLabel,
    markupLabel: t.markupLabel,
    totalLabel: t.totalLabel,
  };
}

/**
 * Named figures for prose interpolation.
 *
 * Some client-facing copy is a sentence that happens to quote a price — an FAQ
 * answer, a homepage artifact caption. Those live in the app's next-intl
 * catalogue because they are prose, but the number inside them must still come
 * from here or it drifts the moment a price changes. The copy carries a
 * `{token}` and the renderer fills it from this map.
 */
export function pricingTokens(
  locale: Locale,
  pricing: ResolvedPricing = DEFAULT_PRICING,
): Readonly<Record<string, string>> {
  const audit = pricing.consulting["technical-audit"];
  const essential = pricing.maintenance.essential;
  const professional = pricing.maintenance.professional;
  const COMMERCIAL_TERMS = pricing.terms;

  return {
    auditPrice: formatMoney(audit.price, locale),
    essentialRange: formatRange(tierRangeFrom("essential", pricing), locale),
    maintenanceEssential:
      essential.price === null ? "" : formatMoney(essential.price, locale),
    maintenanceProfessional:
      professional.price === null
        ? ""
        : formatMoney(professional.price, locale),
    minimumEngagement: formatMoney(lowestCell(pricing), locale),
    revisionRate: formatMoney(COMMERCIAL_TERMS.revisionHourlyRate, locale),
    vatRate: formatPercent(COMMERCIAL_TERMS.vatRate, locale),
    // The post-launch warranty is a published commercial term, not a price,
    // but it is quoted in the same prose and drifts the same way: the FAQ, the
    // terms of service and the quote artifact all name the window, and the
    // contract promises it.
    warrantyDays: formatNumber(COMMERCIAL_TERMS.postLaunchWarrantyDays, locale),
  };
}

/** Fills every `{token}` in a prose string from `pricingTokens`. */
export function fillPricingTokens(
  text: string,
  locale: Locale,
  pricing: ResolvedPricing = DEFAULT_PRICING,
): string {
  return fillTemplate(text, pricingTokens(locale, pricing));
}
