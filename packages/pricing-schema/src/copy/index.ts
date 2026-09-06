import type { Locale } from "../types.js";
import { AR_COPY } from "./ar.js";
import { EN_COPY } from "./en.js";
import type { PricingCopy } from "./types.js";

export * from "./types.js";

const CATALOGUE: Readonly<Record<Locale, PricingCopy>> = {
  en: EN_COPY,
  ar: AR_COPY,
};

/** Unknown locales fall back to EN rather than throwing mid-render. */
export function pricingCopy(locale: string): PricingCopy {
  return locale === "ar" ? CATALOGUE.ar : CATALOGUE.en;
}
