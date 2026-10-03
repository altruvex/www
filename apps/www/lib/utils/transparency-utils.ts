import {
  DEFAULT_PRICING,
  fillTemplate,
  formatNumber,
  pricingCopy,
  type Locale,
  type ResolvedPricing,
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
 * The estimator prices from the resolved pricing the page read (admin
 * overrides applied), so the warranty window is read from the same object.
 * A deeper band's list opens by pointing at the band below it; that band's
 * name is the schema's, so `{bandBasic}` / `{bandStandard}` fill from it.
 */
export function fillScopeTokens(
  text: string,
  locale: string,
  pricing: ResolvedPricing = DEFAULT_PRICING,
): string {
  const l: Locale = locale.startsWith("ar") ? "ar" : "en";
  const bands = pricingCopy(l).bands;
  return fillTemplate(text, {
    warrantyDays: formatNumber(pricing.terms.postLaunchWarrantyDays, l),
    bandBasic: bands.basic,
    bandStandard: bands.standard,
  });
}

/** Legacy band ids — the keys the deliverable lists are filed under. */
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

/**
 * The one phone rule, shared by the estimator form and the lead API.
 *
 * Zod-free on purpose: the form runs it on every blur, and pulling zod into
 * the estimator's client bundle for one check is not worth it. The server
 * schema (`lib/validations/transparency-lead.ts`) imports these same two
 * functions, so a number the form accepts is a number the API accepts.
 *
 * Accepted: Arabic-Indic or Western digits, spaces, `+`, `-` and brackets.
 * After the separators are stripped the number must be international
 * (an optional `+` or `00`, then 7–15 digits) or an Egyptian mobile (`01x`
 * then 8 digits).
 */
const PHONE_CHARACTERS = /^[\d\s+()-]+$/;
const PHONE_PATTERN = /^(\+|00)?[1-9]\d{6,14}$|^01[0125]\d{8}$/;

/** Western digits, separators removed — the form stored on the lead. */
export function normalizePhone(raw: string): string {
  return normalizeNumeralsToEnglish(raw).trim().replace(/[\s()-]/g, "");
}

export function isValidPhone(raw: string): boolean {
  const ascii = normalizeNumeralsToEnglish(raw).trim();
  if (!ascii || !PHONE_CHARACTERS.test(ascii)) return false;
  return PHONE_PATTERN.test(normalizePhone(ascii));
}
