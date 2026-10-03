/* Shared layer for the transparency + pricing prototypes (A / B / C / index). Needs data.js first.
 *
 * API (window.X)
 *   X.lang                 "en" | "ar"  (from ?l=ar; sets <html lang dir>)
 *   X.D                    window.AX[X.lang] — every figure comes from here, never typed
 *   X.c                    merged copy for the current language (shared + registered direction copy)
 *   X.addCopy({en:{…},ar:{…}})  register direction copy; deep-merged, read back as X.c.<key>
 *   X.boot({active, render, mount})
 *                          active: "a"|"b"|"c"|"o" (marks the switcher); render(): returns the <main> HTML;
 *                          mount(root): bind the direction's behaviour. Re-run on every language change.
 *                          Boot adds nav, footer, switcher, then auto-settles [data-settle] and reveals [data-reveal].
 *   Renderers (return HTML strings):
 *     X.homeSection({device, index})   homepage section "Transparent by design": eyebrow + mono index +
 *                                      heading + lead + the two CTAs; `device` is the direction's compact form
 *     X.pricingHero()                  /pricing hero (divider, eyebrow, h1, model line, CTAs)
 *     X.secHead({index, title, lead}) pricing section head with grey mono index
 *     X.register()                     03 Service investment (incl. the 12-range unnamed matrix)
 *     X.terms()                        04 Commercial terms <dl>
 *     X.closeBand()                    closing CTA band
 *     X.fig(text, {cls, delay})        figure slot that digit-settles on enter (cls "fig-d" = decision figure, brand)
 *     X.btn(kind, label, href)         kind "p" (primary, brand) | "s" (secondary); control radius
 *   Data helpers:
 *     X.stages()     five stages [{id, name, does, cap, fig, prev, kind}] for the worked example
 *                    (kind: "unknown" | "range" | "estimate" | "proposal"); fig/prev are schema-formatted strings
 *     X.drivers()    seven drivers [{id, name, desc, cls, clsLabel, stage, factors:[{id,label,price}]}]
 *                    cls: "moves" | "review" | "monthly"; stage: where the driver acts (A's attachment point)
 *     X.factorList(group) / X.factorSpan(group)   group "timeline"|"brand"|"content" → real multipliers
 *     X.exampleLine()  "Worked example — Website · Standard complexity · …" (built from AX.example.input)
 *     X.bands()      [{id,label}] working band labels (Contained/Standard/Extensive) — overrides matrix.bands
 *     X.plans()      maintenance [{id,name,price,cycle,custom}]
 *     X.num(n) locale number · X.pct(n) · X.digits(s) (Latin→Arabic-Indic in AR; data weeks come Latin)
 *     X.fill(str, {k:v})  replace {k} placeholders · X.esc(s)
 *   Motion:
 *     X.motion       false under prefers-reduced-motion or without IntersectionObserver (content is final then)
 *     X.settle(el, text?, delayMs?)   digit settle; number runs stay LTR-isolated so RTL never reverses digits
 *     X.reveal(els, onEnter, {threshold, rootMargin})  IntersectionObserver once-per-element; immediate if !X.motion
 */
(function () {
  "use strict";
  const params = new URLSearchParams(location.search);
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  const fill = (s, o) => String(s).replace(/\{(\w+)\}/g, (m, k) => (k in o ? o[k] : m));
  const isObj = (v) => v && typeof v === "object" && !Array.isArray(v);
  const merge = (a, b) => { for (const k in b) a[k] = isObj(b[k]) && isObj(a[k]) ? merge(a[k], b[k]) : b[k]; return a; };

  /* ---------------- shared copy (EN / AR) ---------------- */
  const COPY = {
    en: {
      nav: { links: ["Work", "Services", "Pricing", "About", "Contact"], on: 2, cta: "Estimate your project" },
      cta: { estimate: "Estimate your project", discuss: "Discuss your requirements", scope: "See how we scope projects" },
      divider: { home: "Homepage · section", pricing: "Page · /pricing" },
      home: {
        eyebrow: "Transparent by design",
        heading: "One project, priced at every stage.",
        lead: "The range narrows as requirements become scope. Every range on the way is published; the only binding number is the proposal.",
      },
      hero: {
        eyebrow: "Pricing",
        h1a: "Priced from requirements,",
        h1b: "not packages.",
        sub: "There are no packages to pick from. A build starts from a published floor, narrows as we understand the scope, and ends in one written figure.",
      },
      sec: {
        how: "How pricing works",
        what: "What determines cost",
        invest: "Service investment",
        investLead: "Published figures for every service. Build ranges stay indicative until the proposal fixes one number.",
        terms: "Commercial terms",
        termsLead: "What applies to every engagement, before any proposal is written.",
      },
      stages: {
        requirements: { name: "Requirements", does: "You describe the problem and what the site or system has to do.", cap: "Not priced yet" },
        scope: { name: "Scope", does: "What gets designed, engineered and integrated sets the project type.", cap: "Every build starts here" },
        complexity: { name: "Complexity", does: "Logic, templates, states and roles place it in a published range.", cap: "Published range" },
        estimate: { name: "Estimate", does: "Content, brand readiness and timeline adjust the range. Indicative, never a quotation.", cap: "Indicative · {weeks} weeks" },
        proposal: { name: "Proposal", does: "Scope review confirms integrations and performance targets, then one written figure, valid {days} days.", cap: "Binding", fig: "One figure, set after scope review" },
      },
      drivers: {
        scope: { name: "Scope", desc: "What gets designed, engineered and integrated." },
        complexity: { name: "Complexity", desc: "How much logic, how many templates, states and roles." },
        content: { name: "Content", desc: "Whether copy, imagery and brand identity are ready." },
        timeline: { name: "Timeline", desc: "Urgent, standard or flexible delivery." },
        integrations: { name: "Integrations", desc: "Payments, sign-in, CRM, APIs, analytics." },
        performance: { name: "Performance", desc: "Performance, accessibility, SEO and infrastructure targets." },
        operation: { name: "Ongoing operation", desc: "Maintenance, monitoring, security and updates." },
      },
      cls: { moves: "Moves the estimate", review: "Confirmed in scope review — never priced by the estimator", monthly: "Priced separately — monthly plans" },
      drvHow: { scope: "Sets the project type", complexity: "Sets the complexity band" },
      factorOpt: {
        timeline: { urgent: "Urgent", standard: "Standard", flexible: "Flexible" },
        brand: { complete: "Brand ready", partial: "Partial brand", scratch: "No brand yet" },
        content: { provide: "You provide content", "need-help": "Content help", unsure: "Not sure yet" },
      },
      bands: { basic: "Contained", standard: "Standard", premium: "Extensive" },
      example: "Worked example — {service} · {band} complexity · {brand} · {content} · {timeline} timeline",
      reg: {
        cols: ["Service", "What it covers", "How it's priced", "Figure"],
        interface: { name: "Interface design", covers: "Interface and experience design, delivered as screens and a working design system.", how: "Per project, from the screens and flows involved", fig: "Scoped per project" },
        dev: { name: "Custom development", how: "Published range by project type and complexity; fixed in the proposal", more: "See all {n} published ranges" },
        audit: { name: "Technical audit", covers: "Architecture, performance and security review with a remediation roadmap, in {duration}.", how: "Fixed fee, credited to the build" },
        maint: { name: "Maintenance", covers: "Updates, monitoring, backups and edit requests after launch.", how: "Monthly plan" },
        mxHead: "Project type",
        mxNote: "<b>Label proposal:</b> Contained / Standard / Extensive are working names for the complexity bands.",
      },
      terms: {
        payment: "Payment",
        pay: ["{p} to start", "{p} at a development milestone", "{p} before production launch"],
        warranty: "Warranty", warrantyNote: "{d} days after launch — defects in delivered work are fixed at no charge.",
        validity: "Proposal validity", validityNote: "{n} days from the date of issue.",
        ownership: "Ownership", ownershipNote: "Code, designs and accounts pass to you at final payment.",
      },
      close: { h: "Start from your requirements.", p: "The estimator gives an indicative range in a few minutes. The proposal — the only binding figure — follows a scope review." },
      foot: { draft: "Copy unreviewed — draft", src: "Figures generated from the pricing schema on {date}" },
      sw: { overview: "Overview", home: "Home", pricing: "Pricing", estimator: "Estimator", light: "Light", dark: "Dark" },
      dir: {
        a: { name: "Resolution spine", claim: "One project, priced five times as it resolves.", proof: "Proof: sequence" },
        b: { name: "The split line", claim: "What moves the estimate, split from what doesn't.", proof: "Proof: comparison" },
        c: { name: "Three documents", claim: "The same project answered as three documents.", proof: "Proof: comparison of resolution" },
      },
    },
    ar: {
      nav: { links: ["أعمالنا", "الخدمات", "الأسعار", "من نحن", "تواصل"], on: 2, cta: "قدّر مشروعك" },
      cta: { estimate: "قدّر مشروعك", discuss: "ناقش متطلباتك معنا", scope: "اطّلع على طريقة تحديد النطاق" },
      divider: { home: "الصفحة الرئيسية · قسم", pricing: "صفحة · \u200E/pricing" },
      home: {
        eyebrow: "شفافية من الأساس",
        heading: "مشروع واحد، مسعَّر في كل مرحلة.",
        lead: "يضيق النطاق السعري كلما تحوّلت المتطلبات إلى نطاق عمل واضح. كل نطاق في الطريق منشور، والرقم الوحيد الملزم هو عرض السعر.",
      },
      hero: {
        eyebrow: "الأسعار",
        h1a: "نسعّر من المتطلبات،",
        h1b: "لا من الباقات.",
        sub: "لا توجد باقات تختار منها. يبدأ البناء من حدّ أدنى منشور، ويضيق كلما فهمنا نطاق العمل، وينتهي برقم واحد مكتوب.",
      },
      sec: {
        how: "كيف نسعّر",
        what: "ما الذي يحدد التكلفة",
        invest: "أسعار الخدمات",
        investLead: "أرقام منشورة لكل خدمة. نطاقات البناء تبقى استرشادية حتى يثبّت عرض السعر رقماً واحداً.",
        terms: "الشروط التجارية",
        termsLead: "ما ينطبق على كل تعاقد، قبل أن يُكتب أي عرض سعر.",
      },
      stages: {
        requirements: { name: "المتطلبات", does: "تصف المشكلة وما يجب أن يؤديه الموقع أو النظام.", cap: "لم يُسعَّر بعد" },
        scope: { name: "نطاق العمل", does: "ما سيُصمَّم ويُبنى ويُربط يحدد نوع المشروع.", cap: "نقطة بداية أي مشروع بناء" },
        complexity: { name: "درجة التعقيد", does: "حجم المنطق وعدد القوالب والحالات والصلاحيات يضعه في نطاق منشور.", cap: "النطاق المنشور" },
        estimate: { name: "التقدير", does: "جاهزية المحتوى والهوية والجدول الزمني تعدّل النطاق. تقدير استرشادي، وليس عرض سعر.", cap: "استرشادي · {weeks} أسابيع" },
        proposal: { name: "عرض السعر", does: "مراجعة النطاق تؤكد التكاملات ومستهدفات الأداء، ثم رقم واحد مكتوب صالح لمدة {days} يوماً.", cap: "ملزم", fig: "رقم واحد، يُحدَّد بعد مراجعة النطاق" },
      },
      drivers: {
        scope: { name: "نطاق العمل", desc: "ما سيُصمَّم ويُبنى ويُربط." },
        complexity: { name: "درجة التعقيد", desc: "حجم المنطق، وعدد القوالب والحالات والصلاحيات." },
        content: { name: "المحتوى", desc: "هل النصوص والصور والهوية البصرية جاهزة." },
        timeline: { name: "الجدول الزمني", desc: "تسليم عاجل أو عادي أو مرن." },
        integrations: { name: "التكاملات", desc: "الدفع، وتسجيل الدخول، وأنظمة العملاء، والواجهات البرمجية، والتحليلات." },
        performance: { name: "الأداء", desc: "مستهدفات الأداء وسهولة الوصول ومحركات البحث والبنية التحتية." },
        operation: { name: "التشغيل المستمر", desc: "الصيانة والمراقبة والأمان والتحديثات." },
      },
      cls: { moves: "يحرّك التقدير", review: "يُؤكَّد في مراجعة النطاق — لا يسعّره المقدّر", monthly: "يُسعَّر منفصلاً — خطط شهرية" },
      drvHow: { scope: "يحدد نوع المشروع", complexity: "يحدد فئة التعقيد" },
      factorOpt: {
        timeline: { urgent: "عاجل", standard: "عادي", flexible: "مرن" },
        brand: { complete: "هوية جاهزة", partial: "هوية جزئية", scratch: "بلا هوية بعد" },
        content: { provide: "المحتوى منك", "need-help": "مساعدة في المحتوى", unsure: "غير محدد بعد" },
      },
      bands: { basic: "محدود", standard: "قياسي", premium: "واسع" },
      example: "مثال محسوب — {service} · تعقيد {band} · {brand} · {content} · جدول {timeline}",
      reg: {
        cols: ["الخدمة", "ما تشمله", "طريقة التسعير", "الرقم"],
        interface: { name: "تصميم الواجهات", covers: "تصميم الواجهات وتجربة الاستخدام، يُسلَّم شاشاتٍ ونظامَ تصميم جاهزاً للعمل.", how: "لكل مشروع، حسب الشاشات ومسارات الاستخدام", fig: "يُحدَّد لكل مشروع" },
        dev: { name: "التطوير المخصص", how: "نطاق منشور حسب نوع المشروع ودرجة تعقيده، ويُثبَّت في عرض السعر", more: "اعرض كل النطاقات المنشورة ({n})" },
        audit: { name: "المراجعة التقنية", covers: "مراجعة للبنية والأداء والأمان مع خارطة طريق للإصلاح، خلال {duration}.", how: "رسوم ثابتة، تُخصم من مشروع البناء" },
        maint: { name: "الصيانة", covers: "التحديثات والمراقبة والنسخ الاحتياطي وطلبات التعديل بعد الإطلاق.", how: "خطة شهرية" },
        mxHead: "نوع المشروع",
        mxNote: "<b>مقترح تسمية:</b> «محدود / قياسي / واسع» أسماء عمل مؤقتة لفئات التعقيد.",
      },
      terms: {
        payment: "الدفعات",
        pay: ["{p} عند البدء", "{p} عند مرحلة تطوير متفق عليها", "{p} قبل الإطلاق على بيئة الإنتاج"],
        warranty: "الضمان", warrantyNote: "{d} يوماً بعد الإطلاق — نصلح أي عيب في العمل المسلَّم دون مقابل.",
        validity: "صلاحية عرض السعر", validityNote: "{n} يوماً من تاريخ الإصدار.",
        ownership: "الملكية", ownershipNote: "تنتقل إليك ملكية الكود والتصاميم والحسابات عند سداد الدفعة الأخيرة.",
      },
      close: { h: "ابدأ من متطلباتك.", p: "يعطيك المقدّر نطاقاً استرشادياً خلال دقائق. أما عرض السعر — الرقم الملزم الوحيد — فيأتي بعد مراجعة النطاق." },
      foot: { draft: "النص غير مُراجَع — مسودة", src: "الأرقام مولَّدة من مخطط الأسعار بتاريخ {date}" },
      sw: { overview: "نظرة عامة", home: "الرئيسية", pricing: "الأسعار", estimator: "المقدّر", light: "فاتح", dark: "داكن" },
      dir: {
        a: { name: "العمود المتدرّج", claim: "مشروع واحد، يُسعَّر خمس مرات كلما اتضح.", proof: "الدليل: التسلسل" },
        b: { name: "الخط الفاصل", claim: "ما يحرّك التقدير، مفصولاً عمّا لا يحرّكه.", proof: "الدليل: المقارنة" },
        c: { name: "ثلاث وثائق", claim: "المشروع نفسه، مُجاباً عنه في ثلاث وثائق.", proof: "الدليل: مقارنة درجات الوضوح" },
      },
    },
  };

  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const X = (window.X = {
    lang: params.get("l") === "ar" ? "ar" : "en",
    theme: params.get("t") === "dark" ? "dark" : params.get("t") === "light" ? "light" : null,
    motion: !reduced && "IntersectionObserver" in window,
    esc, fill,
    get D() { return window.AX[X.lang]; },
    get c() { return COPY[X.lang]; },
    addCopy(o) { for (const l of ["en", "ar"]) if (o[l]) merge(COPY[l], o[l]); },

    /* ---------- number helpers ---------- */
    num(n) { return new Intl.NumberFormat(X.lang === "ar" ? "ar-EG" : "en", { useGrouping: true }).format(n); },
    pct(n) { return X.num(n) + (X.lang === "ar" ? "٪" : "%"); },
    digits(s) { return X.lang === "ar" ? String(s).replace(/[0-9]/g, (d) => "٠١٢٣٤٥٦٧٨٩"[d]) : String(s); },

    /* ---------- data helpers ---------- */
    bands() { return X.D.matrix.bands.map((b) => ({ id: b.id, label: X.c.bands[b.id] || b.label })); },
    plans() { return X.D.maintenance.map((m) => ({ id: m.id, name: m.name, price: m.priceLabel, cycle: m.cycleLabel, custom: m.isCustomQuote })); },
    factorList(g) {
      const f = X.D.factors[g];
      return Object.keys(f).map((id) => ({ id, label: X.c.factorOpt[g][id], price: f[id].price, raw: f[id].raw.price }));
    },
    factorSpan(g) {
      const l = X.factorList(g).slice().sort((a, b) => a.raw - b.raw);
      return l[0].price + " … " + l[l.length - 1].price;
    },
    exampleLine() {
      const e = X.D.example.input, row = X.D.matrix.rows.find((r) => r.serviceId === e.serviceId);
      return fill(X.c.example, {
        service: row.name, band: X.c.bands[e.complexityId],
        brand: X.c.factorOpt.brand[e.brandIdentity], content: X.c.factorOpt.content[e.contentReadiness],
        timeline: X.c.factorOpt.timeline[e.timeline],
      });
    },
    stages() {
      const s = X.c.stages, D = X.D, ex = D.example;
      const days = X.num(D.proposalValidityDays), weeks = X.digits(ex.weeks);
      const list = [
        { id: "requirements", kind: "unknown", fig: "—" },
        { id: "scope", kind: "range", fig: D.minimumEngagement },
        { id: "complexity", kind: "range", fig: ex.cell },
        { id: "estimate", kind: "estimate", fig: ex.estimate },
        { id: "proposal", kind: "proposal", fig: s.proposal.fig },
      ];
      return list.map((st, i) => ({
        ...st, index: i + 1, name: s[st.id].name,
        does: fill(s[st.id].does, { days }), cap: fill(s[st.id].cap, { weeks }),
        prev: i ? list[i - 1].fig : null,
      }));
    },
    drivers() {
      const d = X.c.drivers, cls = X.c.cls;
      const def = [
        ["scope", "moves", "scope", []], ["complexity", "moves", "complexity", []],
        ["content", "moves", "scope", ["content", "brand"]], ["timeline", "moves", "estimate", ["timeline"]],
        ["integrations", "review", "proposal", []], ["performance", "review", "proposal", []],
        ["operation", "monthly", "after", []],
      ];
      return def.map(([id, c, stage, groups]) => ({
        id, name: d[id].name, desc: d[id].desc, cls: c, clsLabel: cls[c], stage,
        how: X.c.drvHow[id] || null,
        factors: groups.flatMap((g) => X.factorList(g).map((f) => ({ ...f, group: g }))),
      }));
    },

    /* ---------- motion ---------- */
    settle(el, text, delay) {
      text = text == null ? el.dataset.settle || el.textContent : text;
      el.classList.add("settled");
      if (!X.motion) { el.textContent = text; return; }
      el.classList.add("settle");
      const toks = text.match(/[+\-−]?[0-9٠-٩][0-9٠-٩,٬.٫]*%?|[\p{L}\p{M}]+|\s+|./gu) || [];
      let i = 0, out = "";
      for (const t of toks) {
        if (/^\s+$/.test(t)) { out += " "; continue; }
        if (/[0-9٠-٩]/.test(t)) {
          out += `<span class="n">${[...t].map((ch) => `<span style="--i:${i++}">${esc(ch)}</span>`).join("")}</span>`;
        } else out += `<span class="t" style="--i:${i++}">${esc(t)}</span>`;
      }
      el.innerHTML = `<span class="sr">${esc(text)}</span><span aria-hidden="true" style="--d:${delay || 0}ms">${out}</span>`;
      /* once settled, fall back to plain text: native kerning, one node for assistive tech */
      clearTimeout(el._settleT);
      el._settleT = setTimeout(() => { el.textContent = text; el.classList.remove("settle"); }, (delay || 0) + i * 26 + 700);
    },
    reveal(els, onEnter, opts) {
      els = Array.from(els || []);
      if (!X.motion) { els.forEach((el) => onEnter(el)); return null; }
      const io = new IntersectionObserver((entries) => {
        entries.forEach((e) => { if (e.isIntersecting) { io.unobserve(e.target); onEnter(e.target); } });
      }, { threshold: (opts && opts.threshold) || 0.25, rootMargin: (opts && opts.rootMargin) || "0px 0px -8% 0px" });
      els.forEach((el) => io.observe(el));
      X._ios.push(io);
      return io;
    },
    _ios: [],

    /* ---------- small renderers ---------- */
    fig(text, o) {
      o = o || {};
      return `<span class="fig ${o.cls || ""}" data-settle="${esc(text)}"${o.delay ? ` data-settle-delay="${o.delay}"` : ""}>${esc(text)}</span>`;
    },
    btn(kind, label, href) {
      return `<a class="btn ${kind}" href="${esc(href)}">${esc(label)}${kind === "p" ? ' <span class="arr" aria-hidden="true">→</span>' : ""}</a>`;
    },
    href(file, hash) {
      const q = new URLSearchParams();
      if (X.lang === "ar") q.set("l", "ar");
      if (X.theme) q.set("t", X.theme);
      const s = q.toString();
      return file + (s ? "?" + s : "") + (hash || "");
    },
    homeSection(o) {
      const c = X.c;
      return `<div class="divider"><span class="mono">${esc(c.divider.home)}</span></div>
<section class="hs" id="home" aria-labelledby="hs-h">
  <div class="hs-top"><span class="eyebrow">${esc(c.home.eyebrow)}</span><span class="ix mono num">${esc(X.digits(String(o.index || 6).padStart(2, "0")))}</span></div>
  <div class="hs-head"><h2 id="hs-h">${esc(c.home.heading)}</h2>
    <div><p>${esc(c.home.lead)}</p><div class="ctas">${X.btn("p", c.cta.scope, "#pricing")}${X.btn("s", c.cta.estimate, X.href("estimator.html"))}</div></div></div>
  ${o.device || ""}
</section>`;
    },
    pricingHero() {
      const c = X.c;
      return `<div class="divider" id="pricing"><span class="mono">${esc(c.divider.pricing)}</span></div>
<header class="hero">
  <div><div class="eyebrow">${esc(c.hero.eyebrow)}</div><h1>${esc(c.hero.h1a)}<br><span class="dim">${esc(c.hero.h1b)}</span></h1></div>
  <div><p>${esc(c.hero.sub)}</p><div class="ctas" style="margin-top:22px">${X.btn("p", c.cta.estimate, X.href("estimator.html"))}${X.btn("s", c.cta.discuss, "#")}</div></div>
</header>`;
    },
    secHead(o) {
      return `<div class="sec-head"><span class="ix mono num">${esc(o.index)}</span><h2${o.id ? ` id="${o.id}"` : ""}>${esc(o.title)}</h2>${o.lead ? `<p>${esc(o.lead)}</p>` : "<span></span>"}</div>`;
    },
    ix(n) { return X.digits(String(n).padStart(2, "0")); },
    register() {
      const c = X.c.reg, D = X.D, rows = D.matrix.rows, bands = X.bands();
      const cellCount = rows.reduce((n, r) => n + r.cells.length, 0);
      const devCovers = rows.map((r) => r.name).join(X.lang === "ar" ? "، " : ", ");
      const matrix = `<table class="mx"><thead><tr><th scope="col">${esc(c.mxHead)}</th>${bands.map((b) => `<th scope="col">${esc(b.label)}</th>`).join("")}</tr></thead>
<tbody>${rows.map((r) => `<tr><th scope="row">${esc(r.name)}</th>${r.cells.map((cell, i) => `<td data-label="${esc(bands[i].label)}"><div><span class="fig">${esc(cell.priceLabel)}</span><small>${esc(X.digits(cell.weeksLabel))}</small></div></td>`).join("")}</tr>`).join("")}</tbody></table>
<p class="note mx-note">${c.mxNote}</p>`;
      const plans = X.plans().map((p) => `<li><span>${esc(p.name)}</span><span class="fig">${esc(p.price)}</span>${p.cycle ? `<span class="note">${esc(p.cycle)}</span>` : ""}</li>`).join("");
      const a = D.consulting;
      return `<section class="sec" id="investment" aria-labelledby="h-inv">
${X.secHead({ index: X.ix(3), title: X.c.sec.invest, lead: X.c.sec.investLead, id: "h-inv" })}
<table class="reg"><thead><tr>${c.cols.map((h) => `<th scope="col">${esc(h)}</th>`).join("")}</tr></thead><tbody>
<tr data-reveal><td><div class="nm">${esc(c.interface.name)}</div></td><td class="cv">${esc(c.interface.covers)}</td><td class="how">${esc(c.interface.how)}</td><td class="f"><span class="fig">${esc(c.interface.fig)}</span></td></tr>
<tr class="has-more" data-reveal><td><div class="nm">${esc(c.dev.name)}</div></td><td class="cv">${esc(devCovers)}</td><td class="how">${esc(c.dev.how)}</td><td class="f">${X.fig(D.minimumEngagement, { cls: "fig-d" })}</td></tr>
<tr class="more"><td colspan="4"><details><summary>${esc(fill(c.dev.more, { n: X.num(cellCount) }))} <span class="chev" aria-hidden="true">⌄</span></summary>${matrix}</details></td></tr>
<tr data-reveal><td><div class="nm">${esc(c.audit.name)}</div></td><td class="cv">${esc(fill(c.audit.covers, { duration: a.duration }))}<p class="credit"><b>${esc(a.creditIfBuild)}</b> ${esc(a.creditIfNot)}</p></td><td class="how">${esc(c.audit.how)}</td><td class="f">${X.fig(a.priceLabel)}</td></tr>
<tr data-reveal><td><div class="nm">${esc(c.maint.name)}</div></td><td class="cv">${esc(c.maint.covers)}</td><td class="how">${esc(c.maint.how)}</td><td class="f"><ul class="plans">${plans}</ul></td></tr>
</tbody></table></section>`;
    },
    terms() {
      const c = X.c.terms, D = X.D, t = D.terms;
      const pay = D.paymentSplit.map((p, i) => `<li>${fill(esc(c.pay[i]), { p: `<span class="fig">${esc(X.pct(p))}</span>` })}</li>`).join("");
      const rows = [
        [c.payment, `<ol>${pay}</ol>`],
        [t.vatLabel, esc(t.vatNote)],
        [t.revisionLabel, esc(t.revisionNote)],
        [c.warranty, esc(fill(c.warrantyNote, { d: D.tokens.warrantyDays }))],
        [c.validity, esc(fill(c.validityNote, { n: X.num(D.proposalValidityDays) }))],
        [c.ownership, esc(c.ownershipNote)],
      ];
      return `<section class="sec" id="terms" aria-labelledby="h-terms">
${X.secHead({ index: X.ix(4), title: X.c.sec.terms, lead: X.c.sec.termsLead, id: "h-terms" })}
<dl class="terms">${rows.map(([k, v], i) => `<div data-reveal><span class="ix mono num" aria-hidden="true">${X.ix(i + 1)}</span><dt>${esc(k)}</dt><dd>${v}</dd></div>`).join("")}</dl></section>`;
    },
    closeBand() {
      const c = X.c;
      return `<section class="close" aria-labelledby="h-close"><h2 id="h-close">${esc(c.close.h)}</h2>
<div><p>${esc(c.close.p)}</p><div class="ctas">${X.btn("p", c.cta.estimate, X.href("estimator.html"))}${X.btn("s", c.cta.discuss, "#")}</div></div></section>`;
    },

    /* ---------- chrome ---------- */
    nav() {
      const n = X.c.nav;
      return `<b>Altruvex</b><div class="l">${n.links.map((l, i) => `<span${i === n.on ? ' class="on" aria-current="page"' : ""}>${esc(l)}</span>`).join("")}</div>${X.btn("p sm", n.cta, X.href("estimator.html"))}`;
    },
    footer() {
      const f = X.c.foot;
      return `<span class="draft">${esc(f.draft)}</span><span class="note">${esc(fill(f.src, { date: X.digits(window.AX.generatedOn) }))}</span>`;
    },
    switcher() {
      const s = X.c.sw, cur = X.active, dir = X.c.dir;
      const link = (file, key, label) => `<a href="${X.href(file)}"${cur === key ? ' aria-current="page"' : ""}>${esc(label)}</a>`;
      const anchors = cur === "o" ? "" : `<a href="#home">${esc(s.home)}</a><a href="#pricing">${esc(s.pricing)}</a><i></i>`;
      const dark = X.isDark();
      return anchors + link("index.html", "o", s.overview) + link("a.html", "a", "A") + link("b.html", "b", "B") + link("c.html", "c", "C") + link("ab.html", "ab", "AB") + link("estimator.html", "e", s.estimator) +
        `<i></i><button data-l="en" aria-pressed="${X.lang === "en"}">EN</button><button data-l="ar" aria-pressed="${X.lang === "ar"}" lang="ar">عربي</button>` +
        `<i></i><button data-t="light" aria-pressed="${!dark}">${esc(s.light)}</button><button data-t="dark" aria-pressed="${dark}">${esc(s.dark)}</button>`;
    },
    isDark() {
      const r = document.documentElement.dataset.theme;
      return r ? r === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
    },
    setLang(l) {
      X.lang = l;
      const u = new URL(location.href); if (l === "ar") u.searchParams.set("l", "ar"); else u.searchParams.delete("l");
      history.replaceState(null, "", u);
      X.render();
    },
    setTheme(t) {
      X.theme = t; document.documentElement.dataset.theme = t;
      const u = new URL(location.href); u.searchParams.set("t", t); history.replaceState(null, "", u);
      X.chrome();
    },
    chrome() {
      X._nav.innerHTML = X.nav();
      X._foot.innerHTML = X.footer();
      X._sw.innerHTML = X.switcher();
      X._sw.querySelectorAll("[data-l]").forEach((b) => (b.onclick = () => X.setLang(b.dataset.l)));
      X._sw.querySelectorAll("[data-t]").forEach((b) => (b.onclick = () => X.setTheme(b.dataset.t)));
      const lbl = X.lang === "ar" ? "تبديل النماذج" : "Prototype switcher";
      X._sw.setAttribute("aria-label", lbl);
    },
    render() {
      const html = document.documentElement;
      html.lang = X.lang; html.dir = X.lang === "ar" ? "rtl" : "ltr";
      X._ios.forEach((io) => io.disconnect()); X._ios = [];
      X._main.innerHTML = X._cfg.render();
      X.chrome();
      if (X._cfg.mount) X._cfg.mount(X._main);
      X.reveal(X._main.querySelectorAll("[data-settle]:not(.settled)"), (el) => X.settle(el, null, +el.dataset.settleDelay || 0), { threshold: 0.4 });
      X.reveal(X._main.querySelectorAll("[data-reveal]"), (el) => el.classList.add("in"), { threshold: 0.15 });
    },
    boot(cfg) {
      X._cfg = cfg; X.active = cfg.active;
      const start = () => {
        if (X.theme) document.documentElement.dataset.theme = X.theme;
        if (X.motion) document.documentElement.classList.add("motion");
        X._nav = document.createElement("nav"); X._nav.className = "nav";
        X._main = document.createElement("main"); X._main.className = "wrap";
        X._foot = document.createElement("footer"); X._foot.className = "wrap foot";
        X._sw = document.createElement("div"); X._sw.className = "switch"; X._sw.setAttribute("role", "navigation");
        document.body.prepend(X._nav, X._main, X._foot);
        document.body.appendChild(X._sw);
        X.render();
      };
      if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
    },
  });
})();
