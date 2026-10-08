import type { ServiceId } from "@repo/pricing-schema";

/**
 * Every conversion link on the site comes from this registry; labels live in
 * messages/{en,ar}/commercial.json under `ctas`, one label per action.
 *
 * Funnel rule (2026-10 content pass; page ends per option C, Ali 2026-10-08):
 * - The site header leads with Estimate your project (`projectRange`).
 * - A page end has one button and one text link. The button is the step that
 *   page earns (docs/conversion-intelligence.md §4 C6 lists them); the link is
 *   the alternative, worded from `ctasAlternative` when its key has one
 *   ("or estimate it first").
 * - One primary per view. A closing pair never sends both to the same
 *   destination, and never links back to the page it sits on.
 * - Booking a call is always "Schedule a consultation" (`technicalCall`); the
 *   audit is always "Start with a technical audit" (`technicalAudit`).
 */
export type CommercialCtaKey =
  | "describeTheBuild"
  | "exploreServices"
  | "projectRange"
  | "realBuild"
  | "scopeProjects"
  | "technicalCall"
  | "viewTransparency"
  | "technicalAudit"
  | "architecture"
  | "maintenanceEnquiry"
  | "maintenancePlans"
  | "startDesign"
  | "startDevelopment"
  | "viewStandards"
  | "paymentTerms";

type CommercialCtaDefinition = {
  href: string;
};

const COMMERCIAL_CTAS: Record<CommercialCtaKey, CommercialCtaDefinition> = {
  describeTheBuild: { href: "/contact" },
  exploreServices: { href: "/services" },
  projectRange: { href: "/transparency" },
  realBuild: { href: "/work" },
  scopeProjects: { href: "/pricing" },
  technicalCall: { href: "/schedule" },
  viewTransparency: { href: "/transparency#how-estimates-are-calculated" },
  technicalAudit: { href: "/contact?service=consulting&package=audit" },
  architecture: { href: "/contact?service=development&track=architecture" },
  maintenanceEnquiry: { href: "/contact?service=maintenance" },
  maintenancePlans: { href: "/services/maintenance#pricing" },
  startDesign: { href: "/contact?service=interface-design" },
  startDevelopment: { href: "/contact?service=development" },
  viewStandards: { href: "/standards" },
  paymentTerms: { href: "/pricing#terms" },
};

export function maintenancePlanHref(id: string, billing: "monthly" | "annual") {
  return `/contact?service=maintenance&plan=${encodeURIComponent(id)}&billing=${billing}`;
}

/**
 * What a CTA carries to its destination. Ids only, never visitor input:
 * `service` is a /contact service, `projectType` an estimator service id,
 * `source` a short slug naming the surface the link sits on.
 */
export type CtaContext = {
  service?: "interface-design" | "development" | "consulting" | "maintenance";
  projectType?: ServiceId;
  source?: string;
};

const CONTEXT_KEYS = ["service", "projectType", "source"] as const;

/** The context as a query string ("" when empty), in a fixed key order. */
export function ctaContextQuery(context: CtaContext = {}) {
  const params = new URLSearchParams();
  for (const key of CONTEXT_KEYS) {
    const value = context[key];
    if (value) params.set(key, value);
  }
  return params.toString();
}

/**
 * The registry href with the context merged into its query (a context value
 * replaces the registry's own for the same key) and an optional fragment.
 * No context and no hash returns the registry href unchanged.
 */
function ctaHref(key: CommercialCtaKey, context?: CtaContext, hash?: string) {
  const base = COMMERCIAL_CTAS[key].href;
  const extra = ctaContextQuery(context);
  if (!extra && !hash) return base;

  const [withoutHash, ownHash] = base.split("#");
  const [path, query = ""] = withoutHash.split("?");
  const params = new URLSearchParams(query);
  for (const [name, value] of new URLSearchParams(extra)) params.set(name, value);
  const search = params.toString();
  const fragment = hash ?? ownHash;
  return `${path}${search ? `?${search}` : ""}${fragment ? `#${fragment}` : ""}`;
}

export function getCommercialCta(
  key: CommercialCtaKey,
  context?: CtaContext,
  hash?: string,
) {
  return { href: ctaHref(key, context, hash) };
}

const KEY_BY_HREF = new Map(
  (Object.keys(COMMERCIAL_CTAS) as CommercialCtaKey[]).map((key) => [
    COMMERCIAL_CTAS[key].href,
    key,
  ]),
);

/** The registry key whose plain href this is, for measuring untyped links. */
export function ctaKeyForHref(href: string): CommercialCtaKey | undefined {
  return KEY_BY_HREF.get(href);
}

export const HOMEPAGE_SUPPORTING_CASE_STUDIES = [
  "newlight-lighting-store",
  "art-lighting-store",
] as const;

export const FOUNDER_LINK =
  "https://www.linkedin.com/in/ali-abdelhadi-65094b283/";
