import { minimumEngagementFrom } from "./compute";
import { pricingCopy } from "./copy/index";
import { formatFrom, formatRange } from "./format";
import {
  BUDGET_ANSWER_IDS,
  BUDGET_BAND_IDS,
  type BudgetAnswerId,
  type BudgetBandId,
} from "./ids";
import { DEFAULT_PRICING, type ResolvedPricing } from "./overrides";
import type { Amount, Locale } from "./types";

/**
 * Each band as a multiple of the minimum engagement: [from, to). `to: null`
 * is open-ended. The first band starts at the floor, so no band offered to a
 * lead is below the published minimum.
 */
const BUDGET_BAND_MULTIPLES: Readonly<
  Record<BudgetBandId, { readonly from: number; readonly to: number | null }>
> = {
  "floor-2x": { from: 1, to: 2 },
  "2x-5x": { from: 2, to: 5 },
  "5x-10x": { from: 5, to: 10 },
  "over-10x": { from: 10, to: null },
};

export interface BudgetBand {
  readonly id: BudgetBandId;
  readonly min: Amount;
  /** Exclusive upper bound; null for the open-ended top band. */
  readonly max: Amount | null;
}

export function budgetBands(
  pricing: ResolvedPricing = DEFAULT_PRICING,
): readonly BudgetBand[] {
  const floor = minimumEngagementFrom(pricing);
  return BUDGET_BAND_IDS.map((id) => {
    const { from, to } = BUDGET_BAND_MULTIPLES[id];
    return { id, min: floor * from, max: to === null ? null : floor * to };
  });
}

/** The band an amount falls in; amounts below the floor return null. */
export function budgetBandFor(
  amount: Amount,
  pricing: ResolvedPricing = DEFAULT_PRICING,
): BudgetBandId | null {
  const band = budgetBands(pricing).find(
    (b) => amount >= b.min && (b.max === null || amount < b.max),
  );
  return band?.id ?? null;
}

/**
 * Database enum (`BudgetRange` in @repo/database) for each answer. Plain
 * strings so this package never imports Prisma. The legacy fixed-currency
 * values (UNDER_10K etc.) are deliberately absent: new code never writes them.
 */
export const BUDGET_ANSWER_TO_DB = {
  "floor-2x": "FLOOR_TO_2X",
  "2x-5x": "X2_TO_5X",
  "5x-10x": "X5_TO_10X",
  "over-10x": "OVER_10X",
  unsure: "UNSURE",
} as const satisfies Readonly<Record<BudgetAnswerId, string>>;
export type BudgetAnswerDbValue =
  (typeof BUDGET_ANSWER_TO_DB)[BudgetAnswerId];

export function budgetAnswerFromDb(value: string): BudgetAnswerId | null {
  return (
    BUDGET_ANSWER_IDS.find((id) => BUDGET_ANSWER_TO_DB[id] === value) ?? null
  );
}

export interface BudgetOptionView {
  readonly id: BudgetAnswerId;
  readonly dbValue: BudgetAnswerDbValue;
  readonly label: string;
}

/** Locale labels for every budget answer, bands first, "unsure" last. */
export function budgetOptionsView(
  locale: Locale,
  pricing: ResolvedPricing = DEFAULT_PRICING,
): readonly BudgetOptionView[] {
  const bands = budgetBands(pricing).map((band) => ({
    id: band.id,
    dbValue: BUDGET_ANSWER_TO_DB[band.id],
    label:
      band.max === null
        ? formatFrom(band.min, locale)
        : formatRange({ min: band.min, max: band.max }, locale),
  }));
  return [
    ...bands,
    {
      id: "unsure",
      dbValue: BUDGET_ANSWER_TO_DB.unsure,
      label: pricingCopy(locale).budget.unsure,
    },
  ];
}
