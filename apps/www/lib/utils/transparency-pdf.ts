import type { ResolvedPricing } from "@repo/pricing-schema";
import { css, PALETTE } from "@repo/ui/palette";
import { SITE_CONFIG } from "../metadata";
import { localizeNumbers } from "./number";
import {
  fillScopeTokens,
  type DeliverableBand,
  type DeliverableProject,
  type TransparencyTranslator,
} from "./transparency-utils";

const PDF = {
  white: css(PALETTE.light.card),
  paper: css(PALETTE.light["n-0"]),
  paperDeep: css(PALETTE.light["n-1"]),
  panel: css(PALETTE.light.surface),
  hairline: css(PALETTE.light["n-2"]),
  rule: css(PALETTE.light["n-3"]),
  faint: css(PALETTE.light["n-4"]),
  muted: css(PALETTE.light["n-5"]),
  body: css(PALETTE.light["n-6"]),
  ink: css(PALETTE.light["n-8"]),
  brand: css(PALETTE.light.brand),
} as const;

interface NarrativeInsight {
  label: { ar: string; en: string };
  message: { ar: string; en: string };
}

interface ProposalNarrative {
  headline: { ar: string; en: string };
  insights: NarrativeInsight[];
  closing: { ar: string; en: string };
}

interface PdfFonts {
  faces: string;
  display: string;
  body: string;
  mono: string;
}

const GENERIC_STACK = "sans-serif";

function familyNames(stack: string): string[] {
  return stack
    .split(",")
    .map((name) => name.trim().replace(/^(['"])(.*)\1$/, "$2"))
    .filter(Boolean);
}

export function collectPdfFonts(): PdfFonts {
  const display =
    getComputedStyle(document.documentElement)
      .getPropertyValue("--font-brand")
      .replace(/\s+/g, " ")
      .trim() || GENERIC_STACK;
  const body = getComputedStyle(document.body).fontFamily || GENERIC_STACK;
  const mono = display;
  const wanted = new Set(familyNames(`${display},${body},${mono}`));

  const faces: string[] = [];
  for (const sheet of Array.from(document.styleSheets)) {
    let rules: CSSRuleList;
    try {
      rules = sheet.cssRules;
    } catch {
      continue;
    }
    const base = sheet.href ?? document.baseURI;
    for (const rule of Array.from(rules)) {
      if (!(rule instanceof CSSFontFaceRule)) continue;
      const [family] = familyNames(rule.style.getPropertyValue("font-family"));
      if (!family || !wanted.has(family)) continue;
      faces.push(
        rule.cssText
          .replace(
            /url\(\s*(['"]?)([^'")]+)\1\s*\)/g,
            (_, _quote, url: string) => `url("${new URL(url, base).href}")`,
          )
          .replace(/font-display:\s*[\w-]+/, "font-display: block"),
      );
    }
  }
  return { faces: faces.join("\n"), display, body, mono };
}

function pickLang(obj: { ar: string; en: string }, locale: string): string {
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

const TIMELINE_COPY: Record<string, { ar: string; en: string }> = {
  urgent: {
    ar: "اخترت التسليم السريع - يعني لديك موعد حرج أو فرصة سوق لا تنتظر. سنُعيد تصميم نطاق العمل حول تاريخك لا العكس، مع تحديد ما يُطلق أولاً وما يأتي في المرحلة الثانية.",
    en: "You chose fast delivery - you have a critical deadline or a market window that won't stay open. We'll engineer the scope around your date, not the other way around - identifying what launches first and what follows in a second phase.",
  },
  standard: {
    ar: "اخترت التوقيت المتوازن - وهو الأذكى في معظم الحالات. يمنحنا وقتاً كافياً لاكتشاف المتطلبات بدقة، بناء نظام متين، واختباره جيداً قبل الإطلاق دون ضغط غير ضروري.",
    en: "You chose a balanced timeline - the smartest choice in most cases. It gives us enough time to gather requirements precisely, build a solid system, and test it thoroughly before launch without unnecessary pressure.",
  },
  flexible: {
    ar: "اخترت المرونة في التوقيت - وهذه ميزة هندسية حقيقية. وقت أوسع داخل سقف التسليم نفسه يعني اختباراً أعمق، وتحسيناً أكثر في الأداء، ونظاماً يصمد على المدى البعيد دون حاجة لإعادة بناء.",
    en: "You chose a flexible timeline - a genuine engineering advantage. A wider window inside the same delivery ceiling means deeper testing, more performance refinement, and a system built to hold up long-term without needing a rebuild.",
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
    ar: "المحتوى لا يزال في طور التخطيط - هذا طبيعي في المراحل الأولى. سنُحدد الاحتياجات الفعلية خلال مراجعة النطاق.",
    en: "Content is still being planned - that's normal at this stage. We'll define the actual needs during scope review.",
  },
};

const CLOSING_COPY = {
  ar: "هذا التقدير مبني على اختياراتك الفعلية. الخطوة التالية: نراجع النطاق معك، ثم نرسل عرضاً مكتوباً واحداً بالرقم المُلزِم.",
  en: "This estimate is built on your actual selections. Next, we review scope with you, then send one written proposal with the binding figure.",
};

interface NarrativeParams {
  projectType: DeliverableProject;
  timelineKey: string;
  brandIdentity?: string | null;
  contentReadiness?: string | null;
}

function generateProposalNarrative(p: NarrativeParams): ProposalNarrative {
  const insights: NarrativeInsight[] = [
    {
      label: { ar: "نوع المشروع", en: "Project type" },
      message: PROJECT_COPY[p.projectType],
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

  return {
    headline: {
      ar: "لماذا هذه الخطة مناسبة لك",
      en: "Why this plan fits your needs",
    },
    insights,
    closing: CLOSING_COPY,
  };
}

interface PDFParams {
  locale: string;
  t: TransparencyTranslator;
  projectType: DeliverableProject;
  band: DeliverableBand;
  serviceLabel: string;
  bandLabel: string;
  timelineLabel: string;
  timelineKey: string;
  scopeNotes: readonly string[];
  disclaimer: string;
  pricing: ResolvedPricing;
  fonts: PdfFonts;
  priceMin: number;
  priceMax: number;
  weeksMin: number;
  weeksMax: number;
  name: string;
  brandIdentity?: string | null;
  contentReadiness?: string | null;
}

export function buildPDFHtml(p: PDFParams): string {
  const isRtl = p.locale === "ar";
  const dir = isRtl ? "rtl" : "ltr";
  const alignLeft = isRtl ? "right" : "left";
  const alignRight = isRtl ? "left" : "right";

  const f = (n: number) =>
    new Intl.NumberFormat(isRtl ? "ar-EG-u-nu-latn" : "en-EG", {
      style: "currency",
      currency: "EGP",
      maximumFractionDigits: 0,
    }).format(n);

  const today = new Intl.DateTimeFormat(isRtl ? "ar-EG-u-nu-latn" : "en-US", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date());

  const asStrings = (raw: unknown): string[] =>
    Array.isArray(raw)
      ? raw.filter((item): item is string => typeof item === "string")
      : [];
  const listed = asStrings(
    p.t.raw?.(`pdfContent.deliverables.${p.projectType}.${p.band}`),
  );
  const items = (
    listed.length > 0
      ? listed
      : asStrings(p.t.raw?.("results.fallbackDeliverables"))
  ).map((item) => fillScopeTokens(item, p.locale, p.pricing));

  const half = Math.ceil(items.length / 2);
  const col1 = items.slice(0, half);
  const col2 = items.slice(half);

  const lblProjectType = escapeHtml(p.serviceLabel);
  const lblBand = escapeHtml(p.bandLabel);
  const lblTimeline = escapeHtml(p.timelineLabel);

  const narrative = generateProposalNarrative({
    projectType: p.projectType,
    timelineKey: p.timelineKey,
    brandIdentity: p.brandIdentity,
    contentReadiness: p.contentReadiness,
  });
  const L = (obj: { ar: string; en: string }) => pickLang(obj, p.locale);

  const fontBody = escapeHtml(p.fonts.body);
  const scopeNoteRows =
    p.scopeNotes.length > 0
      ? p.scopeNotes
          .map(
            (n) => `
      <div style="padding:7px 0;border-bottom:1px solid ${PDF.hairline};font-family:${fontBody};font-size:11.5px;color:${PDF.body};">${escapeHtml(n)}</div>`,
          )
          .join("")
      : `<div style="padding:7px 0;font-family:${fontBody};font-size:11.5px;color:${PDF.muted};">${escapeHtml(p.t("pdfContent.noScopeNotes"))}</div>`;
  const fontDisplay = escapeHtml(p.fonts.display);
  const fontMono = escapeHtml(p.fonts.mono);
  const labelStyle = (tracking: string) =>
    isRtl
      ? `font-family:${fontBody};letter-spacing:0;text-transform:none;`
      : `font-family:${fontMono};letter-spacing:${tracking};text-transform:uppercase;`;
  const monoText = `font-family:${isRtl ? fontBody : fontMono};`;
  const latinMono = `font-family:${fontMono};direction:ltr;unicode-bidi:isolate;`;
  const safeName = p.name ? escapeHtml(p.name) : "";
  const clientName =
    safeName || escapeHtml(p.t("pdfContent.prospectiveClient"));
  const NAME_SLOT = "\uE000";
  const confidentialLine = escapeHtml(
    p.t("pdfContent.confidential", { name: NAME_SLOT }),
  ).replace(NAME_SLOT, `<bdi>${clientName}</bdi>`);

  const mkCol = (arr: string[]) =>
    arr
      .map(
        (d) => `
      <div style="display:flex;align-items:flex-start;gap:9px;padding:7px 0;border-bottom:1px solid ${PDF.hairline};">
        <svg width="12" height="12" viewBox="0 0 12 12" style="margin-top:3px;flex-shrink:0;">
          <circle cx="6" cy="6" r="2" fill="${PDF.ink}" opacity="0.4"/>
        </svg>
        <span style="font-family:${fontBody};font-size:11.5px;color:${PDF.body};line-height:1.55;">${d}</span>
      </div>`,
      )
      .join("");

  const hdr = (label: string, sub: string) => `
    <div style="display:flex;justify-content:space-between;align-items:center;padding-bottom:16px;border-bottom:1.5px solid ${PDF.ink};margin-bottom:20px;">
      <span style="font-family:${fontDisplay};font-size:17px;font-weight:600;letter-spacing:.14em;color:${PDF.ink};">ALTRUVEX</span>
      <div style="text-align:${alignRight};">
        <span style="${labelStyle(".22em")}font-size:8px;color:${PDF.muted};display:block;margin-bottom:2px;">${label}</span>
        <span style="${monoText}font-size:11px;color:${PDF.body};">${sub}</span>
      </div>
    </div>`;

  const sCard = (l: string, v: string) => `
    <div style="padding:12px 14px;border:1px solid ${PDF.hairline};border-radius:4px;background:${PDF.paper};text-align:${alignLeft};">
      <span style="${labelStyle(".22em")}font-size:7.5px;color:${PDF.muted};display:block;margin-bottom:4px;">${l}</span>
      <span style="font-family:${fontDisplay};font-size:12px;font-weight:500;color:${PDF.ink};">${v}</span>
    </div>`;

  const secHead = (lbl: string) => `
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;">
      <span style="${labelStyle(".25em")}font-size:8px;color:${PDF.muted};white-space:nowrap;">${lbl}</span>
      <div style="flex:1;height:1px;background:${PDF.hairline};"></div>
    </div>`;

  const foot = (pg: string, disc: string) => `
    <div style="border-top:1px solid ${PDF.hairline};padding-top:11px;display:flex;justify-content:space-between;align-items:flex-end;margin-top:auto;">
      <div style="${monoText}font-size:7.5px;color:${PDF.faint};max-width:68%;line-height:1.6;text-align:${alignLeft};">${disc}</div>
      <span style="font-family:${fontDisplay};font-size:11px;font-weight:600;letter-spacing:.12em;color:${PDF.faint};direction:ltr;unicode-bidi:isolate;">${pg}</span>
    </div>`;

  const narrativeRows = narrative.insights
    .map(
      (ins) => `
    <div style="padding:9px 12px;border:1px solid ${PDF.hairline};border-radius:4px;background:${PDF.paper};text-align:${alignLeft};">
      <span style="${labelStyle(".2em")}font-size:7.5px;color:${PDF.faint};display:block;margin-bottom:3px;">${L(ins.label)}</span>
      <span style="font-family:${fontBody};font-size:11px;color:${PDF.body};line-height:1.65;">${L(ins.message)}</span>
    </div>`,
    )
    .join("");

  return `<!DOCTYPE html>
<html ${isRtl ? 'lang="ar" dir="rtl"' : 'lang="en" dir="ltr"'}>
<head>
<meta charset="UTF-8"/>
<title>${p.t("pdf.label")} · ALTRUVEX · ${today}</title>
<style data-pdf-style="true">
  ${p.fonts.faces}
  *{margin:0;padding:0;box-sizing:border-box;}
  body{
    font-family:${p.fonts.body};
    background:${PDF.paperDeep};
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
  ${hdr(p.t("pdf.label"), `${today}${safeName ? ` · <bdi>${safeName}</bdi>` : ""}`)}
  <div style="background:${PDF.ink};border-radius:5px;padding:20px 24px;margin-bottom:18px;">
    <span style="${labelStyle(".25em")}font-size:8px;color:${PDF.muted};display:block;margin-bottom:8px;">${p.t("pdfContent.engineeringBeyond")}</span>
    <div style="font-family:${fontDisplay};font-size:24px;font-weight:500;color:${PDF.paper};line-height:1.2;margin-bottom:6px;">${lblProjectType}</div>
    <div style="${monoText}font-size:12px;color:${PDF.muted};">${lblBand}${lblTimeline ? ` &nbsp;·&nbsp; ${lblTimeline}` : ""}</div>
  </div>

  <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:16px;">
    ${sCard(p.t("pdfContent.projectType"), lblProjectType)}
    ${sCard(p.t("pdfContent.band"), lblBand)}
    ${sCard(p.t("pdfContent.deliveryMode"), lblTimeline)}
  </div>

  ${secHead(L(narrative.headline))}
  <div style="display:grid;grid-template-columns:1fr;gap:7px;margin-bottom:16px;">
    ${narrativeRows}
  </div>

  ${secHead(p.t("pdfContent.investmentEstimate"))}
  <div style="display:grid;grid-template-columns:1.2fr 1fr;gap:10px;margin-bottom:16px;">
    <div style="padding:18px 20px;background:${PDF.paper};border:1px solid ${PDF.rule};border-radius:4px;">
      <span style="${labelStyle(".2em")}font-size:7.5px;color:${PDF.muted};display:block;margin-bottom:8px;">${p.t("pdfContent.totalRange")}</span>
      <div style="font-family:${fontDisplay};font-size:28px;font-weight:500;letter-spacing:-.02em;color:${PDF.ink};line-height:1.1;">${f(p.priceMin)}</div>
      <div style="font-size:13px;color:${PDF.muted};margin-top:3px;">- ${f(p.priceMax)}</div>
    </div>
    <div style="padding:18px 20px;background:${PDF.panel};border-radius:4px;">
      <span style="${labelStyle(".2em")}font-size:7.5px;color:${PDF.muted};display:block;margin-bottom:8px;">${p.t("pdfContent.estimatedDelivery")}</span>
      <div style="font-family:${fontDisplay};font-size:28px;font-weight:500;letter-spacing:-.02em;color:${PDF.ink};line-height:1.1;">${localizeNumbers(p.weeksMin.toString(), p.locale)}–${localizeNumbers(p.weeksMax.toString(), p.locale)}</div>
      <div style="font-size:12px;color:${PDF.muted};margin-top:3px;">${p.t("pdfContent.weeksFromKickoff")}</div>
    </div>
  </div>

  ${secHead(p.t("pdfContent.scopeNotes"))}
  <div style="margin-bottom:16px;">${scopeNoteRows}</div>

  <div style="display:flex;justify-content:space-between;align-items:center;padding:16px 20px;background:${PDF.ink};border-radius:4px;margin-bottom:16px;">
    <div>
      <div style="font-family:${fontDisplay};font-size:15px;font-weight:500;color:${PDF.paper};margin-bottom:3px;">${p.t("pdfContent.readyToMoveForward")}</div>
      <div style="${monoText}font-size:11px;color:${PDF.muted};">${p.t("pdfContent.nextStep")}</div>
    </div>
    <div style="text-align:${alignRight};">
      <span style="${latinMono}font-size:12px;color:${PDF.paper};display:block;margin-bottom:2px;">${SITE_CONFIG.email}</span>
      <span style="${latinMono}font-size:11px;color:${PDF.muted};">altruvex.com</span>
    </div>
  </div>

  ${foot("ALTRUVEX · 1 / 2", escapeHtml(p.disclaimer))}
</div>
<div class="page">
  ${hdr(p.t("pdfContent.scopeOfDeliverables"), `${lblProjectType} · ${lblBand}`)}

  <div style="padding:14px 0 18px;">
    <p style="font-family:${fontDisplay};font-size:22px;font-weight:400;letter-spacing:-.02em;color:${PDF.ink};margin-bottom:4px;">${p.t("pdfContent.whatsIncluded")}</p>
    <p style="${monoText}font-size:12px;color:${PDF.muted};">${p.t("pdfContent.deliverablesCount", { count: localizeNumbers(items.length.toString(), p.locale), band: lblBand })}</p>
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
        [p.t("pdfContent.phase3Title"), p.t("pdfContent.phase3Desc")],
        [p.t("pdfContent.phase4Title"), p.t("pdfContent.phase4Desc")],
      ]
        .map(
          ([phase, desc]) => `
        <div style="padding:12px 15px;border:1px solid ${PDF.hairline};border-radius:4px;background:${PDF.paper};">
          <p style="${labelStyle(".2em")}font-size:8px;color:${PDF.muted};margin-bottom:5px;">${phase}</p>
          <p style="font-size:11.5px;color:${PDF.body};line-height:1.55;font-family:${fontBody};">${desc}</p>
        </div>`,
        )
        .join("")}
    </div>
  </div>

  ${foot("ALTRUVEX · 2 / 2", confidentialLine)}
</div>

</body>
</html>`;
}

export async function generateEstimatePdf(
  html: string,
  filename: string,
): Promise<void> {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import("html2canvas"),
    import("jspdf"),
  ]);
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
    source.style.background = PDF.white;

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
        backgroundColor: PDF.white,
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

        pageCtx.fillStyle = PDF.white;
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
