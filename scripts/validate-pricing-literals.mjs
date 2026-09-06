#!/usr/bin/env node
/**
 * Fails CI when a price-like literal appears outside packages/pricing-schema.
 *
 * The audit found the same figures maintained by hand in seven places. Fixing
 * them once is worth little if the next edit can put one back, so this guard
 * makes reintroducing a hardcoded price a build failure rather than something
 * caught in review — or not caught, which is how the last set drifted.
 *
 * What counts as price-like is deliberately narrow. Scanning for "any number"
 * would drown in EMU offsets, hex colours, cache TTLs and z-indexes, and a
 * guard that cries wolf gets disabled. Two shapes are flagged:
 *
 *   1. A number adjacent to a currency marker — EGP, USD, $, جنيه, دولار.
 *   2. A bare thousands-grouped or underscore-separated number of 4+ digits in
 *      a pricing-relevant file, which is how every table in the audit was
 *      written (35_000, "22,000").
 *
 * Internal-only fields are policed separately: `internalHourEquivalent` exists
 * for margin planning and must never reach a client surface.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname.replace(/\/$/, "");
const SCHEMA_DIR = join("packages", "pricing-schema");

const SCAN_DIRS = ["apps", "packages"];
const SCAN_EXT = new Set([".ts", ".tsx", ".mjs", ".js", ".json"]);

const SKIP_DIRS = new Set([
  "node_modules", ".next", "dist", ".turbo", "build", "coverage", ".git",
  "public", "prisma",
]);

/**
 * Files whose numbers are legitimately not prices.
 *
 * Each entry is a considered exception, not a convenience: the proposal and
 * contract builders position shapes in English Metric Units and mix colours in
 * hex, both of which are 4+ digit literals with no commercial meaning.
 */
const ALLOW_FILES = [
  "apps/admin/lib/proposal-builder.ts",   // EMU geometry + hex colours
  "apps/admin/lib/proposal-qa.ts",        // contrast-ratio fixtures
  "apps/admin/lib/pptx-to-images.ts",
  "apps/admin/lib/pptx-to-pdf.ts",
  "apps/www/lib/metadata.ts",             // postal code
  "bun.lock",
  "package-lock.json",
];

/**
 * Message keys whose figure is not an Altruvex price.
 *
 * The one entry is rhetorical: it cites what a template costs elsewhere, to
 * contrast with custom work. It is not a number this company charges, so the
 * schema is the wrong home for it.
 */
const ALLOW_MESSAGE_KEYS = new Set(["problem.items[0].delivery"]);

/** Message catalogues may hold prose, but its figures must be `{token}`s. */
const MESSAGE_FILES = [
  "apps/www/messages/en.json",
  "apps/www/messages/ar.json",
];

// `$` needs two digits: `$80` is a rate, `$1` is a regex backreference.
const CURRENCY_ADJACENT =
  /(?:(?:EGP|USD|جنيه|دولار)\s*[٠-٩\d][٠-٩\d,،_٬٫.]*)|(?:[٠-٩\d][٠-٩\d,،_٬٫.]*\s*(?:EGP|USD|جنيه|دولار))|(?:\$\d{2,}(?:[.,]\d+)?)/gu;

// Two or three groups only. Four or more (86_400_000, 604_800_000) are
// millisecond and byte constants, never money — Altruvex does not quote in
// hundreds of millions.
const GROUPED_NUMBER =
  /(?<![\d,_])\d{1,3}(?:[,_]\d{3}){1,2}(?![\d,_])|(?<![٠-٩٬،])[٠-٩]{1,3}(?:[٬،][٠-٩]{3}){1,2}(?![٠-٩٬،])/gu;

/**
 * Above a million is a millisecond or byte constant, not a quote — the
 * published table tops out at 1,000,000 and that figure lives in the schema.
 */
const MAX_PLAUSIBLE_PRICE = 1_000_000;

function plausiblePrice(match) {
  const digits = match.replace(/[^0-9٠-٩]/gu, "")
    .replace(/[٠-٩]/gu, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)));
  return digits.length > 0 && Number(digits) < MAX_PLAUSIBLE_PRICE;
}

/** Lines carrying one of these are geometry/time/colour, never money. */
// Colour functions carry no word boundary in Tailwind arbitrary values
// (`4px_rgba(34,197,94,0.4)`), so they are matched without one.
const NON_PRICE_CONTEXT =
  /\b(?:EMU|emu|inches?|z-index|maxAge|max-age|revalidate|timeout|getTime|Date\.now|duration_?ms|color|colou?r|stroke)\b|rgba?\(|hsla?\(|#[0-9a-fA-F]{6}|\d+px|\bcompact\b|\bnotation\b/;

const problems = [];

function walk(dir) {
  for (const name of readdirSync(dir)) {
    if (SKIP_DIRS.has(name)) continue;
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) walk(full);
    else if (SCAN_EXT.has(name.slice(name.lastIndexOf(".")))) inspect(full);
  }
}

function inspect(full) {
  const rel = relative(ROOT, full).split(sep).join("/");
  if (rel.startsWith(SCHEMA_DIR)) return;          // the one place prices live
  if (ALLOW_FILES.includes(rel)) return;
  if (MESSAGE_FILES.includes(rel)) return inspectMessages(full, rel);

  const lines = readFileSync(full, "utf8").split("\n");
  lines.forEach((raw, i) => {
    // Comments cannot reach a client, and flagging them only teaches people to
    // disable the guard. Code and string literals are what matter.
    const trimmed = raw.trim();
    if (trimmed.startsWith("//") || trimmed.startsWith("*") || trimmed.startsWith("/*")) return;
    const line = raw.replace(/\/\/.*$/, "");
    if (NON_PRICE_CONTEXT.test(line)) return;
    const hits = [
      ...(line.match(CURRENCY_ADJACENT) ?? []),
      ...(line.match(GROUPED_NUMBER) ?? []),
    ];
    // A currency word with no digits beside it is a label, not a price.
    const real = hits.filter((h) => /[٠-٩\d]/.test(h) && plausiblePrice(h));
    if (real.length > 0) {
      problems.push({ file: rel, line: i + 1, found: [...new Set(real)].join(", "), text: line.trim().slice(0, 100) });
    }
  });
}

/**
 * Prose in the message catalogue may mention a price only as a `{token}`,
 * filled at render time from the schema.
 */
function inspectMessages(full, rel) {
  const flat = [];
  const walkJson = (node, path) => {
    if (typeof node === "string") flat.push([path, node]);
    else if (Array.isArray(node)) node.forEach((v, i) => walkJson(v, `${path}[${i}]`));
    else if (node && typeof node === "object")
      for (const [k, v] of Object.entries(node)) walkJson(v, path ? `${path}.${k}` : k);
  };
  walkJson(JSON.parse(readFileSync(full, "utf8")), "");

  for (const [path, value] of flat) {
    if (ALLOW_MESSAGE_KEYS.has(path)) continue;
    if (NON_PRICE_CONTEXT.test(value)) continue;
    const hits = [
      ...(value.match(CURRENCY_ADJACENT) ?? []),
      ...(value.match(GROUPED_NUMBER) ?? []),
    ].filter((h) => /[٠-٩\d]/.test(h) && plausiblePrice(h));
    if (hits.length > 0) {
      problems.push({ file: rel, line: path, found: [...new Set(hits)].join(", "), text: value.slice(0, 100) });
    }
  }
}

/** `internalHourEquivalent` is margin planning and must stay in the schema. */
function checkInternalLeak() {
  const leaked = [];
  const scan = (dir) => {
    for (const name of readdirSync(dir)) {
      if (SKIP_DIRS.has(name)) continue;
      const full = join(dir, name);
      if (statSync(full).isDirectory()) scan(full);
      else if (SCAN_EXT.has(name.slice(name.lastIndexOf(".")))) {
        const rel = relative(ROOT, full).split(sep).join("/");
        if (rel.startsWith(SCHEMA_DIR)) continue;
        if (readFileSync(full, "utf8").includes("internalHourEquivalent")) leaked.push(rel);
      }
    }
  };
  for (const d of SCAN_DIRS) scan(join(ROOT, d));
  return leaked;
}

for (const d of SCAN_DIRS) walk(join(ROOT, d));
const leaked = checkInternalLeak();

if (problems.length === 0 && leaked.length === 0) {
  console.log("✓ No price literals outside packages/pricing-schema.");
  process.exit(0);
}

if (problems.length > 0) {
  console.error(`\n✗ ${problems.length} price-like literal(s) outside packages/pricing-schema:\n`);
  for (const p of problems) console.error(`  ${p.file}:${p.line}\n    found: ${p.found}\n    ${p.text}\n`);
  console.error("Move the figure into packages/pricing-schema and render it from there.");
  console.error("Prose may quote a price only as a {token} filled by fillPricingTokens().\n");
}
if (leaked.length > 0) {
  console.error(`✗ internalHourEquivalent referenced outside the schema (margin data must not reach a client surface):`);
  for (const f of leaked) console.error(`  ${f}`);
}
process.exit(1);
