import type { SupportedLocale } from "@/lib/metadata";

type LocalizedValue = Record<SupportedLocale, string>;

type CaseStudyMetric = {
  label: LocalizedValue;
  value: string;
};

export const CASE_STUDY_SLUGS = [
  "altruvex-site",
  "art-lighting-store",
  "newlight-lighting-store",
] as const;

export type CaseStudySlug = (typeof CASE_STUDY_SLUGS)[number];

export type CaseStudyRecord = {
  client: LocalizedValue;
  industry: LocalizedValue;
  keywords: Record<SupportedLocale, string[]>;
  metrics: CaseStudyMetric[];
  name: LocalizedValue;
  slug: CaseStudySlug;
  summary: LocalizedValue;
  year: string;
  externalUrl?: string;
  /** Base path for production screenshots; `-light.png`/`-dark.png` are appended. */
  screenshot?: string;
};

export const CASE_STUDIES: CaseStudyRecord[] = [
  {
    client: {
      ar: "داخلي / ألتروفيكس",
      en: "Internal / Altruvex",
    },
    industry: {
      ar: "تطوير الويب / وكالة",
      en: "Web Engineering / Agency",
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
    metrics: [
      {
        label: {
          ar: "وقت التفاعل على الجوال",
          en: "Mobile TTI",
        },
        value: "< 1s",
      },
      {
        label: {
          ar: "سرعة تبديل العربي",
          en: "RTL Switch",
        },
        value: "< 16ms",
      },
      {
        label: {
          ar: "تأهيل العملاء",
          en: "Discovery-call time",
        },
        value: "-40%",
      },
    ],
    name: {
      ar: "Altruvex.com - كان على الموقع نفسه أن يكون الدليل",
      en: "Altruvex.com - The Site Itself Had to Be the Proof",
    },
    slug: "altruvex-site",
    summary: {
      ar: "مشروع موقع ويب متعدد اللغات صُمم لإظهار الجودة التقنية والتنفيذ الأصلي لـ RTL وتأهيل العميل المحتمل قبل أول مكالمة.",
      en: "A bilingual multilingual proof build designed to demonstrate technical quality, native RTL execution, and lead qualification before the first call.",
    },
    year: "2025",
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
    metrics: [
      {
        label: {
          ar: "الأداء",
          en: "Performance",
        },
        value: "95+ Lighthouse",
      },
      {
        label: {
          ar: "الكتالوج",
          en: "Catalog",
        },
        value: "High-res zoom",
      },
      {
        label: {
          ar: "المخزون",
          en: "Inventory",
        },
        value: "Synced live",
      },
    ],
    name: {
      ar: "متجر آرت لايتنج للإضاءة",
      en: "Art Lighting Store",
    },
    slug: "art-lighting-store",
    summary: {
      ar: "صور منتجات عالية الدقة على نطاق واسع مع مخزون في الوقت الفعلي وتحميل سريع للصفحات لبائع تجزئة للإضاءة الفاخرة.",
      en: "High-resolution product imagery at scale with real-time inventory and fast page loads for a premium lighting retailer.",
    },
    year: "2024",
    externalUrl: "https://www.artlighting-eg.com",
    screenshot: "/projects/artlighting-eg.com",
  },
  {
    client: {
      ar: "نيو لايت",
      en: "NewLight",
    },
    industry: {
      ar: "إضاءة وتجارة إلكترونية",
      en: "Lighting & E-Commerce",
    },
    keywords: {
      ar: [
        "بناء أول متجر إلكتروني",
        "تجارة إلكترونية للإضاءة",
        "متجر Next.js مخصص",
        "التحول الرقمي",
      ],
      en: [
        "first e-commerce build",
        "lighting online store",
        "custom next.js shop",
        "digital transformation",
      ],
    },
    metrics: [
      {
        label: {
          ar: "التسليم",
          en: "Delivery",
        },
        value: "Live site",
      },
      {
        label: {
          ar: "اللغات",
          en: "Languages",
        },
        value: "EN / AR",
      },
      {
        label: {
          ar: "النطاق",
          en: "Scope",
        },
        value: "First store",
      },
    ],
    name: {
      ar: "متجر نيو لايت للإضاءة - الانطلاق نحو التجارة الإلكترونية",
      en: "NewLight Lighting Store - Venturing into E-Commerce",
    },
    slug: "newlight-lighting-store",
    summary: {
      ar: "عندما قررت نيو لايت دخول عالم التجارة الإلكترونية لأول مرة، قمنا ببناء متجر متكامل يجمع بين التصميم الفاخر وسهولة الشراء، محققين كافة تطلعاتهم التقنية والتجارية.",
      en: "When NewLight decided to launch their first online store, we built a custom e-commerce platform that matches their brand and supports bilingual buying on every device.",
    },
    year: "2024",
    externalUrl: "https://www.newlight-eg.com/",
    screenshot: "/projects/newlight-eg.com",
  },
];

export function getAllCaseStudies() {
  return CASE_STUDIES;
}

export function getCaseStudyBySlug(slug: string): CaseStudyRecord | null {
  return CASE_STUDIES.find((caseStudy) => caseStudy.slug === slug) ?? null;
}
