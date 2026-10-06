/**
 * Every conversion link on the site comes from this registry; labels live in
 * messages/{en,ar}/commercial.json under `ctas`, one label per action.
 *
 * Funnel rule (2026-10 content pass):
 * - The site header leads with Estimate your project (`projectRange`).
 * - Page ends lead with Start a project (`describeTheBuild`).
 * - Pages about price, or made for reading (pricing, transparency, writing),
 *   lead with `projectRange`; every other page leads with `describeTheBuild`.
 * - One primary per view. A closing pair never sends both buttons to the same
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

export function getCommercialCta(key: CommercialCtaKey) {
  return COMMERCIAL_CTAS[key];
}

export const HOMEPAGE_SUPPORTING_CASE_STUDIES = [
  "newlight-lighting-store",
  "art-lighting-store",
] as const;

export const FOUNDER_LINK =
  "https://www.linkedin.com/in/ali-abdelhadi-65094b283/";
