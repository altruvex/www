import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import { SITE_CONFIG } from "./metadata";
import { localizeNumbers, normalizeNumeralsToEnglish } from "./number";

export type DeliverableTier = "small" | "medium" | "large" | "enterprise";
export type DeliverableProject =
  | "ecommerce"
  | "corporate"
  | "custom"
  | "performance";

export type TransparencyTranslationValues = Record<string, string | number>;

export type TransparencyTranslator = {
  (key: string, values?: TransparencyTranslationValues): string;
  raw?: (key: string) => unknown;
};

export function mapProjectType(raw: string | null): DeliverableProject {
  const map: Record<string, DeliverableProject> = {
    website: "corporate",
    webapp: "custom",
    ecommerce: "ecommerce",
    pwa: "custom",
    performance: "performance",
    corporate: "corporate",
    custom: "custom",
  };
  return map[raw ?? ""] ?? "corporate";
}

export function mapBudgetTier(raw: string | null): DeliverableTier {
  const map: Record<string, DeliverableTier> = {
    small: "small",
    essential: "small",
    medium: "medium",
    professional: "medium",
    large: "large",
    premium: "large",
    custom: "enterprise",
    enterprise: "enterprise",
    flagship: "enterprise",
  };
  return map[raw ?? ""] ?? "medium";
}

const ESTIMATE_ROUNDING = 5_000;

function roundEstimate(value: number): number {
  return Math.round(value / ESTIMATE_ROUNDING) * ESTIMATE_ROUNDING;
}

const SECTION_PRICING: Record<
  DeliverableProject,
  Record<DeliverableTier, [number, number]>
> = {
  corporate: {
    small: [25_000, 32_000],
    medium: [35_000, 50_000],
    large: [65_000, 130_000],
    enterprise: [130_000, 200_000],
  },
  ecommerce: {
    small: [60_000, 95_000],
    medium: [95_000, 150_000],
    large: [150_000, 280_000],
    enterprise: [280_000, 450_000],
  },
  custom: {
    small: [100_000, 180_000],
    medium: [180_000, 350_000],
    large: [350_000, 600_000],
    enterprise: [600_000, 1_000_000],
  },
  performance: {
    small: [15_000, 25_000],
    medium: [25_000, 40_000],
    large: [40_000, 60_000],
    enterprise: [60_000, 100_000],
  },
};

const SECTION_WEEKS: Record<
  DeliverableProject,
  Record<DeliverableTier, [number, number]>
> = {
  corporate: {
    small: [2, 4],
    medium: [4, 7],
    large: [7, 11],
    enterprise: [10, 16],
  },
  ecommerce: {
    small: [4, 6],
    medium: [6, 10],
    large: [10, 16],
    enterprise: [16, 24],
  },
  custom: {
    small: [5, 8],
    medium: [8, 14],
    large: [14, 22],
    enterprise: [20, 32],
  },
  performance: {
    small: [1, 2],
    medium: [2, 4],
    large: [4, 7],
    enterprise: [6, 10],
  },
};

const SECTION_TIMELINE_MUL: Record<string, { price: number; weeks: number }> = {
  urgent: { price: 1.15, weeks: 0.85 },
  soon: { price: 1.0, weeks: 1.0 },
  standard: { price: 1.0, weeks: 1.0 },
  flexible: { price: 0.95, weeks: 1.15 },
};

export function calculateQuickEstimate(
  projectType: DeliverableProject,
  tier: DeliverableTier,
  timelineKey: string,
): { priceMin: number; priceMax: number; weeksMin: number; weeksMax: number } {
  const [baseMin, baseMax] = SECTION_PRICING[projectType][tier];
  const [wBase1, wBase2] = SECTION_WEEKS[projectType][tier];
  const timeline =
    SECTION_TIMELINE_MUL[timelineKey] ?? SECTION_TIMELINE_MUL.standard;

  const priceMin = roundEstimate(baseMin * timeline.price);
  const priceMax = roundEstimate(baseMax * timeline.price);
  const weeksMin = Math.max(Math.round(wBase1 * timeline.weeks), 1);
  const weeksMax = Math.max(Math.round(wBase2 * timeline.weeks), weeksMin);

  return { priceMin, priceMax, weeksMin, weeksMax };
}

export const HOSTING_RENEWAL: Record<DeliverableTier, number> = {
  small: 4_500,
  medium: 8_500,
  large: 14_500,
  enterprise: 22_000,
};

const TIER_LABELS: Record<DeliverableTier, string> = {
  small: "Focused (Essential)",
  medium: "Connected (Professional)",
  large: "Operational (Premium)",
  enterprise: "Enterprise Ecosystem",
};

const PROJECT_LABELS: Record<DeliverableProject, string> = {
  corporate: "Corporate Experience",
  ecommerce: "E-Commerce Solution",
  custom: "Custom Web Application",
  performance: "Performance & SEO Overhaul",
};

const TIMELINE_LABELS: Record<string, string> = {
  urgent: "Urgent - Sprint delivery",
  soon: "Standard - 1–3 months",
  flexible: "Extended - 3+ months",
  standard: "Standard - balanced pace",
};

export function validatePhone(phone: string): boolean {
  const normalized = normalizeNumeralsToEnglish(phone);
  const digits = normalized.replace(/\D/g, "");
  return digits.length >= 8 && digits.length <= 15;
}

export function normalisePhone(phone: string): string {
  const normalized = normalizeNumeralsToEnglish(phone);
  const digits = normalized.replace(/\D/g, "");
  if (!digits) return "";
  return normalized.trim().startsWith("+") ? `+${digits}` : digits;
}

interface NarrativeInsight {
  label: { ar: string; en: string };
  message: { ar: string; en: string };
}

interface ProposalNarrative {
  headline: { ar: string; en: string };
  insights: NarrativeInsight[];
  closing: { ar: string; en: string };
}

export function pickLang(
  obj: { ar: string; en: string },
  locale: string,
): string {
  return locale.startsWith("ar") ? obj.ar : obj.en;
}

function escapeHtml(input: string): string {
  return input
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

const PROJECT_COPY: Record<DeliverableProject, { ar: string; en: string }> = {
  ecommerce: {
    ar: "اخترت المتجر الإلكتروني - هدفك الأساسي تحويل الزوار إلى عملاء يدفعون. سنبني نظاماً يدعم بوابات الدفع المناسبة لسوقك، وإدارة مخزون حقيقية، وتجربة شراء سلسة على الجوال تُقلل معدل التخلي عن السلة.",
    en: "You chose an e-commerce platform - your core goal is converting visitors into paying customers. We'll build a system with payment gateways suited to your market, real inventory management, and a seamless mobile checkout that reduces cart abandonment.",
  },
  corporate: {
    ar: "اخترت موقع الشركة - يعني تريد حضوراً رقمياً يعكس احترافية عملك ويجذب العملاء المحتملين على مدار الساعة. سنبني واجهة تُقنع الزائر بالتواصل معك، مع أساس SEO قوي يضمن ظهورك في نتائج البحث.",
    en: "You chose a corporate website - you want a digital presence that reflects your brand's professionalism and generates leads around the clock. We'll build an interface that compels visitors to reach out, backed by solid SEO foundations.",
  },
  custom: {
    ar: "اخترت التطبيق المخصص - يعني عندك فكرة أو منطق عمل لا يوفره أي نظام جاهز في السوق. سنبنيه من الصفر بناءً على متطلباتك الفعلية، بدون تسويات أو قوالب.",
    en: "You chose a custom web application - your idea or business logic can't be served by any off-the-shelf system. We'll build it from scratch around your actual requirements, with no compromises or templates.",
  },
  performance: {
    ar: "اخترت تحسين الأداء - وهو قرار استثماري ذكي. موقعك الحالي يخسر عملاء محتملين بسبب بطء التحميل. سنقيس المشكلة الفعلية بدقة أولاً، ثم نُصلحها بشكل هندسي منهجي بدلاً من التخمين.",
    en: "You chose performance optimization - a smart investment decision. Your current site is losing potential customers to slow load times. We'll measure the real problem precisely first, then fix it systematically rather than guessing.",
  },
};

const TIER_COPY: Record<DeliverableTier, { ar: string; en: string }> = {
  small: {
    ar: "اخترت الباقة الأساسية - الخيار الصح إذا كنت في مرحلة الإطلاق أو تريد التحقق من الفكرة قبل الاستثمار الكبير. ستحصل على نظام متكامل وجاهز بنطاق محدد بوضوح، يمكن توسيعه لاحقاً.",
    en: "You chose the Essential tier - the right call if you're in launch mode or validating your concept before a larger investment. You get a complete, production-ready system with a clearly defined scope that can scale later.",
  },
  medium: {
    ar: "اخترت الباقة الاحترافية - الأكثر طلباً لأنها تُحقق التوازن الأمثل بين الجودة والتكلفة. ستحصل على نظام متكامل يدعم النمو الفعلي لعملك، مع تكاملات ومميزات لا توجد في الباقة الأساسية.",
    en: "You chose the Professional tier - the most requested because it hits the sweet spot between quality and cost. You get a full-featured system built to support real business growth, with integrations the Essential tier doesn't cover.",
  },
  large: {
    ar: "اخترت الباقة المتميزة - يعني أنك تبني لتدوم. تصميم مخصص بالكامل، أداء هندسي عالٍ، ودعم موسع بعد الإطلاق. مشروعك في هذه الباقة يُصبح أصلاً حقيقياً لشركتك لا مجرد موقع.",
    en: "You chose the Premium tier - you're building to last. Fully custom design, high-performance engineering, and extended post-launch support. At this level, your project becomes a genuine business asset, not just a website.",
  },
  enterprise: {
    ar: "اخترت الباقة المؤسسية - حجم عملك يستحق بنية تحتية لا تقبل التسوية. فريق متخصص، تكاملات مع أنظمتك الحالية (ERP, POS, CRM)، وSLA يضمن استمرارية العمل ٢٤/٧.",
    en: "You chose the Enterprise tier - your business scale demands infrastructure that accepts no compromise. A dedicated team, integrations with your existing systems (ERP, POS, CRM), and an SLA that guarantees 24/7 business continuity.",
  },
};

const TIMELINE_COPY: Record<string, { ar: string; en: string }> = {
  urgent: {
    ar: "اخترت التسليم السريع - يعني لديك موعد حرج أو فرصة سوق لا تنتظر. سنُعيد هندسة نطاق العمل حول تاريخك لا العكس، مع تحديد ما يُطلق أولاً وما يأتي في المرحلة الثانية.",
    en: "You chose fast delivery - you have a critical deadline or a market window that won't stay open. We'll engineer the scope around your date, not the other way around - identifying what launches first and what follows in a second phase.",
  },
  soon: {
    ar: "اخترت التوقيت المتوازن - وهو الأذكى في معظم الحالات. يمنحنا وقتاً كافياً لاكتشاف المتطلبات بدقة، بناء نظام متين، واختباره جيداً قبل الإطلاق دون ضغط غير ضروري.",
    en: "You chose a balanced timeline - the smartest choice in most cases. It gives us enough time to gather requirements precisely, build a solid system, and test it thoroughly before launch without unnecessary pressure.",
  },
  standard: {
    ar: "اخترت التوقيت المتوازن - وهو الأذكى في معظم الحالات. يمنحنا وقتاً كافياً لاكتشاف المتطلبات بدقة، بناء نظام متين، واختباره جيداً قبل الإطلاق دون ضغط غير ضروري.",
    en: "You chose a balanced timeline - the smartest choice in most cases. It gives us enough time to gather requirements precisely, build a solid system, and test it thoroughly before launch without unnecessary pressure.",
  },
  flexible: {
    ar: "اخترت المرونة في التوقيت - وهذه ميزة هندسية حقيقية. وقت أطول يعني اختباراً أعمق، تحسيناً أكثر في الأداء، ونظاماً يصمد على المدى البعيد دون حاجة لإعادة بناء.",
    en: "You chose a flexible timeline - a genuine engineering advantage. More time means deeper testing, more performance refinement, and a system built to hold up long-term without needing a rebuild.",
  },
};

const BRAND_COPY: Record<string, { ar: string; en: string }> = {
  complete: {
    ar: "هويتك التجارية جاهزة - هذا يُسرّع مرحلة التصميم ويضمن اتساقاً بصرياً كاملاً من اليوم الأول.",
    en: "Your brand identity is ready - this accelerates the design phase and guarantees full visual consistency from day one.",
  },
  partial: {
    ar: "هويتك التجارية جزئية - سنعمل بما لديك وننسق معك لسد الفجوات خلال مرحلة التصميم دون تأخير.",
    en: "Your brand identity is partial - we'll work with what you have and coordinate to fill the gaps during the design phase without delay.",
  },
  scratch: {
    ar: "ستبدأ الهوية التجارية من الصفر - سنُدرج مرحلة تصميم الهوية في بداية المشروع قبل الشروع في بناء النظام.",
    en: "Your brand identity starts from scratch - we'll include an identity design phase at the project start before building the system.",
  },
};

const CONTENT_COPY: Record<string, { ar: string; en: string }> = {
  provide: {
    ar: "محتواك جاهز - هذا يحمي الجدول الزمني من أكثر أسباب التأخير شيوعاً في المشاريع الرقمية.",
    en: "Your content is ready - this protects the timeline from the most common cause of delays in digital projects.",
  },
  "need-help": {
    ar: "ستحتاج مساعدة في المحتوى - سنُدرج جلسة استراتيجية للمحتوى في بداية المشروع لتحديد ما تحتاجه بالضبط.",
    en: "You'll need content help - we'll include a content strategy session early in the project to define exactly what's needed.",
  },
  unsure: {
    ar: "المحتوى لا يزال في طور التخطيط - هذا طبيعي في المراحل الأولى. سنُحدد الاحتياجات الفعلية خلال جلسة الاكتشاف.",
    en: "Content is still being planned - that's normal at this stage. We'll define the actual needs during the discovery session.",
  },
};

const DEADLINE_COPY: Record<string, { ar: string; en: string }> = {
  urgent: {
    ar: "لديك موعد في أقل من ٤ أسابيع - سنُركز فوراً على المتطلبات الحرجة ونُطلق النسخة الأولى أولاً.",
    en: "You have a deadline under 4 weeks - we'll focus immediately on critical requirements and launch a first version first.",
  },
  "1month": {
    ar: "لديك شهر واحد - جدول ضيق لكنه قابل للتنفيذ مع تحديد نطاق عمل واضح من اليوم الأول.",
    en: "You have one month - a tight but achievable schedule with a clearly defined scope from day one.",
  },
  "2months": {
    ar: "لديك شهران - توقيت جيد يتيح دورة تصميم وتطوير متكاملة مع هامش للاختبار.",
    en: "You have two months - a solid timeline that allows a complete design-and-development cycle with room for testing.",
  },
  flexible: {
    ar: "التوقيت مرن - ميزة تتيح لنا التركيز على الجودة وليس السرعة فقط.",
    en: "Your timeline is flexible - an advantage that lets us focus on quality, not just speed.",
  },
};

const CLOSING_COPY: Record<DeliverableProject, { ar: string; en: string }> = {
  ecommerce: {
    ar: "هذا التقدير مبني على اختياراتك الفعلية. الخطوة التالية مكالمة اكتشاف مجانية لمدة ٣٠ دقيقة نُحدد فيها النطاق الدقيق ونُقدم لك عرض سعر نهائياً ملزماً.",
    en: "This estimate is built on your actual selections. Next step is a free 30-minute discovery call where we define the exact scope and give you a binding final quote.",
  },
  corporate: {
    ar: "هذا التقدير مبني على اختياراتك الفعلية. الخطوة التالية مكالمة اكتشاف مجانية لمدة ٣٠ دقيقة نُحدد فيها النطاق الدقيق ونُقدم لك عرض سعر نهائياً ملزماً.",
    en: "This estimate is built on your actual selections. Next step is a free 30-minute discovery call where we define the exact scope and give you a binding final quote.",
  },
  custom: {
    ar: "هذا التقدير مبني على اختياراتك الفعلية. الخطوة التالية مكالمة اكتشاف مجانية لمدة ٣٠ دقيقة نُحدد فيها المتطلبات التقنية الفعلية.",
    en: "This estimate is built on your actual selections. Next step is a free 30-minute discovery call where we nail down the actual technical requirements.",
  },
  performance: {
    ar: "هذا التقدير مبني على اختياراتك الفعلية. الخطوة التالية تدقيق أولي مجاني نوضح فيه حجم المشكلة الحالية في موقعك.",
    en: "This estimate is built on your actual selections. Next step is a free initial audit where we show you exactly how much performance your current site is leaving on the table.",
  },
};

interface NarrativeParams {
  projectType: DeliverableProject;
  tier: DeliverableTier;
  timelineKey: string;
  brandIdentity?: string | null;
  contentReadiness?: string | null;
  deadlineUrgency?: string | null;
}

export function generateProposalNarrative(
  p: NarrativeParams,
): ProposalNarrative {
  const insights: NarrativeInsight[] = [
    {
      label: { ar: "نوع المشروع", en: "Project type" },
      message: PROJECT_COPY[p.projectType],
    },
    {
      label: { ar: "مستوى الباقة", en: "Scope tier" },
      message: TIER_COPY[p.tier],
    },
    {
      label: { ar: "توقيت التسليم", en: "Delivery timeline" },
      message: TIMELINE_COPY[p.timelineKey] ?? TIMELINE_COPY["standard"],
    },
  ];

  if (p.brandIdentity && BRAND_COPY[p.brandIdentity])
    insights.push({
      label: { ar: "الهوية التجارية", en: "Brand identity" },
      message: BRAND_COPY[p.brandIdentity],
    });

  if (p.contentReadiness && CONTENT_COPY[p.contentReadiness])
    insights.push({
      label: { ar: "جاهزية المحتوى", en: "Content readiness" },
      message: CONTENT_COPY[p.contentReadiness],
    });

  if (p.deadlineUrgency && DEADLINE_COPY[p.deadlineUrgency])
    insights.push({
      label: { ar: "الجدول الزمني", en: "Deadline" },
      message: DEADLINE_COPY[p.deadlineUrgency],
    });

  return {
    headline: {
      ar: "لماذا هذه الخطة مناسبة لك",
      en: "Why this plan fits your needs",
    },
    insights,
    closing: CLOSING_COPY[p.projectType],
  };
}

const DELIVERABLES: Record<
  DeliverableProject,
  Record<DeliverableTier, string[]>
> = {
  ecommerce: {
    small: [
      "Catalog setup for a focused store (up to 50 SKUs)",
      "Product pages, categories, and basic filtering",
      "Checkout with one payment method such as Paymob or cash on delivery",
      "Order notifications and a simple order-status flow",
      "Mobile-first storefront implementation",
      "Essential SEO, analytics, and launch tracking",
      "Multilingual-ready structure where the scope requires it",
      "30-day launch assurance for critical fixes",
    ],
    medium: [
      "Larger catalog with variants, bundles, or collections",
      "Improved checkout flow and customer account basics",
      "One core operational integration such as payment, shipping, or ERP-lite sync",
      "Promotions, coupon codes, and merchandising controls",
      "CMS support for landing pages, blog, or campaign content",
      "Multilingual storefront and QA where required",
      "Analytics, pixels, and search-readiness setup",
      "30-day launch assurance with structured handover",
    ],
    large: [
      "Everything in Professional",
      "Richer storefront UX, search, and merchandising logic",
      "Multiple operational workflows such as payments, shipping, and inventory coordination",
      "Customer accounts, returns, or post-purchase flows where required",
      "Custom reporting surfaces for key commerce metrics",
      "Performance pass for higher traffic and heavier catalogs",
      "Infrastructure planning for scale, CDN, and backup strategy",
      "30-day launch assurance plus rollout support",
    ],
    enterprise: [
      "Custom commerce architecture for complex operational needs",
      "ERP, POS, warehouse, or multi-system integration planning",
      "Role-based back-office workflows and approvals",
      "Multi-brand, multi-store, or regional rollout requirements",
      "Security review, release process, and environment strategy",
      "Infrastructure design quoted to actual traffic and operational load",
      "Phased roadmap for post-launch expansion",
      "Hypercare window after launch, then ongoing support quoted separately",
    ],
  },
  corporate: {
    small: [
      "Discovery-led sitemap and page structure",
      "Up to 6 core pages with custom UI implementation",
      "Contact or lead form with email routing",
      "Responsive build with strong performance fundamentals",
      "Basic SEO setup, analytics, and search console readiness",
      "Multilingual-ready structure where the scope calls for it",
      "Deployment and launch checklist",
      "30-day launch assurance for critical fixes",
    ],
    medium: [
      "Everything in Essential",
      "Expanded page system with reusable sections",
      "CMS or blog setup for ongoing content updates",
      "One lead-flow integration such as CRM, booking, or advanced forms",
      "Full Multilingual implementation and QA where required",
      "Tracking, SEO, and conversion event setup",
      "Structured handover for internal marketing teams",
      "30-day launch assurance with post-launch review",
    ],
    large: [
      "Everything in Professional",
      "Richer storytelling sections, motion, and case-study structure",
      "Advanced lead routing, gated content, or light account workflows",
      "Calendar, CRM, or operations integration where needed",
      "Performance hardening for heavier content and higher traffic",
      "Reusable design system for future landing pages",
      "Launch planning across environments and stakeholders",
      "30-day launch assurance plus rollout support",
    ],
    enterprise: [
      "Custom corporate platform with portal or secure stakeholder areas",
      "Role-based access, document flows, or approval workflows",
      "Multi-site or multi-brand architecture planning",
      "Deeper CRM / ERP / internal system integration",
      "Security review, permissions model, and environment strategy",
      "Infrastructure quoted to real traffic and operational needs",
      "Phased roadmap for future modules and rollout",
      "Hypercare window after launch, then ongoing support quoted separately",
    ],
  },
  custom: {
    small: [
      "Discovery-scoped MVP around one core workflow",
      "Authentication, basic roles, and protected routes",
      "Admin-facing screens for essential operations",
      "Core data model, API, and database setup",
      "Responsive web app UI for desktop and mobile",
      "Basic notifications or status updates where required",
      "Deployment, environment setup, and documentation baseline",
      "30-day launch assurance for critical fixes",
    ],
    medium: [
      "Everything in Essential",
      "Multi-role workflows and richer admin controls",
      "One or two business-critical integrations",
      "Reporting, exports, uploads, or dashboard modules where needed",
      "QA coverage for key business flows",
      "Documentation and handover for product ownership",
      "Launch plan with staging and production readiness",
      "30-day launch assurance with post-launch review",
    ],
    large: [
      "Everything in Professional",
      "Advanced workflow logic, approvals, or automation rules",
      "Background jobs, queues, or webhook-driven processes where required",
      "Audit logs, exports, and operational reporting",
      "Performance and security hardening for heavier usage",
      "Multi-environment rollout with CI/CD planning",
      "Technical roadmap for phase-two growth",
      "Hypercare window after launch",
    ],
    enterprise: [
      "Platform architecture for multi-team or multi-tenant operation",
      "Advanced permissions, auditability, and operational controls",
      "Multiple integrations, data pipelines, or system-to-system workflows",
      "Infrastructure, CI/CD, and release management design",
      "Security review and deployment governance",
      "Phased rollout across teams, regions, or business units",
      "Operational documentation and training handover",
      "Ongoing product support quoted separately after launch",
    ],
  },
  performance: {
    small: [
      "Baseline Lighthouse and Core Web Vitals audit",
      "Findings summary across the highest-impact pages",
      "Image, asset, and script bottleneck review",
      "Up to 5 priority fixes applied",
      "Clear before/after measurements",
      "Written remediation roadmap",
      "One debrief session",
    ],
    medium: [
      "Everything in Essential",
      "Up to 10 priority fixes across frontend performance issues",
      "Caching, script loading, and rendering-path improvements",
      "Third-party tag audit and cleanup recommendations",
      "Analytics review to protect measurement accuracy",
      "Validation pass after implementation",
      "Short post-audit support window",
    ],
    large: [
      "Everything in Professional",
      "Broader implementation across frontend, server, and delivery layers",
      "Load testing and performance budgeting for key flows",
      "Database or API bottleneck review where relevant",
      "Monitoring baseline for ongoing performance visibility",
      "Stakeholder-ready report with next-phase priorities",
      "30-day observation period after optimization",
    ],
    enterprise: [
      "Performance program for complex or high-traffic systems",
      "Cross-stack review spanning frontend, backend, and infrastructure",
      "SLA-oriented benchmarking and target definition",
      "Release-risk review for major traffic or launch events",
      "Operational reporting for engineering and leadership",
      "Optimization roadmap phased by business impact",
      "Retainer or ongoing monitoring quoted separately",
    ],
  },
};

interface PDFParams {
  locale: string;
  t: TransparencyTranslator;
  projectType: DeliverableProject;
  tier: DeliverableTier;
  timelineKey: string;
  priceMin: number;
  priceMax: number;
  weeksMin: number;
  weeksMax: number;
  phone: string;
  name: string;
  brandIdentity?: string | null;
  contentReadiness?: string | null;
  deadlineUrgency?: string | null;
}

export function buildPDFHtml(p: PDFParams): string {
  const isRtl = p.locale === "ar";
  const dir = isRtl ? "rtl" : "ltr";
  const alignLeft = isRtl ? "right" : "left";
  const alignRight = isRtl ? "left" : "right";

  const f = (n: number) =>
    new Intl.NumberFormat(isRtl ? "ar-EG" : "en-EG", {
      style: "currency",
      currency: "EGP",
      maximumFractionDigits: 0,
    }).format(n);

  const today = new Intl.DateTimeFormat(p.locale, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date());

  const rawItems = p.t.raw?.(
    `pdfContent.deliverables.${p.projectType}.${p.tier}`,
  );
  const items =
    Array.isArray(rawItems) && rawItems.length > 0
      ? rawItems.filter((item): item is string => typeof item === "string")
      : DELIVERABLES[p.projectType][p.tier] || [];

  const hosting = HOSTING_RENEWAL[p.tier];
  const half = Math.ceil(items.length / 2);
  const col1 = items.slice(0, half);
  const col2 = items.slice(half);

  const lblProjectType =
    p.t(`pdfContent.projectLabels.${p.projectType}`) ||
    PROJECT_LABELS[p.projectType];
  const lblTier = p.t(`pdfContent.tierLabels.${p.tier}`) || TIER_LABELS[p.tier];
  const lblTimelineFull =
    p.t(`pdfContent.timelineLabels.${p.timelineKey}`) ||
    TIMELINE_LABELS[p.timelineKey] ||
    p.timelineKey;
  const lblTimeline = lblTimelineFull.split("-")[0].trim();
  const tTier = p.t("pdfContent.tier", { tier: lblTier });

  const narrative = generateProposalNarrative({
    projectType: p.projectType,
    tier: p.tier,
    timelineKey: p.timelineKey,
    brandIdentity: p.brandIdentity,
    contentReadiness: p.contentReadiness,
    deadlineUrgency: p.deadlineUrgency,
  });
  const L = (obj: { ar: string; en: string }) => pickLang(obj, p.locale);

  const fontBody = isRtl ? "'Tajawal', sans-serif" : "'Inter', sans-serif";
  const fontDisplay = isRtl ? "'Tajawal', sans-serif" : "'Outfit', sans-serif";
  const safeName = p.name ? escapeHtml(p.name) : "";
  const clientName =
    safeName || escapeHtml(p.t("pdfContent.prospectiveClient"));

  const mkCol = (arr: string[]) =>
    arr
      .map(
        (d) => `
      <div style="display:flex;align-items:flex-start;gap:9px;padding:7px 0;border-bottom:1px solid #EEECE6;">
        <svg width="12" height="12" viewBox="0 0 12 12" style="margin-top:3px;flex-shrink:0;">
          <circle cx="6" cy="6" r="2" fill="#0A0A0A" opacity="0.4"/>
        </svg>
        <span style="font-family:${fontBody};font-size:11.5px;color:#3D3D3A;line-height:1.55;">${d}</span>
      </div>`,
      )
      .join("");

  const hdr = (label: string, sub: string) => `
    <div style="display:flex;justify-content:space-between;align-items:center;padding-bottom:16px;border-bottom:1.5px solid #0A0A0A;margin-bottom:20px;">
      <span style="font-family:'Outfit',sans-serif;font-size:17px;font-weight:600;letter-spacing:.14em;color:#0A0A0A;">ALTRUVEX</span>
      <div style="text-align:${alignRight};">
        <span style="font-family:monospace;font-size:8px;letter-spacing:.22em;text-transform:uppercase;color:#888780;display:block;margin-bottom:2px;">${label}</span>
        <span style="font-family:monospace;font-size:11px;color:#444441;">${sub}</span>
      </div>
    </div>`;

  const sCard = (l: string, v: string) => `
    <div style="padding:12px 14px;border:1px solid #E8E6DE;border-radius:4px;background:#FAFAF7;text-align:${alignLeft};">
      <span style="font-family:monospace;font-size:7.5px;letter-spacing:.22em;text-transform:uppercase;color:#888780;display:block;margin-bottom:4px;">${l}</span>
      <span style="font-family:${fontDisplay};font-size:12px;font-weight:500;color:#0A0A0A;">${v}</span>
    </div>`;

  const secHead = (lbl: string) => `
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;">
      <span style="font-family:monospace;font-size:8px;letter-spacing:.25em;text-transform:uppercase;color:#888780;white-space:nowrap;">${lbl}</span>
      <div style="flex:1;height:1px;background:#E8E6DE;"></div>
    </div>`;

  const foot = (pg: string, disc: string) => `
    <div style="border-top:1px solid #E8E6DE;padding-top:11px;display:flex;justify-content:space-between;align-items:flex-end;margin-top:auto;">
      <div style="font-family:monospace;font-size:7.5px;color:#B4B2A9;max-width:68%;line-height:1.6;text-align:${alignLeft};">${disc}</div>
      <span style="font-family:'Outfit',sans-serif;font-size:11px;font-weight:600;letter-spacing:.12em;color:#B4B2A9;direction:ltr;unicode-bidi:isolate;">${pg}</span>
    </div>`;

  const narrativeRows = narrative.insights
    .map(
      (ins) => `
    <div style="padding:9px 12px;border:1px solid #E8E6DE;border-radius:4px;background:#FBFAF5;text-align:${alignLeft};">
      <span style="font-family:monospace;font-size:7.5px;letter-spacing:.2em;text-transform:uppercase;color:#B4B2A9;display:block;margin-bottom:3px;">${L(ins.label)}</span>
      <span style="font-family:${fontBody};font-size:11px;color:#444441;line-height:1.65;">${L(ins.message)}</span>
    </div>`,
    )
    .join("");

  return `<!DOCTYPE html>
<html ${isRtl ? 'lang="ar" dir="rtl"' : 'lang="en" dir="ltr"'}>
<head>
<meta charset="UTF-8"/>
<title>${p.t("pdf.label")} · ALTRUVEX · ${today}</title>
<style data-pdf-style="true">
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500&family=Outfit:wght@300;400;500;600&family=Tajawal:wght@400;500;700&display=swap');
  *{margin:0;padding:0;box-sizing:border-box;}
  body{
    font-family:${fontBody};
    background:#F7F6F0;
    -webkit-print-color-adjust:exact;
    print-color-adjust:exact;
    direction:${dir};
    text-align:${alignLeft};
  }
  .page{
    width:210mm;
    min-height:297mm;
    background:#FFF;
    margin:0 auto;
    padding:11mm 13mm 10mm;
    display:flex;
    flex-direction:column;
  }
  .page+.page{page-break-before:always;}
  @media print{
    body{background:#fff;}
    .page{margin:0;padding:9mm 12mm;}
    @page{size:A4 portrait;margin:0;}
  }
</style>
</head>
<body>
<div class="page">
  ${hdr(p.t("pdf.label"), `${today}${safeName ? ` · ${safeName}` : ""}`)}
  <div style="background:#0A0A0A;border-radius:5px;padding:20px 24px;margin-bottom:18px;">
    <span style="font-family:monospace;font-size:8px;letter-spacing:.25em;text-transform:uppercase;color:#73726C;display:block;margin-bottom:8px;">${p.t("pdfContent.engineeringBeyond")}</span>
    <div style="font-family:${fontDisplay};font-size:24px;font-weight:500;color:#FAFAF7;line-height:1.2;margin-bottom:6px;">${lblProjectType}</div>
    <div style="font-family:monospace;font-size:12px;color:#73726C;">${tTier} &nbsp;·&nbsp; ${lblTimelineFull}</div>
  </div>

  <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:16px;">
    ${sCard(p.t("pdfContent.projectType"), lblProjectType)}
    ${sCard(p.t("pdfContent.scopeTier"), lblTier)}
    ${sCard(p.t("pdfContent.deliveryMode"), lblTimeline)}
  </div>

  ${secHead(L(narrative.headline))}
  <div style="display:grid;grid-template-columns:1fr;gap:7px;margin-bottom:16px;">
    ${narrativeRows}
  </div>

  ${secHead(p.t("pdfContent.investmentEstimate"))}
  <div style="display:grid;grid-template-columns:1.2fr 1fr;gap:10px;margin-bottom:16px;">
    <div style="padding:18px 20px;background:#FAFAF7;border:1px solid #DDDBD3;border-radius:4px;">
      <span style="font-family:monospace;font-size:7.5px;letter-spacing:.2em;text-transform:uppercase;color:#888780;display:block;margin-bottom:8px;">${p.t("pdfContent.totalRange")}</span>
      <div style="font-family:${fontDisplay};font-size:28px;font-weight:500;letter-spacing:-.02em;color:#0A0A0A;line-height:1.1;">${f(p.priceMin)}</div>
      <div style="font-size:13px;color:#888780;margin-top:3px;">- ${f(p.priceMax)}</div>
      <span style="font-family:monospace;font-size:8px;letter-spacing:.08em;text-transform:uppercase;color:#B4B2A9;margin-top:10px;display:block;">${p.t("pdfContent.inclDomain")}</span>
    </div>
    <div style="padding:18px 20px;background:#F3F2EB;border-radius:4px;">
      <span style="font-family:monospace;font-size:7.5px;letter-spacing:.2em;text-transform:uppercase;color:#888780;display:block;margin-bottom:8px;">${p.t("pdfContent.estimatedDelivery")}</span>
      <div style="font-family:${fontDisplay};font-size:28px;font-weight:500;letter-spacing:-.02em;color:#0A0A0A;line-height:1.1;">${localizeNumbers(p.weeksMin.toString(), p.locale)}–${localizeNumbers(p.weeksMax.toString(), p.locale)}</div>
      <div style="font-size:12px;color:#888780;margin-top:3px;">${p.t("pdfContent.weeksFromKickoff")}</div>
      <span style="font-family:monospace;font-size:8px;letter-spacing:.08em;text-transform:uppercase;color:#B4B2A9;margin-top:10px;display:block;">${p.t("pdfContent.discoverySeparate")}</span>
    </div>
  </div>

  ${secHead(p.t("pdfContent.infraIncluded"))}
  <div style="display:flex;gap:12px;padding:13px 16px;background:#F3F2EB;border-radius:4px;margin-bottom:16px;">
    <div style="width:6px;height:6px;border-radius:50%;background:#4A6ED4;margin-top:3px;flex-shrink:0;"></div>
    <div>
      <span style="font-family:monospace;font-size:8px;letter-spacing:.18em;text-transform:uppercase;color:#4A6ED4;display:block;margin-bottom:3px;">${p.t("pdfContent.whatsCovered")}</span>
      <span style="font-size:11.5px;color:#444441;line-height:1.65;font-family:${fontBody};">
        ${p.t("pdfContent.infraDetails")}<br/>
        <strong style="font-weight:600;display:block;margin-top:3px;">${p.t("pdfContent.renewalFromYear2", { amount: f(hosting) })}</strong>
      </span>
    </div>
  </div>

  <div style="display:flex;justify-content:space-between;align-items:center;padding:16px 20px;background:#0A0A0A;border-radius:4px;margin-bottom:16px;">
    <div>
      <div style="font-family:${fontDisplay};font-size:15px;font-weight:500;color:#FAFAF7;margin-bottom:3px;">${p.t("pdfContent.readyToMoveForward")}</div>
      <div style="font-family:monospace;font-size:11px;color:#73726C;">${p.t("pdfContent.bookCall")}</div>
    </div>
    <div style="text-align:${alignRight};">
      <span style="font-family:monospace;font-size:12px;color:#FAFAF7;display:block;margin-bottom:2px;">${SITE_CONFIG.email}</span>
      <span style="font-family:monospace;font-size:11px;color:#73726C;">altruvex.com</span>
    </div>
  </div>

  ${foot("ALTRUVEX · 1 / 2", p.t("pdfContent.estimateValid"))}
</div>
<div class="page">
  ${hdr(p.t("pdfContent.scopeOfDeliverables"), `${lblProjectType} · ${lblTier}`)}

  <div style="padding:14px 0 18px;">
    <p style="font-family:${fontDisplay};font-size:22px;font-weight:400;letter-spacing:-.02em;color:#0A0A0A;margin-bottom:4px;">${p.t("pdfContent.whatsIncluded")}</p>
    <p style="font-family:monospace;font-size:12px;color:#888780;">${p.t("pdfContent.deliverablesCount", { count: localizeNumbers(items.length.toString(), p.locale), tier: lblTier })}</p>
  </div>

  ${secHead(p.t("pdfContent.fullDeliverablesList"))}
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:0 28px;margin-bottom:28px;">
    <div>${mkCol(col1)}</div>
    <div>${mkCol(col2)}</div>
  </div>

  <div>
    ${secHead(p.t("pdfContent.howWeWork"))}
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
      ${[
        [p.t("pdfContent.phase1Title"), p.t("pdfContent.phase1Desc")],
        [p.t("pdfContent.phase2Title"), p.t("pdfContent.phase2Desc")],
        [
          p.t("pdfContent.phase3Title"),
          p.t("pdfContent.phase3Desc", {
            min: localizeNumbers(
              Math.max(p.weeksMin - 3, 1).toString(),
              p.locale,
            ),
            max: localizeNumbers(
              Math.max(p.weeksMax - 3, 1).toString(),
              p.locale,
            ),
          }),
        ],
        [p.t("pdfContent.phase4Title"), p.t("pdfContent.phase4Desc")],
      ]
        .map(
          ([phase, desc]) => `
        <div style="padding:12px 15px;border:1px solid #E8E6DE;border-radius:4px;background:#FAFAF7;">
          <p style="font-family:monospace;font-size:8px;letter-spacing:.2em;text-transform:uppercase;color:#888780;margin-bottom:5px;">${phase}</p>
          <p style="font-size:11.5px;color:#444441;line-height:1.55;font-family:${fontBody};">${desc}</p>
        </div>`,
        )
        .join("")}
    </div>
  </div>

  ${foot("ALTRUVEX · 2 / 2", escapeHtml(p.t("pdfContent.confidential", { name: clientName })))}
</div>

</body>
</html>`;
}

export async function generateEstimatePdf(html: string, filename: string) {
  const iframe = document.createElement("iframe");
  iframe.style.cssText =
    "position:fixed;left:-9999px;top:0;width:210mm;height:297mm;border:none;opacity:0;pointer-events:none;";
  document.body.appendChild(iframe);

  try {
    const doc = iframe.contentDocument;
    if (!doc) return;

    doc.open();
    doc.write(html);
    doc.close();

    const killStyle = doc.createElement("style");
    killStyle.setAttribute("data-pdf-style", "true");
    killStyle.textContent = `*, *::before, *::after { color-scheme: light !important; }`;
    doc.head.appendChild(killStyle);

    await new Promise((resolve) => setTimeout(resolve, 500));
    if ("fonts" in doc) {
      await doc.fonts.ready;
    }

    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
      compress: true,
    });
    const source = doc.body;
    source.style.colorScheme = "light";
    source.style.background = "#ffffff";

    const pageNodes = Array.from(
      doc.querySelectorAll(".page"),
    ) as HTMLElement[];
    const targets = pageNodes.length > 0 ? pageNodes : [source];

    const pageWidthMm = 210;
    const pageHeightMm = 297;
    let pageIndex = 0;

    for (const target of targets) {
      const canvas = await html2canvas(target, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
        windowWidth: Math.max(target.scrollWidth, 794),
        windowHeight: Math.max(target.scrollHeight, 1123),
      });

      const pxPerMm = canvas.width / pageWidthMm;
      const pageHeightPx = Math.max(Math.floor(pageHeightMm * pxPerMm), 1);
      const hasExplicitPages = pageNodes.length > 0;

      if (hasExplicitPages) {
        if (pageIndex > 0) {
          pdf.addPage("a4", "portrait");
        }

        pdf.addImage(
          canvas.toDataURL("image/jpeg", 0.94),
          "JPEG",
          0,
          0,
          pageWidthMm,
          pageHeightMm,
          `page-${pageIndex + 1}`,
          "FAST",
        );

        pageIndex += 1;
        continue;
      }

      for (let offsetY = 0; offsetY < canvas.height; offsetY += pageHeightPx) {
        const sliceHeightPx = Math.min(pageHeightPx, canvas.height - offsetY);
        const pageCanvas = document.createElement("canvas");
        pageCanvas.width = canvas.width;
        pageCanvas.height = sliceHeightPx;

        const pageCtx = pageCanvas.getContext("2d");
        if (!pageCtx) continue;

        pageCtx.fillStyle = "#ffffff";
        pageCtx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
        pageCtx.drawImage(
          canvas,
          0,
          offsetY,
          canvas.width,
          sliceHeightPx,
          0,
          0,
          canvas.width,
          sliceHeightPx,
        );

        if (pageIndex > 0) {
          pdf.addPage("a4", "portrait");
        }

        const renderHeightMm = Math.max(sliceHeightPx / pxPerMm, 1);
        pdf.addImage(
          pageCanvas.toDataURL("image/jpeg", 0.94),
          "JPEG",
          0,
          0,
          pageWidthMm,
          renderHeightMm,
          `page-${pageIndex + 1}`,
          "FAST",
        );

        pageIndex += 1;
      }
    }

    pdf.save(filename);
  } finally {
    document.body.removeChild(iframe);
  }
}
