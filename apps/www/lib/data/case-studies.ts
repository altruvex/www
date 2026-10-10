import type { ServiceSlug } from "@/lib/config/accent-world";
import type { SupportedLocale } from "@/lib/metadata";
import type { ServiceId } from "@repo/pricing-schema";

type LocalizedValue = Record<SupportedLocale, string>;

export type CaseStudySlug =
  | "altruvex-site"
  | "art-lighting-store"
  | "newlight-lighting-store";

/**
 * `client` = work done for a paying client; `own` = Altruvex's own site. Only client
 * records may be counted or listed as portfolio work.
 */
type CaseStudyKind = "client" | "own";

/** Each metric's label lives at `work.labels.metrics.<metric>` in both locales. */
export type CaseStudyResultMetric =
  | "loadTime"
  | "lighthousePerformance"
  | "lighthouseAccessibility"
  | "lighthouseSeo"
  | "conversionRate"
  | "monthlyOrders";

/** One measured before/after pair. Only real measurements, never estimates. */
export type CaseStudyResult = {
  metric: CaseStudyResultMetric;
  before?: string;
  after: string;
  unit?: string;
};

/** A client quote that the client approved for publication, with their real name and role. */
export type CaseStudyQuote = {
  text: LocalizedValue;
  name: string;
  role: LocalizedValue;
};

export type CaseStudyRecord = {
  kind: CaseStudyKind;
  client: LocalizedValue;
  industry: LocalizedValue;
  keywords: Record<SupportedLocale, string[]>;
  name: LocalizedValue;
  /** Shorter <title> when `name` + " | Altruvex" would exceed 60 characters. */
  seoTitle?: LocalizedValue;
  slug: CaseStudySlug;
  summary: LocalizedValue;
  services: readonly ServiceSlug[];
  /** The estimator project type a similar build starts from. */
  projectType: ServiceId;
  externalUrl?: string;
  /** Rendered only when present. */
  results?: readonly CaseStudyResult[];
  /** Rendered only when present. */
  quote?: CaseStudyQuote;
};

export const CASE_STUDIES: CaseStudyRecord[] = [
  {
    kind: "client",
    client: {
      ar: "نيو لايت",
      en: "NewLight",
    },
    industry: {
      ar: "إضاءة وتجارة إلكترونية",
      en: "Lighting & e-commerce",
    },
    keywords: {
      ar: [
        "بناء أول متجر إلكتروني",
        "تجارة إلكترونية للإضاءة",
        "متجر Next.js مخصص",
      ],
      en: [
        "first e-commerce build",
        "lighting online store",
        "custom next.js shop",
      ],
    },
    name: {
      ar: "نيو لايت — أول متجر إلكتروني لعلامة إضاءة",
      en: "NewLight — a first online store for a lighting brand",
    },
    seoTitle: {
      ar: "نيو لايت: أول متجر إلكتروني لعلامة إضاءة",
      en: "NewLight: First Online Store for a Lighting Brand",
    },
    slug: "newlight-lighting-store",
    projectType: "ecommerce",
    summary: {
      ar: "أول متجر إلكتروني لنيو لايت: متجر مخصص بالعربية والإنجليزية بمسار شراء منظم، يعمل على كل جهاز ويمكن تثبيته على الهاتف.",
      en: "NewLight's first online store: a custom storefront in Arabic and English with a structured checkout, built for every device and installable on a phone.",
    },
    services: ["interface-design", "development"],
    externalUrl: "https://www.newlight-eg.com/",
    // TODO(ali): real measured results (before/after load time, Lighthouse, orders/conversion) and a client quote with name and role.
  },
  {
    kind: "client",
    client: {
      ar: "متجر آرت لايتنج",
      en: "Art Lighting Store",
    },
    industry: {
      ar: "إضاءة منزلية فاخرة",
      en: "Premium home lighting",
    },
    keywords: {
      ar: [
        "دراسة حالة متجر مخصص",
        "واجهة متجر Next.js",
        "تجارة إلكترونية عالية الأداء",
      ],
      en: [
        "custom storefront case study",
        "next.js ecommerce build",
        "high-performance retail website",
      ],
    },
    name: {
      ar: "متجر آرت لايتنج — متجر إلكتروني مخصص للإضاءة الفاخرة",
      en: "Art Lighting Store — a custom storefront for premium lighting",
    },
    seoTitle: {
      ar: "آرت لايتنج: دراسة حالة متجر إضاءة مخصص",
      en: "Art Lighting: Custom Lighting Store Case Study",
    },
    slug: "art-lighting-store",
    projectType: "ecommerce",
    summary: {
      ar: "متجر إلكتروني مخصص على Next.js لبائع إضاءة فاخرة، بالعربية والإنجليزية: كتالوج حسب الفئة وصور منتجات عالية الدقة.",
      en: "A custom Next.js online store for a premium lighting retailer, in Arabic and English: a catalog by category and high-resolution product images.",
    },
    services: ["interface-design", "development"],
    externalUrl: "https://www.artlighting-eg.com",
    // TODO(ali): real measured results (before/after load time, Lighthouse, orders/conversion) and a client quote with name and role.
  },
  {
    kind: "own",
    client: {
      ar: "Altruvex (موقعنا)",
      en: "Altruvex (our own site)",
    },
    industry: {
      ar: "تطوير مواقع ويب مخصصة",
      en: "Custom web development",
    },
    keywords: {
      ar: [
        "دراسة حالة ألتروفيكس",
        "موقع وكالة Next.js",
        "كيف بنينا موقعنا",
        "تطوير مواقع ويب مخصصة",
      ],
      en: [
        "altruvex case study",
        "next.js agency website",
        "how we built our site",
        "custom web development",
      ],
    },
    name: {
      ar: "Altruvex.com — كيف بنينا موقعنا على Next.js",
      en: "Altruvex.com — how we built our own site on Next.js",
    },
    slug: "altruvex-site",
    projectType: "website",
    summary: {
      ar: "موقعنا نفسه، وليس مشروعًا لعميل: مبني على Next.js، بتخطيط ينعكس كاملًا من اليمين إلى اليسار وأداة عامة لتقدير تكلفة المشروع.",
      en: "Our own site, not a client project: built on Next.js, with a layout that mirrors fully right to left and a public project cost estimator.",
    },
    services: ["interface-design", "development"],
    externalUrl: "https://altruvex.com",
  },
];

export function getAllCaseStudies() {
  return CASE_STUDIES;
}

/** Portfolio work only: every list or count of client work reads this, never CASE_STUDIES. */
export function getClientCaseStudies() {
  return CASE_STUDIES.filter((caseStudy) => caseStudy.kind === "client");
}

export function getCaseStudyBySlug(slug: string): CaseStudyRecord | null {
  return CASE_STUDIES.find((caseStudy) => caseStudy.slug === slug) ?? null;
}
