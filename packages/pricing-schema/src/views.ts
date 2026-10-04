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

export { DEFAULT_PRICING };

export interface InvestmentCellView {
  readonly serviceId: ServiceId;
  readonly complexityId: ComplexityId;
  readonly priceLabel: string;
  readonly weeksLabel: string;
}

export interface InvestmentMatrixRowView {
  readonly serviceId: ServiceId;
  readonly name: string;
  readonly description: string;
  readonly cells: readonly InvestmentCellView[];
}

export interface InvestmentMatrixView {
  readonly bands: readonly {
    readonly id: ComplexityId;
    readonly label: string;
  }[];
  readonly rows: readonly InvestmentMatrixRowView[];
  readonly cellCount: number;
}

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
  readonly figureLabel: string;
  readonly isScopedPerProject: boolean;
  readonly matrix: InvestmentMatrixView | null;
  readonly audit: ConsultingView | null;
  readonly plans: readonly MaintenanceView[] | null;
}

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
  readonly input: typeof WORKED_EXAMPLE_INPUT;
  readonly serviceLabel: string;
  readonly bandLabel: string;
  readonly brandLabel: string;
  readonly contentLabel: string;
  readonly timelineLabel: string;
  readonly floorLabel: string;
  readonly cellLabel: string;
  readonly estimateLabel: string;
  readonly weeksLabel: string;
  readonly validityDays: number;
  readonly validityDaysLabel: string;
}

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
  readonly factor: number;
  readonly deltaLabel: string;
  readonly isNeutral: boolean;
}

export interface FactorGroupView {
  readonly id: FactorGroupId;
  readonly label: string;
  readonly options: readonly FactorOptionView[];
  readonly spanLabel: string;
}

const SPAN_SEPARATOR = " … ";

function factorDeltaLabel(
  factor: number,
  locale: Locale,
  noChange: string,
): string {
  return factor === 1 ? noChange : formatSignedPercent(factor - 1, locale);
}

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
  readonly groups: readonly FactorGroupView[];
  readonly spanLabel: string | null;
}

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

export function scopeNoteViews(locale: Locale): readonly ScopeNoteView[] {
  const copy = pricingCopy(locale).scopeNotes;
  return SCOPE_NOTE_IDS.map((id) => ({
    id,
    name: copy[id].name,
    description: copy[id].description,
  }));
}

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

function lowestCell(pricing: ResolvedPricing): number {
  return minimumEngagementFrom(pricing);
}

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
  readonly priceLabel: string;
  readonly cycleLabel: string;
  readonly annual: {
    readonly priceLabel: string;
    readonly cycleLabel: string;
  } | null;
  readonly isCustomQuote: boolean;
  readonly features: readonly string[];
  readonly overageNote: string | null;
  readonly highlight: boolean;
  readonly requestsPerCycle: number | null;
  readonly priorityTurnaround: boolean;
  readonly compare: MaintenanceCompare;
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

export function publicAddonViews(
  locale: Locale,
  pricing: ResolvedPricing = DEFAULT_PRICING,
): readonly AddonView[] {
  return Object.values(pricing.addons)
    .filter((addon) => addon.status === "active")
    .map((addon) => toAddonView(addon, locale));
}

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
  readonly percent: number;
  readonly percentLabel: string;
  readonly label: string;
}

export interface PaymentScheduleView {
  readonly milestones: readonly [
    PaymentMilestoneView,
    PaymentMilestoneView,
    PaymentMilestoneView,
  ];
  readonly milestoneTrigger: string;
  readonly vatExcluded: string;
  readonly ownership: string;
  readonly validity: string;
  readonly validityDays: number;
  readonly validityDaysLabel: string;
}

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
    auditCredit: formatMoney(consultingCreditAmount(audit), locale),
    essentialRange: formatRange(pricing.services.website.price.basic, locale),
    maintenanceEssential:
      essential.price === null ? "" : formatMoney(essential.price, locale),
    maintenanceProfessional:
      professional.price === null
        ? ""
        : formatMoney(professional.price, locale),
    maintenanceEssentialAnnual: annualView(essential, locale)?.priceLabel ?? "",
    maintenanceProfessionalAnnual:
      annualView(professional, locale)?.priceLabel ?? "",
    minimumEngagement: formatMoney(lowestCell(pricing), locale),
    revisionRate: formatMoney(COMMERCIAL_TERMS.revisionHourlyRate, locale),
    vatRate: formatPercent(COMMERCIAL_TERMS.vatRate, locale),
    warrantyDays: formatNumber(COMMERCIAL_TERMS.postLaunchWarrantyDays, locale),
    deliveryWeeksMin: formatNumber(deliveryWindowFrom(pricing).min, locale),
    deliveryWeeksMax: formatNumber(deliveryWindowFrom(pricing).max, locale),
    deliveryCeilingWeeks: formatNumber(MAX_DELIVERY_WEEKS, locale),
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

export function fillPricingTokens(
  text: string,
  locale: Locale,
  pricing: ResolvedPricing = DEFAULT_PRICING,
): string {
  return fillTemplate(text, pricingTokens(locale, pricing));
}
