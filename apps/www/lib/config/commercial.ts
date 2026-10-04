export type CommercialCtaKey =
  | "describeTheBuild"
  | "projectRange"
  | "realBuild"
  | "scopeProjects"
  | "technicalCall"
  | "technicalAudit"
  | "architecture"
  | "maintenanceEnquiry"
  | "maintenancePlans";

type CommercialCtaDefinition = {
  href: string;
};

const COMMERCIAL_CTAS: Record<CommercialCtaKey, CommercialCtaDefinition> = {
  describeTheBuild: { href: "/contact" },
  projectRange: { href: "/transparency" },
  realBuild: { href: "/work" },
  scopeProjects: { href: "/pricing" },
  technicalCall: { href: "/schedule" },
  technicalAudit: { href: "/contact?service=consulting&package=audit" },
  architecture: { href: "/contact?service=development&track=architecture" },
  maintenanceEnquiry: { href: "/contact?service=maintenance" },
  maintenancePlans: { href: "/services/maintenance#pricing" },
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
