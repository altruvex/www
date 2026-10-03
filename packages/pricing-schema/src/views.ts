import { ADDONS, type Addon } from "./addons";
import {
  calculateEstimate,
  computeAddonPrice,
  estimateSpan,
  minimumEngagementFrom,
  WORKED_EXAMPLE_INPUT,
  type AddonPrice,
} from "./compute";
import { consultingCreditAmount, CONSULTING_PACKAGES } from "./consulting";
import { pricingCopy, type MaintenanceCompare } from "./copy/index";
import {
  fillTemplate,
  formatFrom,
  formatMoney,
  formatNumber,
  formatPercent,
  formatPercentLabel,
  formatRange,
  formatSignedPercent,
  formatWeeks,
} from "./format";
import {
  COMPLEXITY_IDS,
  SCOPE_NOTE_IDS,
  SERVICE_IDS,
  type AddonId,
  type ComplexityId,
  type ConsultingPackageId,
  type MaintenancePlanId,
  type ScopeNoteId,
  type ServiceId,
} from "./ids";
import {
  MAINTENANCE_PLANS,
  maintenanceFreeMonths,
  maintenanceIntervalPrice,
  publicMaintenancePlans,
  type MaintenancePlan,
} from "./maintenance";
import {
  COMMERCIAL_TERMS,
  FACTOR_GROUP_IDS,
  FACTOR_GROUPS,
  NEUTRAL_FACTOR,
  PRICING_DRIVERS,
  USD_EXCHANGE_RATE,
  type FactorGroupId,
  type PricingDriverEffect,
  type PricingDriverId,
} from "./modifiers";
import { DEFAULT_PRICING, type ResolvedPricing } from "./overrides";
import {
  MAX_DELIVERY_WEEKS,
  type Locale,
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

/**
 * Shipped defaults, resolved once. The fallback for every view below; defined
 * in `overrides.ts` so the estimate engine shares it without an import cycle.
 */
export { DEFAULT_PRICING };

export interface InvestmentCellView {
  readonly serviceId: ServiceId;
  readonly complexityId: ComplexityId;
  /** The cell's range, e.g. "40,000 – 75,000 EGP". Always a range. */
  readonly priceLabel: string;
  /** The cell's delivery window, e.g. "3–5 weeks". */
  readonly weeksLabel: string;
}

export interface InvestmentMatrixRowView {
  readonly serviceId: ServiceId;
  readonly name: string;
  readonly description: string;
  /** One cell per complexity band, in `COMPLEXITY_IDS` order. */
  readonly cells: readonly InvestmentCellView[];
}

export interface InvestmentMatrixView {
  readonly bands: readonly {
    readonly id: ComplexityId;
    readonly label: string;
  }[];
  readonly rows: readonly InvestmentMatrixRowView[];
  /** Cells in the grid, so copy can count them instead of hardcoding it. */
  readonly cellCount: number;
}

/**
 * The published range grid: a buyer reads project type × complexity and a
 * range, nothing else. This is the grid the service investment register
 * discloses under Custom development.
 */
export function investmentMatrixView(
  locale: Locale,
  pricing: ResolvedPricing = DEFAULT_PRICING,
): InvestmentMatrixView {
  const copy = pricingCopy(locale);

  const rows = SERVICE_IDS.map((serviceId) => {
    const service = pricing.services[serviceId];
    return {
      serviceId,
      name: copy.services[serviceId].name,
      description: copy.services[serviceId].description,
      cells: COMPLEXITY_IDS.map((complexityId) => {
        const weeks = service.weeks[complexityId];
        return {
          serviceId,
          complexityId,
          priceLabel: formatRange(service.price[complexityId], locale),
          weeksLabel: fillTemplate(copy.investment.weeksValue, {
            weeks: formatWeeks(weeks.min, weeks.max, locale),
          }),
        };
      }),
    };
  });

  return {
    bands: COMPLEXITY_IDS.map((id) => ({ id, label: copy.bands[id] })),
    rows,
    cellCount: SERVICE_IDS.length * COMPLEXITY_IDS.length,
  };
}

export const SERVICE_INVESTMENT_IDS = [
  "design",
  "development",
  "audit",
  "maintenance",
] as const;
export type ServiceInvestmentId = (typeof SERVICE_INVESTMENT_IDS)[number];

export interface ServiceInvestmentRowView {
  readonly id: ServiceInvestmentId;
  readonly name: string;
  readonly covers: string;
  readonly how: string;
  /**
   * The row's figure cell: "Scoped per project" for design, "From {floor}"
   * for development, the audit fee, and the lowest plan for maintenance.
   */
  readonly figureLabel: string;
  /** True when the figure is words, not a number (design). */
  readonly isScopedPerProject: boolean;
  /** Development only: the twelve published ranges behind "From {floor}". */
  readonly matrix: InvestmentMatrixView | null;
  /** Audit only: fee, duration and the credit rule. */
  readonly audit: ConsultingView | null;
  /** Maintenance only: the plans, custom-quote plan included. */
  readonly plans: readonly MaintenanceView[] | null;
}

/**
 * The service investment register: one row per service line, as `/pricing`
 * and every service page print it.
 *
 * Interface design carries no figure by decision — it is scoped per project.
 * Development quotes the engagement floor and discloses the grid behind it;
 * the audit quotes its fixed fee and the credit; maintenance quotes its plans.
 * Every number resolves from the same set the estimator reads.
 */
export function serviceInvestmentViews(
  locale: Locale,
  pricing: ResolvedPricing = DEFAULT_PRICING,
): readonly ServiceInvestmentRowView[] {
  const copy = pricingCopy(locale).investment;
  const cycle = pricingCopy(locale).maintenanceTemplates.perCycle;

  const matrix = investmentMatrixView(locale, pricing);
  const audit = consultingView("technical-audit", locale, pricing);
  const plans = maintenanceViews(locale, pricing);

  const pricedPlans = Object.values(pricing.maintenance).filter(
    (plan) => plan.status === "active" && plan.price !== null,
  );
  const lowestPlan = pricedPlans.reduce<(typeof pricedPlans)[number] | null>(
    (lowest, plan) =>
      lowest === null || (plan.price as number) < (lowest.price as number)
        ? plan
        : lowest,
    null,
  );

  return [
    {
      id: "design",
      name: copy.design.name,
      covers: copy.design.covers,
      how: copy.design.how,
      figureLabel: copy.design.figure,
      isScopedPerProject: true,
      matrix: null,
      audit: null,
      plans: null,
    },
    {
      id: "development",
      name: copy.development.name,
      covers: copy.development.covers,
      how: copy.development.how,
      figureLabel: formatFrom(minimumEngagementFrom(pricing), locale),
      isScopedPerProject: false,
      matrix,
      audit: null,
      plans: null,
    },
    {
      id: "audit",
      name: copy.audit.name,
      covers: copy.audit.covers,
      how: copy.audit.how,
      figureLabel: audit.priceLabel,
      isScopedPerProject: false,
      matrix: null,
      audit,
      plans: null,
    },
    {
      id: "maintenance",
      name: copy.maintenance.name,
      covers: copy.maintenance.covers,
      how: copy.maintenance.how,
      figureLabel:
        lowestPlan === null
          ? ""
          : `${formatFrom(lowestPlan.price as number, locale)} ${cycle[lowestPlan.billingCycle]}`,
      isScopedPerProject: false,
      matrix: null,
      audit: null,
      plans,
    },
  ];
}

export interface WorkedExampleView {
  /** The five answers behind every figure below. */
  readonly input: typeof WORKED_EXAMPLE_INPUT;
  /** The answers as words, for the example's caption line. */
  readonly serviceLabel: string;
  readonly bandLabel: string;
  readonly brandLabel: string;
  readonly contentLabel: string;
  readonly timelineLabel: string;
  /** "From 22,000 EGP" — the engagement floor. */
  readonly floorLabel: string;
  /** The published cell the answers land in, e.g. "40,000 – 75,000 EGP". */
  readonly cellLabel: string;
  /** The estimate after conditions, e.g. "45,000 – 85,000 EGP". */
  readonly estimateLabel: string;
  /** Weeks after conditions, e.g. "3–6". */
  readonly weeksLabel: string;
  readonly validityDays: number;
  readonly validityDaysLabel: string;
}

/**
 * The worked example, fully computed.
 *
 * The pricing pages walk a buyer from requirements to proposal on one example
 * project. Every figure in that walkthrough comes from here, computed from
 * `WORKED_EXAMPLE_INPUT` against the same pricing the estimator uses, so the
 * example can never show a number the estimator would not.
 */
export function workedExampleView(
  locale: Locale,
  pricing: ResolvedPricing = DEFAULT_PRICING,
): WorkedExampleView {
  const copy = pricingCopy(locale);
  const input = WORKED_EXAMPLE_INPUT;
  const cell = pricing.services[input.serviceId].price[input.complexityId];
  const estimate = calculateEstimate(input, pricing);
  const factorLabel = (group: FactorGroupId, option: string) =>
    copy.factors.groups[group].options[option]?.label ?? option;

  return {
    input,
    serviceLabel: copy.services[input.serviceId].name,
    bandLabel: copy.bands[input.complexityId],
    brandLabel: factorLabel("brand", input.brandIdentity ?? "complete"),
    contentLabel: factorLabel("content", input.contentReadiness ?? "provide"),
    timelineLabel: factorLabel("timeline", input.timeline),
    floorLabel: formatFrom(minimumEngagementFrom(pricing), locale),
    cellLabel: formatRange(cell, locale),
    estimateLabel: formatRange(
      { min: estimate.minPrice, max: estimate.maxPrice },
      locale,
    ),
    weeksLabel: formatWeeks(estimate.minWeeks, estimate.maxWeeks, locale),
    validityDays: pricing.terms.proposalValidityDays,
    validityDaysLabel: formatNumber(pricing.terms.proposalValidityDays, locale),
  };
}

export interface FactorOptionView {
  readonly id: string;
  readonly label: string;
  /** The raw price factor, e.g. 1.15. */
  readonly factor: number;
  /** The price change as words: "+15%", "no change", "−5%". */
  readonly deltaLabel: string;
  readonly isNeutral: boolean;
}

export interface FactorGroupView {
  readonly id: FactorGroupId;
  readonly label: string;
  /** In the order the estimator asks them. */
  readonly options: readonly FactorOptionView[];
  /** Lowest to highest delta, e.g. "−5% … +15%" or "no change … +12%". */
  readonly spanLabel: string;
}

/** The separator between the two ends of a factor span. */
const SPAN_SEPARATOR = " … ";

function factorDeltaLabel(
  factor: number,
  locale: Locale,
  noChange: string,
): string {
  return factor === 1 ? noChange : formatSignedPercent(factor - 1, locale);
}

/**
 * The priced conditions, as percents a buyer can read.
 *
 * Turns the multipliers in `modifiers.ts` into per-option delta labels and a
 * span per group. These are the only numbers the "what determines cost"
 * explanation may print, and they are computed from the factors the estimate
 * engine multiplies by — the explanation cannot drift from the engine.
 */
export function factorViews(locale: Locale): readonly FactorGroupView[] {
  const copy = pricingCopy(locale).factors;

  return FACTOR_GROUP_IDS.map((id) => {
    const group = FACTOR_GROUPS[id];
    const text = copy.groups[id];

    const options = group.optionIds.map((optionId) => {
      const factor = (group.factors[optionId] ?? NEUTRAL_FACTOR).price;
      return {
        id: optionId,
        label: text.options[optionId]?.label ?? optionId,
        factor,
        deltaLabel: factorDeltaLabel(factor, locale, copy.noChange),
        isNeutral: factor === 1,
      };
    });

    const sorted = [...options].sort((a, b) => a.factor - b.factor);
    const first = sorted[0];
    const last = sorted[sorted.length - 1];

    return {
      id,
      label: text.label,
      options,
      spanLabel:
        first && last
          ? `${first.deltaLabel}${SPAN_SEPARATOR}${last.deltaLabel}`
          : "",
    };
  });
}

export interface PricingDriverView {
  readonly id: PricingDriverId;
  readonly effect: PricingDriverEffect;
  /** The factor groups that explain this driver's percents; empty for reviewed and monthly items. */
  readonly groups: readonly FactorGroupView[];
  /**
   * The driver's overall span across its groups, or null when nothing priced
   * is attached (a matrix axis, a reviewed item, a monthly plan).
   */
  readonly spanLabel: string | null;
}

/**
 * What determines cost, one row per driver, with the real percents attached
 * where a driver is a priced condition. Wording is app copy; the structure and
 * every number are this package's.
 */
export function pricingDriverViews(
  locale: Locale,
): readonly PricingDriverView[] {
  const groups = factorViews(locale);
  const noChange = pricingCopy(locale).factors.noChange;

  return PRICING_DRIVERS.map((driver) => {
    const attached = driver.factorGroups
      .map((id) => groups.find((g) => g.id === id))
      .filter((g): g is FactorGroupView => g !== undefined);

    const options = attached.flatMap((g) => g.options);
    const sorted = [...options].sort((a, b) => a.factor - b.factor);
    const first = sorted[0];
    const last = sorted[sorted.length - 1];

    return {
      id: driver.id,
      effect: driver.effect,
      groups: attached,
      spanLabel:
        first && last
          ? `${factorDeltaLabel(first.factor, locale, noChange)}${SPAN_SEPARATOR}${factorDeltaLabel(last.factor, locale, noChange)}`
          : null,
    };
  });
}

export interface ScopeNoteView {
  readonly id: ScopeNoteId;
  readonly name: string;
  readonly description: string;
}

/** The unpriced scope notes a buyer can tick, in display order. */
export function scopeNoteViews(locale: Locale): readonly ScopeNoteView[] {
  const copy = pricingCopy(locale).scopeNotes;
  return SCOPE_NOTE_IDS.map((id) => ({
    id,
    name: copy[id].name,
    description: copy[id].description,
  }));
}

/**
 * The widest range the estimator publishes before any answer, as labels.
 * The estimator opens on this and every pricing page that says "from … to …"
 * about the whole offer reads it.
 */
export function estimateSpanLabels(
  locale: Locale,
  pricing: ResolvedPricing = DEFAULT_PRICING,
): { readonly priceLabel: string; readonly weeksLabel: string } {
  const span = estimateSpan({}, pricing);
  return {
    priceLabel: formatRange({ min: span.minPrice, max: span.maxPrice }, locale),
    weeksLabel: formatWeeks(span.minWeeks, span.maxWeeks, locale),
  };
}

/**
 * The published delivery window: the shortest and longest cell in the matrix,
 * in weeks. The process pages split this window into phases, so the phase
 * lengths they print cannot promise more (or less) time than a price cell
 * does - and an admin edit to a cell's weeks moves them with it.
 */
export function deliveryWindowFrom(
  pricing: ResolvedPricing = DEFAULT_PRICING,
): WeekRange {
  const cells = Object.values(pricing.services).flatMap((service) =>
    Object.values(service.weeks),
  );
  return {
    min: Math.min(...cells.map((cell) => cell.min)),
    max: Math.max(...cells.map((cell) => cell.max)),
  };
}

/** The engagement floor: the lowest published cell in the matrix. */
function lowestCell(pricing: ResolvedPricing): number {
  return minimumEngagementFrom(pricing);
}

/**
 * The whole published build range — the lowest cell in the matrix to the
 * highest — as one formatted span.
 *
 * `/services/consulting` states the audit's fee against it ("4% of the largest
 * build we publish"), so the two figures have to come from the same matrix an
 * admin edits. Deriving it in the app would put a second authority on what the
 * published range is.
 */
export function publishedBuildRangeLabel(
  locale: Locale,
  pricing: ResolvedPricing = DEFAULT_PRICING,
): string {
  const services = Object.values(pricing.services);
  return formatRange(
    {
      min: Math.min(...services.map((service) => service.price.basic.min)),
      max: Math.max(...services.map((service) => service.price.premium.max)),
    },
    locale,
  );
}

export interface MaintenanceView {
  readonly id: MaintenancePlanId;
  readonly name: string;
  /** Formatted price, or the locale's "Custom" wording when quote-only. */
  readonly priceLabel: string;
  readonly cycleLabel: string;
  /**
   * The same plan paid a year up front: the yearly figure and its cycle
   * wording. Null when quote-only.
   */
  readonly annual: {
    readonly priceLabel: string;
    readonly cycleLabel: string;
  } | null;
  readonly isCustomQuote: boolean;
  /** Descriptive bullets plus the templated scope and portal lines. */
  readonly features: readonly string[];
  /** Published overage term. Null on quote-only plans. */
  readonly overageNote: string | null;
  readonly highlight: boolean;
  /**
   * The client-facing cap on edit requests per cycle — the unit the retainer
   * is sold in — so a surface can draw the allowance as a count, not only
   * read it in a sentence. Null when quote-only.
   */
  readonly requestsPerCycle: number | null;
  readonly priorityTurnaround: boolean;
  /** The plan answered against the shared comparison questions. */
  readonly compare: MaintenanceCompare;
  /** "{rate} EGP / hour" for a table cell. Null on quote-only plans. */
  readonly overageShort: string | null;
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

function annualView(
  plan: MaintenancePlan,
  locale: Locale,
): MaintenanceView["annual"] {
  const price = maintenanceIntervalPrice(plan, "annual");
  if (price === null) return null;

  return {
    priceLabel: formatMoney(price, locale),
    cycleLabel: pricingCopy(locale).maintenanceTemplates.perCycle.annual,
  };
}

/** Months a year paid up front does not charge for — for "{n} months free" copy. */
export const MAINTENANCE_ANNUAL_FREE_MONTHS = maintenanceFreeMonths("annual");

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
      annual: annualView(plan, locale),
      isCustomQuote: plan.price === null,
      features: maintenanceFeatures(plan, locale),
      overageNote:
        plan.overageHourlyRate === null
          ? null
          : fillTemplate(tpl.overage, {
              rate: formatNumber(plan.overageHourlyRate, locale),
            }),
      highlight: plan.highlight,
      requestsPerCycle: plan.requestsPerCycle,
      priorityTurnaround: plan.priorityTurnaround,
      compare: copy.maintenance[plan.id].compare,
      overageShort:
        plan.overageHourlyRate === null
          ? null
          : fillTemplate(tpl.overageShort, {
              rate: formatNumber(plan.overageHourlyRate, locale),
            }),
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
  /**
   * The credit rule, already resolved against the package's own price.
   *
   * `creditAmountLabel` is null when nothing is credited, which is the signal
   * for a surface to print neither half — never a "0 EGP credited" line.
   */
  readonly creditLabel: string;
  readonly creditAmountLabel: string | null;
  readonly creditIfBuild: string;
  readonly creditIfNot: string;
}

export function consultingView(
  id: ConsultingPackageId,
  locale: Locale,
  pricing: ResolvedPricing = DEFAULT_PRICING,
): ConsultingView {
  const pkg = pricing.consulting[id];
  const text = pricingCopy(locale).consulting[id];
  const credit = consultingCreditAmount(pkg);

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
    creditLabel: text.creditLabel,
    creditAmountLabel: credit > 0 ? formatMoney(credit, locale) : null,
    creditIfBuild: fillTemplate(text.creditIfBuild, {
      credit: formatMoney(credit, locale),
    }),
    creditIfNot: text.creditIfNot,
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

export interface PaymentMilestoneView {
  /** The share as a number, e.g. 50. */
  readonly percent: number;
  /** The share as text, e.g. "50%" / "٥٠٪". */
  readonly percentLabel: string;
  /** The milestone sentence, e.g. "50% to start". */
  readonly label: string;
}

export interface PaymentScheduleView {
  /** In `paymentSplit` order: start, development milestone, before launch. */
  readonly milestones: readonly [
    PaymentMilestoneView,
    PaymentMilestoneView,
    PaymentMilestoneView,
  ];
  /** The middle trigger on its own: "a development milestone". */
  readonly milestoneTrigger: string;
  /** "All figures exclude VAT at 14%." */
  readonly vatExcluded: string;
  readonly ownership: string;
  /** "30 days from the date of issue." */
  readonly validity: string;
  readonly validityDays: number;
  readonly validityDaysLabel: string;
}

/**
 * The payment schedule and the terms that travel with a figure.
 *
 * The three milestones are `paymentSplit` joined to the trigger copy, so the
 * pricing page, the FAQ, a proposal and a contract all describe the same
 * schedule in the same words — and an edit to the split moves all of them.
 */
export function paymentScheduleView(
  locale: Locale,
  pricing: ResolvedPricing = DEFAULT_PRICING,
): PaymentScheduleView {
  const t = pricingCopy(locale).terms;
  const terms = pricing.terms;

  const milestone = (index: 0 | 1 | 2): PaymentMilestoneView => {
    const percent = terms.paymentSplit[index];
    const percentLabel = formatPercentLabel(percent / 100, locale);
    return {
      percent,
      percentLabel,
      label: fillTemplate(t.paymentTriggers[index], { p: percentLabel }),
    };
  };

  return {
    milestones: [milestone(0), milestone(1), milestone(2)],
    milestoneTrigger: t.milestoneTrigger,
    vatExcluded: fillTemplate(t.vatExcluded, {
      rate: formatPercent(terms.vatRate, locale),
    }),
    ownership: t.ownership,
    validity: fillTemplate(t.validity, {
      days: formatNumber(terms.proposalValidityDays, locale),
    }),
    validityDays: terms.proposalValidityDays,
    validityDaysLabel: formatNumber(terms.proposalValidityDays, locale),
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
    // What that fee is worth against a build. Prose that states the credit
    // quotes this, so the sentence cannot outlive the rule it describes.
    auditCredit: formatMoney(consultingCreditAmount(audit), locale),
    // The website/basic cell: the smallest build the matrix publishes.
    essentialRange: formatRange(pricing.services.website.price.basic, locale),
    maintenanceEssential:
      essential.price === null ? "" : formatMoney(essential.price, locale),
    maintenanceProfessional:
      professional.price === null
        ? ""
        : formatMoney(professional.price, locale),
    // The same plans paid a year up front. Derived, so the FAQ's yearly figure
    // moves with the monthly one.
    maintenanceEssentialAnnual: annualView(essential, locale)?.priceLabel ?? "",
    maintenanceProfessionalAnnual:
      annualView(professional, locale)?.priceLabel ?? "",
    minimumEngagement: formatMoney(lowestCell(pricing), locale),
    revisionRate: formatMoney(COMMERCIAL_TERMS.revisionHourlyRate, locale),
    vatRate: formatPercent(COMMERCIAL_TERMS.vatRate, locale),
    // The post-launch warranty is a published commercial term, not a price,
    // but it is quoted in the same prose and drifts the same way: the FAQ, the
    // terms of service and the quote artifact all name the window, and the
    // contract promises it.
    warrantyDays: formatNumber(COMMERCIAL_TERMS.postLaunchWarrantyDays, locale),
    // The delivery window the process pages divide into phases.
    deliveryWeeksMin: formatNumber(deliveryWindowFrom(pricing).min, locale),
    deliveryWeeksMax: formatNumber(deliveryWindowFrom(pricing).max, locale),
    deliveryCeilingWeeks: formatNumber(MAX_DELIVERY_WEEKS, locale),
    // The payment schedule. Prose that names a milestone quotes these, so the
    // FAQ, the terms page and a contract cannot split the same price
    // three different ways.
    paymentStart: formatPercentLabel(
      COMMERCIAL_TERMS.paymentSplit[0] / 100,
      locale,
    ),
    paymentMilestone: formatPercentLabel(
      COMMERCIAL_TERMS.paymentSplit[1] / 100,
      locale,
    ),
    paymentFinal: formatPercentLabel(
      COMMERCIAL_TERMS.paymentSplit[2] / 100,
      locale,
    ),
    milestoneTrigger: pricingCopy(locale).terms.milestoneTrigger,
    proposalValidityDays: formatNumber(
      COMMERCIAL_TERMS.proposalValidityDays,
      locale,
    ),
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
