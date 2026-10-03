/* Shared shell for the pricing prototypes: language/theme, data access, digit settle, doors, switcher. */
(function () {
  const V = window.PRICING_VIEWS, RAW = window.PRICING_RAW;
  const BANDS = ["basic", "standard", "premium"];
  const UI = {
    en: {
      eyebrow: "Published prices",
      h1a: (n) => `${n} price ranges, all published.`,
      h1b: (n) => `${n} of them have names.`,
      sub: "What you build sets the row, how much scope sets the column. The estimator and every offer read the same cells — there is no second price list.",
      service: "What you're building", scope: "Scope", price: "Price range", delivery: "Delivery",
      package: "Package", idealFor: "Ideal for", includes: "Includes", notIn: "Not in this package",
      unnamed: "Priced, not packaged", unnamedNote: "This cell is published, but no marketed package is built around it. The estimator fixes the range for your project.",
      cta: "Get an estimate", ctaNamed: (n) => `Get an estimate — ${n}`,
      doorsTitle: "Which row are you in?", doorTo: "Jump to",
      doors: { website: "I need a site that presents the business", webapp: "I need a system or dashboard for my team", ecommerce: "I need to sell online", pwa: "I need an installable app that works offline" },
      quote: "Quote · pre-filled", ref: "Reference", from: "the cell", floorNote: "Ranges narrow as the estimator learns your project — never widen.",
      stepUp: "Next step up", stepTop: "Top of this row", floor: "Floor moves", ceil: "Ceiling moves", weeks: "Weeks move", adds: "What the step adds",
      addsNone: "Per-cell features are published for the four packages only, so this step shows price and time alone.",
      needA: "I need a", at: "at", scopeWord: "scope.",
      whatBuilt: "What's built", legendNamed: "Package — pick it to read what it includes", legendPlain: "Priced, not packaged",
      lead: "Selected", sentenceNote: "Two answers, one cell. The full grid is below — every cell published.",
      weeksU: "weeks", by: "Pick a cell",
    },
    ar: {
      eyebrow: "الأسعار المنشورة",
      h1a: (n) => `${n} نطاقاً سعرياً، كلها منشورة.`,
      h1b: (n) => `${n} منها لها أسماء.`,
      sub: "ما تبنيه يحدد الصف، وحجم النطاق يحدد العمود. المقدّر وكل عرض سعر يقرآن هذه الخلايا نفسها — لا توجد قائمة أسعار ثانية.",
      service: "ما ستبنيه", scope: "حجم النطاق", price: "نطاق السعر", delivery: "مدة التسليم",
      package: "الباقة", idealFor: "مناسبة لـ", includes: "تشمل", notIn: "غير مشمول في هذه الباقة",
      unnamed: "مسعّرة وليست باقة", unnamedNote: "هذه الخلية منشورة، لكن لا توجد باقة مسوّقة مبنية عليها. المقدّر يثبّت النطاق لمشروعك.",
      cta: "احصل على تقدير", ctaNamed: (n) => `احصل على تقدير — ${n}`,
      doorsTitle: "في أي صف أنت؟", doorTo: "انتقل إلى",
      doors: { website: "أحتاج موقعاً يعرّف بنشاطي", webapp: "أحتاج نظاماً أو لوحة تحكم لفريقي", ecommerce: "أحتاج أن أبيع أونلاين", pwa: "أحتاج تطبيقاً قابلاً للتثبيت ويعمل دون اتصال" },
      quote: "عرض سعر · مُعبّأ مسبقاً", ref: "المرجع", from: "الخلية", floorNote: "النطاق يضيق كلما فهم المقدّر مشروعك — ولا يتسع أبداً.",
      stepUp: "الخطوة التالية", stepTop: "قمة هذا الصف", floor: "يتحرك الحد الأدنى", ceil: "يتحرك الحد الأعلى", weeks: "تتحرك المدة", adds: "ما تضيفه الخطوة",
      addsNone: "مزايا كل خلية منشورة للباقات الأربع فقط، لذا تعرض هذه الخطوة السعر والمدة فقط.",
      needA: "أحتاج", at: "بحجم", scopeWord: "",
      whatBuilt: "ما يُبنى", legendNamed: "باقة — اخترها لتقرأ ما تشمله", legendPlain: "مسعّرة وليست باقة",
      lead: "المحدد", sentenceNote: "إجابتان، خلية واحدة. الشبكة الكاملة أسفلها — كل الخلايا منشورة.",
      weeksU: "أسابيع", by: "اختر خلية",
    },
  };
  const P = (window.P = {
    lang: (new URLSearchParams(location.search).get("l") || "en") === "ar" ? "ar" : "en",
    BANDS, listeners: [],
    t() { return UI[P.lang]; },
    v() { return V[P.lang]; },
    rows() { return P.v().matrix.rows; },
    bands() { return P.v().matrix.bands; },
    cell(sid, bid) { return P.rows().find((r) => r.serviceId === sid).cells.find((c) => c.complexityId === bid); },
    row(sid) { return P.rows().find((r) => r.serviceId === sid); },
    tier(id) { return id ? P.v().tiers.find((t) => t.id === id) : null; },
    raw(sid, bid) { return RAW[sid]; },
    fmt(n) { return new Intl.NumberFormat(P.lang === "ar" ? "ar-EG" : "en").format(n); },
    num(n) { return P.lang === "ar" ? new Intl.NumberFormat("ar-EG").format(n) : String(n); },
    cur() { return P.lang === "ar" ? "جنيه" : "EGP"; },
    stepUp(sid, bid) {
      const i = BANDS.indexOf(bid); if (i >= BANDS.length - 1) return null;
      const a = RAW[sid], n = BANDS[i + 1];
      return { to: n, floor: a.price[n].min - a.price[bid].min, ceil: a.price[n].max - a.price[bid].max,
        wMin: a.weeks[n].min - a.weeks[bid].min, wMax: a.weeks[n].max - a.weeks[bid].max };
    },
    settle(el, text) {
      if (el.dataset.v === text) return; el.dataset.v = text; el.textContent = ""; el.classList.add("settle");
      [...text].forEach((ch, i) => { const s = document.createElement("span"); s.textContent = ch === " " ? " " : ch; s.style.setProperty("--i", i); el.appendChild(s); });
      el.setAttribute("aria-label", text);
    },
    onChange(fn) { P.listeners.push(fn); },
    apply() { document.documentElement.lang = P.lang; document.documentElement.dir = P.lang === "ar" ? "rtl" : "ltr"; P.listeners.forEach((f) => f()); },
    setLang(l) { P.lang = l; const u = new URL(location); u.searchParams.set("l", l); history.replaceState(null, "", u); P.apply(); P.renderSwitch(); },
    chrome(active) {
      const nav = document.createElement("nav"); nav.className = "nav";
      nav.innerHTML = `<b>Altruvex</b><div class="l"><span>Work</span><span>Services</span><span class="on">Pricing</span><span>About</span><span>Contact</span></div><a class="pill p sm" href="#">Get an estimate</a>`;
      document.body.prepend(nav);
      const sw = document.createElement("div"); sw.className = "switch"; sw.id = "sw"; document.body.appendChild(sw);
      P.active = active; P.renderSwitch();
    },
    renderSwitch() {
      const sw = document.getElementById("sw"); const q = P.lang === "ar" ? "?l=ar" : "";
      const link = (f, k, name) => `<a href="${f}${q}" class="${P.active === k ? "on" : ""}">${name}</a>`;
      sw.innerHTML = link("index.html", "o", "Overview") + link("a.html", "a", "A · Quote sheet") + link("b.html", "b", "B · Step-up ladder") + link("c.html", "c", "C · Sentence") + `<i></i><button id="bl">${P.lang === "ar" ? "EN" : "AR"}</button><button id="bt">Theme</button>`;
      document.getElementById("bl").onclick = () => P.setLang(P.lang === "ar" ? "en" : "ar");
      document.getElementById("bt").onclick = () => { const r = document.documentElement; const dark = r.dataset.theme === "dark" || (!r.dataset.theme && matchMedia("(prefers-color-scheme:dark)").matches); r.dataset.theme = dark ? "light" : "dark"; };
    },
    hero(el) {
      const t = P.t(), m = P.v().matrix;
      el.innerHTML = `<div><div class="eyebrow">${t.eyebrow}</div><h1>${t.h1a(P.num(m.cellCount))}<br><span class="dim">${t.h1b(P.num(m.tierCount))}</span></h1></div><p>${t.sub}</p>`;
    },
    doors(el, sel, onPick) {
      const t = P.t();
      el.innerHTML = P.rows().map((r) => `<button data-s="${r.serviceId}" aria-pressed="${sel === r.serviceId}"><span class="q">${t.doors[r.serviceId]}</span><span class="to">${t.doorTo} → ${r.name}</span></button>`).join("");
      el.querySelectorAll("button").forEach((b) => (b.onclick = () => onPick(b.dataset.s)));
    },
  });
  window.addEventListener("DOMContentLoaded", () => setTimeout(() => P.apply(), 0));
})();
