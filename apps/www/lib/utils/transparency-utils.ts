import {
  DEFAULT_PRICING,
  fillTemplate,
  formatNumber,
  pricingCopy,
  type Locale,
  type ResolvedPricing,
} from "@repo/pricing-schema";
import { normalizeNumeralsToEnglish } from "./number";
import { toLocale } from "@/i18n/locale-meta";

export function fillScopeTokens(
  text: string,
  locale: string,
  pricing: ResolvedPricing = DEFAULT_PRICING,
): string {
  const l: Locale = toLocale(locale);
  const bands = pricingCopy(l).bands;
  return fillTemplate(text, {
    warrantyDays: formatNumber(pricing.terms.postLaunchWarrantyDays, l),
    bandBasic: bands.basic,
    bandStandard: bands.standard,
  });
}

export type DeliverableBand = "small" | "medium" | "large";
export type DeliverableProject =
  | "ecommerce"
  | "corporate"
  | "custom"
  | "performance";

type TransparencyTranslationValues = Record<string, string | number>;

export type TransparencyTranslator = {
  (key: string, values?: TransparencyTranslationValues): string;
  raw?: (key: string) => unknown;
};

export function mapProjectType(raw: string | null): DeliverableProject {
  const map: Record<string, DeliverableProject> = {
    website: "corporate",
    webapp: "custom",
    ecommerce: "ecommerce",
    pwa: "custom",
    performance: "performance",
    corporate: "corporate",
    custom: "custom",
  };
  return map[raw ?? ""] ?? "corporate";
}

const PHONE_CHARACTERS = /^[\d\s+()-]+$/;
const PHONE_PATTERN = /^(\+|00)?[1-9]\d{6,14}$|^01[0125]\d{8}$/;

export function normalizePhone(raw: string): string {
  return normalizeNumeralsToEnglish(raw).trim().replace(/[\s()-]/g, "");
}

export function isValidPhone(raw: string): boolean {
  const ascii = normalizeNumeralsToEnglish(raw).trim();
  if (!ascii || !PHONE_CHARACTERS.test(ascii)) return false;
  return PHONE_PATTERN.test(normalizePhone(ascii));
}
