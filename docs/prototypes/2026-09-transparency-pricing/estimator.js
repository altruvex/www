/* Transparency estimator — prototype (2026-09-29).
   Every figure comes from window.AX (data.js, generated from @repo/pricing-schema).
   The estimator LOOKS UP AX.estimates; it never re-implements pricing. Numbers are
   parsed only to compare endpoints — what is displayed is always a schema-formatted label. */
(function () {
  "use strict";
  var AX = window.AX;
  var EN = AX.en;

  /* ---------- ids, straight from the data ---------- */
  var SERVICES = EN.matrix.rows.map(function (r) { return r.serviceId; });
  var COMPLEXITIES = EN.matrix.bands.map(function (b) { return b.id; });
  var BRAND = Object.keys(EN.factors.brand);
  var CONTENT = Object.keys(EN.factors.content);
  var TIMELINE = Object.keys(EN.factors.timeline);
  var NOTES = ["cms", "auth", "integrations", "bilingual", "performance", "maintenance"];
  var BUILD_KEYS = ["service", "complexity"];
  var ALL_KEYS = ["service", "complexity", "brand", "content", "timeline"];

  /* ---------- copy (draft, unreviewed) ---------- */
  var T = {
    en: {
      title: "Estimator — Altruvex prototype",
      skip: "Skip to the questions",
      navTag: "Estimator · prototype",
      eyebrow: "Estimator",
      h1a: "An indicative range,",
      h1b: "not a quotation.",
      lead: "Answer what you know. The range opens at the widest span we publish and narrows with each answer. The final figure is set in a written proposal, after scope review.",
      chain: [
        { k: "Pricing", a: "How Altruvex charges", tag: "Published" },
        { k: "Estimate", a: "What your project might require", tag: "Indicative — this page" },
        { k: "Proposal", a: "What it will cost — binding", tag: "After scope review" }
      ],
      scopeLink: "See how we scope projects",
      s1: "What are you building?",
      s1hint: "Sets which published range applies.",
      s2: "How much scope?",
      s2hint: "Sets the cell inside that range.",
      s2note: "Contained / Standard / Extensive are working labels — label proposal.",
      s2pick: "Pick a project type to see each cell.",
      bands: {
        basic: ["Contained", "One core flow, few page types, little custom logic."],
        standard: ["Standard", "Several flows, an integration or two, a richer interface."],
        premium: ["Extensive", "Multiple roles, advanced logic, bespoke interactions."]
      },
      s3: "What does it need?",
      s3hint: "Tick what applies. Each one is checked with you in scope review.",
      s3note: "Reviewed in scope — doesn't move this range",
      notes: {
        cms: ["Content management (CMS)", "Edit pages and posts yourself."],
        auth: ["Sign-in & accounts", "Customer or staff accounts, with roles."],
        integrations: ["Payments & third-party integrations", "Payment gateway, CRM, APIs, analytics."],
        bilingual: ["Arabic + English", "Both languages, right-to-left done properly."],
        performance: ["Performance & SEO targets", "Speed, accessibility and search targets written into scope."],
        maintenance: ["Ongoing maintenance", "A monthly plan after launch, billed separately — from {p} {c}."]
      },
      s4: "Project conditions",
      s4hint: "What you are bringing to it. Each answer adjusts the range by the effect shown.",
      brandL: "Brand identity",
      contentL: "Content readiness",
      timelineL: "Timeline",
      brand: {
        complete: ["Ready", "Logo, colours, type and usage rules in place."],
        partial: ["Partial", "A logo or basic visuals, no full system."],
        scratch: ["Starting fresh", "We build the identity as part of the project."]
      },
      content: {
        provide: ["Ready", "Copy and assets are written and organised."],
        "need-help": ["Need support", "We shape the messaging with you."],
        unsure: ["Not sure yet", "We clarify the key messages first."]
      },
      timeline: {
        urgent: ["Urgent", "Compressed build, tightly held scope."],
        standard: ["Standard", "Room for discovery, design, build and QA."],
        flexible: ["Flexible", "Extra time for iteration and testing."]
      },
      rEyebrow: "Indicative estimate",
      rTitle: "Your range",
      opening: "Opening span — covers all {n} combinations",
      narrowed: "Narrowed to {m} of {n} combinations",
      settled: "Settled on your answers — one of {n} combinations",
      answered: "{a} of {t} answered",
      weeks: "{w} weeks",
      delivery: "Delivery",
      widest: "Widest published span",
      drivers: "Scope drivers",
      dService: "Project type",
      dComplexity: "Scope",
      setsRange: "sets the range",
      cellOf: "published cell",
      pending: "Not answered — every option still counted",
      notesL: "Scope notes",
      noNotes: "None ticked yet.",
      confirmed: "confirmed in scope review",
      monthly: "billed monthly, outside this range",
      disclaimer: "Indicative only — not a quotation. The final price is set in a written proposal after scope review, valid for {d} days.",
      cta: "Request a formal proposal",
      discuss: "Discuss your requirements",
      discussNote: "Prototype — on the site this opens the contact page.",
      reset: "Clear answers",
      fIntro: "We review your answers, confirm scope with you, and send one written figure.",
      fPhone: "Phone (WhatsApp)",
      fReq: "required",
      fOpt: "optional",
      fName: "Name",
      fEmail: "Email",
      fCompany: "Company",
      fNote: "Anything we should know",
      fAttached: "Your answers and scope notes are attached to the request.",
      fSend: "Send request",
      ePhoneEmpty: "A phone number is needed so we can confirm scope with you.",
      ePhoneBad: "Enter a phone or WhatsApp number — digits, spaces, + and - only.",
      eEmail: "Check the email address, or leave it empty.",
      sent: "Prototype — nothing was sent. On the live site this request, with your answers, would reach the team.",
      live: "Estimate {p}, {w}. {s}.",
      readoutMore: "Breakdown",
      footer: "Copy unreviewed — draft · Figures from data.js, generated {d}",
      sw: { index: "Overview", a: "A", b: "B", c: "C", est: "Estimator", light: "Light", dark: "Dark", nav: "Prototype switcher" }
    },
    ar: {
      title: "المقدّر — نموذج Altruvex",
      skip: "انتقل إلى الأسئلة",
      navTag: "المقدّر · نموذج أولي",
      eyebrow: "المقدّر",
      h1a: "نطاق استرشادي،",
      h1b: "وليس عرض سعر.",
      lead: "أجب عمّا تعرفه. يبدأ النطاق بأوسع مدى ننشره، ويضيق مع كل إجابة. أما الرقم النهائي فيُحدَّد في عرض مكتوب بعد مراجعة النطاق.",
      chain: [
        { k: "التسعير", a: "كيف تُسعّر Altruvex", tag: "منشور" },
        { k: "التقدير", a: "ما الذي قد يتطلبه مشروعك", tag: "استرشادي — هذه الصفحة" },
        { k: "العرض", a: "كم سيكلّف فعلًا — مُلزِم", tag: "بعد مراجعة النطاق" }
      ],
      scopeLink: "اطّلع على طريقة تحديدنا لنطاق المشاريع",
      s1: "ماذا تبني؟",
      s1hint: "يحدد أيّ نطاق منشور ينطبق على مشروعك.",
      s2: "ما حجم النطاق؟",
      s2hint: "يحدد الخانة داخل ذلك النطاق.",
      s2note: "محدود / قياسي / واسع تسميات عمل مقترحة.",
      s2pick: "اختر نوع المشروع لترى كل خانة.",
      bands: {
        basic: ["محدود", "مسار أساسي واحد، وأنواع صفحات قليلة، ومنطق مخصص بسيط."],
        standard: ["قياسي", "عدة مسارات، وربط أو اثنان، وواجهة أغنى."],
        premium: ["واسع", "أدوار متعددة، ومنطق متقدم، وتفاعلات مصممة خصيصًا."]
      },
      s3: "ما الذي يحتاجه؟",
      s3hint: "اختر ما ينطبق. نتحقق من كل بند معك في مراجعة النطاق.",
      s3note: "يُراجَع عند تحديد النطاق — لا يحرّك هذا التقدير",
      notes: {
        cms: ["نظام إدارة محتوى (CMS)", "تعدّل الصفحات والمقالات بنفسك."],
        auth: ["تسجيل الدخول والحسابات", "حسابات للعملاء أو للفريق، مع صلاحيات."],
        integrations: ["المدفوعات والربط مع أنظمة خارجية", "بوابة دفع، CRM، واجهات برمجية، أدوات تحليل."],
        bilingual: ["العربية + الإنجليزية", "اللغتان معًا، واتجاه من اليمين لليسار مُنفّذ كما يجب."],
        performance: ["أهداف الأداء والظهور في البحث", "أهداف للسرعة وسهولة الوصول والظهور في البحث مكتوبة في النطاق."],
        maintenance: ["صيانة مستمرة", "باقة شهرية بعد الإطلاق تُحتسب منفصلة — تبدأ من {p} {c}."]
      },
      s4: "ظروف المشروع",
      s4hint: "ما تحضره معك. كل إجابة تعدّل النطاق بالأثر الموضّح بجانبها.",
      brandL: "الهوية البصرية",
      contentL: "جاهزية المحتوى",
      timelineL: "الجدول الزمني",
      brand: {
        complete: ["جاهزة", "شعار وألوان وخطوط وقواعد استخدام متوفرة."],
        partial: ["جزئية", "شعار أو عناصر أساسية، دون نظام كامل."],
        scratch: ["من الصفر", "نبني الهوية ضمن المشروع."]
      },
      content: {
        provide: ["جاهز", "النصوص والملفات مكتوبة ومنظّمة."],
        "need-help": ["أحتاج مساعدة", "نصوغ الرسائل معك."],
        unsure: ["لست متأكدًا بعد", "نوضّح الرسائل الأساسية أولًا."]
      },
      timeline: {
        urgent: ["عاجل", "تنفيذ مضغوط ونطاق مضبوط بإحكام."],
        standard: ["معتاد", "وقت كافٍ للاستكشاف والتصميم والتطوير والاختبار."],
        flexible: ["مرن", "وقت إضافي للتحسين والاختبار."]
      },
      rEyebrow: "تقدير استرشادي",
      rTitle: "نطاقك",
      opening: "النطاق الافتتاحي — يشمل {n} تركيبة ممكنة",
      narrowed: "ضاق إلى {m} من {n} تركيبة",
      settled: "استقر على إجاباتك — تركيبة واحدة من {n}",
      answered: "أُجيب عن {a} من {t}",
      weeks: "{w} أسابيع",
      delivery: "مدة التنفيذ",
      widest: "أوسع نطاق منشور",
      drivers: "عوامل النطاق",
      dService: "نوع المشروع",
      dComplexity: "حجم النطاق",
      setsRange: "يحدد النطاق",
      cellOf: "الخانة المنشورة",
      pending: "لم تُجب — كل الخيارات ما زالت محسوبة",
      notesL: "بنود النطاق",
      noNotes: "لم تحدد أي بند بعد.",
      confirmed: "يُؤكَّد في مراجعة النطاق",
      monthly: "يُحتسب شهريًا، خارج هذا النطاق",
      disclaimer: "استرشادي فقط — وليس عرض سعر. يُحدَّد السعر النهائي في عرض مكتوب بعد مراجعة النطاق، ويسري لمدة {d} يومًا.",
      cta: "اطلب عرضًا رسميًا",
      discuss: "ناقش متطلباتك",
      discussNote: "نموذج أولي — في الموقع يفتح هذا صفحة التواصل.",
      reset: "امسح الإجابات",
      fIntro: "نراجع إجاباتك، ونؤكد النطاق معك، ثم نرسل رقمًا واحدًا مكتوبًا.",
      fPhone: "رقم الهاتف (واتساب)",
      fReq: "مطلوب",
      fOpt: "اختياري",
      fName: "الاسم",
      fEmail: "البريد الإلكتروني",
      fCompany: "الشركة",
      fNote: "أي شيء يجب أن نعرفه",
      fAttached: "تُرفق إجاباتك وبنود النطاق بالطلب.",
      fSend: "أرسل الطلب",
      ePhoneEmpty: "نحتاج رقم هاتف لنؤكد النطاق معك.",
      ePhoneBad: "أدخل رقم هاتف أو واتساب — أرقام ومسافات و+ و- فقط.",
      eEmail: "تحقق من البريد الإلكتروني، أو اتركه فارغًا.",
      sent: "نموذج أولي — لم يُرسل شيء. في الموقع الفعلي يصل هذا الطلب مع إجاباتك إلى الفريق.",
      live: "التقدير {p}، {w}. {s}.",
      readoutMore: "التفاصيل",
      footer: "النصوص غير مراجَعة — مسودة · الأرقام من data.js، بتاريخ {d}",
      sw: { index: "نظرة عامة", a: "A", b: "B", c: "C", est: "المقدّر", light: "فاتح", dark: "داكن", nav: "مبدّل النماذج" }
    }
  };

  /* ---------- state ---------- */
  var params = new URLSearchParams(location.search);
  var lang = params.get("l") === "ar" ? "ar" : "en";
  var state = { service: null, complexity: null, brand: null, content: null, timeline: null, notes: [] };
  var lastFigure = "";

  function D() { return AX[lang]; }
  function t() { return T[lang]; }
  function fill(s, o) { return s.replace(/\{(\w+)\}/g, function (_, k) { return o[k] != null ? o[k] : ""; }); }
  function num(n, pad) {
    return new Intl.NumberFormat(lang === "ar" ? "ar-EG" : "en-US", { minimumIntegerDigits: pad || 1, useGrouping: false }).format(n);
  }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function $(s) { return document.querySelector(s); }

  /* ---------- lookup over AX.estimates (no pricing math) ---------- */
  // Compare on the EN labels (Western digits); display the current locale's label.
  function ends(label) { return label.split("–").map(function (x) { return +x.replace(/[^\d]/g, ""); }); }
  // Join the low side of one schema label with the high side of another, spacing untouched.
  function join(lowLabel, highLabel) {
    if (lowLabel === highLabel) return lowLabel;
    return lowLabel.slice(0, lowLabel.indexOf("–")) + "–" + highLabel.slice(highLabel.indexOf("–") + 1);
  }
  function keyOf(s) { return [s.service, s.complexity, s.timeline, s.brand, s.content]; }

  function lookup() {
    var want = keyOf(state);
    var keys = Object.keys(EN.estimates).filter(function (k) {
      var p = k.split("|");
      for (var i = 0; i < 5; i++) if (want[i] && p[i] !== want[i]) return false;
      return true;
    });
    var loP = null, hiP = null, loW = null, hiW = null;
    keys.forEach(function (k) {
      var e = EN.estimates[k], p = ends(e.price), w = ends(e.weeks);
      if (!loP || p[0] < loP.v) loP = { v: p[0], k: k };
      if (!hiP || p[1] > hiP.v) hiP = { v: p[1], k: k };
      if (!loW || w[0] < loW.v) loW = { v: w[0], k: k };
      if (!hiW || w[1] > hiW.v) hiW = { v: w[1], k: k };
    });
    var L = D().estimates;
    return {
      count: keys.length,
      price: join(L[loP.k].price, L[hiP.k].price),
      weeks: join(L[loW.k].weeks, L[hiW.k].weeks),
      lo: loP.v, hi: hiP.v
    };
  }
  window.__estLookup = lookup; // for the node/browser sanity check

  function answeredCount() { return ALL_KEYS.filter(function (k) { return state[k]; }).length; }
  function rowOf(id) { return D().matrix.rows.filter(function (r) { return r.serviceId === id; })[0]; }
  function cellOf(sid, cid) { return rowOf(sid).cells.filter(function (c) { return c.complexityId === cid; })[0]; }

  /* ---------- markup builders ---------- */
  function radio(name, value, title, desc, fx, fxId) {
    var id = name + "-" + value;
    return '<label class="opt" for="' + id + '">' +
      '<input type="radio" name="' + name + '" id="' + id + '" value="' + value + '"' + (state[name] === value ? " checked" : "") + ">" +
      '<span class="mark" aria-hidden="true"></span>' +
      '<span class="body"><span class="t">' + esc(title) + '</span><span class="d">' + esc(desc) + "</span></span>" +
      '<span class="fx num"' + (fxId ? ' id="' + fxId + '"' : "") + ">" + esc(fx || "") + "</span></label>";
  }
  function check(value, title, desc) {
    var id = "note-" + value;
    return '<label class="opt" for="' + id + '">' +
      '<input type="checkbox" name="notes" id="' + id + '" value="' + value + '"' + (state.notes.indexOf(value) > -1 ? " checked" : "") + ">" +
      '<span class="mark" aria-hidden="true"></span>' +
      '<span class="body"><span class="t">' + esc(title) + '</span><span class="d">' + esc(desc) + "</span></span><span></span></label>";
  }
  function legend(n, title, hint, hintId) {
    return '<legend><span class="idx">' + num(n, 2) + '</span><h2 class="sh">' + esc(title) + "</h2></legend>" +
      (hint ? '<p class="hint" id="' + hintId + '">' + esc(hint) + "</p>" : "");
  }

  function renderSteps() {
    var c = t(), d = D();
    var s1 = SERVICES.map(function (id) {
      var r = rowOf(id);
      return radio("service", id, r.name, r.description, join(r.cells[0].priceLabel, r.cells[r.cells.length - 1].priceLabel));
    }).join("");
    var s2 = COMPLEXITIES.map(function (id) {
      return radio("complexity", id, c.bands[id][0], c.bands[id][1], "", "cell-" + id);
    }).join("");
    var m = d.maintenance[0];
    var s3 = NOTES.map(function (id) {
      return check(id, c.notes[id][0], fill(c.notes[id][1], { p: m.priceLabel, c: m.cycleLabel }));
    }).join("");
    function cond(name, ids, label) {
      return '<fieldset class="sub"><legend class="subl">' + esc(label) + "</legend>" +
        '<div class="opts">' + ids.map(function (id) {
          return radio(name, id, c[name][id][0], c[name][id][1], d.factors[name][id].price);
        }).join("") + "</div></fieldset>";
    }
    $("#steps").innerHTML =
      '<fieldset class="step" aria-describedby="hint-1">' + legend(1, c.s1, c.s1hint, "hint-1") + '<div class="opts">' + s1 + "</div></fieldset>" +
      '<fieldset class="step" aria-describedby="hint-2 n2">' + legend(2, c.s2, c.s2hint, "hint-2") +
        '<p class="note" id="n2">' + esc(c.s2note) + '</p><div class="opts">' + s2 + "</div></fieldset>" +
      '<fieldset class="step" aria-describedby="hint-3 n3">' + legend(3, c.s3, c.s3hint, "hint-3") +
        '<p class="scope-tag" id="n3">' + esc(c.s3note) + '</p><div class="opts two">' + s3 + "</div></fieldset>" +
      '<fieldset class="step" aria-describedby="hint-4">' + legend(4, c.s4, c.s4hint, "hint-4") +
        cond("brand", BRAND, c.brandL) + cond("content", CONTENT, c.contentL) + cond("timeline", TIMELINE, c.timelineL) +
      "</fieldset>";
  }

  function renderStatic() {
    var c = t(), d = D();
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
    document.title = c.title;
    $("#navTag").textContent = c.navTag;
    $(".skip").textContent = c.skip;
    $("#eyebrow").textContent = c.eyebrow;
    $("#h1a").textContent = c.h1a;
    $("#h1b").textContent = c.h1b;
    $("#lead").textContent = c.lead;
    var arrow = lang === "ar" ? "←" : "→";
    $("#chain").innerHTML = c.chain.map(function (x, i) {
      return "<li" + (i === 1 ? ' aria-current="step"' : "") + '><span class="eyebrow">' + num(i + 1, 2) + " · " + esc(x.k) +
        (i < 2 ? ' <span aria-hidden="true">' + arrow + "</span>" : "") + '</span><span class="ans">' + esc(x.a) +
        '</span><span class="tag">' + esc(x.tag) + "</span>" +
        (i === 0 ? '<a class="ln" href="a.html' + (lang === "ar" ? "?l=ar" : "") + '#pricing">' + esc(c.scopeLink) + "</a>" : "") + "</li>";
    }).join("");
    renderSteps();
    $("#rIdx").textContent = num(5, 2);
    $("#rEyebrow").textContent = c.rEyebrow;
    $("#rTitle").textContent = c.rTitle;
    $("#deliveryL").textContent = c.delivery;
    $("#widestL").textContent = c.widest;
    $("#widest").textContent = d.widestSpan;
    $("#driversL").textContent = c.drivers;
    $("#disclaimer").textContent = fill(c.disclaimer, { d: num(d.proposalValidityDays) });
    $("#vat").textContent = d.terms.vatNote || "";
    $("#cta").textContent = c.cta;
    $("#discuss").textContent = c.discuss;
    $("#reset").textContent = c.reset;
    $("#readoutMore").textContent = c.readoutMore;
    // form
    $("#fIntro").textContent = c.fIntro;
    $("#lPhone").innerHTML = esc(c.fPhone) + ' <span class="req">— ' + esc(c.fReq) + "</span>";
    $("#lName").innerHTML = esc(c.fName) + ' <span class="optl">— ' + esc(c.fOpt) + "</span>";
    $("#lEmail").innerHTML = esc(c.fEmail) + ' <span class="optl">— ' + esc(c.fOpt) + "</span>";
    $("#lCompany").innerHTML = esc(c.fCompany) + ' <span class="optl">— ' + esc(c.fOpt) + "</span>";
    $("#lNote").innerHTML = esc(c.fNote) + ' <span class="optl">— ' + esc(c.fOpt) + "</span>";
    $("#fAttached").textContent = c.fAttached;
    $("#fSend").textContent = c.fSend;
    if (!$("#sent").hidden) $("#sent").textContent = c.sent;
    if (!$("#discussNote").hidden) $("#discussNote").textContent = c.discussNote;
    ["phone", "email"].forEach(function (f) { if ($("#e-" + f).textContent) validate(f); });
    $("#footer").textContent = fill(c.footer, { d: AX.generatedOn });
    renderSwitch();
    lastFigure = "";
    update();
  }

  /* ---------- the figure: digit settle (motion-safe via base.css) ---------- */
  function settleHTML(label) {
    var i = 0;
    return label.split(" ").map(function (word) {
      if (/^[\d٠-٩,٬.–\-]+$/.test(word)) {
        return '<b class="w n">' + word.split("").map(function (ch) {
          return '<span style="--i:' + (i++) + '">' + esc(ch) + "</span>";
        }).join("") + "</b>";
      }
      return '<b class="w"><span style="--i:' + (i++) + '">' + esc(word) + "</span></b>";
    }).join(" ");
  }

  var liveTimer;
  function update() {
    var c = t(), d = D();
    var r = lookup();
    var a = answeredCount();
    var nC = num(d.combos), nM = num(r.count);
    var status = a === 0 ? fill(c.opening, { n: nC }) : r.count === 1 ? fill(c.settled, { n: nC }) : fill(c.narrowed, { m: nM, n: nC });
    var price = a === 0 ? d.widestSpan : r.price;
    var weeks = fill(c.weeks, { w: r.weeks });

    $("#status").textContent = status;
    $("#answered").textContent = fill(c.answered, { a: num(a), t: num(ALL_KEYS.length) });
    $("#figSr").textContent = price;
    if (price !== lastFigure) {
      $("#fig").innerHTML = settleHTML(price);
      lastFigure = price;
    }
    $("#weeks").textContent = weeks;
    $("#roFig").textContent = price;
    $("#roStatus").textContent = fill(c.answered, { a: num(a), t: num(ALL_KEYS.length) });

    // span track: current range inside the widest span (numbers used for position only)
    var W = lookupAll();
    var start = (r.lo - W.lo) / (W.hi - W.lo) * 100, width = (r.hi - r.lo) / (W.hi - W.lo) * 100;
    var bar = $("#bar");
    bar.style.insetInlineStart = start + "%";
    bar.style.width = Math.max(width, 1.5) + "%";

    // complexity cells follow the chosen service
    COMPLEXITIES.forEach(function (id) {
      var el = document.getElementById("cell-" + id);
      if (el) el.textContent = state.service ? cellOf(state.service, id).priceLabel : "";
    });
    var pick = document.getElementById("n2");
    if (pick) pick.textContent = c.s2note + (state.service ? "" : " " + c.s2pick);

    renderDrivers();

    clearTimeout(liveTimer);
    liveTimer = setTimeout(function () {
      $("#live").textContent = fill(c.live, { p: price, w: weeks, s: status });
    }, 450);
  }
  var _all;
  function lookupAll() {
    if (_all) return _all;
    var lo = Infinity, hi = 0;
    Object.keys(EN.estimates).forEach(function (k) { var p = ends(EN.estimates[k].price); lo = Math.min(lo, p[0]); hi = Math.max(hi, p[1]); });
    return (_all = { lo: lo, hi: hi });
  }

  function driverRow(label, value, fx, pending) {
    return '<div class="dr' + (pending ? " pend" : "") + '"><dt>' + esc(label) + "</dt><dd class=\"v\">" + esc(value) +
      '</dd><dd class="fx num">' + esc(fx) + "</dd></div>";
  }
  function renderDrivers() {
    var c = t(), d = D(), rows = [];
    rows.push(state.service
      ? driverRow(c.dService, rowOf(state.service).name, c.setsRange)
      : driverRow(c.dService, c.pending, "", true));
    rows.push(state.complexity
      ? driverRow(c.dComplexity, c.bands[state.complexity][0],
          state.service ? c.cellOf + " " + cellOf(state.service, state.complexity).priceLabel : c.setsRange)
      : driverRow(c.dComplexity, c.pending, "", true));
    [["brand", c.brandL], ["content", c.contentL], ["timeline", c.timelineL]].forEach(function (p) {
      var v = state[p[0]];
      rows.push(v ? driverRow(p[1], c[p[0]][v][0], d.factors[p[0]][v].price) : driverRow(p[1], c.pending, "", true));
    });
    $("#drivers").innerHTML = rows.join("");

    var notes = state.notes.length
      ? state.notes.map(function (id) {
          return "<li><span>" + esc(c.notes[id][0]) + '</span><span class="tag">' + esc(c.confirmed) + "</span>" +
            (id === "maintenance" ? '<span class="tag">' + esc(c.monthly) + "</span>" : "") + "</li>";
        }).join("")
      : '<li class="none">' + esc(c.noNotes) + "</li>";
    $("#notesList").innerHTML = notes;
    $("#notesL").textContent = c.notesL;
  }

  /* ---------- proposal form ---------- */
  function digits(s) { return s.replace(/[٠-٩]/g, function (ch) { return String(ch.charCodeAt(0) - 0x0660); }); }
  function validate(field) {
    var c = t(), input = $("#f-" + field), err = $("#e-" + field), msg = "";
    var v = input.value.trim();
    if (field === "phone") {
      var w = digits(v), n = w.replace(/\D/g, "").length;
      if (!v) msg = c.ePhoneEmpty;
      else if (!/^[\d\s\-+()]+$/.test(w) || n < 8 || n > 15) msg = c.ePhoneBad;
    }
    if (field === "email" && v && !input.checkValidity()) msg = c.eEmail;
    err.textContent = msg;
    input.setAttribute("aria-invalid", msg ? "true" : "false");
    return !msg;
  }

  function wire() {
    $("#steps").addEventListener("change", function (e) {
      var el = e.target;
      if (el.name === "notes") {
        state.notes = NOTES.filter(function (id) { var x = document.getElementById("note-" + id); return x && x.checked; });
      } else if (el.name in state) {
        state[el.name] = el.value;
      }
      update();
    });
    $("#reset").addEventListener("click", function () {
      state = { service: null, complexity: null, brand: null, content: null, timeline: null, notes: [] };
      renderSteps();
      update();
      var first = document.querySelector("#steps input");
      if (first) first.focus();
    });
    $("#cta").addEventListener("click", function () {
      var f = $("#pform"), open = f.hidden;
      f.hidden = !open;
      this.setAttribute("aria-expanded", String(open));
      if (open) {
        $("#f-phone").focus();
        f.scrollIntoView({ block: "nearest", behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
      }
    });
    $("#discuss").addEventListener("click", function (e) {
      e.preventDefault();
      var n = $("#discussNote");
      n.hidden = false;
      n.textContent = t().discussNote;
    });
    ["phone", "email"].forEach(function (f) {
      var el = $("#f-" + f);
      el.addEventListener("blur", function () { if (el.value.trim() || f === "phone" && el.getAttribute("aria-invalid")) validate(f); });
      el.addEventListener("input", function () { if (el.getAttribute("aria-invalid") === "true") validate(f); });
    });
    $("#pform").addEventListener("submit", function (e) {
      e.preventDefault();
      var ok = validate("phone") & validate("email");
      if (!ok) {
        $("#sent").hidden = true;
        (($("#f-phone").getAttribute("aria-invalid") === "true") ? $("#f-phone") : $("#f-email")).focus();
        return;
      }
      var s = $("#sent");
      s.hidden = false;
      s.textContent = t().sent;
    });
    $("#readoutMore").addEventListener("click", function (e) {
      e.preventDefault();
      $("#result").scrollIntoView({ block: "start", behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
      $("#rTitle").focus({ preventScroll: true });
    });
  }

  /* ---------- chrome: switcher, language, theme ---------- */
  function store(k, v) { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) { /* storage blocked */ } }
  function read(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function effectiveTheme() {
    var set = document.documentElement.getAttribute("data-theme");
    if (set) return set;
    return matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  function renderSwitch() {
    var s = t().sw, q = lang === "ar" ? "?l=ar" : "", th = effectiveTheme();
    var pages = [["index.html", s.index], ["a.html", s.a], ["b.html", s.b], ["c.html", s.c], ["ab.html", "AB"], ["estimator.html", s.est]];
    var nav = $("#switch");
    nav.setAttribute("aria-label", s.nav);
    nav.innerHTML = pages.map(function (p) {
      var on = p[0] === "estimator.html";
      return '<a href="' + p[0] + q + '"' + (on ? ' class="on" aria-current="page"' : "") + ">" + esc(p[1]) + "</a>";
    }).join("") +
      '<i aria-hidden="true"></i>' +
      '<button type="button" data-lang="en" lang="en" aria-pressed="' + (lang === "en") + '"' + (lang === "en" ? ' class="on"' : "") + ">EN</button>" +
      '<button type="button" data-lang="ar" lang="ar" aria-pressed="' + (lang === "ar") + '"' + (lang === "ar" ? ' class="on"' : "") + ">عربي</button>" +
      '<i aria-hidden="true"></i>' +
      '<button type="button" data-theme-set="light" aria-pressed="' + (th === "light") + '"' + (th === "light" ? ' class="on"' : "") + ">" + esc(s.light) + "</button>" +
      '<button type="button" data-theme-set="dark" aria-pressed="' + (th === "dark") + '"' + (th === "dark" ? ' class="on"' : "") + ">" + esc(s.dark) + "</button>";
  }
  function wireSwitch() {
    $("#switch").addEventListener("click", function (e) {
      var b = e.target.closest("button");
      if (!b) return;
      if (b.dataset.lang && b.dataset.lang !== lang) {
        lang = b.dataset.lang;
        var u = new URL(location.href);
        if (lang === "ar") u.searchParams.set("l", "ar"); else u.searchParams.delete("l");
        history.replaceState(null, "", u);
        renderStatic();
        var again = document.querySelector('#switch [data-lang="' + lang + '"]');
        if (again) again.focus();
      }
      if (b.dataset.themeSet) {
        document.documentElement.setAttribute("data-theme", b.dataset.themeSet);
        store("ax-proto-theme", b.dataset.themeSet);
        renderSwitch();
        var btn = document.querySelector('#switch [data-theme-set="' + b.dataset.themeSet + '"]');
        if (btn) btn.focus();
      }
    });
  }

  var saved = read("ax-proto-theme");
  if (saved === "light" || saved === "dark") document.documentElement.setAttribute("data-theme", saved);
  renderStatic();
  wire();
  wireSwitch();
})();
