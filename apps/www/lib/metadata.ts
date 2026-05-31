import type { Metadata } from "next";

export const SUPPORTED_LOCALES = ["en", "ar"] as const;

export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

type LocalizedSeoEntry = {
  breadcrumb: string;
  description: string;
  keywords: readonly string[];
  title: string;
};

type PageMetadataEntry = {
  ar: LocalizedSeoEntry;
  en: LocalizedSeoEntry;
  path: string;
  robots?: Metadata["robots"];
};

export const SITE_CONFIG = {
  defaultLocale: "en" as SupportedLocale,
  description: {
    ar: "ألتروفيكس تبني أنظمة ويب دقيقة ثنائية اللغة للفرق التي تحتاج أداءً حقيقياً ووضوحاً تقنياً وتجربة عربية/إنجليزية متكافئة.",
    en: "Altruvex builds precision web systems for teams that need bilingual execution, technical clarity, and performance that holds up in production.",
  },
  email: "hello@altruvex.com",
  founder: {
    description: {
      ar: "المؤسس والمهندس الرئيسي في Altruvex، ويقود بناء أنظمة الويب المخصصة وواجهات العربية والإنجليزية.",
      en: "Founder and lead engineer at Altruvex, focused on custom web systems and Arabic/English product delivery.",
    },
    jobTitle: {
      ar: "المؤسس والمهندس الرئيسي",
      en: "Founder & Lead Engineer",
    },
    linkedin: "https://www.linkedin.com/in/ali-abdelhadi-65094b283/",
    name: "Ali Abdelhadi",
  },
  location: {
    city: "Cairo",
    country: "Egypt",
    countryCode: "EG",
    region: "Cairo Governorate",
  },
  locales: SUPPORTED_LOCALES,
  name: "Altruvex",
  phone: "+20 102 312 5493",
  social: {
    facebook: "https://www.facebook.com/profile.php?id=61580710300593",
    github: "https://github.com/altruvex/www",
    instagram: "https://www.instagram.com/altruvex/",
    linkedin: "https://www.linkedin.com/company/altruvex/",
    threads: "https://www.threads.com/@altruvex",
    x: "https://x.com/altruvex",
    dribbble: "https://dribbble.com/altruvex",
  },
  twitterHandle: "@altruvex",
  url:
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : "https://altruvex.com"),
} as const;

const METADATA_DEFAULTS = {
  defaultDescription: SITE_CONFIG.description,
  entityKeywords: {
    ar: ["ألتروفيكس", "علي عبد الهادي", "القاهرة", "مصر"],
    en: ["Altruvex", "Ali Abdelhadi", "Cairo", "Egypt"],
  },
  keywords: {
    ar: [
      "تطوير ويب مخصص",
      "تصميم مواقع ويب مخصصة",
      "وكالة Next.js",
      "أنظمة ويب دقيقة",
      "مواقع ثنائية اللغة",
    ],
    en: [
      "custom web development",
      "custom web design",
      "Next.js development agency",
      "custom web development",
      "bilingual web systems",  
    ],
  },
  robots: {
    follow: true,
    googleBot: {
      follow: true,
      index: true,
      "max-image-preview": "large" as const,
      "max-snippet": -1,
      "max-video-preview": -1,
    },
    index: true,
  } satisfies Metadata["robots"],
  titleTemplate: "%s | Altruvex",
} as const;

export const PAGE_METADATA = {
  approach: {
    ar: {
      breadcrumb: "النهج",
      description:
        "تعرّف على نهج Altruvex في تطوير مواقع ويب مخصصة وتطوير دقيق والمعمارية ثنائية اللغة والأنظمة التي تبقى قابلة للصيانة مع النمو.",
      keywords: [
        "نهج تطوير مواقع ويب مخصصة",
        "معمارية المواقع متعددة اللغات",
        "أنظمة مواقع ويب مخصصة دقيقة",
        "بناء مواقع قابلة للتوسع",
      ],
      title: "نهج أنظمة مواقع ويب مخصصة دقيقة",
    },
    en: {
      breadcrumb: "Approach",
      description:
        "Understand Altruvex's approach to technical web engineering, bilingual architecture, and systems that stay maintainable under growth.",
      keywords: [
        "precision web systems",
        "technical web engineering approach",
        "bilingual web architecture",
        "scalable web systems",
      ],
      title: "Precision Web Systems Approach",
    },
    path: "/approach",
  },
  about: {
    ar: {
      breadcrumb: "من نحن",
      description:
        "تعرّف على Altruvex والمؤسس الذي يقود تطوير مواقع ويب مخصصة وبناء أنظمة Next.js ثنائية اللغة من القاهرة إلى مصر والمنطقة.",
      keywords: [
        "من هي ألتروفيكس",
        "علي عبد الهادي",
        "تطوير مواقع ويب مخصصة من القاهرة",
        "وكالة Next.js يقودها المؤسس",
      ],
      title: "من نحن | شركة تطوير مواقع ويب مخصصة للانظمة المعقده ومتعدده اللغات",
    },
    en: {
      breadcrumb: "About",
      description:
        "Meet Altruvex and the founder leading precision web engineering, bilingual Next.js systems, and founder-led delivery from Cairo.",
      keywords: [
        "about altruvex",
        "ali abdelhadi",
        "founder-led web engineering",
        "next.js agency cairo",
      ],
      title: "About Altruvex | Founder-Led Web Engineering",
    },
    path: "/about",
  },
  contact: {
    ar: {
      breadcrumb: "تواصل معنا",
      description:
        "ابدأ محادثة مباشرة مع Altruvex حول تطوير ويب مخصص أو تدقيق تقني أو تسليم Next.js من القاهرة إلى مصر والمنطقة.",
      keywords: [
        "تواصل مع وكالة تطوير ويب",
        "استشارة Next.js",
        "فريق تطوير مواقع ويب مخصصة القاهرة",
        "مكالمة تقنية",
      ],
      title: "تحدث مع فريق تطوير مواقع ويب مخصصة في القاهرة",
    },
    en: {
      breadcrumb: "Contact",
      description:
        "Talk to Altruvex about custom web development, technical audits, or Next.js delivery. Start with a founder-led conversation from Cairo.",
      keywords: [
        "contact next.js agency",
        "custom web development cairo",
        "technical web engineering team",
        "book a technical call",
      ],
      title: "Talk to a Cairo Web Engineering Team",
    },
    path: "/contact",
  },
  transparency: {
    ar: {
      breadcrumb: "الشفافية",
      description:
        "حدّد نطاق موقع مخصص أو بوابة أو بناء منتج قبل أول مكالمة. استخدم تجربة الشفافية من Altruvex المبنية على التعقيد الهندسي الحقيقي.",
      keywords: [
        "تقدير تكلفة تطوير موقع",
        "تسعير تطوير ويب مخصص",
        "شفافية مشروع Next.js",
        "نطاق بوابة أعمال",
      ],
      title: "الشفافية في نطاق وتكلفة البناء",
    },
    en: {
      breadcrumb: "Transparency",
      description:
        "Scope the range for a custom website, portal, or product build before the first call. Use Altruvex's Transparency experience based on real engineering complexity.",
      keywords: [
        "transparent web development scoping",
        "custom web project estimate",
        "next.js project pricing",
        "portal build estimate",
      ],
      title: "Transparent Custom Web Build Scoping",
    },
    path: "/transparency",
  },
  home: {
    ar: {
      breadcrumb: "الرئيسية",
      description:
        "تطوير ويب مخصص وتطوير دقيق Next.js لفرق مصر والمنطقة. نبني أنظمة ثنائية اللغة عالية الأداء يقودها المؤسس من القاهرة.",
      keywords: [
        "تطوير ويب مخصص القاهرة",
        "تطوير مواقع ويب مخصصة وتطوير دقيق",
        "وكالة Next.js مصر",
        "أنظمة مواقع ويب مخصصة متعددة اللغات",
      ],
      title: "تطوير مواقع ويب مخصصة وتطوير دقيق",
    },
    en: {
      breadcrumb: "Home",
      description:
        "Custom web development and Next.js engineering for Cairo and MENA brands. Build bilingual, high-performance systems with a founder-led team.",
      keywords: [
        "precision web development cairo",
        "custom web development cairo",
        "next.js development agency",
        "technical web engineering",
      ],
      title: "Precision Web Development",
    },
    path: "/",
  },
  howWeWork: {
    ar: {
      breadcrumb: "كيف نعمل",
      description:
        "تعرّف كيف تتعامل Altruvex مع التعاون والنطاق والتواصل والملكية في مشاريع تطوير مواقع ويب مخصصة وتطوير دقيق الجادة من أول خطوة حتى التسليم.",
      keywords: [
        "كيف تعمل وكالة ويب",
        "ملكية التنفيذ التقني",
        "عملية تطوير مواقع مخصصة",
        "تعاون تطوير مواقع ويب مخصصة",
      ],
      title: "كيف تسلّم Altruvex الأعمال التقنية",
    },
    en: {
      breadcrumb: "How We Work",
      description:
        "Learn how Altruvex handles collaboration, scope, communication, and ownership on serious web engineering engagements.",
      keywords: [
        "how a next.js agency works",
        "technical delivery model",
        "web engineering collaboration",
        "founder-led execution",
      ],
      title: "How Altruvex Delivers Technical Work",
    },
    path: "/how-we-work",
  },
  offline: {
    ar: {
      breadcrumb: "دون اتصال",
      description:
        "هذه الصفحة مخصصة لحالة انقطاع الاتصال ولا تستهدف الظهور في نتائج البحث.",
      keywords: ["صفحة دون اتصال"],
      title: "دون اتصال",
    },
    en: {
      breadcrumb: "Offline",
      description:
        "This offline state page exists for connection loss and is not intended to rank in search results.",
      keywords: ["offline page"],
      title: "Offline",
    },
    path: "/offline",
    robots: {
      follow: false,
      googleBot: {
        follow: false,
        index: false,
      },
      index: false,
    },
  },
  pricing: {
    ar: {
      breadcrumb: "التسعير",
      description:
        "شاهد كيف تحدد Altruvex نطاق أنظمة المواقع والبوابات وبناء المنتجات المخصصة. قارن نطاقات التعاون وحدد خطوتك التالية.",
      keywords: [
        "تسعير تطوير ويب مخصص",
        "تسعير وكالة Next.js",
        "نطاق بناء بوابات",
        "تكلفة أنظمة المواقع",
      ],
      title: "تسعير تطوير مواقع ويب مخصصة ونماذج التعاون",
    },
    en: {
      breadcrumb: "Pricing",
      description:
        "See how Altruvex scopes custom website systems, portals, and product builds. Compare engagement ranges and qualify your next step.",
      keywords: [
        "web engineering pricing",
        "custom web development cost",
        "next.js agency pricing",
        "portal engagement model",
      ],
      title: "Web Engineering Pricing & Engagements",
    },
    path: "/pricing",
  },
  privacy: {
    ar: {
      breadcrumb: "سياسة الخصوصية",
      description:
        "اطّلع على كيفية جمع Altruvex للبيانات الشخصية واستخدامها وحمايتها عند استخدام الموقع أو نماذج التواصل الخاصة بنا.",
      keywords: ["سياسة الخصوصية ألتروفيكس", "بيانات العملاء"],
      title: "سياسة الخصوصية",
    },
    en: {
      breadcrumb: "Privacy Policy",
      description:
        "Review how Altruvex collects, uses, and protects personal data when you use the site or contact forms.",
      keywords: ["altruvex privacy policy", "website privacy policy"],
      title: "Privacy Policy",
    },
    path: "/privacy",
  },
  process: {
    ar: {
      breadcrumb: "العملية",
      description:
        "شاهد كيف تنتقل Altruvex من الاكتشاف إلى الإطلاق عبر قرارات تقنية واضحة وضبط جودة ثنائي اللغة وتسليم مواقع ويب مخصصة جاهز للإنتاج.",
      keywords: [
        "عملية تطوير ويب",
        "تسليم مشاريع Next.js",
        "ضبط جودة ثنائي اللغة",
        "إطلاق مواقع مخصصة",
      ],
      title: "عملية تطوير مواقع ويب مخصصة",
    },
    en: {
      breadcrumb: "Process",
      description:
        "See how Altruvex moves from discovery to launch with clear technical decisions, bilingual QA, and production-ready delivery.",
      keywords: [
        "web delivery process",
        "next.js project delivery",
        "bilingual qa process",
        "custom website launch process",
      ],
      title: "Web Delivery Process",
    },
    path: "/process",
  },
  schedule: {
    ar: {
      breadcrumb: "احجز موعداً",
      description:
        "احجز مكالمة اكتشاف تقنية مع Altruvex لاختبار النطاق وتوضيح المخاطر وتحديد مسار البناء الصحيح قبل الالتزام بالميزانية.",
      keywords: [
        "حجز مكالمة تقنية",
        "اكتشاف مشروع مواقع ويب مخصصة",
        "استشارة مواقع ويب مخصصة",
        "مكالمة مع وكالة تطوير مواقع ويب مخصصة",
      ],
      title: "احجز مكالمة اكتشاف تقنية",
    },
    en: {
      breadcrumb: "Schedule",
      description:
        "Book a technical discovery call with Altruvex and pressure-test your scope before you commit budget, team time, or architecture.",
      keywords: [
        "schedule technical discovery call",
        "web engineering consultation",
        "next.js discovery call",
        "technical project scoping",
      ],
      title: "Schedule a Technical Discovery Call",
    },
    path: "/schedule",
  },
  serviceConsulting: {
    ar: {
      breadcrumb: "الاستشارات التقنية",
      description:
        "احصل على تدقيق تقني ومراجعة معمارية وخارطة طريق واضحة قبل إعادة البناء أو النقل أو توسيع نظام ويب شديد الحساسية.",
      keywords: [
        "استشارات تطوير مواقع ويب",
        "تدقيق تقني Next.js",
        "مراجعة معمارية مواقع",
        "خارطة طريق تقنية",
      ],
      title: "استشارات تطوير مواقع ويب مخصصة وتطوير دقيق",
    },
    en: {
      breadcrumb: "Technical Consulting",
      description:
        "Get a technical audit, architecture review, and clear build roadmap before you rebuild, migrate, or scale a revenue-critical web system.",
      keywords: [
        "technical web engineering consulting",
        "next.js architecture review",
        "web platform audit",
        "technical audit cairo",
      ],
      title: "Technical Web Engineering Consulting",
    },
    path: "/services/consulting",
  },
  serviceDevelopment: {
    ar: {
      breadcrumb: "تطوير Next.js",
      description:
        "استعن بوكالة تطوير Next.js لبناء بوابات ومنتجات ولوحات تحكم وأنظمة مواقع ويب مخصصة ثنائية اللغة مصممة للتوسع والسرعة والتسليم النظيف.",
      keywords: [
        "وكالة تطوير Next.js",
        "بناء بوابات أعمال",
        "تطوير منتجات ويب مخصصة",
        "أنظمة مواقع ويب مخصصة ثنائية اللغة",
      ],
      title: "وكالة تطوير Next.js",
    },
    en: {
      breadcrumb: "Next.js Development",
      description:
        "Hire a Next.js development agency for portals, product builds, dashboards, and bilingual web systems engineered for scale and clean handoff.",
      keywords: [
        "next.js development agency",
        "custom portal development",
        "technical web engineering agency",
        "bilingual product development",
      ],
      title: "Next.js Development Agency",
    },
    path: "/services/development",
  },
  serviceInterfaceDesign: {
    ar: {
      breadcrumb: "تصميم واجهات المواقع",
      description:
        "صمّم واجهات تركّز على التحويل وأنظمة مكونات وتجارب عربية/إنجليزية مع مواصفات جاهزة للتنفيذ وإمكانية وصول مدروسة.",
      keywords: [
        "تصميم واجهات مخصصة",
        "تصميم أنظمة مكونات",
        "واجهة استخدام ثنائية اللغة",
        "تصميم UI قابل للتنفيذ",
      ],
      title: "خدمات تصميم واجهات المواقع وأنظمة التصميم المخصصة",
    },
    en: {
      breadcrumb: "UI Engineering",
      description:
        "Design conversion-focused interfaces, component systems, and bilingual website experiences with implementation-ready UI engineering.",
      keywords: [
        "custom ui engineering",
        "interface design cairo",
        "design systems agency",
        "bilingual interface design",
      ],
      title: "Custom UI Engineering Services",
    },
    path: "/services/interface-design",
  },
  serviceMaintenance: {
    ar: {
      breadcrumb: "الصيانة والتطوير",
      description:
        "حافظ على أنظمة الويب المخصصة سريعة وآمنة وجاهزة للإصدارات عبر صيانة مستمرة ومراقبة ودعم منتج تكراري من Altruvex.",
      keywords: [
        "صيانة مواقع مخصصة",
        "دعم Next.js مستمر",
        "مراقبة أداء الأنظمة",
        "صيانة بوابات الأعمال",
      ],
      title: "صيانة الأنظمة المخصصة وتطويرها",
    },
    en: {
      breadcrumb: "Maintenance & Support",
      description:
        "Keep custom web systems fast, secure, and release-ready with ongoing maintenance, monitoring, and iterative product support from Altruvex.",
      keywords: [
        "website maintenance for custom systems",
        "next.js maintenance retainer",
        "ongoing web engineering support",
        "product maintenance partner",
      ],
      title: "Website Maintenance for Custom Systems",
    },
    path: "/services/maintenance",
  },
  serviceEcommerce: {
    ar: {
      breadcrumb: "التجارة الإلكترونية",
      description:
        "ابنِ متجراً إلكترونياً مخصصاً على Next.js مع كتالوج عالي الدقة ومخزون متزامن وسداد ثنائي اللغة—مصمم للتجزئة الفاخرة في مصر والمنطقة.",
      keywords: [
        "تطوير متجر إلكتروني مخصص",
        "وكالة تجارة إلكترونية القاهرة",
        "متجر Next.js ثنائي اللغة",
        "بناء متجر إضاءة إلكتروني",
      ],
      title: "تطوير متاجر إلكترونية مخصصة | Next.js",
    },
    en: {
      breadcrumb: "E-Commerce",
      description:
        "Build a custom Next.js e-commerce store with high-resolution catalogs, synced inventory, bilingual checkout, and production-grade performance for Cairo and MENA retail brands.",
      keywords: [
        "custom ecommerce development cairo",
        "next.js ecommerce agency",
        "bilingual online store development",
        "custom shopify alternative nextjs",
      ],
      title: "Custom E-Commerce Development | Next.js Stores",
    },
    path: "/services/ecommerce",
  },
  services: {
    ar: {
      breadcrumb: "الخدمات",
      description:
        "استكشف تطوير مواقع ويب مخصصة والاستشارات التقنية وأنظمة الواجهات والصيانة المستمرة للمنتجات ثنائية اللغة والأنظمة الموجهة للأعمال.",
      keywords: [
        "خدمات تطوير مواقع ويب مخصصة",
        "خدمات Next.js",
        "استشارات تقنية لمواقع ويب مخصصة",
        "صيانة أنظمة ويب",
      ],
      title: "خدمات تطوير مواقع ويب مخصصة",
    },
    en: {
      breadcrumb: "Services",
      description:
        "Explore custom web development, technical consulting, interface systems, and ongoing maintenance for bilingual B2B products and websites.",
      keywords: [
        "custom web development services",
        "technical web engineering services",
        "next.js services",
        "precision web systems",
      ],
      title: "Custom Web Development Services",
    },
    path: "/services",
  },
  standards: {
    ar: {
      breadcrumb: "المعايير",
      description:
        "راجع معايير الأداء وإمكانية الوصول والأمان والتصميم التي تطبقها Altruvex على كل نظام ويب مخصص.",
      keywords: [
        "معايير تطوير مواقع ويب مخصصة",
        "أداء المواقع",
        "إمكانية الوصول",
        "أمان التطبيقات",
      ],
      title: "معايير تطوير مواقع ويب مخصصة",
    },
    en: {
      breadcrumb: "Standards",
      description:
        "Review the performance, accessibility, security, and engineering standards Altruvex applies to every custom web system.",
      keywords: [
        "web engineering standards",
        "website performance standards",
        "accessibility standards",
        "secure web development",
      ],
      title: "Web Engineering Standards",
    },
    path: "/standards",
  },
  terms: {
    ar: {
      breadcrumb: "شروط الخدمة",
      description:
        "راجع الشروط التي تحكم استخدامك لموقع Altruvex وخدماته ونماذج التواصل والمحتوى المنشور عليه.",
      keywords: ["شروط خدمة ألتروفيكس", "الشروط القانونية للموقع"],
      title: "شروط الخدمة",
    },
    en: {
      breadcrumb: "Terms of Service",
      description:
        "Review the terms that govern your use of the Altruvex website, services, contact forms, and published content.",
      keywords: ["altruvex terms of service", "website terms and conditions"],
      title: "Terms of Service",
    },
    path: "/terms",
  },
  work: {
    ar: {
      breadcrumb: "دراسات الحالة",
      description:
        "راجع دراسات حالة Altruvex في التجارة الإلكترونية والمكوّنات التفاعلية والمنصات الثنائية اللغة مع الأرقام والقرارات التقنية والنتائج.",
      keywords: [
        "دراسات حالة تطوير مواقع ويب",
        "مشاريع Next.js",
        "دراسات حالة مواقع ثنائية اللغة",
        "أعمال Altruvex",
      ],
      title: "دراسات حالة تطوير مواقع ويب مخصصة",
    },
    en: {
      breadcrumb: "Case Studies",
      description:
        "Review Altruvex case studies across ecommerce, configurators, and bilingual B2B platforms. See metrics, architecture, and outcomes.",
      keywords: [
        "web engineering case studies",
        "next.js case studies",
        "bilingual website case studies",
        "custom web development portfolio",
      ],
      title: "Web Engineering Case Studies",
    },
    path: "/work",
  },
  workCaseStudy: {
    ar: {
      breadcrumb: "دراسة حالة",
      description:
        "اقرأ دراسة حالة مفصلة من Altruvex تشمل السياق والقرارات التقنية والبنية والنتائج التجارية.",
      keywords: ["دراسة حالة ويب", "نتائج مشاريع Next.js", "تصميم مواقع ويب مخصصة"],
      title: "دراسة حالة",
    },
    en: {
      breadcrumb: "Case Study",
      description:
        "Read a detailed Altruvex case study covering the context, architecture, delivery choices, and commercial outcomes.",
      keywords: [
        "web engineering case study",
        "next.js delivery case study",
        "custom web systems proof",
      ],
      title: "Case Study",
    },
    path: "/work",
  },
  writing: {
    ar: {
      breadcrumb: "الكتابة",
      description:
        "اقرأ مقالات Altruvex حول تطوير مواقع ويب مخصصة والمعمارية متعددة اللغات والأداء وتسليم المنتجات المخصصة.",
      keywords: [
        "مقالات تطوير مواقع ويب مخصصة",
        "معمارية متعددة اللغات",
        "أداء الويب",
        "محتوى Next.js",
      ],
      title: "رؤى تطوير مواقع ويب مخصصة",
    },
    en: {
      breadcrumb: "Writing",
      description:
        "Read Altruvex articles on technical web engineering, multilingual architecture, performance, and custom product delivery.",
      keywords: [
        "web engineering insights",
        "technical web engineering articles",
        "multilingual architecture",
        "next.js performance writing",
      ],
      title: "Web Engineering Insights",
    },
    path: "/writing",
  },
} as const satisfies Record<string, PageMetadataEntry>;

export type RouteMetaKey = keyof typeof PAGE_METADATA;

type MetadataOverrides = {
  canonicalPath?: string;
  description?: string;
  keywords?: readonly string[];
  modifiedTime?: string;
  openGraphType?: "article" | "website";
  publishedTime?: string;
  robots?: Metadata["robots"];
  title?: string;
};

export function normalizeLocale(locale: string): SupportedLocale {
  return locale === "ar" ? "ar" : "en";
}

function normalizePath(pathSuffix: string): string {
  if (!pathSuffix || pathSuffix === "/") {
    return "/";
  }

  return pathSuffix.startsWith("/") ? pathSuffix : `/${pathSuffix}`;
}

function getLocalizedPath(locale: string, pathSuffix: string): string {
  const loc = normalizeLocale(locale);
  const path = normalizePath(pathSuffix);

  return path === "/" ? `/${loc}` : `/${loc}${path}`;
}

export function getLocalizedUrl(locale: string, pathSuffix: string): string {
  return `${SITE_CONFIG.url}${getLocalizedPath(locale, pathSuffix)}`;
}

export function getLocalizedSeoEntry(locale: string, key: RouteMetaKey) {
  return PAGE_METADATA[key][normalizeLocale(locale)];
}

function buildOgImageUrl(locale: string): string {
  return getLocalizedUrl(locale, "/opengraph-image");
}

function formatTitle(title: string): string {
  if (title.includes("|")) {
    return title;
  }

  return METADATA_DEFAULTS.titleTemplate.replace("%s", title);
}

function buildAlternates(pathSuffix: string) {
  const path = normalizePath(pathSuffix);

  return Object.fromEntries(
    SUPPORTED_LOCALES.map((locale) => [locale, getLocalizedUrl(locale, path)]),
  ) as Record<SupportedLocale, string>;
}

function buildKeywords(locale: SupportedLocale, pageKeywords: string[] = []) {
  return Array.from(
    new Set([
      ...METADATA_DEFAULTS.keywords[locale],
      ...METADATA_DEFAULTS.entityKeywords[locale],
      ...pageKeywords,
    ]),
  );
}

export function generateRouteMetadata(
  locale: string,
  key: RouteMetaKey,
  pathSuffix: string,
  overrides: MetadataOverrides = {},
): Metadata {
  const loc = normalizeLocale(locale);
  const entry = PAGE_METADATA[key][loc];
  const canonicalPath = overrides.canonicalPath ?? pathSuffix;
  const canonicalUrl = getLocalizedUrl(loc, canonicalPath);
  const title = formatTitle(overrides.title ?? entry.title);
  const description = overrides.description ?? entry.description;
  const keywords = buildKeywords(loc, [
    ...entry.keywords,
    ...(overrides.keywords ?? []),
  ]);
  const ogImageUrl = buildOgImageUrl(loc);
  const pageRobots = (PAGE_METADATA[key] as PageMetadataEntry).robots;
  const robots = overrides.robots ?? pageRobots ?? METADATA_DEFAULTS.robots;
  const openGraphType = overrides.openGraphType ?? "website";

  const openGraph = {
    description,
    images: [
      {
        alt: title,
        height: 630,
        url: ogImageUrl,
        width: 1200,
      },
    ],
    locale: loc === "ar" ? "ar_EG" : "en_US",
    siteName: SITE_CONFIG.name,
    ...(openGraphType === "article"
      ? {
          authors: [SITE_CONFIG.founder.name],
          modifiedTime: overrides.modifiedTime ?? overrides.publishedTime,
          publishedTime: overrides.publishedTime,
          tags: keywords.slice(0, 8),
        }
      : {}),
    title,
    type: openGraphType,
    url: canonicalUrl,
  } as Metadata["openGraph"];

  return {
    alternates: {
      canonical: canonicalUrl,
      languages: {
        ...buildAlternates(canonicalPath),
        "x-default": getLocalizedUrl(SITE_CONFIG.defaultLocale, canonicalPath),
      },
    },
    authors: [{ name: SITE_CONFIG.founder.name }],
    creator: SITE_CONFIG.name,
    description,
    keywords,
    metadataBase: new URL(SITE_CONFIG.url ?? "https://altruvex.com"),
    verification: {
      google: process.env.GOOGLE_SITE_VERIFICATION,
      other: process.env.BING_SITE_VERIFICATION
        ? { "msvalidate.01": process.env.BING_SITE_VERIFICATION }
        : undefined,
    },
    openGraph,
    publisher: SITE_CONFIG.name,
    robots,
    title,
    twitter: {
      card: "summary_large_image",
      creator: SITE_CONFIG.twitterHandle,
      description,
      images: [ogImageUrl],
      site: SITE_CONFIG.twitterHandle,
      title,
    },
  };
}
