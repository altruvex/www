import type { Locale } from "../types";
import { AR_COPY } from "./ar";
import { EN_COPY } from "./en";
import type { PricingCopy } from "./types";

export * from "./types";

const CATALOGUE: Readonly<Record<Locale, PricingCopy>> = {
  en: EN_COPY,
  ar: AR_COPY,
};

/** Unknown locales fall back to EN rather than throwing mid-render. */
export function pricingCopy(locale: string): PricingCopy {
  return locale === "ar" ? CATALOGUE.ar : CATALOGUE.en;
}
