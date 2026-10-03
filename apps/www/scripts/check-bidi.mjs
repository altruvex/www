#!/usr/bin/env node
// Bidi check for the site copy (spec step 20). Usage, from apps/www:
//
//   bun run check:bidi            static check + browser rendering (needs uv + Playwright browsers)
//   bun run check:bidi --static   static check only
//
// (a) Static: a product or standard name followed by its version number is one unit, so the
//     space between them must be a no-break space (U+00A0) in every locale. "Next.js 16" split
//     over two lines reads as "Next.js" and a stray "16" — in RTL the "16" even lands on the
//     other side of the column. The same holds between a WCAG version and its level (2.1 AA).
//
// (b) Browser: builds rendering cases from the real message strings, in the DOM shape their
//     component renders (a <bdi> where the component isolates LTR content), writes them to
//     packages/brand-font/dist/bidi-report.json and runs packages/brand-font/tests/test_bidi_www.py,
//     which renders each case in Chromium, Firefox and WebKit and adds per-engine results to the
//     same report. The fixes are the standard tools only: NBSP, <bdi>/dir. No bidi control
//     characters live in the messages, and (c) below keeps it that way.

import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const WWW = new URL("..", import.meta.url).pathname.replace(/\/$/, "");
const REPO = join(WWW, "..", "..");
const MESSAGES = join(WWW, "messages");
const BRAND_FONT = join(REPO, "packages", "brand-font");
const REPORT = join(BRAND_FONT, "dist", "bidi-report.json");
const LOCALES = ["en", "ar"];
const NBSP = " ";

// Names that are written with a version number. Add to this list, not around it.
const VERSIONED = [
  "Next\\.js", "React", "TypeScript", "Tailwind CSS", "Node\\.js", "WCAG", "ISO", "PHP", "Python",
  "Vue", "Angular", "PostgreSQL", "Prisma", "iOS", "Android", "HTTP", "TLS", "OAuth", "ECMAScript",
];
const VERSION = "v?[0-9\\u0660-\\u0669]+(?:[.\\u066B][0-9\\u0660-\\u0669]+)*";
// Any whitespace (or none) other than a single NBSP between a name and its version.
const NAME_VERSION = new RegExp(`(?<![\\w.-])(${VERSIONED.join("|")})(\\s+)(${VERSION})(?![\\w.])`, "gu");
const WCAG_LEVEL = new RegExp(`(WCAG${NBSP}${VERSION})(\\s+)(A{1,3})(?![\\w])`, "gu");
// Explicit bidi controls (LRM/RLM/ALM, embeddings, overrides, isolates) — none belong in copy.
const BIDI_CONTROLS = /[؜‎‏‪-‮⁦-⁩]/u;

function load(locale) {
  const out = {};
  for (const f of readdirSync(join(MESSAGES, locale)).sort()) {
    if (f.endsWith(".json")) out[f.slice(0, -5)] = JSON.parse(readFileSync(join(MESSAGES, locale, f), "utf8"));
  }
  return out;
}

function walk(node, path, out) {
  if (typeof node === "string") out.push([path, node]);
  else if (node && typeof node === "object") {
    for (const [k, v] of Object.entries(node)) walk(v, path ? `${path}.${k}` : k, out);
  }
  return out;
}

function get(messages, key) {
  let o = messages;
  for (const p of key.split(".")) o = o?.[p];
  if (typeof o !== "string") throw new Error(`message not found: ${key}`);
  return o;
}

/* ── (a) static ──────────────────────────────────────────────────────────── */

function staticCheck(all) {
  const failures = [];
  let units = 0;
  let controls = 0;
  for (const locale of LOCALES) {
    for (const [key, s] of walk(all[locale], "", [])) {
      for (const re of [NAME_VERSION, WCAG_LEVEL]) {
        for (const m of s.matchAll(re)) {
          units++;
          if (m[2] !== NBSP) {
            failures.push({ locale, key, found: m[0], rule: "no-break space between name and version" });
          }
        }
      }
      if (BIDI_CONTROLS.test(s)) {
        controls++;
        failures.push({ locale, key, found: JSON.stringify(s.match(BIDI_CONTROLS)[0]), rule: "no bidi control characters in copy" });
      }
    }
  }
  return { ok: failures.length === 0, units_checked: units, bidi_controls: controls, failures };
}

/* ── (b) rendering cases ─────────────────────────────────────────────────── */

const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const plain = (s) => s.replaceAll(NBSP, " ");
// Rich-text tags in a message render as spans; the bidi class of the text is what matters.
const rich = (s) => esc(s).replace(/&lt;(\/?)[a-z]+&gt;/g, (_, close) => (close ? "</span>" : "<span>"));
const tokens = (s) => s.match(/[()+]|[^\s ()+]+/gu);
const firstStrongIsLatin = (s) => /^[^A-Za-z؀-ۿ]*[A-Za-z]/u.test(s);
// The unit that must not break: the name's last word + the version ("CSS v4" in "Tailwind CSS v4").
const versionUnits = (s) => [...s.matchAll(NAME_VERSION)].map((m) => `${m[1].split(" ").pop()}${m[2]}${m[3]}`);

// work/[slug]/page-client.tsx: tech list item — a dot, then the name.
const DOT = '<span style="display:block;width:4px;height:4px;border-radius:9999px;background:currentColor;flex-shrink:0"></span>';
const chip = (inner) => `<li style="display:flex;align-items:center;gap:12px">${DOT}${inner}</li>`;

function buildCases(all) {
  const ar = all.ar;
  const cases = [];
  const add = (c) => cases.push({ units: [], ...c, control_units: (c.units || []).map(plain) });

  // 1. Case-study tech list (AR). The NBSP keeps "Next.js 16" whole. No <bdi>: measured, the UBA
  //    (bracket pairing included) already orders every chip correctly, so the control is the
  //    same markup with a plain space.
  const chips = new Set();
  for (const study of Object.values(ar.caseStudies)) for (const t of study.techStack || []) chips.add(t);
  for (const t of chips) {
    if (!/[A-Za-z]/.test(t)) continue;
    const tk = tokens(t);
    add({
      id: `ar-tech-chip:${plain(t)}`, kind: versionUnits(t).length ? "nbsp" : "verified", lang: "ar", dir: "rtl",
      source: "caseStudies.*.techStack → work/[slug]/page-client.tsx",
      fixed: chip(esc(t)), control: versionUnits(t).length ? chip(esc(plain(t))) : null,
      tokens: tk, expected: firstStrongIsLatin(t) ? tk : tk.slice().reverse(),
      units: versionUnits(t),
    });
  }

  // 2. Case-study metric figures (AR) that carry Latin: <p><bdi>value</bdi></p>.
  for (const [slug, study] of Object.entries(ar.caseStudies)) {
    for (const [i, m] of (study.metrics || []).entries()) {
      if (!/[A-Za-z]/.test(m.value)) continue;
      const tk = tokens(m.value);
      add({
        id: `ar-metric:${slug}.${i}`, kind: "isolate", lang: "ar", dir: "rtl",
        source: `caseStudies.${slug}.metrics.${i}.value → work/[slug]/page-client.tsx`,
        fixed: `<p><bdi>${esc(m.value)}</bdi></p>`, control: `<p>${esc(m.value)}</p>`,
        tokens: tk, expected: firstStrongIsLatin(m.value) ? tk : tk.slice().reverse(),
      });
    }
  }

  // 3. WCAG version + level in running text, both locales.
  const wcag = [
    ["serviceDetails.webDesign.lab.rows.items.5.body", "p"],
    ["serviceDetails.webDesign.features.06.description", "p"],
    ["standards.categories.accessibility.requirements", "li"],
  ];
  for (const locale of LOCALES) {
    for (const [key, tag] of wcag) {
      let s = get(all[locale], key);
      if (tag === "li") s = s.split(" | ").find((x) => x.includes("WCAG"));
      const unit = s.match(new RegExp(`WCAG[\\s]+${VERSION}[\\s]+A{1,3}`, "u"))[0];
      add({
        id: `${locale}-wcag:${key}`, kind: "nbsp", lang: locale, dir: locale === "ar" ? "rtl" : "ltr",
        source: key, fixed: `<${tag}>${rich(s)}</${tag}>`, control: `<${tag}>${rich(plain(s))}</${tag}>`,
        tokens: ["WCAG", "2.1", "AA"], expected: ["WCAG", "2.1", "AA"], units: [unit],
      });
    }
  }

  // 4. A client-typed name inside the AR PDF footer (lib/utils/transparency-pdf.ts). The sample
  //    name ends in its own full stop, which without isolation leaves the name and joins the
  //    sentence's full stop on the far side. (A trailing "(EG)" is not a case: bracket pairing
  //    keeps it with the name, measured.)
  const [before, after] = get(ar, "transparency.pdfContent.confidential").split("{name}");
  const sample = "Acme Co.";
  const next = after.trim().split(/\s+/u)[1];
  add({
    id: "ar-pdf-client-name", kind: "isolate", lang: "ar", dir: "rtl",
    source: "transparency.pdfContent.confidential {name} → lib/utils/transparency-pdf.ts",
    fixed: `<p>${esc(before)}<bdi>${esc(sample)}</bdi>${esc(after)}</p>`,
    control: `<p>${esc(before + sample + after)}</p>`,
    tokens: ["لـ", "Acme", "Co", ".", ".", next],
    expected: [next, ".", "Acme", "Co", ".", "لـ"],
  });

  // 5. The prototype's two sentences (docs/prototypes/2026-09-altruvex-sans, a2 matrix): the
  //    "Next.js 16" line break seen there, now with the NBSP the messages use.
  for (const [id, text, tk, exp] of [
    ["ref-nextjs-16", `بنينا الموقع على Next.js${NBSP}16 من البداية`,
      ["بنينا", "الموقع", "Next.js", "16", "البداية"], ["البداية", "Next.js", "16", "الموقع", "بنينا"]],
    ["ref-parentheses-nextjs-16", `نعتمد على (Next.js${NBSP}16) في كل مشروع`,
      ["نعتمد", "(", "Next.js", "16", ")", "مشروع"], ["مشروع", ")", "Next.js", "16", "(", "نعتمد"]],
  ]) {
    add({ id, kind: "nbsp", lang: "ar", dir: "rtl", source: "prototype a2 matrix (reference sentence)",
      fixed: `<p>${esc(text)}</p>`, control: `<p>${esc(plain(text))}</p>`, tokens: tk, expected: exp,
      units: [`Next.js${NBSP}16`] });
  }

  // 6. Measured and left alone: the UBA already orders these correctly in an RTL paragraph.
  const verified = [
    ["about.record.items.floor.value", null, ["٩٥", "+", "في", "Lighthouse", "قبل"]],
    ["footer.copyright", { year: "٢٠٢٦" }, ["©", "٢٠٢٦", "Altruvex", ".", "جميع"]],
    ["approach.closing.cta", null, ["ابدأ", "المحادثة", ":", "hello@altruvex.com"]],
    ["faq.questions.03.question", null, ["WordPress", "أو", "Shopify", "أو", "Odoo", "؟"]],
    ["transparency.pdfContent.deliverables.ecommerce.small.0", null, ["محدد", "(", "حتى", "٥٠", "SKU", ")"]],
    ["contactPage.receipt.sentAt", { time: "١٤:٣٠" }, ["استُلمت", "الساعة", "١٤:٣٠", "بتوقيت"]],
    ["standards.enforcement.outcomes.fail.example", { check: get(ar, "standards.categories.performance.checks.lcp.label") },
      ["مثال", ":", "محتوى", "(", "LCP", ")", "لا"]],
  ];
  for (const [key, vars, tk] of verified) {
    let s = get(ar, key);
    for (const [k, v] of Object.entries(vars || {})) s = s.replace(`{${k}}`, v);
    add({ id: `ar-verified:${key}`, kind: "verified", lang: "ar", dir: "rtl", source: key,
      fixed: `<p>${rich(s)}</p>`, control: null, tokens: tk, expected: tk.slice().reverse() });
  }
  // The contrast pass line: "٤٫٥:١ أو أعلى" — the ratio stays one left-to-right number.
  const ratio = get(ar, "standards.sheet.pass.atLeast").replace("{value}", get(ar, "standards.sheet.unit.ratio").replace("{value}", "٤٫٥").replace("1", "١"));
  add({ id: "ar-verified:standards.sheet.pass.atLeast(ratio)", kind: "verified", lang: "ar", dir: "rtl",
    source: "standards.sheet.pass.atLeast + standards.sheet.unit.ratio", fixed: `<p>${esc(ratio)}</p>`, control: null,
    tokens: ["٤٫٥", ":", "١", "أو", "أعلى"], expected: ["أعلى", "أو", "٤٫٥", ":", "١"] });

  return cases;
}

/* ── run ─────────────────────────────────────────────────────────────────── */

const staticOnly = process.argv.includes("--static");
const all = Object.fromEntries(LOCALES.map((l) => [l, load(l)]));
const stat = staticCheck(all);

console.log(`static: ${stat.units_checked} name+version units, ${stat.failures.length} failure(s)`);
for (const f of stat.failures) console.log(`  ✗ ${f.locale} ${f.key}: ${JSON.stringify(f.found)} — ${f.rule}`);
if (staticOnly) process.exit(stat.ok ? 0 : 1);

const cases = buildCases(all);
const report = {
  spec: "step 20: bidi content fixes in apps/www",
  generated_by: "apps/www/scripts/check-bidi.mjs + packages/brand-font/tests/test_bidi_www.py",
  methods: {
    static: "regex over every message string: known name + version must be joined by U+00A0; no bidi control characters",
    order: "Range rects over token text offsets (no spans), sorted by centre x = visual left-to-right order",
    breaks: "container swept from the unit's own width to natural width in 2px steps; every unit on one line",
    control: "the same case without the fix (plain space, no <bdi>); recorded, not asserted",
  },
  static: stat,
  cases,
  engines: null,
  browser_ok: null,
  ok: null,
};
mkdirSync(join(BRAND_FONT, "dist"), { recursive: true });
writeFileSync(REPORT, JSON.stringify(report, null, 2) + "\n");
console.log(`browser: ${cases.length} cases written to packages/brand-font/dist/bidi-report.json`);

const run = spawnSync("uv", ["run", "pytest", "-q", "tests/test_bidi_www.py"], { cwd: BRAND_FONT, stdio: "inherit" });
if (run.error) {
  console.error(`browser: not run (${run.error.message}); install uv and \`uv run playwright install\` in packages/brand-font`);
  process.exit(1);
}

const done = JSON.parse(readFileSync(REPORT, "utf8"));
for (const [name, e] of Object.entries(done.engines || {})) {
  if (e.not_run) { console.log(`  ${name}: not run (${e.not_run})`); continue; }
  const cs = Object.entries(e.cases);
  const bad = cs.filter(([, c]) => !c.pass).map(([id]) => id);
  const reproduced = cs.filter(([, c]) => c.control_reproduces).length;
  console.log(`  ${name} ${e.version}: ${cs.length - bad.length}/${cs.length} pass; controls that misrender without the fix: ${reproduced}${bad.length ? `\n    failing: ${bad.join(", ")}` : ""}`);
}
process.exit(stat.ok && run.status === 0 && done.ok ? 0 : 1);
