"use client";

import { localizeNumbers } from "@/lib/utils/number";
import { useLocale, useTranslations } from "next-intl";

type Unit = "score" | "seconds" | "percent" | "ratio" | "plain";

type ScaleCheck = {
  id: string;
  kind: "scale";
  min: number;
  max: number;
  threshold: number;
  pass: "atLeast" | "over" | "under";
  unit: Unit;
};

export type Check =
  | ScaleCheck
  | { id: string; kind: "zero" }
  | { id: string; kind: "grade"; grades: readonly string[]; passFrom: string }
  | { id: string; kind: "rule" };

type Standard = { id: string; lead: string; checks: readonly Check[] };

export const STANDARDS: readonly Standard[] = [
  {
    id: "code",
    lead: "lint",
    checks: [
      { id: "lint", kind: "zero" },
      { id: "coverage", kind: "scale", min: 0, max: 100, threshold: 80, pass: "over", unit: "percent" },
      { id: "apiDocs", kind: "rule" },
    ],
  },
  {
    id: "performance",
    lead: "lcp",
    checks: [
      { id: "lighthouse", kind: "scale", min: 0, max: 100, threshold: 95, pass: "atLeast", unit: "score" },
      { id: "lcp", kind: "scale", min: 0, max: 4, threshold: 2.5, pass: "under", unit: "seconds" },
      { id: "cls", kind: "scale", min: 0, max: 0.25, threshold: 0.1, pass: "under", unit: "plain" },
    ],
  },
  {
    id: "accessibility",
    lead: "contrast",
    checks: [
      { id: "lighthouse", kind: "scale", min: 0, max: 100, threshold: 95, pass: "atLeast", unit: "score" },
      { id: "aria", kind: "zero" },
      { id: "contrast", kind: "scale", min: 1, max: 21, threshold: 4.5, pass: "atLeast", unit: "ratio" },
    ],
  },
  {
    id: "security",
    lead: "headers",
    checks: [
      { id: "headers", kind: "grade", grades: ["F", "E", "D", "C", "B", "A", "A+"], passFrom: "A" },
      { id: "cves", kind: "zero" },
      { id: "patches", kind: "rule" },
    ],
  },
];

export const CHECK_COUNT = STANDARDS.reduce((sum, s) => sum + s.checks.length, 0);

function useUnitFormat() {
  const t = useTranslations("standards.sheet.unit");
  const locale = useLocale();

  return (value: number, unit: Unit) => {
    const text =
      unit === "seconds" || unit === "percent" || unit === "ratio"
        ? t(unit, { value: String(value) })
        : String(value);
    return localizeNumbers(text, locale);
  };
}

export function useThresholdText(check: Check): string {
  const format = useUnitFormat();

  switch (check.kind) {
    case "scale":
      return format(check.threshold, check.unit);
    case "zero":
      return "0";
    case "grade":
      return check.passFrom;
    case "rule":
      return "";
  }
}

export function useCheckText(standard: string, check: Check): { label: string; passText: string } {
  const t = useTranslations("standards.sheet.pass");
  const tCheck = useTranslations(`standards.categories.${standard}.checks.${check.id}`);
  const format = useUnitFormat();

  const passText = (() => {
    switch (check.kind) {
      case "scale":
        return t(check.pass, { value: format(check.threshold, check.unit) });
      case "zero":
        return t("zero");
      case "grade":
        return t("grade", { value: check.passFrom });
      case "rule":
        return tCheck("value");
    }
  })();

  return { label: tCheck("label"), passText };
}
