#!/usr/bin/env node

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const WWW = new URL("..", import.meta.url).pathname.replace(/\/$/, "");
const REPO = join(WWW, "..", "..");
const ROOTS = [
  join(WWW, "app"),
  join(WWW, "components"),
  join(WWW, "lib"),
  join(WWW, "styles"),
  join(REPO, "packages", "ui", "src"),
];
const EXTENSIONS = /\.(css|scss|ts|tsx|js|jsx|mjs|mdx)$/;
const SKIP_DIRS = new Set(["node_modules", ".next", "dist", "public"]);

const RULES = [
  { id: "css-line-height-normal", re: /line-height\s*:\s*normal\b/gi },
  { id: "style-object-line-height-normal", re: /lineHeight\s*:\s*["'`]normal["'`]/g },
  { id: "tailwind-leading-normal-arbitrary", re: /\bleading-\[normal\]/g },
  {
    id: "font-shorthand-without-line-height",
    re: /(?:^|[{;"'`]\s*)font\s*:\s*(?!inherit\b|initial\b|unset\b|revert\b|revert-layer\b|var\()([^;{}"'`\n]*)/gm,
    keep: (m) => !m[1].includes("/") && /\d/.test(m[1]),
  },
  {
    id: "style-object-font-without-line-height",
    re: /\bfont\s*:\s*["'`]([^"'`\n]*)["'`]/g,
    keep: (m) => !m[1].includes("/") && /\d/.test(m[1]),
  },
];

function files(dir, out = []) {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return out;
  }
  for (const name of entries) {
    if (SKIP_DIRS.has(name)) continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) files(p, out);
    else if (EXTENSIONS.test(name)) out.push(p);
  }
  return out;
}

function lineOf(text, index) {
  return text.slice(0, index).split("\n").length;
}

const findings = [];
let scanned = 0;
for (const root of ROOTS) {
  for (const file of files(root)) {
    scanned++;
    const text = readFileSync(file, "utf8");
    for (const rule of RULES) {
      for (const m of text.matchAll(rule.re)) {
        if (rule.keep && !rule.keep(m)) continue;
        findings.push({
          rule: rule.id,
          file: relative(REPO, file),
          line: lineOf(text, m.index + (m[0].length - m[0].trimStart().length)),
          found: m[0].trim().slice(0, 80),
        });
      }
    }
  }
}

const globals = readFileSync(join(WWW, "app", "globals.css"), "utf8");
const bodyRule = [...globals.matchAll(/(?:^|\n)\s*body\s*\{([^}]*)\}/g)].some((m) => /line-height\s*:/.test(m[1]));
if (!bodyRule) {
  findings.push({ rule: "root-line-height", file: "apps/www/app/globals.css", line: 0, found: "body has no line-height" });
}

console.log(`line-height: ${scanned} files scanned, ${findings.length} finding(s)`);
for (const f of findings) console.log(`  ✗ ${f.file}:${f.line} [${f.rule}] ${f.found}`);
process.exit(findings.length ? 1 : 0);
