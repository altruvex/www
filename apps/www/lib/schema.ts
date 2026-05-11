import type { CaseStudyRecord } from "@/lib/case-studies";
import {
  PAGE_METADATA,
  SITE_CONFIG,
  getLocalizedSeoEntry,
  getLocalizedUrl,
  normalizeLocale,
} from "@/lib/metadata";
import type { RouteMetaKey, SupportedLocale } from "@/lib/metadata";
import type { Article } from "@/types/mdx";

export type JsonLdSchema = Record<string, unknown>;
type FaqEntry = { answer: string; question: string };

type BreadcrumbItem = {
  name: string;
  path: string;
};

type ServiceSchemaKey =
  | "serviceConsulting"
  | "serviceDevelopment"
  | "serviceInterfaceDesign"
  | "serviceMaintenance";

const ORGANIZATION_ID = `${SITE_CONFIG.url}#organization`;
const LOCAL_BUSINESS_ID = `${SITE_CONFIG.url}#local-business`;
const WEBSITE_ID = `${SITE_CONFIG.url}#website`;
const FOUNDER_ID = `${SITE_CONFIG.url}#founder`;

const AREA_SERVED = [
  "Egypt",
  "Saudi Arabia",
  "United Arab Emirates",
  "Middle East",
  "Worldwide",
];

const SERVICE_DEFINITIONS: Record<
  ServiceSchemaKey,
  {
    audience: Record<SupportedLocale, string>;
    name: Record<SupportedLocale, string>;
    serviceType: Record<SupportedLocale, string>;
  }
> = {
  serviceConsulting: {
    audience: {
      ar: "للشركات التي تحتاج تدقيقاً تقنياً وخارطة قرار قبل إعادة البناء أو التوسع.",
      en: "For teams that need a technical audit and decision-ready roadmap before a rebuild or scale move.",
    },
    name: {
      ar: "الاستشارات والتدقيقات التقنية",
      en: "Technical Consulting & Web Audits",
    },
    serviceType: {
      ar: "استشارات هندسة ويب تقنية",
      en: "Technical web engineering consulting",
    },
  },
  serviceDevelopment: {
    audience: {
      ar: "للبوابات ولوحات التحكم والمنتجات التي تحتاج هندسة Next.js قابلة للتوسع وثنائية اللغة.",
      en: "For portals, dashboards, and product builds that need scalable bilingual Next.js engineering.",
    },
    name: {
      ar: "تطوير Next.js وبناء المنتجات",
      en: "Next.js Development & Product Engineering",
    },
    serviceType: {
      ar: "وكالة تطوير Next.js",
      en: "Next.js development agency",
    },
  },
  serviceInterfaceDesign: {
    audience: {
      ar: "للشركات التي تحتاج واجهات تحويلية وأنظمة مكونات جاهزة للتنفيذ عبر العربية والإنجليزية.",
      en: "For teams that need conversion-focused interfaces and implementation-ready systems in Arabic and English.",
    },
    name: {
      ar: "هندسة الواجهات وأنظمة التصميم",
      en: "UI Engineering & Interface Systems",
    },
    serviceType: {
      ar: "خدمات هندسة واجهات مخصصة",
      en: "Custom UI engineering services",
    },
  },
  serviceMaintenance: {
    audience: {
      ar: "للأنظمة الحية التي تحتاج إصدارات مستمرة ومراقبة وأداءً مستقراً بعد الإطلاق.",
      en: "For live systems that need structured releases, monitoring, and reliable post-launch support.",
    },
    name: {
      ar: "الصيانة المستمرة ودعم الأنظمة",
      en: "Ongoing Maintenance & System Support",
    },
    serviceType: {
      ar: "صيانة الأنظمة المخصصة",
      en: "Website maintenance for custom systems",
    },
  },
};

function buildBreadcrumbSchema(
  locale: SupportedLocale,
  items: BreadcrumbItem[],
): JsonLdSchema {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      item: getLocalizedUrl(locale, item.path),
      name: item.name,
      position: index + 1,
    })),
  };
}

function buildOrganizationSchema(): JsonLdSchema {
  const socialProfiles = Object.values(SITE_CONFIG.social);

  return {
    "@context": "https://schema.org",
    "@id": ORGANIZATION_ID,
    "@type": "Organization",
    areaServed: AREA_SERVED,
    contactPoint: {
      "@type": "ContactPoint",
      areaServed: AREA_SERVED,
      availableLanguage: ["en", "ar"],
      contactType: "sales",
      email: SITE_CONFIG.email,
      telephone: SITE_CONFIG.phone,
    },
    description: SITE_CONFIG.description.en,
    email: SITE_CONFIG.email,
    founder: {
      "@type": "Person",
      name: SITE_CONFIG.founder.name,
      sameAs: SITE_CONFIG.founder.linkedin,
    },
    knowsAbout: [
      "Custom web development",
      "Technical web engineering",
      "Next.js delivery",
      "Bilingual web systems",
      "RTL web architecture",
    ],
    logo: `${SITE_CONFIG.url}/apple-touch-icon.png`,
    name: SITE_CONFIG.name,
    sameAs: socialProfiles,
    telephone: SITE_CONFIG.phone,
    url: SITE_CONFIG.url,
  };
}

function buildLocalBusinessSchema(locale: SupportedLocale): JsonLdSchema {
  const home = PAGE_METADATA.home[locale];

  return {
    "@context": "https://schema.org",
    "@id": LOCAL_BUSINESS_ID,
    "@type": "LocalBusiness",
    address: {
      "@type": "PostalAddress",
      addressCountry: SITE_CONFIG.location.countryCode,
      addressLocality: SITE_CONFIG.location.city,
      addressRegion: SITE_CONFIG.location.region,
    },
    areaServed: AREA_SERVED,
    description: home.description,
    image: getLocalizedUrl(locale, "/opengraph-image"),
    name: SITE_CONFIG.name,
    parentOrganization: {
      "@id": ORGANIZATION_ID,
    },
    priceRange: "$$",
    telephone: SITE_CONFIG.phone,
    url: getLocalizedUrl(locale, "/"),
  };
}

function buildWebsiteSchema(locale: SupportedLocale): JsonLdSchema {
  const home = PAGE_METADATA.home[locale];

  return {
    "@context": "https://schema.org",
    "@id": WEBSITE_ID,
    "@type": "WebSite",
    description: home.description,
    inLanguage: locale,
    name: SITE_CONFIG.name,
    publisher: {
      "@id": ORGANIZATION_ID,
    },
    potentialAction: {
      "@type": "SearchAction",
      "query-input": "required name=search_term_string",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${getLocalizedUrl(locale, "/writing")}?q={search_term_string}`,
      },
    },
    url: getLocalizedUrl(locale, "/"),
  };
}

function buildAboutPageSchema(locale: SupportedLocale): JsonLdSchema {
  const entry = PAGE_METADATA.about[locale];

  return {
    "@context": "https://schema.org",
    "@type": "AboutPage",
    about: {
      "@id": ORGANIZATION_ID,
    },
    description: entry.description,
    inLanguage: locale,
    mainEntity: {
      "@id": FOUNDER_ID,
    },
    name: entry.title,
    url: getLocalizedUrl(locale, PAGE_METADATA.about.path),
  };
}

function buildFounderSchema(locale: SupportedLocale): JsonLdSchema {
  return {
    "@context": "https://schema.org",
    "@id": FOUNDER_ID,
    "@type": "Person",
    description: SITE_CONFIG.founder.description[locale],
    jobTitle: SITE_CONFIG.founder.jobTitle[locale],
    knowsAbout: [
      "Custom web development",
      "Technical web engineering",
      "Next.js architecture",
      "Bilingual web systems",
      "RTL product design",
    ],
    name: SITE_CONFIG.founder.name,
    sameAs: [SITE_CONFIG.founder.linkedin],
    url: SITE_CONFIG.founder.linkedin,
    worksFor: {
      "@id": ORGANIZATION_ID,
    },
  };
}

function buildServiceSchema(
  locale: SupportedLocale,
  key: ServiceSchemaKey,
): JsonLdSchema {
  const entry = getLocalizedSeoEntry(locale, key);
  const definition = SERVICE_DEFINITIONS[key];

  return {
    "@context": "https://schema.org",
    "@id": `${getLocalizedUrl(locale, PAGE_METADATA[key].path)}#service`,
    "@type": "Service",
    areaServed: AREA_SERVED,
    audience: {
      "@type": "BusinessAudience",
      audienceType: definition.audience[locale],
    },
    description: entry.description,
    name: definition.name[locale],
    provider: {
      "@id": ORGANIZATION_ID,
    },
    serviceType: definition.serviceType[locale],
    url: getLocalizedUrl(locale, PAGE_METADATA[key].path),
  };
}

function buildFaqSchema(entries: FaqEntry[]): JsonLdSchema {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: entries.map((entry) => ({
      "@type": "Question",
      acceptedAnswer: {
        "@type": "Answer",
        text: entry.answer,
      },
      name: entry.question,
    })),
  };
}

function buildCaseStudySchema(
  locale: SupportedLocale,
  caseStudy: CaseStudyRecord,
): JsonLdSchema {
  const url = getLocalizedUrl(locale, `/work/${caseStudy.slug}`);

  return {
    "@context": "https://schema.org",
    "@type": "CreativeWork",
    about: [
      caseStudy.client[locale],
      caseStudy.industry[locale],
      ...caseStudy.keywords[locale],
    ],
    creator: {
      "@id": ORGANIZATION_ID,
    },
    datePublished: `${caseStudy.year}-01-01`,
    description: caseStudy.summary[locale],
    headline: caseStudy.name[locale],
    inLanguage: locale,
    name: caseStudy.name[locale],
    publisher: {
      "@id": ORGANIZATION_ID,
    },
    url,
  };
}

function buildArticleSchema(
  locale: SupportedLocale,
  article: Article,
): JsonLdSchema {
  const url = getLocalizedUrl(locale, `/writing/${article.slug}`);

  return {
    "@context": "https://schema.org",
    "@type": "Article",
    articleSection: "Web Engineering",
    author: {
      "@id": ORGANIZATION_ID,
    },
    creator: {
      "@type": "Person",
      name: SITE_CONFIG.founder.name,
      sameAs: SITE_CONFIG.founder.linkedin,
    },
    dateModified: article.frontmatter.date,
    datePublished: article.frontmatter.date,
    description: article.frontmatter.excerpt,
    headline: article.frontmatter.title,
    inLanguage: locale,
    keywords: article.frontmatter.tags.join(", "),
    mainEntityOfPage: url,
    publisher: {
      "@id": ORGANIZATION_ID,
    },
    url,
  };
}

function buildStaticBreadcrumbs(
  locale: SupportedLocale,
  pageKey: RouteMetaKey,
): BreadcrumbItem[] {
  const home = PAGE_METADATA.home[locale];
  const current = PAGE_METADATA[pageKey][locale];

  if (pageKey === "services") {
    return [
      { name: home.breadcrumb, path: "/" },
      { name: current.breadcrumb, path: PAGE_METADATA.services.path },
    ];
  }

  if (
    pageKey === "serviceConsulting" ||
    pageKey === "serviceDevelopment" ||
    pageKey === "serviceInterfaceDesign" ||
    pageKey === "serviceMaintenance"
  ) {
    return [
      { name: home.breadcrumb, path: "/" },
      {
        name: PAGE_METADATA.services[locale].breadcrumb,
        path: PAGE_METADATA.services.path,
      },
      { name: current.breadcrumb, path: PAGE_METADATA[pageKey].path },
    ];
  }

  return [
    { name: home.breadcrumb, path: "/" },
    { name: current.breadcrumb, path: PAGE_METADATA[pageKey].path },
  ];
}

const SCHEMAS = {
  aboutPage: buildAboutPageSchema,
  article: buildArticleSchema,
  breadcrumb: buildBreadcrumbSchema,
  caseStudy: buildCaseStudySchema,
  faq: buildFaqSchema,
  founder: buildFounderSchema,
  localBusiness: buildLocalBusinessSchema,
  organization: buildOrganizationSchema,
  service: buildServiceSchema,
  website: buildWebsiteSchema,
} as const;

export function buildGlobalSchemas(locale: string): JsonLdSchema[] {
  const loc = normalizeLocale(locale);

  return [
    SCHEMAS.organization(),
    SCHEMAS.localBusiness(loc),
    SCHEMAS.website(loc),
  ];
}

export function buildPageSchemas(
  locale: string,
  pageKey: RouteMetaKey,
): JsonLdSchema[] {
  if (pageKey === "home" || pageKey === "workCaseStudy") {
    return [];
  }

  const loc = normalizeLocale(locale);
  const breadcrumbs = buildStaticBreadcrumbs(loc, pageKey);
  const schemas: JsonLdSchema[] = [SCHEMAS.breadcrumb(loc, breadcrumbs)];

  if (pageKey === "about") {
    schemas.push(SCHEMAS.aboutPage(loc), SCHEMAS.founder(loc));
  }

  if (pageKey === "services") {
    schemas.push(
      SCHEMAS.service(loc, "serviceDevelopment"),
      SCHEMAS.service(loc, "serviceConsulting"),
      SCHEMAS.service(loc, "serviceInterfaceDesign"),
      SCHEMAS.service(loc, "serviceMaintenance"),
    );
  }

  if (
    pageKey === "serviceConsulting" ||
    pageKey === "serviceDevelopment" ||
    pageKey === "serviceInterfaceDesign" ||
    pageKey === "serviceMaintenance"
  ) {
    schemas.push(SCHEMAS.service(loc, pageKey));
  }

  return schemas;
}

export function buildCaseStudyPageSchemas(
  locale: string,
  caseStudy: CaseStudyRecord,
): JsonLdSchema[] {
  const loc = normalizeLocale(locale);

  return [
    SCHEMAS.breadcrumb(loc, [
      { name: PAGE_METADATA.home[loc].breadcrumb, path: "/" },
      {
        name: PAGE_METADATA.work[loc].breadcrumb,
        path: PAGE_METADATA.work.path,
      },
      { name: caseStudy.name[loc], path: `/work/${caseStudy.slug}` },
    ]),
    SCHEMAS.caseStudy(loc, caseStudy),
  ];
}

export function buildArticlePageSchemas(
  locale: string,
  article: Article,
): JsonLdSchema[] {
  const loc = normalizeLocale(locale);

  return [
    SCHEMAS.breadcrumb(loc, [
      { name: PAGE_METADATA.home[loc].breadcrumb, path: "/" },
      {
        name: PAGE_METADATA.writing[loc].breadcrumb,
        path: PAGE_METADATA.writing.path,
      },
      { name: article.frontmatter.title, path: `/writing/${article.slug}` },
    ]),
    SCHEMAS.article(loc, article),
  ];
}

export function buildFaqPageSchemas(entries: FaqEntry[]): JsonLdSchema[] {
  return entries.length > 0 ? [SCHEMAS.faq(entries)] : [];
}
