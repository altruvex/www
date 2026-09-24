import {
  COMMERCIAL_TERMS,
  fillTemplate,
  formatNumber,
  type Locale,
} from "@repo/pricing-schema";
import { normalizeNumeralsToEnglish } from "./number";

/**
 * The estimator's small, eagerly-needed helpers — used on every render, not
 * just once a visitor reaches the PDF. Everything only needed to *build* the
 * PDF (the bilingual narrative copy, the deliverables catalogue, the
 * HTML/canvas renderer) lives in `./transparency-pdf.ts` instead, which
 * `transparency-estimator.tsx` reaches only through a dynamic `import()`.
 * Keeping that split real is why nothing below imports from that file: doing
 * so would pull its ~600 lines back into whatever statically imports this
 * one.
 */

/**
 * Fills the `{token}`s a scope line may carry.
 *
 * The deliverable lists name the post-launch warranty window, which is a
 * published commercial term rather than a wording choice — the contract
 * grants the same number. The estimator renders these lines on screen and
 * the PDF module renders them into the document, so the fill lives here for
 * both.
 *
 * The estimator prices from the shipped schema rather than the database
 * overrides, so this reads the shipped term for the same reason.
 */
export function fillScopeTokens(text: string, locale: string): string {
  const l: Locale = locale.startsWith("ar") ? "ar" : "en";
  return fillTemplate(text, {
    warrantyDays: formatNumber(COMMERCIAL_TERMS.postLaunchWarrantyDays, l),
  });
}

export type DeliverableTier = "small" | "medium" | "large" | "enterprise";
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

export function validatePhone(phone: string): boolean {
  const normalized = normalizeNumeralsToEnglish(phone);
  const digits = normalized.replace(/\D/g, "");
  return digits.length >= 8 && digits.length <= 15;
}


