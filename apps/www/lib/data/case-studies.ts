import type { ServiceSlug } from "@/lib/config/accent-world";
import type { SupportedLocale } from "@/lib/metadata";

type LocalizedValue = Record<SupportedLocale, string>;

type CaseStudySlug =
  | "altruvex-site"
  | "art-lighting-store"
  | "newlight-lighting-store";

export type CaseStudyRecord = {
  client: LocalizedValue;
  industry: LocalizedValue;
  keywords: Record<SupportedLocale, string[]>;
  name: LocalizedValue;
  /** Shorter <title> when `name` + " | Altruvex" would exceed 60 characters. */
  seoTitle?: LocalizedValue;
  slug: CaseStudySlug;
  summary: LocalizedValue;
  services: readonly ServiceSlug[];
  externalUrl?: string;
};

export const CASE_STUDIES: CaseStudyRecord[] = [
  {
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
        "موقع ثنائي اللغة",
        "تطوير مواقع ويب مخصصة",
      ],
      en: [
        "altruvex case study",
        "next.js agency website",
        "bilingual website case study",
        "custom web development",
      ],
    },
    name: {
      ar: "Altruvex.com — موقع شركة ثنائي اللغة على Next.js",
      en: "Altruvex.com — a bilingual Next.js studio website",
    },
    slug: "altruvex-site",
    summary: {
      ar: "موقع ثنائي اللغة بالعربية والإنجليزية على Next.js، باتجاه عربي أصيل من اليمين إلى اليسار وأداة عامة لتقدير تكلفة المشروع.",
      en: "A bilingual English and Arabic website on Next.js, with native right-to-left layout and a public project cost estimator.",
    },
    services: ["interface-design", "development"],
    externalUrl: "https://altruvex.com",
  },
  {
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
    summary: {
      ar: "متجر إلكتروني مخصص على Next.js لبائع إضاءة فاخرة، بالعربية والإنجليزية: كتالوج حسب الفئة وصور منتجات عالية الدقة.",
      en: "A custom Next.js online store for a premium lighting retailer, in Arabic and English: a catalog by category and high-resolution product images.",
    },
    services: ["interface-design", "development"],
    externalUrl: "https://www.artlighting-eg.com",
  },
  {
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
    summary: {
      ar: "أول متجر إلكتروني لنيو لايت: متجر مخصص ثنائي اللغة بمسار شراء منظم، يعمل على كل جهاز ويمكن تثبيته على الهاتف.",
      en: "NewLight's first online store: a custom bilingual storefront with a structured checkout, built for every device and installable on a phone.",
    },
    services: ["interface-design", "development"],
    externalUrl: "https://www.newlight-eg.com/",
  },
];

export function getAllCaseStudies() {
  return CASE_STUDIES;
}

export function getCaseStudyBySlug(slug: string): CaseStudyRecord | null {
  return CASE_STUDIES.find((caseStudy) => caseStudy.slug === slug) ?? null;
}
