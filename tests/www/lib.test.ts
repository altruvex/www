import { describe, expect, test } from "bun:test";
import {
  DEFAULT_PRICING,
  SERVICES,
  estimateSpan,
  formatNumber,
  formatRange,
  type WeekRange,
} from "@repo/pricing-schema";
import {
  formatIndex,
  localizeNumbers,
  normalizeNumeralsToEnglish,
} from "../../apps/www/lib/utils/number";
import {
  fillScopeTokens,
  isValidPhone,
  mapProjectType,
  normalizePhone,
} from "../../apps/www/lib/utils/transparency-utils";
import {
  BUILD_PHASE,
  PHASE_KEYS,
  phaseName,
  processPhases,
} from "../../apps/www/lib/process-phases";
import {
  resolveEstimatorPricing,
  spanFor,
} from "../../apps/www/components/sections/transparency-estimator/span";

describe("Latin digits on the Arabic site", () => {
  test("localizeNumbers folds Arabic-Indic digits and separators to Latin", () => {
    expect(localizeNumbers("١٢٣٤٥٦٧٨٩٠", "ar")).toBe("1234567890");
    expect(localizeNumbers("٣٫٥", "ar")).toBe("3.5");
    expect(localizeNumbers("١٬٢٠٠", "ar")).toBe("1,200");
    expect(localizeNumbers("٥٠ ٪", "ar")).toBe("50 %");
    expect(localizeNumbers("", "ar")).toBe("");
  });

  test("normalizeNumeralsToEnglish also folds Persian digits", () => {
    expect(normalizeNumeralsToEnglish("۰۱۲۳۴۵۶۷۸۹")).toBe("0123456789");
    expect(normalizeNumeralsToEnglish("٠١٠٠٠٠٠٠٠٠٠")).toBe("01000000000");
  });

  test("formatIndex pads and stays Latin in both locales", () => {
    expect(formatIndex(3, 2, "ar")).toBe("03");
    expect(formatIndex("12", 3, "en")).toBe("012");
  });

  test("schema number formatting renders Latin digits for Arabic", () => {
    expect(formatNumber(1234567, "ar")).toMatch(/^[0-9٬,.\s]+$/);
    expect(formatRange(SERVICES.website.price.basic, "ar")).not.toMatch(/[٠-٩]/);
  });
});

describe("phone validation", () => {
  test("accepts Egyptian mobiles and international numbers, in any digit script", () => {
    expect(isValidPhone("01012345678")).toBe(true);
    expect(isValidPhone("٠١٠١٢٣٤٥٦٧٨")).toBe(true);
    expect(isValidPhone("+44 20 7946 0958")).toBe(true);
    expect(normalizePhone("(010) 1234-5678")).toBe("01012345678");
  });

  test("rejects letters, empty input and too-short numbers", () => {
    expect(isValidPhone("")).toBe(false);
    expect(isValidPhone("call me")).toBe(false);
    expect(isValidPhone("12345")).toBe(false);
  });

  test("fillScopeTokens fills warranty days and band names from the schema", () => {
    const days = formatNumber(DEFAULT_PRICING.terms.postLaunchWarrantyDays, "en");
    expect(fillScopeTokens("{warrantyDays} days", "en")).toBe(`${days} days`);
    expect(fillScopeTokens("{bandBasic}", "ar-EG")).not.toContain("{");
    expect(fillScopeTokens("{unknown}", "en")).toBe("{unknown}");
  });

  test("mapProjectType falls back to corporate", () => {
    expect(mapProjectType("ecommerce")).toBe("ecommerce");
    expect(mapProjectType("pwa")).toBe("custom");
    expect(mapProjectType(null)).toBe("corporate");
    expect(mapProjectType("unknown")).toBe("corporate");
  });
});

describe("process phases", () => {
  const windows: WeekRange[] = [
    { min: 1, max: 1 },
    { min: 2, max: 3 },
    { min: 7, max: 8 },
  ];

  test("five phases in order, build phase fills the window", () => {
    for (const w of windows) {
      const phases = processPhases(w);
      expect(phases.map((p) => p.key)).toEqual([...PHASE_KEYS]);
      const build = phases.find((p) => p.key === BUILD_PHASE)!;
      expect(build.min).toBeGreaterThanOrEqual(1);
      expect(build.max).toBeGreaterThanOrEqual(build.min);
    }
  });

  test("phaseName strips a leading number in either digit script", () => {
    expect(phaseName("01 - Discovery")).toBe("Discovery");
    expect(phaseName("٠٢ - تصميم")).toBe("تصميم");
    expect(phaseName("Launch")).toBe("Launch");
  });
});

describe("transparency estimator span", () => {
  test("the opening span is the schema's own open span, never a literal", () => {
    expect(spanFor({})).toEqual(estimateSpan());
    expect(spanFor({}, DEFAULT_PRICING)).toEqual(estimateSpan({}, DEFAULT_PRICING));
  });

  test("answers narrow the span exactly as the schema does", () => {
    const answers = { projectType: "webapp", complexity: "premium", timeline: "urgent" };
    expect(spanFor(answers)).toEqual(
      estimateSpan({ serviceId: "webapp", complexityId: "premium", timeline: "urgent" }),
    );
  });

  test("a pricing slice from the server replaces services and terms only", () => {
    expect(resolveEstimatorPricing(undefined)).toBe(DEFAULT_PRICING);
    const resolved = resolveEstimatorPricing({
      services: DEFAULT_PRICING.services,
      terms: { ...DEFAULT_PRICING.terms, vatRate: 0.5 },
    });
    expect(resolved.terms.vatRate).toBe(0.5);
    expect(resolved.maintenance).toBe(DEFAULT_PRICING.maintenance);
  });
});
