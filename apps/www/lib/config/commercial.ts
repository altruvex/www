export type CommercialCtaKey =
  | "projectRange"
  | "realBuild"
  | "technicalCall"
  | "technicalAudit"
  | "architecture"
  | "maintenancePlans"
  | "pricingEssential"
  | "pricingProfessional"
  | "pricingFlagship"
  | "flagshipBuild";

type CommercialCtaDefinition = {
  href: string;
};

const COMMERCIAL_CTAS: Record<CommercialCtaKey, CommercialCtaDefinition> = {
  projectRange: { href: "/transparency" },
  realBuild: { href: "/work" },
  technicalCall: { href: "/schedule" },
  technicalAudit: { href: "/contact?service=consulting&package=audit" },
  architecture: { href: "/contact?service=development&track=architecture" },
  maintenancePlans: { href: "/services/maintenance#pricing" },
  pricingEssential: { href: "/transparency?tier=essential" },
  pricingProfessional: { href: "/transparency?tier=professional" },
  pricingFlagship: { href: "/schedule" },
  flagshipBuild: { href: "/transparency?tier=professional" },
};

export function getCommercialCta(key: CommercialCtaKey) {
  return COMMERCIAL_CTAS[key];
}

export const HOMEPAGE_OFFERS = [
  {
    id: "website",
    detailHref: "/services/interface-design",
    ctaKey: "projectRange" as const,
  },
  {
    id: "portal",
    detailHref: "/services/development",
    ctaKey: "architecture" as const,
  },
  {
    id: "audit",
    detailHref: "/services/consulting",
    ctaKey: "technicalAudit" as const,
  },
  {
    id: "maintenance",
    detailHref: "/services/maintenance",
    ctaKey: "maintenancePlans" as const,
  },
];

export const HOMEPAGE_SUPPORTING_CASE_STUDIES = [
  "newlight-lighting-store",
  "art-lighting-store",
] as const;

export const FOUNDER_LINK =
  "https://www.linkedin.com/in/ali-abdelhadi-65094b283/";
