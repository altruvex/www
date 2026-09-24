import type { CaseStudyRecord } from "@/lib/data/case-studies";
import {
  PAGE_METADATA,
  SITE_CONFIG,
  getLocalizedSeoEntry,
  getLocalizedUrl,
  normalizeLocale,
} from "@/lib/metadata";
import type { RouteMetaKey, SupportedLocale } from "@/lib/metadata";
import type { Article } from "@/types/mdx";
import type { Testimonial } from "@/lib/data/testimonials";
import {
  fillPricingTokens,
  type Locale as PricingLocale,
  type ResolvedPricing,
} from "@repo/pricing-schema";

export type JsonLdSchema = Record<string, unknown>;
type FaqEntry = { answer: string; question: string };
type HowToStepEntry = {
  deliverables?: string;
  name: string;
  text: string;
};
type PricingOfferEntry = {
  description: string;
  features: string[];
  name: string;
  price: string;
};

export type BreadcrumbItem = {
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
  "Cairo",
  "Saudi Arabia",
  "United Arab Emirates",
  "Middle East",
  "Worldwide",
];

const KNOWS_ABOUT = [
  "Altruvex",
  "Custom web development",
  "Technical web engineering",
  "Next.js delivery",
  "Bilingual web systems",
  "Arabic and English websites",
  "RTL web architecture",
  "Website performance engineering",
  "Technical SEO implementation",
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
      ar: "للفرق التي تحتاج استشارات تقنية قبل إعادة البناء أو التوسع - تدقيقاً للنظام وخارطة قرار جاهزة للتنفيذ.",
      en: "For teams that need technical consulting before a rebuild or scale move - an audit of the system and a decision-ready roadmap.",
    },
    name: {
      ar: "الاستشارات التقنية",
      en: "Technical Consulting",
    },
    serviceType: {
      ar: "استشارات تطوير مواقع ويب مخصصة",
      en: "Technical web engineering consulting",
    },
  },
  serviceDevelopment: {
    audience: {
      ar: "للفرق التي تحتاج تطويراً مخصصاً لبوابة أو لوحة تحكم أو منتج - هندسة Next.js ثنائية اللغة وقابلة للتوسع.",
      en: "For teams that need custom development of a portal, dashboard, or product - scalable, bilingual Next.js engineering.",
    },
    name: {
      ar: "التطوير المخصص",
      en: "Custom Development",
    },
    serviceType: {
      ar: "تطوير Next.js مخصص للبوابات والمنتجات",
      en: "Custom Next.js development for portals and products",
    },
  },
  serviceInterfaceDesign: {
    audience: {
      ar: "للفرق التي تحتاج تصميم واجهات يحوّل الزوار - شاشات مبنية للتحويل ونظام مكونات جاهز للتنفيذ بالعربية والإنجليزية.",
      en: "For teams that need interface design that converts - conversion-focused screens and an implementation-ready component system in Arabic and English.",
    },
    name: {
      ar: "تصميم الواجهات",
      en: "Interface Design",
    },
    serviceType: {
      ar: "تصميم وهندسة واجهات المواقع",
      en: "Interface design and UI engineering",
    },
  },
  serviceMaintenance: {
    audience: {
      ar: "للفرق التي تحتاج صيانة ودعماً لموقع يعمل بالفعل - إصدارات منظمة ومراقبة وأداءً مستقراً بعد الإطلاق.",
      en: "For teams that need maintenance and support for a live website - structured releases, monitoring, and reliable post-launch care.",
    },
    name: {
      ar: "الصيانة والدعم",
      en: "Maintenance & Support",
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
    "@id": `${getLocalizedUrl(locale, items.at(-1)?.path ?? "/")}#breadcrumb`,
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
    "@type": ["Organization", "ProfessionalService"],
    address: {
      "@type": "PostalAddress",
      addressCountry: SITE_CONFIG.location.countryCode,
      addressLocality: SITE_CONFIG.location.locality,
      addressRegion: SITE_CONFIG.location.region,
      postalCode: SITE_CONFIG.location.postalCode,
      streetAddress: SITE_CONFIG.location.streetAddress,
    },
    alternateName: SITE_CONFIG.alternateNames,
    areaServed: AREA_SERVED,
    brand: {
      "@type": "Brand",
      name: SITE_CONFIG.name,
      slogan: SITE_CONFIG.slogan,
      url: SITE_CONFIG.url,
    },
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
    foundingLocation: {
      "@type": "Place",
      address: {
        "@type": "PostalAddress",
        addressCountry: SITE_CONFIG.location.countryCode,
        addressLocality: SITE_CONFIG.location.locality,
        addressRegion: SITE_CONFIG.location.region,
        postalCode: SITE_CONFIG.location.postalCode,
        streetAddress: SITE_CONFIG.location.streetAddress,
      },
      name: `${SITE_CONFIG.location.locality}, ${SITE_CONFIG.location.city}, ${SITE_CONFIG.location.country}`,
    },
    identifier: {
      "@type": "PropertyValue",
      name: "Official website",
      propertyID: "domain",
      value: "altruvex.com",
    },
    knowsAbout: KNOWS_ABOUT,
    knowsLanguage: ["English", "Arabic"],
    logo: `${SITE_CONFIG.url}/apple-touch-icon.png`,
    name: SITE_CONFIG.name,
    sameAs: socialProfiles,
    slogan: SITE_CONFIG.slogan,
    telephone: SITE_CONFIG.phone,
    url: SITE_CONFIG.url,
  };
}

function buildLocalBusinessSchema(locale: SupportedLocale): JsonLdSchema {
  const home = PAGE_METADATA.home[locale];

  return {
    "@context": "https://schema.org",
    "@id": LOCAL_BUSINESS_ID,
    "@type": ["LocalBusiness", "ProfessionalService"],
    address: {
      "@type": "PostalAddress",
      addressCountry: SITE_CONFIG.location.countryCode,
      addressLocality: SITE_CONFIG.location.locality,
      addressRegion: SITE_CONFIG.location.region,
      postalCode: SITE_CONFIG.location.postalCode,
      streetAddress: SITE_CONFIG.location.streetAddress,
    },
    alternateName: SITE_CONFIG.alternateNames,
    areaServed: AREA_SERVED,
    description: home.description,
    email: SITE_CONFIG.email,
    geo: {
      "@type": "GeoCoordinates",
      latitude: 30.0869,
      longitude: 31.3301,
    },
    hasMap: "https://maps.google.com/?q=Heliopolis,Cairo,Egypt",
    image: getLocalizedUrl(locale, "/opengraph-image"),
    knowsAbout: KNOWS_ABOUT,
    makesOffer: [
      "Interface Design",
      "Custom Development",
      "Technical Consulting",
      "Maintenance & Support",
      "Custom ecommerce development",
    ],
    name: SITE_CONFIG.name,
    openingHoursSpecification: [
      {
        "@type": "OpeningHoursSpecification",
        closes: "18:00",
        dayOfWeek: [
          "Sunday",
          "Monday",
          "Tuesday",
          "Wednesday",
          "Thursday",
        ],
        opens: "09:00",
      },
    ],
    parentOrganization: {
      "@id": ORGANIZATION_ID,
    },
    priceRange: "$$",
    sameAs: Object.values(SITE_CONFIG.social),
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
    about: {
      "@id": ORGANIZATION_ID,
    },
    alternateName: SITE_CONFIG.alternateNames,
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

function buildWebPageSchema(
  locale: SupportedLocale,
  pageKey: RouteMetaKey,
): JsonLdSchema {
  const entry = PAGE_METADATA[pageKey][locale];
  const url = getLocalizedUrl(locale, PAGE_METADATA[pageKey].path);

  return {
    "@context": "https://schema.org",
    "@id": `${url}#webpage`,
    "@type":
      pageKey === "services" || pageKey === "work" || pageKey === "writing"
        ? "CollectionPage"
        : "WebPage",
    about: {
      "@id": ORGANIZATION_ID,
    },
    breadcrumb:
      pageKey === "home" ? undefined : `${url}#breadcrumb`,
    description: entry.description,
    inLanguage: locale,
    isPartOf: {
      "@id": WEBSITE_ID,
    },
    mainEntity: {
      "@id": pageKey === "about" ? FOUNDER_ID : ORGANIZATION_ID,
    },
    name: entry.title,
    primaryImageOfPage: {
      "@type": "ImageObject",
      url: getLocalizedUrl(locale, "/opengraph-image"),
    },
    publisher: {
      "@id": ORGANIZATION_ID,
    },
    url,
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
    knowsAbout: KNOWS_ABOUT,
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

function buildHowToSchema(
  locale: SupportedLocale,
  pageKey: Extract<RouteMetaKey, "howWeWork" | "process">,
  steps: HowToStepEntry[],
): JsonLdSchema {
  const entry = PAGE_METADATA[pageKey][locale];
  const url = getLocalizedUrl(locale, PAGE_METADATA[pageKey].path);

  return {
    "@context": "https://schema.org",
    "@id": `${url}#howto`,
    "@type": "HowTo",
    description: entry.description,
    inLanguage: locale,
    name: entry.title,
    publisher: {
      "@id": ORGANIZATION_ID,
    },
    step: steps.map((step, index) => ({
      "@type": "HowToStep",
      itemListElement: step.deliverables
        ? [
            {
              "@type": "HowToDirection",
              text: step.deliverables,
            },
          ]
        : undefined,
      name: step.name,
      position: index + 1,
      text: step.text,
    })),
    url,
  };
}

const ARABIC_INDIC_DIGITS = "٠١٢٣٤٥٦٧٨٩";

function parsePriceRange(value: string): { maxPrice?: number; minPrice?: number } {
  const asciiDigits = value.replace(
    /[٠-٩]/g,
    (digit) => String(ARABIC_INDIC_DIGITS.indexOf(digit)),
  );
  const normalized = asciiDigits.replace(/[,٬٫]/g, "");
  const numbers = normalized.match(/\d+/g)?.map(Number) ?? [];

  if (numbers.length === 0) {
    return {};
  }
  if (numbers.length === 1) {
    return { minPrice: numbers[0] };
  }
  return { maxPrice: Math.max(...numbers), minPrice: Math.min(...numbers) };
}

function buildPricingOfferCatalogSchema(
  locale: SupportedLocale,
  offers: PricingOfferEntry[],
): JsonLdSchema {
  const entry = PAGE_METADATA.pricing[locale];
  const url = getLocalizedUrl(locale, PAGE_METADATA.pricing.path);

  return {
    "@context": "https://schema.org",
    "@id": `${url}#offer-catalog`,
    "@type": "OfferCatalog",
    inLanguage: locale,
    itemListElement: offers.map((offer, index) => {
      const { maxPrice, minPrice } = parsePriceRange(offer.price);

      return {
        "@type": "Offer",
        category: "Custom web development",
        description: offer.description,
        itemOffered: {
          "@type": "Service",
          description: offer.description,
          name: offer.name,
          provider: {
            "@id": ORGANIZATION_ID,
          },
          serviceOutput: offer.features,
        },
        name: offer.name,
        position: index + 1,
        ...(minPrice !== undefined
          ? {
              priceSpecification: {
                "@type": "PriceSpecification",
                ...(maxPrice !== undefined ? { maxPrice } : {}),
                minPrice,
                priceCurrency: "EGP",
              },
            }
          : {}),
        url,
      };
    }),
    name: entry.title,
    provider: {
      "@id": ORGANIZATION_ID,
    },
    url,
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

/** Strips MDX/markdown syntax down to plain prose for articleBody/wordCount. */
function plainTextFromMdx(mdx: string): string {
  return mdx
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/^---[\s\S]*?---/, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/<[^>]+>/g, " ")
    .replace(/[#>*_`~-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function buildArticleImageSchema(
  locale: SupportedLocale,
  article: Article,
): JsonLdSchema {
  const url = article.frontmatter.coverImage
    ? `${SITE_CONFIG.url}${article.frontmatter.coverImage}`
    : getLocalizedUrl(locale, "/opengraph-image");

  return {
    "@type": "ImageObject",
    contentUrl: url,
    url,
    ...(article.frontmatter.coverImage
      ? {}
      : { height: 630, width: 1200 }),
  };
}

function buildArticleSchema(
  locale: SupportedLocale,
  article: Article,
): JsonLdSchema {
  const url = getLocalizedUrl(locale, `/writing/${article.slug}`);
  const articleBody = plainTextFromMdx(article.content);
  const wordCount = articleBody.length > 0
    ? articleBody.split(/\s+/).filter(Boolean).length
    : undefined;

  return {
    "@context": "https://schema.org",
    "@type": "Article",
    articleBody,
    articleSection: "Web Engineering",
    author: {
      "@id": FOUNDER_ID,
      "@type": "Person",
      name: SITE_CONFIG.founder.name,
      sameAs: SITE_CONFIG.founder.linkedin,
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
    image: buildArticleImageSchema(locale, article),
    inLanguage: locale,
    keywords: article.frontmatter.tags.join(", "),
    mainEntityOfPage: url,
    publisher: {
      "@id": ORGANIZATION_ID,
    },
    url,
    ...(wordCount !== undefined ? { wordCount } : {}),
  };
}

/**
 * No numeric star ratings exist for these testimonials, so reviewRating /
 * AggregateRating are intentionally omitted rather than fabricated —
 * unsupported rating schema risks a Google manual action.
 */
function buildReviewSchema(
  locale: SupportedLocale,
  testimonial: Testimonial,
): JsonLdSchema {
  return {
    "@context": "https://schema.org",
    "@type": "Review",
    author: {
      "@type": "Organization",
      name: testimonial.author,
    },
    itemReviewed: {
      "@id": ORGANIZATION_ID,
    },
    reviewBody: testimonial.quote[locale],
  };
}

export function buildTestimonialReviewSchemas(
  locale: string,
  testimonials: Testimonial[],
): JsonLdSchema[] {
  const loc = normalizeLocale(locale);

  return testimonials.map((testimonial) => buildReviewSchema(loc, testimonial));
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

function buildCaseStudyBreadcrumbs(
  locale: SupportedLocale,
  caseStudy: CaseStudyRecord,
): BreadcrumbItem[] {
  return [
    { name: PAGE_METADATA.home[locale].breadcrumb, path: "/" },
    {
      name: PAGE_METADATA.work[locale].breadcrumb,
      path: PAGE_METADATA.work.path,
    },
    { name: caseStudy.name[locale], path: `/work/${caseStudy.slug}` },
  ];
}

function buildArticleBreadcrumbs(
  locale: SupportedLocale,
  article: Article,
): BreadcrumbItem[] {
  return [
    { name: PAGE_METADATA.home[locale].breadcrumb, path: "/" },
    {
      name: PAGE_METADATA.writing[locale].breadcrumb,
      path: PAGE_METADATA.writing.path,
    },
    { name: article.frontmatter.title, path: `/writing/${article.slug}` },
  ];
}


export function getCaseStudyBreadcrumbTrail(
  locale: string,
  caseStudy: CaseStudyRecord,
): BreadcrumbItem[] {
  return buildCaseStudyBreadcrumbs(normalizeLocale(locale), caseStudy);
}

export function getArticleBreadcrumbTrail(
  locale: string,
  article: Article,
): BreadcrumbItem[] {
  return buildArticleBreadcrumbs(normalizeLocale(locale), article);
}

const SCHEMAS = {
  aboutPage: buildAboutPageSchema,
  article: buildArticleSchema,
  breadcrumb: buildBreadcrumbSchema,
  caseStudy: buildCaseStudySchema,
  faq: buildFaqSchema,
  founder: buildFounderSchema,
  howTo: buildHowToSchema,
  localBusiness: buildLocalBusinessSchema,
  organization: buildOrganizationSchema,
  pricingOfferCatalog: buildPricingOfferCatalogSchema,
  service: buildServiceSchema,
  webPage: buildWebPageSchema,
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
  if (pageKey === "workCaseStudy") {
    return [];
  }

  const loc = normalizeLocale(locale);
  if (pageKey === "home") {
    return [SCHEMAS.webPage(loc, pageKey)];
  }

  const breadcrumbs = buildStaticBreadcrumbs(loc, pageKey);
  const schemas: JsonLdSchema[] = [
    SCHEMAS.webPage(loc, pageKey),
    SCHEMAS.breadcrumb(loc, breadcrumbs),
  ];

  if (pageKey === "about") {
    schemas.push(SCHEMAS.aboutPage(loc), SCHEMAS.founder(loc));
  }

  if (pageKey === "services") {
    schemas.push(
      // Same order as the /services index rows (services-index/data.ts).
      SCHEMAS.service(loc, "serviceInterfaceDesign"),
      SCHEMAS.service(loc, "serviceDevelopment"),
      SCHEMAS.service(loc, "serviceConsulting"),
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
    SCHEMAS.breadcrumb(loc, buildCaseStudyBreadcrumbs(loc, caseStudy)),
    SCHEMAS.caseStudy(loc, caseStudy),
  ];
}

export function buildArticlePageSchemas(
  locale: string,
  article: Article,
): JsonLdSchema[] {
  const loc = normalizeLocale(locale);

  return [
    SCHEMAS.breadcrumb(loc, buildArticleBreadcrumbs(loc, article)),
    SCHEMAS.article(loc, article),
  ];
}

function stripFaqMarkup(text: string): string {
  return text
    .replace(/<\/(p|li)>/g, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/\n{2,}/g, "\n")
    .trim();
}

/**
 * FAQ answers reach search engines as machine-readable text, so a stale price
 * here is published as a structured offer, not just prose. Pricing tokens are
 * filled centrally rather than at each of the five call sites — one of which
 * would eventually be forgotten.
 */
export function buildFaqPageSchemas(
  entries: FaqEntry[],
  locale: string = "en",
  pricing?: ResolvedPricing,
): JsonLdSchema[] {
  const loc: PricingLocale = locale === "ar" ? "ar" : "en";
  const plainEntries = entries.map((entry) => ({
    ...entry,
    answer: stripFaqMarkup(fillPricingTokens(entry.answer, loc, pricing)),
    question: fillPricingTokens(entry.question, loc, pricing),
  }));

  return plainEntries.length > 0 ? [SCHEMAS.faq(plainEntries)] : [];
}

export function buildHowToPageSchemas(
  locale: string,
  pageKey: Extract<RouteMetaKey, "howWeWork" | "process">,
  steps: HowToStepEntry[],
): JsonLdSchema[] {
  const loc = normalizeLocale(locale);

  return steps.length > 0 ? [SCHEMAS.howTo(loc, pageKey, steps)] : [];
}

export function buildPricingOfferSchemas(
  locale: string,
  offers: PricingOfferEntry[],
): JsonLdSchema[] {
  const loc = normalizeLocale(locale);

  return offers.length > 0 ? [SCHEMAS.pricingOfferCatalog(loc, offers)] : [];
}
