import type { Metadata } from "next";
import { LOCALE_META, toLocale, type Locale } from "@/i18n/locale-meta";
import { routing } from "@/i18n/routing";

/** The routing config is the one locale list; these names stay for existing callers. */
export const SUPPORTED_LOCALES = routing.locales;

export type SupportedLocale = Locale;

const DEFAULT_SITE_URL = "https://www.altruvex.com";

function resolveSiteUrl() {
  const configuredUrl = process.env.NEXT_PUBLIC_APP_URL;
  const vercelProductionUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL;

  if (
    configuredUrl &&
    (process.env.NODE_ENV !== "production" ||
      !/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(configuredUrl))
  ) {
    return configuredUrl.replace(/\/$/, "");
  }

  if (vercelProductionUrl) {
    return `https://${vercelProductionUrl}`.replace(/\/$/, "");
  }

  return DEFAULT_SITE_URL;
}

type LocalizedSeoEntry = {
  breadcrumb: string;
  description: string;
  keywords: readonly string[];
  title: string;
};

type PageMetadataEntry = Record<SupportedLocale, LocalizedSeoEntry> & {
  path: string;
  robots?: Metadata["robots"];
};

export const SITE_CONFIG = {
  alternateNames: ["Altruvex Web Engineering"],
  defaultLocale: routing.defaultLocale as SupportedLocale,
  description: {
    ar: "Altruvex استوديو هندسة ويب يصمم ويبني مواقع وتطبيقات ويب مخصصة باستخدام Next.js، وتنتقل ملكية الكود المصدري كاملًا إلى العميل عند الدفعة الأخيرة.",
    en: "Altruvex is a web engineering studio that designs and builds custom websites and web apps with Next.js. The client owns the full source code once the final payment is made.",
  },
  email: "hello@altruvex.com",
  founder: {
    description: {
      ar: "المؤسس والمهندس الرئيسي في Altruvex، ويقود بناء أنظمة الويب المخصصة وواجهات المواقع.",
      en: "Founder and lead engineer at Altruvex, focused on custom web systems and product delivery.",
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
    locality: "Heliopolis",
    postalCode: "4461232",
    region: "Cairo Governorate",
    streetAddress: "4 El-Shaheed Ahmed Fathi Kamel, Almazah, Heliopolis",
  },
  locales: SUPPORTED_LOCALES,
  name: "Altruvex",
  phone: "+20 102 312 5493",
  slogan: "Precision web engineering",
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
  url: resolveSiteUrl(),
} as const;

const METADATA_DEFAULTS = {
  defaultDescription: SITE_CONFIG.description,
  entityKeywords: {
    ar: [
      "Altruvex",
      "ألتروفيكس",
      "altruvex.com",
    ],
    en: [
      "Altruvex",
      "altruvex.com",
    ],
  },
  keywords: {
    ar: [
      "تصميم مواقع",
      "تطوير مواقع",
      "برمجة مواقع",
    ],
    en: [
      "custom web development",
      "custom website design",
      "Next.js development",
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
      breadcrumb: "منهجيتنا",
      description:
        "ترتيب القرارات التقنية: البيانات ثم البنية ثم الميزات ثم الصفحة، وما تستلمه عند التسليم في كل طبقة.",
      keywords: [
        "منهجية تطوير المواقع",
        "معمارية المواقع متعددة اللغات",
        "تخطيط موقع قبل التصميم",
      ],
      title: "منهجيتنا: البيانات أولًا والصفحة أخيرًا",
    },
    en: {
      breadcrumb: "Approach",
      description:
        "The order technical decisions are made in (data, architecture, features, then the page) and what you receive at handover for each.",
      keywords: [
        "requirements-first web development",
        "website architecture before design",
      ],
      title: "Our Approach: Data First, Page Last",
    },
    path: "/approach",
  },
  about: {
    ar: {
      breadcrumb: "من نحن",
      description:
        "تصمم Altruvex وتبني مواقع وتطبيقات ويب مخصصة، بأسعار منشورة ودفعات على مراحل، وملكية الكود لك عند الدفعة الأخيرة.",
      keywords: [
        "من هي ألتروفيكس",
        "علي عبد الهادي",
        "من نحن",
      ],
      title: "من نحن | Altruvex لتصميم وبرمجة المواقع",
    },
    en: {
      breadcrumb: "About",
      description:
        "Altruvex designs and builds custom websites and web apps: published price ranges, milestone payments, code you own at final payment.",
      keywords: [
        "about altruvex",
        "ali abdelhadi",
      ],
      title: "About Altruvex | Custom Web Design & Development",
    },
    path: "/about",
  },
  contact: {
    ar: {
      breadcrumb: "تواصل معنا",
      description:
        "صف مشروعك في بضع جمل: ما تحتاج إلى بنائه أو إصلاحه أو إعادة بنائه. نردّ عليك باتصال أو عبر واتساب، ولا تحتاج إلى وثيقة متطلبات جاهزة.",
      keywords: [
        "طلب تصميم موقع",
        "ابدأ مشروع موقع",
        "تواصل مع شركة تطوير مواقع",
        "تواصل مع شركة تصميم مواقع",
      ],
      title: "تواصل مع شركة تصميم مواقع | Altruvex",
    },
    en: {
      breadcrumb: "Contact",
      description:
        "Describe the website or web app you need built, fixed or rebuilt. We reply by call or WhatsApp. You do not need a finished brief.",
      keywords: [
        "start a website project",
        "hire a web development studio",
        "contact web design agency",
        "website project inquiry",
      ],
      title: "Contact a Web Design Agency | Altruvex",
    },
    path: "/contact",
  },
  transparency: {
    ar: {
      breadcrumb: "تقدير المشروع",
      description:
        "أجب عن خمسة أسئلة لترى نطاقاً سعرياً ومدة تسليم لموقعك أو تطبيق الويب، من أسعارنا المنشورة. دون مكالمة ودون بيانات تواصل.",
      keywords: [
        "حاسبة تكلفة موقع",
        "تقدير تكلفة موقع",
        "مدة تصميم موقع",
      ],
      title: "حاسبة تكلفة موقع: احسب السعر والمدة",
    },
    en: {
      breadcrumb: "Project Estimator",
      description:
        "Answer five questions to see a price range and delivery weeks for your website or web app, from our published prices. No call or contact details needed.",
      keywords: [
        "website cost calculator",
        "website cost estimator",
        "web app cost estimate",
        "website timeline estimate",
      ],
      title: "Website Cost Calculator: Price Range & Timeline",
    },
    path: "/transparency",
  },
  home: {
    ar: {
      breadcrumb: "الرئيسية",
      description:
        "تصميم وبرمجة مواقع وتطبيقات ويب مخصصة. اعرف النطاق السعري أولًا، والكود ملكك عند الدفعة الأخيرة.",
      keywords: [
        "شركة تصميم وبرمجة مواقع",
        "تصميم مواقع مخصصة",
        "تكلفة تصميم موقع",
      ],
      title: "تصميم وبرمجة مواقع مخصصة",
    },
    en: {
      breadcrumb: "Home",
      description:
        "Website design and development. See your price range before any call; the code is yours at final payment.",
      keywords: [
        "altruvex",
        "custom website development",
        "website cost",
      ],
      title: "Custom Websites & Web Apps",
    },
    path: "/",
  },
  howWeWork: {
    ar: {
      breadcrumb: "قواعد العمل",
      description:
        "مع من تتحدث، وما نحتاجه منك، وتعديلات تُتفق كتابيًا، ومراجعة على بيئة الاختبار قبل الإطلاق، وملكية الكود والحسابات عند الدفعة الأخيرة.",
      keywords: [
        "طريقة العمل مع شركة تطوير مواقع",
        "التواصل أثناء المشروع",
        "شروط مشروع موقع",
      ],
      title: "كيف نعمل: التواصل والتعديلات والملكية",
    },
    en: {
      breadcrumb: "How We Work",
      description:
        "Who you talk to, what we need from you, changes agreed in writing, staging review before launch, and ownership of the code and accounts at final payment.",
      keywords: [
        "working with a web development studio",
        "web project communication",
        "written project scope",
      ],
      title: "How We Work: Communication, Changes, Ownership",
    },
    path: "/how-we-work",
  },
  offline: {
    ar: {
      breadcrumb: "دون اتصال",
      description:
        "لا يوجد اتصال الآن. قد تُفتح الصفحات التي زرتها خلال اليوم الأخير من هذا الجهاز.",
      keywords: ["صفحة دون اتصال"],
      title: "أنت غير متصل",
    },
    en: {
      breadcrumb: "Offline",
      description:
        "No connection right now. Pages you opened in the last day may still load from this device.",
      keywords: ["offline page"],
      title: "You are offline",
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
        "كم تكلفة تصميم موقع أو تطبيق ويب مخصص: نطاقات أسعار منشورة، وما يحرّك السعر، وما يشمله المشروع وما يُحاسَب عليه منفصلاً، وجدول الدفعات الثلاث.",
      keywords: [
        "تكلفة تصميم موقع",
        "أسعار تصميم المواقع",
        "تكلفة برمجة موقع",
        "جدول دفعات مشروع موقع",
      ],
      title: "تكلفة تصميم موقع وأسعار تطوير المواقع",
    },
    en: {
      breadcrumb: "Pricing",
      description:
        "What a custom website or web app costs: published ranges, what moves the price, what is included, what is billed separately, and the payment schedule.",
      keywords: [
        "website development cost",
        "custom website pricing",
        "website payment schedule",
      ],
      title: "Website Design Cost & Custom Web Pricing",
    },
    path: "/pricing",
  },
  privacy: {
    ar: {
      breadcrumb: "سياسة الخصوصية",
      description:
        "ما يجمعه موقع Altruvex ولماذا، ومن يتلقاه، ومدة الاحتفاظ به، وحقوقك وفق قانون حماية البيانات المصري واللائحة الأوروبية.",
      keywords: ["سياسة الخصوصية ألتروفيكس", "بيانات العملاء"],
      title: "سياسة الخصوصية",
    },
    en: {
      breadcrumb: "Privacy Policy",
      description:
        "What the Altruvex site collects, why, who receives it, how long it is kept, and your rights under Egypt's PDPL and the GDPR.",
      keywords: ["altruvex privacy policy", "website privacy policy"],
      title: "Privacy Policy",
    },
    path: "/privacy",
  },
  process: {
    ar: {
      breadcrumb: "مراحل المشروع",
      description:
        "الاستكشاف، والتصميم الأولي، والتصميم، والتطوير، والإطلاق: ما تنتجه كل مرحلة، وما تقدّمه، واعتمادك قبل بدء التالية.",
      keywords: [
        "مراحل تطوير الموقع",
        "خطوات تصميم موقع",
        "مراحل مشروع موقع",
      ],
      title: "مراحل تصميم وتطوير المواقع: خمس مراحل",
    },
    en: {
      breadcrumb: "Process",
      description:
        "Discovery, wireframe, design, development and launch: what each phase produces, what you bring, and your sign-off before the next starts.",
      keywords: [
        "website development process",
        "web design process phases",
        "website project phases",
      ],
      title: "Website Development Process: 5 Phases",
    },
    path: "/process",
  },
  schedule: {
    ar: {
      breadcrumb: "احجز استشارة",
      description:
        "احجز مكالمة الاستشارة الأولية لمشروعك: 30 دقيقة دون مقابل، منفصلة عن المراجعة التقنية المدفوعة. نؤكد الموعد باتصال أو عبر واتساب، ثم نقترح خطوة تالية واحدة.",
      keywords: [
        "حجز استشارة تقنية",
        "استشارة تطوير موقع",
        "استشارة تصميم موقع",
        "مكالمة تقنية",
      ],
      title: "احجز استشارة لمشروعك مدتها 30 دقيقة",
    },
    en: {
      breadcrumb: "Schedule",
      description:
        "Book the initial project consultation call: 30 minutes, no charge, separate from the paid technical audit. We confirm the time by call or WhatsApp, then recommend one next step.",
      keywords: [
        "book a technical consultation",
        "website project consultation",
        "book a website consultation",
        "technical scoping call",
      ],
      title: "Schedule a 30-Minute Project Consultation",
    },
    path: "/schedule",
  },
  serviceConsulting: {
    ar: {
      breadcrumb: "المراجعة التقنية",
      description:
        "مراجعة تقنية بمبلغ ثابت لموقعك أو تطبيقك: الأداء والبحث والأمان والمعمار، مع نتائج مرتبة وخارطة طريق. يُخصم المبلغ من سعر البناء.",
      keywords: [
        "مراجعة تقنية للموقع",
        "استشارات تطوير المواقع",
        "مراجعة معمارية موقع",
        "فحص أداء موقع",
      ],
      title: "مراجعة تقنية للموقع خلال 5 أيام عمل",
    },
    en: {
      breadcrumb: "Technical Audit",
      description:
        "A fixed-fee technical audit of your site or app: performance, search, security and architecture, with ranked findings and a roadmap. Credited to a build.",
      keywords: [
        "technical website audit",
        "next.js architecture review",
        "web platform audit",
      ],
      title: "Website Technical Audit in 5 Business Days",
    },
    path: "/services/consulting",
  },
  serviceDevelopment: {
    ar: {
      breadcrumb: "تطوير المواقع وتطبيقات الويب",
      description:
        "مواقع وبوابات عملاء ولوحات تحكم وتكاملات تُبنى بـ Next.js. الكود والمخطط والتوثيق ملكك عند الدفعة الأخيرة.",
      keywords: [
        "برمجة مواقع",
        "تطوير مواقع مخصصة",
        "تطوير تطبيقات ويب",
        "شركة برمجة Next.js",
      ],
      title: "برمجة وتطوير مواقع وتطبيقات ويب مخصصة",
    },
    en: {
      breadcrumb: "Website & Web App Development",
      description:
        "Websites, client portals, dashboards and integrations built in Next.js. Source, schema and docs are yours at the final payment.",
      keywords: [
        "custom website development",
        "web application development",
        "next.js development company",
      ],
      title: "Custom Website & Web App Development (Next.js)",
    },
    path: "/services/development",
  },
  serviceInterfaceDesign: {
    ar: {
      breadcrumb: "تصميم المواقع",
      description:
        "تصميم المواقع وتطبيقات الويب: البنية أولاً، ثم شاشات متجاوبة ونظام تصميم يبني عليه فريقك. يُسعَّر لكل مشروع.",
      keywords: [
        "تصميم واجهات المواقع",
        "تصميم UI/UX",
        "نظام تصميم",
      ],
      title: "تصميم المواقع وتطبيقات الويب",
    },
    en: {
      breadcrumb: "Website Design",
      description:
        "Website and web app design: structure first, then responsive screens and a design system your team can extend.",
      keywords: [
        "website ui design",
        "design system",
        "rtl interface design",
      ],
      title: "Website and Web App Design",
    },
    path: "/services/interface-design",
  },
  serviceMaintenance: {
    ar: {
      breadcrumb: "صيانة المواقع",
      description:
        "باقات صيانة للمواقع المنشورة، سواء بنيناها أم لا: مراقبة ونسخ احتياطي وتحديثات أمنية وطلبات تعديل شهرية، بفوترة شهرية أو سنوية.",
      keywords: [
        "صيانة المواقع",
        "دعم فني للمواقع",
        "باقة صيانة موقع",
        "صيانة موقع Next.js",
      ],
      title: "باقات صيانة المواقع والدعم الفني",
    },
    en: {
      breadcrumb: "Website Maintenance",
      description:
        "Maintenance plans for live websites, built by us or not: monitoring, backups, security updates and monthly edit requests, billed monthly or annually.",
      keywords: [
        "website maintenance plans",
        "website support retainer",
        "next.js maintenance",
        "custom website maintenance",
      ],
      title: "Website Maintenance & Support Plans",
    },
    path: "/services/maintenance",
  },
  services: {
    ar: {
      breadcrumb: "الخدمات",
      description:
        "تصميم المواقع، وتطوير المواقع وتطبيقات الويب بـ Next.js، والمراجعة التقنية، وباقات الصيانة للمواقع. قارن نطاق العمل والخطوة التالية.",
      keywords: [
        "خدمات تصميم المواقع",
        "خدمات تطوير المواقع",
        "خدمات برمجة مواقع",
        "صيانة المواقع",
      ],
      title: "خدمات تصميم وتطوير وصيانة المواقع",
    },
    en: {
      breadcrumb: "Services",
      description:
        "Website design, Next.js website and web app development, technical audits and maintenance plans for websites. Compare scope and next steps.",
      keywords: [
        "web design services",
        "web development services",
        "website maintenance services",
        "technical audit services",
      ],
      title: "Web Design, Development & Maintenance Services",
    },
    path: "/services",
  },
  standards: {
    ar: {
      breadcrumb: "المعايير",
      description:
        "الأهداف التي تبني Altruvex وفقها: Lighthouse وLCP وCLS والتباين وترويسات الأمان والثغرات.",
      keywords: [
        "معايير جودة المواقع",
        "سرعة الموقع",
        "إمكانية الوصول",
        "أمان المواقع",
      ],
      title: "معايير الجودة: السرعة والإتاحة والأمان",
    },
    en: {
      breadcrumb: "Standards",
      description:
        "The targets Altruvex builds to: Lighthouse, LCP, CLS, contrast, ARIA, security headers, CVEs and lint.",
      keywords: [
        "website quality standards",
        "website performance standards",
        "web accessibility standards",
        "secure web development",
      ],
      title: "Quality Standards: Speed, Accessibility, Security",
    },
    path: "/standards",
  },
  terms: {
    ar: {
      breadcrumb: "شروط الخدمة",
      description:
        "شروط البناء المخصص مع Altruvex: نطاق وتغييرات مكتوبة، وثلاث دفعات، وملكية عند الدفعة النهائية، والضمان، وإنهاء المشروع.",
      keywords: ["شروط خدمة ألتروفيكس", "الشروط القانونية للموقع"],
      title: "شروط الخدمة",
    },
    en: {
      breadcrumb: "Terms of Service",
      description:
        "Terms for a custom build with Altruvex: written scope and changes, three payments, ownership at final payment, warranty and ending a project.",
      keywords: ["altruvex terms of service", "website terms and conditions"],
      title: "Terms of Service",
    },
    path: "/terms",
  },
  work: {
    ar: {
      breadcrumb: "دراسات الحالة",
      description:
        "مواقع ومتاجر إلكترونية تعمل الآن: المشكلة والقرارات وما بنيناه والتقنيات. افتح كل مشروع وافحصه بنفسك.",
      keywords: [
        "أعمال تصميم مواقع",
        "دراسات حالة تطوير مواقع",
      ],
      title: "أعمالنا: نماذج تصميم مواقع ومتاجر إلكترونية",
    },
    en: {
      breadcrumb: "Case Studies",
      description:
        "Live websites and online stores: the problem, the decisions, what was built and the stack. Open each one and check it yourself.",
      keywords: [
        "web development portfolio",
        "website case studies",
      ],
      title: "Web Design Portfolio: Websites & Online Stores",
    },
    path: "/work",
  },
  workCaseStudy: {
    ar: {
      breadcrumb: "دراسة حالة",
      description:
        "اقرأ دراسة حالة من Altruvex: العميل، والمشكلة، والقرارات وأسبابها، وما بنيناه، والموقع المباشر.",
      keywords: ["دراسة حالة ويب", "متجر إلكتروني Next.js", "تصميم مواقع ويب مخصصة"],
      title: "دراسة حالة",
    },
    en: {
      breadcrumb: "Case Study",
      description:
        "Read an Altruvex case study: the client, the problem, the decisions and why, what was built and the live site.",
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
        "أدلة عملية لأصحاب الشركات وفرقها: كيف تختار شريك تطوير المواقع، وكيف تبني موقعاً سريعاً يصمد مع الوقت. مصادر موثقة ودون أسعار.",
      keywords: [
        "مقالات تطوير المواقع",
        "معمارية متعددة اللغات",
        "الدين التقني",
      ],
      title: "مقالات: أدلة لاختيار شريك التطوير وبناء موقعك",
    },
    en: {
      breadcrumb: "Writing",
      description:
        "Practical guides for founders and teams on choosing a web partner and building fast websites that hold up. Sources cited, no prices quoted.",
      keywords: [
        "web development articles",
        "technical debt",
        "evaluating web developers",
      ],
      title: "Writing: Guides to Building & Choosing a Website",
    },
    path: "/writing",
  },
  faq: {
    ar: {
      breadcrumb: "الأسئلة الشائعة",
      description:
        "إجابات مباشرة عن السعر وجدول الدفع والمدة والتعديلات وملكية الدومين والاستضافة والإلغاء.",
      keywords: [
        "أسئلة شائعة تطوير مواقع",
        "ملكية الكود",
        "مدة تطوير موقع",
      ],
      title: "أسئلة شائعة: التكلفة والمدة والملكية",
    },
    en: {
      breadcrumb: "FAQ",
      description:
        "Straight answers on price, payment schedule, timeline, revisions, domain and hosting ownership, cancellation.",
      keywords: [
        "custom website faq",
        "website development timeline",
        "code ownership",
        "website maintenance plans",
      ],
      title: "Web Design FAQ: Cost, Timeline, Ownership",
    },
    path: "/faq",
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
  return toLocale(locale);
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

  if (loc === SITE_CONFIG.defaultLocale) {
    return path;
  }

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
    locale: LOCALE_META[loc].og,
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
    applicationName: SITE_CONFIG.name,
    alternates: {
      canonical: canonicalUrl,
      languages: {
        ...buildAlternates(canonicalPath),
        "x-default": getLocalizedUrl(SITE_CONFIG.defaultLocale, canonicalPath),
      },
      types: {
        "application/rss+xml": [
          {
            title: "Altruvex Writing RSS Feed",
            url: `${SITE_CONFIG.url}/feed.xml`,
          },
        ],
      },
    },
    authors: [
      {
        name:
          openGraphType === "article" ? SITE_CONFIG.founder.name : SITE_CONFIG.name,
      },
    ],
    category: "technology",
    classification: "Custom web development, Next.js engineering",
    creator: SITE_CONFIG.name,
    description,
    keywords,
    metadataBase: new URL(SITE_CONFIG.url),
    verification: {
      google: process.env.GOOGLE_SITE_VERIFICATION,
      other: process.env.BING_SITE_VERIFICATION
        ? { "msvalidate.01": process.env.BING_SITE_VERIFICATION }
        : undefined,
    },
    openGraph,
    other: {
      "business:contact_data:country_name": SITE_CONFIG.location.country,
      "business:contact_data:locality": SITE_CONFIG.location.city,
      "business:contact_data:region": SITE_CONFIG.location.region,
      "og:email": SITE_CONFIG.email,
    },
    publisher: SITE_CONFIG.name,
    referrer: "strict-origin-when-cross-origin",
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
