import { describe, expect, test } from "bun:test";
import {
  ADDONS,
  BRAND_IDENTITY_IDS,
  COMMERCIAL_TERMS,
  COMPLEXITY_IDS,
  CONSULTING_PACKAGES,
  CONTENT_READINESS_IDS,
  DEFAULT_PRICING,
  ESTIMATE_ROUNDING,
  MAX_DELIVERY_WEEKS,
  SERVICES,
  SERVICE_IDS,
  TIMELINE_IDS,
  USD_EXCHANGE_RATE,
  WORKED_EXAMPLE_INPUT,
  applyVat,
  calculateEstimate,
  computeAddonPrice,
  consultingCreditAmount,
  consultingCreditIn,
  egpToUsd,
  estimateSpan,
  minimumEngagement,
  minimumEngagementFrom,
  resolvePricing,
  type Addon,
  type EstimateInput,
} from "../src/index";

function everyInput(): EstimateInput[] {
  const out: EstimateInput[] = [];
  for (const serviceId of SERVICE_IDS)
    for (const complexityId of COMPLEXITY_IDS)
      for (const timeline of TIMELINE_IDS)
        for (const brandIdentity of BRAND_IDENTITY_IDS)
          for (const contentReadiness of CONTENT_READINESS_IDS)
            out.push({ serviceId, complexityId, timeline, brandIdentity, contentReadiness });
  return out;
}

describe("calculateEstimate", () => {
  const floor = minimumEngagement();

  test("every combination yields an ordered, rounded range at or above the floor", () => {
    for (const input of everyInput()) {
      const r = calculateEstimate(input);
      expect(r.minPrice).toBeLessThanOrEqual(r.maxPrice);
      expect(r.minPrice).toBeGreaterThanOrEqual(floor);
      expect(r.minPrice % ESTIMATE_ROUNDING === 0 || r.minPrice === floor).toBe(true);
      expect(r.maxPrice % ESTIMATE_ROUNDING === 0 || r.maxPrice === floor).toBe(true);
      expect(r.minWeeks).toBeGreaterThanOrEqual(1);
      expect(r.maxWeeks).toBeLessThanOrEqual(MAX_DELIVERY_WEEKS);
      expect(r.minWeeks).toBeLessThanOrEqual(r.maxWeeks);
    }
  });

  test("neutral answers reproduce the schema cell (rounded)", () => {
    for (const serviceId of SERVICE_IDS)
      for (const complexityId of COMPLEXITY_IDS) {
        const r = calculateEstimate({
          serviceId,
          complexityId,
          timeline: "standard",
          brandIdentity: "complete",
          contentReadiness: "provide",
        });
        const cell = SERVICES[serviceId].price[complexityId];
        const round = (v: number) => Math.round(v / ESTIMATE_ROUNDING) * ESTIMATE_ROUNDING;
        expect(r.minPrice).toBe(Math.max(round(cell.min), floor));
        expect(r.maxPrice).toBe(Math.max(round(cell.max), floor));
        expect(r.minWeeks).toBe(SERVICES[serviceId].weeks[complexityId].min);
        expect(r.maxWeeks).toBe(SERVICES[serviceId].weeks[complexityId].max);
      }
  });

  test("a missing brand / content answer is treated as neutral, not as a surcharge", () => {
    const base = { serviceId: "website", complexityId: "standard", timeline: "standard" } as const;
    expect(calculateEstimate({ ...base, brandIdentity: null, contentReadiness: null })).toEqual(
      calculateEstimate({ ...base, brandIdentity: "complete", contentReadiness: "provide" }),
    );
  });

  test("urgent costs at least as much and takes no longer than standard", () => {
    for (const serviceId of SERVICE_IDS)
      for (const complexityId of COMPLEXITY_IDS) {
        const urgent = calculateEstimate({ serviceId, complexityId, timeline: "urgent" });
        const standard = calculateEstimate({ serviceId, complexityId, timeline: "standard" });
        expect(urgent.maxPrice).toBeGreaterThanOrEqual(standard.maxPrice);
        expect(urgent.maxWeeks).toBeLessThanOrEqual(standard.maxWeeks);
      }
  });

  test("an admin cell override moves the estimate (override ?? default)", () => {
    const cell = SERVICES.website.price.basic;
    const pricing = resolvePricing({
      cells: [
        {
          serviceId: "website",
          complexityId: "premium",
          priceMin: cell.min * 10,
          priceMax: cell.max * 10,
          weeksMin: 1,
          weeksMax: 2,
          version: 99,
        },
      ],
    });
    const r = calculateEstimate(
      { serviceId: "website", complexityId: "premium", timeline: "standard" },
      pricing,
    );
    expect(r.maxPrice).toBe(Math.round((cell.max * 10) / ESTIMATE_ROUNDING) * ESTIMATE_ROUNDING);
    expect(r.maxWeeks).toBe(2);
  });

  test("the worked example input is a valid, fully specified estimate", () => {
    const r = calculateEstimate(WORKED_EXAMPLE_INPUT);
    expect(r.minPrice).toBeGreaterThan(0);
    expect(r.maxPrice).toBeGreaterThan(r.minPrice);
  });
});

describe("estimateSpan", () => {
  test("the opening span covers every single estimate", () => {
    const span = estimateSpan();
    for (const input of everyInput()) {
      const r = calculateEstimate(input);
      expect(r.minPrice).toBeGreaterThanOrEqual(span.minPrice);
      expect(r.maxPrice).toBeLessThanOrEqual(span.maxPrice);
      expect(r.minWeeks).toBeGreaterThanOrEqual(span.minWeeks);
      expect(r.maxWeeks).toBeLessThanOrEqual(span.maxWeeks);
    }
  });

  test("a fully answered span collapses to that one estimate", () => {
    const span = estimateSpan(WORKED_EXAMPLE_INPUT);
    expect(span).toEqual(calculateEstimate(WORKED_EXAMPLE_INPUT));
  });

  test("answering a question only ever narrows the span", () => {
    const open = estimateSpan();
    for (const serviceId of SERVICE_IDS) {
      const narrowed = estimateSpan({ serviceId });
      expect(narrowed.minPrice).toBeGreaterThanOrEqual(open.minPrice);
      expect(narrowed.maxPrice).toBeLessThanOrEqual(open.maxPrice);
      for (const complexityId of COMPLEXITY_IDS) {
        const deeper = estimateSpan({ serviceId, complexityId });
        expect(deeper.minPrice).toBeGreaterThanOrEqual(narrowed.minPrice);
        expect(deeper.maxPrice).toBeLessThanOrEqual(narrowed.maxPrice);
      }
    }
  });

  test("the floor equals the lowest basic cell", () => {
    expect(minimumEngagementFrom(DEFAULT_PRICING)).toBe(minimumEngagement());
    expect(estimateSpan().minPrice).toBeGreaterThanOrEqual(minimumEngagement());
  });
});

describe("computeAddonPrice", () => {
  test("an add-on with no known cost basis is never priced (null, never zero)", () => {
    for (const addon of Object.values(ADDONS)) {
      if (addon.costBasis === null) expect(computeAddonPrice(addon)).toBeNull();
    }
    expect(computeAddonPrice({ ...ADDONS.domain, costBasis: null })).toBeNull();
  });

  test("percent markup is rounded and added to the cost basis", () => {
    const addon: Addon = { ...ADDONS.domain, costBasis: 999, markupType: "percent", markupValue: 20 };
    const price = computeAddonPrice(addon);
    expect(price).not.toBeNull();
    expect(price!.markup).toBe(Math.round((999 * 20) / 100));
    expect(price!.total).toBe(999 + price!.markup);
    expect(price!.addonId).toBe("domain");
  });

  test("fixed markup is added as-is", () => {
    const addon: Addon = { ...ADDONS.hosting, costBasis: 100, markupType: "fixed", markupValue: 7 };
    expect(computeAddonPrice(addon)).toEqual({ addonId: "hosting", costBasis: 100, markup: 7, total: 107 });
  });
});

describe("money helpers", () => {
  test("applyVat uses the schema VAT rate and keeps net + vat = gross", () => {
    const v = applyVat(1234);
    expect(v.rate).toBe(COMMERCIAL_TERMS.vatRate);
    expect(v.vat).toBe(Math.round(1234 * COMMERCIAL_TERMS.vatRate));
    expect(v.gross).toBe(v.net + v.vat);
  });

  test("egpToUsd converts at the schema rate and rounds to tens", () => {
    const egp = USD_EXCHANGE_RATE.egpPerUsd * 1234;
    expect(egpToUsd(egp)).toBe(1230);
    expect(egpToUsd(egp) % 10).toBe(0);
  });

  test("the audit fee credit resolves from the schema in both currencies", () => {
    const pkg = CONSULTING_PACKAGES["technical-audit"];
    expect(consultingCreditIn("EGP")).toBe(consultingCreditAmount(pkg));
    expect(consultingCreditIn("USD")).toBe(egpToUsd(consultingCreditAmount(pkg)));
    expect(consultingCreditIn("EGP", { ...pkg, creditedToBuildRate: 0 })).toBeNull();
  });
});
