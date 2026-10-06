import { describe, expect, test } from "bun:test";
import {
  CONSULTING_PACKAGE_IDS,
  DEFAULT_PRICING,
  MAINTENANCE_PLANS,
  MAX_DELIVERY_WEEKS,
  allAddonViews,
  consultingView,
  deliveryWindowFrom,
  estimateSpanLabels,
  factorViews,
  fillPricingTokens,
  fillTemplate,
  formatFrom,
  formatMoney,
  formatNumber,
  formatPercent,
  formatPercentLabel,
  formatRange,
  formatSignedPercent,
  formatWeeks,
  investmentMatrixView,
  isComplexityId,
  isServiceId,
  maintenanceViews,
  paymentScheduleView,
  pricingCopy,
  pricingDriverViews,
  pricingTokens,
  publicAddonViews,
  publishedBuildRangeLabel,
  resolvePricing,
  scopeNoteViews,
  serviceInvestmentViews,
  termsView,
  workedExampleView,
  type Locale,
} from "../src/index";

const LOCALES: Locale[] = ["en", "ar"];

// Collects every string reachable from a view so a missing copy key or an
// unfilled {token} in either locale fails here instead of on the live page.
function strings(node: unknown, out: string[] = []): string[] {
  if (typeof node === "string") out.push(node);
  else if (Array.isArray(node)) node.forEach((v) => strings(v, out));
  else if (node && typeof node === "object") Object.values(node).forEach((v) => strings(v, out));
  return out;
}

function allViews(locale: Locale, pricing = DEFAULT_PRICING) {
  return {
    matrix: investmentMatrixView(locale, pricing),
    services: serviceInvestmentViews(locale, pricing),
    worked: workedExampleView(locale, pricing),
    factors: factorViews(locale),
    drivers: pricingDriverViews(locale),
    scope: scopeNoteViews(locale),
    span: estimateSpanLabels(locale, pricing),
    range: publishedBuildRangeLabel(locale, pricing),
    maintenance: maintenanceViews(locale, pricing),
    consulting: CONSULTING_PACKAGE_IDS.map((id) => consultingView(id, locale, pricing)),
    publicAddons: publicAddonViews(locale, pricing),
    addons: allAddonViews(locale, pricing),
    terms: termsView(locale, pricing),
    payment: paymentScheduleView(locale, pricing),
    tokens: pricingTokens(locale, pricing),
  };
}

describe("published pricing views", () => {
  for (const locale of LOCALES) {
    test(`${locale}: every view renders with no unfilled {token} and no Arabic-Indic digits`, () => {
      const texts = strings(allViews(locale));
      expect(texts.length).toBeGreaterThan(50);
      expect(texts.filter((t) => /\{\w+\}/.test(t))).toEqual([]);
      expect(texts.filter((t) => /[٠-٩]/.test(t))).toEqual([]);
    });

    test(`${locale}: views still render when admin overrides are present`, () => {
      const pricing = resolvePricing({
        maintenance: [
          { id: "essential", price: null, requestsPerCycle: null, overageHourlyRate: null, status: "active", version: 9 },
        ],
        addons: [
          { id: "domain", costBasis: 100, markupType: "percent", markupValue: 20, billingCycle: "annual", status: "active", version: 9 },
        ],
      });
      const texts = strings(allViews(locale, pricing));
      expect(texts.filter((t) => /\{\w+\}/.test(t))).toEqual([]);
    });
  }

  test("EN and AR views have the same shape", () => {
    const shape = (node: unknown): unknown =>
      Array.isArray(node)
        ? node.map(shape)
        : node && typeof node === "object"
          ? Object.fromEntries(Object.entries(node).map(([k, v]) => [k, shape(v)]))
          : typeof node;
    expect(shape(allViews("ar"))).toEqual(shape(allViews("en")));
  });

  test("fillPricingTokens fills known tokens and leaves unknown ones visible", () => {
    const out = fillPricingTokens("{vatRate}% / {notAToken}", "en");
    expect(out).toBe(`${formatPercent(DEFAULT_PRICING.terms.vatRate, "en")}% / {notAToken}`);
  });

  test("the delivery window never exceeds the published ceiling", () => {
    const w = deliveryWindowFrom();
    expect(w.min).toBeGreaterThanOrEqual(1);
    expect(w.max).toBeLessThanOrEqual(MAX_DELIVERY_WEEKS);
  });

  test("unknown locales fall back to English copy", () => {
    expect(pricingCopy("fr")).toBe(pricingCopy("en"));
    expect(pricingCopy("ar")).not.toBe(pricingCopy("en"));
  });

  test("id guards", () => {
    expect(isServiceId("website")).toBe(true);
    expect(isServiceId("nope")).toBe(false);
    expect(isComplexityId("premium")).toBe(true);
    expect(isComplexityId("huge")).toBe(false);
  });
});

describe("format", () => {
  const price = MAINTENANCE_PLANS.essential.price!;

  test("money and ranges carry the locale's currency word and Latin digits", () => {
    expect(formatMoney(price, "en")).toBe(`${formatNumber(price, "en")} EGP`);
    expect(formatMoney(price, "en", "USD")).toEndWith(" USD");
    expect(formatMoney(price, "ar")).toEndWith(" جنيه");
    expect(formatRange({ min: 1, max: 2 }, "en")).toBe("1 – 2 EGP");
    expect(formatFrom(price, "en")).toStartWith("From ");
    expect(formatFrom(price, "ar")).toStartWith("تبدأ من ");
    expect(formatNumber(1234567, "ar")).not.toMatch(/[٠-٩]/);
  });

  test("weeks and percents", () => {
    expect(formatWeeks(2, 5, "en")).toBe("2–5");
    expect(formatPercent(0.14, "en")).toBe("14");
    expect(formatPercentLabel(0.5, "en")).toBe("50%");
    expect(formatSignedPercent(-0.05, "en")).toBe("−5%");
    expect(formatSignedPercent(0.05, "en")).toBe("+5%");
    expect(formatSignedPercent(0, "en")).toBe("0%");
    expect(formatSignedPercent(0.05, "ar")).not.toMatch(/[٠-٩]/);
  });

  test("fillTemplate", () => {
    expect(fillTemplate("{a} and {b}", { a: 1 })).toBe("1 and {b}");
  });
});
