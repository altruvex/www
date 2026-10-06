import { describe, expect, test } from "bun:test";
import {
  COMMERCIAL_TERMS,
  MAINTENANCE_PAID_MONTHS,
  MAINTENANCE_PLANS,
  ORDERED_MAINTENANCE_PLANS,
  USD_EXCHANGE_RATE,
  currentBillingCycle,
  daysUntilCycleEnd,
  maintenanceFreeMonths,
  maintenanceIntervalPrice,
  publicMaintenancePlans,
  resolvePricing,
} from "../src/index";

const U = (s: string) => new Date(`${s}T00:00:00.000Z`);
const iso = (d: Date) => d.toISOString().slice(0, 10);

describe("currentBillingCycle", () => {
  const cases: [string, string, string, string, string][] = [
    ["mid-cycle", "2026-01-15", "2026-01-20", "2026-01-15", "2026-02-15"],
    ["rollover day", "2026-01-15", "2026-02-15", "2026-02-15", "2026-03-15"],
    ["31st into February", "2026-01-31", "2026-02-10", "2026-01-31", "2026-02-28"],
    ["clamped February cycle", "2026-01-31", "2026-03-01", "2026-02-28", "2026-03-31"],
    ["31st into a leap February", "2028-01-31", "2028-02-10", "2028-01-31", "2028-02-29"],
    ["across new year", "2025-12-20", "2026-01-05", "2025-12-20", "2026-01-20"],
    ["before the start date", "2026-03-10", "2026-03-01", "2026-03-10", "2026-04-10"],
  ];

  for (const [label, started, now, start, end] of cases) {
    test(label, () => {
      const c = currentBillingCycle(U(started), U(now));
      expect([iso(c.start), iso(c.end)]).toEqual([start, end]);
    });
  }

  test("24 consecutive cycles are contiguous and never predate the subscription", () => {
    const started = U("2026-01-31");
    let now = started;
    let previousEnd: Date | null = null;
    for (let i = 0; i < 24; i++) {
      const c = currentBillingCycle(started, now);
      expect(c.start.getTime()).toBeGreaterThanOrEqual(started.getTime());
      if (previousEnd) expect(iso(c.start)).toBe(iso(previousEnd));
      expect(c.end.getTime()).toBeGreaterThan(c.start.getTime());
      previousEnd = c.end;
      now = c.end;
    }
  });

  test("daysUntilCycleEnd counts whole days and never goes negative", () => {
    const c = currentBillingCycle(U("2026-01-15"), U("2026-02-10"));
    expect(daysUntilCycleEnd(c, U("2026-02-10"))).toBe(5);
    expect(daysUntilCycleEnd(c, U("2026-03-01"))).toBe(0);
  });
});

describe("maintenance billing", () => {
  test("annual billing charges fewer months than it covers; monthly charges one", () => {
    expect(MAINTENANCE_PAID_MONTHS.monthly).toBe(1);
    expect(maintenanceFreeMonths("monthly")).toBe(0);
    expect(maintenanceFreeMonths("quarterly")).toBe(0);
    expect(maintenanceFreeMonths("annual")).toBe(12 - MAINTENANCE_PAID_MONTHS.annual);
    expect(maintenanceFreeMonths("annual")).toBeGreaterThan(0);
  });

  test("interval price is derived from the monthly price; a custom plan stays unpriced", () => {
    for (const plan of Object.values(MAINTENANCE_PLANS)) {
      const annual = maintenanceIntervalPrice(plan, "annual");
      if (plan.price === null) expect(annual).toBeNull();
      else expect(annual).toBe(plan.price * MAINTENANCE_PAID_MONTHS.annual);
    }
  });

  test("plans are ordered and only active ones are public", () => {
    const orders = ORDERED_MAINTENANCE_PLANS.map((p) => p.order);
    expect(orders).toEqual([...orders].sort((a, b) => a - b));
    expect(publicMaintenancePlans().every((p) => p.status === "active")).toBe(true);
  });
});

describe("resolvePricing", () => {
  test("no overrides returns the shipped schema and says so", () => {
    const p = resolvePricing();
    expect(p.overridden).toBe(false);
    expect(p.terms).toBe(COMMERCIAL_TERMS);
    expect(p.exchangeRate).toBe(USD_EXCHANGE_RATE);
  });

  test("a maintenance override keeps the internal hour field when the row omits it", () => {
    const base = MAINTENANCE_PLANS.essential;
    const p = resolvePricing({
      maintenance: [
        {
          id: "essential",
          price: 1,
          requestsPerCycle: 9,
          overageHourlyRate: 2,
          status: "retired",
          version: 1,
        },
      ],
    });
    expect(p.overridden).toBe(true);
    expect(p.maintenance.essential.price).toBe(1);
    expect(p.maintenance.essential.status).toBe("retired");
    expect(p.maintenance.essential.version).toBe(base.version);
    expect(p.maintenance.essential).toMatchObject({
      requestsPerCycle: 9,
      overageHourlyRate: 2,
    });
    expect(Object.keys(p.maintenance.essential)).toEqual(Object.keys(base));
  });

  test("a terms override also moves the exchange rate and trims the review date", () => {
    const p = resolvePricing({
      terms: {
        vatRate: 0.2,
        revisionHourlyRate: 1,
        revisionHourlyRateUsd: 1,
        includedRevisionRounds: 1,
        paymentSplit: [40, 40, 20],
        proposalValidityDays: 10,
        postLaunchWarrantyDays: 60,
        usdEgpRate: 60,
        usdRateReviewedOn: "2026-10-01T12:00:00.000Z",
        version: 1,
      },
    });
    expect(p.terms.vatRate).toBe(0.2);
    expect(p.terms.paymentSplit).toEqual([40, 40, 20]);
    expect(p.exchangeRate.egpPerUsd).toBe(60);
    expect(p.exchangeRate.reviewedOn).toBe("2026-10-01");
    expect(p.terms.version).toBe(COMMERCIAL_TERMS.version);
  });

  test("consulting and add-on overrides replace only their own fields", () => {
    const p = resolvePricing({
      consulting: [
        { id: "technical-audit", price: 7, durationBusinessDays: 3, status: "active", version: 50 },
      ],
      addons: [
        {
          id: "domain",
          costBasis: 100,
          markupType: "fixed",
          markupValue: 5,
          billingCycle: "annual",
          status: "active",
          version: 1,
        },
      ],
    });
    expect(p.consulting["technical-audit"].price).toBe(7);
    expect(p.consulting["technical-audit"].version).toBe(50);
    expect(p.addons.domain.costBasis).toBe(100);
    expect(p.addons.hosting.costBasis).toBeNull();
  });

  test("the payment split always sums to 100", () => {
    expect(COMMERCIAL_TERMS.paymentSplit.reduce((a, b) => a + b, 0)).toBe(100);
  });
});
