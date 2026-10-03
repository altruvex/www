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
  /* The one primary the site opens with a blank page rather than a calendar:
     it asks what is being built instead of asking for a slot. */
  describeTheBuild: { href: "/contact" },
  projectRange: { href: "/transparency" },
  realBuild: { href: "/work" },
  /* How a project is scoped and priced: the pricing page. */
  scopeProjects: { href: "/pricing" },
  technicalCall: { href: "/schedule" },
  technicalAudit: { href: "/contact?service=consulting&package=audit" },
  architecture: { href: "/contact?service=development&track=architecture" },
  /* The contact form reads `service` and preselects maintenance. */
  maintenanceEnquiry: { href: "/contact?service=maintenance" },
  maintenancePlans: { href: "/services/maintenance#pricing" },
};

/* Each maintenance plan opens the contact form with the plan and the billing
   period already written into the message, where the visitor can edit them. */
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
