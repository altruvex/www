"use client";

import { usePricingTokens } from "@/components/providers/pricing-tokens-provider";
import { localizeNumbers, normalizeNumeralsToEnglish } from "@/lib/utils/number";
import { processPhases, type PhaseLength } from "@/lib/process-phases";
import { deliveryWindowFrom } from "@repo/pricing-schema";
import { useLocale, useTranslations } from "next-intl";
import { useMemo } from "react";

/**
 * The phases for the window this request resolved. The window arrives as the
 * `deliveryWeeks*` pricing tokens (so an admin edit to a cell reaches these
 * pages like it reaches the price cards); outside the provider it falls back to
 * the shipped matrix.
 */
export function useProcessPhases(): readonly PhaseLength[] {
  const tokens = usePricingTokens();

  return useMemo(() => {
    const fallback = deliveryWindowFrom();
    const read = (token: string | undefined, otherwise: number) => {
      const value = Number(normalizeNumeralsToEnglish(token ?? ""));
      return Number.isFinite(value) && value > 0 ? value : otherwise;
    };
    return processPhases({
      min: read(tokens.deliveryWeeksMin, fallback.min),
      max: read(tokens.deliveryWeeksMax, fallback.max),
    });
  }, [tokens.deliveryWeeksMin, tokens.deliveryWeeksMax]);
}

/** The length a visitor reads for one phase: "1 session", "3 days", "2 – 5 days". */
export function usePhaseLength(): (phase: PhaseLength) => string {
  const t = useTranslations("process");
  const locale = useLocale();

  return (phase) => {
    if (phase.unit === "session") return t("length.session");
    const text =
      phase.min === phase.max
        ? t("length.days", { n: String(phase.max), count: phase.max })
        : t("range.days", {
            min: String(phase.min),
            max: String(phase.max),
            count: phase.max,
          });
    return localizeNumbers(text, locale);
  };
}
