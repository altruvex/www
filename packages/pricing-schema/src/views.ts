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
import { ORDERED_TIERS, tierEstimatorQuery, tierPriceRange } from "./tiers";
import type { Locale } from "./types";

/**
 * Render-ready view models.
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
  readonly idealFor: string;
  readonly notIncluded: string;
  readonly features: readonly string[];
  readonly nextStep: string;
  readonly ctaLabel: string;
  readonly estimatorHref: string;
  readonly highlight: boolean;
}

export function tierViews(locale: Locale): readonly TierView[] {
  const copy = pricingCopy(locale);

  return ORDERED_TIERS.map((tier) => {
    const range = tierPriceRange(tier.id);
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

export function minimumEngagementLabel(locale: Locale): string {
  return formatFrom(minimumEngagement(), locale);
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
    features.splice(2, 0, fillTemplate(template, {
      count: formatNumber(plan.requestsPerCycle, locale),
    }));
  }

  if (plan.clientPortalAccess) features.push(tpl.portal);

  return features;
}

export function maintenanceViews(locale: Locale): readonly MaintenanceView[] {
  const copy = pricingCopy(locale);
  const tpl = copy.maintenanceTemplates;

  return publicMaintenancePlans().map((plan) => ({
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
): ConsultingView {
  const pkg = CONSULTING_PACKAGES[id];
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
export function publicAddonViews(locale: Locale): readonly AddonView[] {
  return Object.values(ADDONS)
    .filter((addon) => addon.status === "active")
    .map((addon) => toAddonView(addon, locale));
}

/** Admin-only: includes roadmap placeholders so they can carry a SOON badge. */
export function allAddonViews(locale: Locale): readonly AddonView[] {
  return Object.values(ADDONS).map((addon) => toAddonView(addon, locale));
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
export function termsView(locale: Locale): TermsView {
  const t = pricingCopy(locale).terms;

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
): Readonly<Record<string, string>> {
  const audit = CONSULTING_PACKAGES["technical-audit"];
  const essential = MAINTENANCE_PLANS.essential;
  const professional = MAINTENANCE_PLANS.professional;

  return {
    auditPrice: formatMoney(audit.price, locale),
    essentialRange: formatRange(tierPriceRange("essential"), locale),
    maintenanceEssential:
      essential.price === null ? "" : formatMoney(essential.price, locale),
    maintenanceProfessional:
      professional.price === null ? "" : formatMoney(professional.price, locale),
    minimumEngagement: formatMoney(minimumEngagement(), locale),
    revisionRate: formatMoney(COMMERCIAL_TERMS.revisionHourlyRate, locale),
    vatRate: formatPercent(COMMERCIAL_TERMS.vatRate, locale),
  };
}

/** Fills every `{token}` in a prose string from `pricingTokens`. */
export function fillPricingTokens(text: string, locale: Locale): string {
  return fillTemplate(text, pricingTokens(locale));
}
