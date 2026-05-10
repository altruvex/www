type CommercialLocale = "en" | "ar";

type CommercialCtaKey =
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
  label: Record<CommercialLocale, string>;
};

function resolveCommercialLocale(locale: string): CommercialLocale {
  return locale.startsWith("ar") ? "ar" : "en";
}

const COMMERCIAL_CTAS: Record<
  CommercialCtaKey,
  CommercialCtaDefinition
> = {
  projectRange: {
    href: "/transparency",
    label: {
      ar: "احصل على نطاق مشروعك",
      en: "Get Your Project Range",
    },
  },
  realBuild: {
    href: "/work/altruvex-site",
    label: {
      ar: "شاهد مشروعًا حقيقيًا",
      en: "See a Real Build",
    },
  },
  technicalCall: {
    href: "/schedule",
    label: {
      ar: "احجز مكالمة تقنية",
      en: "Book a Technical Call",
    },
  },
  technicalAudit: {
    href: "/contact?service=consulting&package=audit",
    label: {
      ar: "ابدأ بفحص تقني",
      en: "Start with a Technical Audit",
    },
  },
  architecture: {
    href: "/contact?service=development&track=architecture",
    label: {
      ar: "ناقش معنا البنية التقنية",
      en: "Talk Through the Architecture",
    },
  },
  maintenancePlans: {
    href: "/services/maintenance#pricing",
    label: {
      ar: "شاهد خطط الصيانة",
      en: "See Maintenance Plans",
    },
  },
  pricingEssential: {
    href: "/transparency?tier=essential",
    label: {
      ar: "احصل على تسعير هذا النطاق",
      en: "Get Pricing for This Scope",
    },
  },
  pricingProfessional: {
    href: "/transparency?tier=professional",
    label: {
      ar: "خطط هذا المشروع",
      en: "Plan This Build",
    },
  },
  pricingFlagship: {
    href: "/schedule",
    label: {
      ar: "ناقش معنا البنية التقنية",
      en: "Talk Through the Architecture",
    },
  },
  flagshipBuild: {
    href: "/transparency?tier=professional",
    label: {
      ar: "خطط مشروعًا بهذا المستوى",
      en: "Plan a Build Like This",
    },
  },
};

export function getCommercialCta(locale: string, key: CommercialCtaKey) {
  const resolvedLocale = resolveCommercialLocale(locale);
  const definition = COMMERCIAL_CTAS[key];
  return {
    href: definition.href,
    label: definition.label[resolvedLocale],
  };
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
  "bilingual-corporate-portal",
  "custom-case-builder",
] as const;

export const FOUNDER_LINK =
  "https://www.linkedin.com/in/ali-abdelhadi-65094b283/";
