#!/usr/bin/env node
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname.replace(/\/$/, "");
const SCHEMA_DIR = join("packages", "pricing-schema");

const SCAN_DIRS = ["apps", "packages"];
const SCAN_EXT = new Set([".ts", ".tsx", ".mjs", ".js", ".json"]);

const SKIP_DIRS = new Set([
  "node_modules", ".next", ".next-scratch", "dist", ".turbo", "build", "coverage", ".git",
  "public", "prisma", ".venv",
]);

const ALLOW_FILES = [
  "apps/admin/lib/proposal-builder.ts",
  "apps/admin/lib/proposal-qa.ts",
  "apps/admin/lib/pptx-to-images.ts",
  "apps/admin/lib/pptx-to-pdf.ts",
  "apps/www/lib/metadata.ts",
  "bun.lock",
  "package-lock.json",
];

const ALLOW_MESSAGE_KEYS = new Set(["problem.items[0].delivery"]);

const MESSAGE_DIRS = ["apps/www/messages/en", "apps/www/messages/ar"];

const CURRENCY_ADJACENT =
  /(?:(?:EGP|USD|جنيه|دولار)\s*[٠-٩\d][٠-٩\d,،_٬٫.]*)|(?:[٠-٩\d][٠-٩\d,،_٬٫.]*\s*(?:EGP|USD|جنيه|دولار))|(?:\$\d{2,}(?:[.,]\d+)?)/gu;

const GROUPED_NUMBER =
  /(?<![\d,_])\d{1,3}(?:[,_]\d{3}){1,2}(?![\d,_])|(?<![٠-٩٬،])[٠-٩]{1,3}(?:[٬،][٠-٩]{3}){1,2}(?![٠-٩٬،])/gu;

const MAX_PLAUSIBLE_PRICE = 1_000_000;

function plausiblePrice(match) {
  const digits = match.replace(/[^0-9٠-٩]/gu, "")
    .replace(/[٠-٩]/gu, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)));
  return digits.length > 0 && Number(digits) < MAX_PLAUSIBLE_PRICE;
}

const NON_PRICE_CONTEXT =
  /\b(?:EMU|emu|inches?|z-index|maxAge|max-age|revalidate|getTime|Date\.now|color|colou?r|stroke)\b|\b\w*(?:TIMEOUT|[Tt]imeout|DELAY|[Dd]elay|DURATION|[Dd]uration|INTERVAL|[Ii]nterval)\w*\b|\b\w*_(?:MS|SECONDS|SEC|MINUTES|LENGTH|BYTES|CHARS)\b|rgba?\(|hsla?\(|#[0-9a-fA-F]{6}|\d+px|\bcompact\b|\bnotation\b/;

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
  if (rel.startsWith(SCHEMA_DIR)) return;
  if (ALLOW_FILES.includes(rel)) return;
  if (MESSAGE_DIRS.some((dir) => rel.startsWith(`${dir}/`))) {
    return inspectMessages(full, rel);
  }

  const lines = readFileSync(full, "utf8").split("\n");
  lines.forEach((raw, i) => {
    const trimmed = raw.trim();
    if (trimmed.startsWith("//") || trimmed.startsWith("*") || trimmed.startsWith("/*")) return;
    const line = raw.replace(/\/\/.*$/, "");
    if (NON_PRICE_CONTEXT.test(line)) return;
    const hits = [
      ...(line.match(CURRENCY_ADJACENT) ?? []),
      ...(line.match(GROUPED_NUMBER) ?? []),
    ];
    const real = hits.filter((h) => /[٠-٩\d]/.test(h) && plausiblePrice(h));
    if (real.length > 0) {
      problems.push({ file: rel, line: i + 1, found: [...new Set(real)].join(", "), text: line.trim().slice(0, 100) });
    }
  });
}

function inspectMessages(full, rel) {
  const namespace = rel.slice(rel.lastIndexOf("/") + 1).replace(/\.json$/, "");
  const flat = [];
  const walkJson = (node, path) => {
    if (typeof node === "string") flat.push([path, node]);
    else if (Array.isArray(node)) node.forEach((v, i) => walkJson(v, `${path}[${i}]`));
    else if (node && typeof node === "object")
      for (const [k, v] of Object.entries(node)) walkJson(v, path ? `${path}.${k}` : k);
  };
  walkJson(JSON.parse(readFileSync(full, "utf8")), namespace);

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

const INTERNAL_FIELD_ALLOWED = new Set([
  "apps/admin/lib/pricing-store.ts",
  "apps/admin/app/api/admin/pricing/route.ts",
  "apps/admin/app/(dashboard)/pricing/page.tsx",
  "apps/admin/app/(dashboard)/pricing/pricing-client.tsx",
]);

function referencesInternalField(source) {
  return source.split("\n").some((raw) => {
    const trimmed = raw.trim();
    if (trimmed.startsWith("//") || trimmed.startsWith("*") || trimmed.startsWith("/*")) {
      return false;
    }
    return raw.replace(/\/\/.*$/, "").includes("internalHourEquivalent");
  });
}

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
        if (INTERNAL_FIELD_ALLOWED.has(rel)) continue;
        if (referencesInternalField(readFileSync(full, "utf8"))) leaked.push(rel);
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
  console.error(`✗ internalHourEquivalent referenced outside the schema or the admin pricing screen (margin data must not reach a client surface):`);
  for (const f of leaked) console.error(`  ${f}`);
}
process.exit(1);
