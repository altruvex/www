#!/usr/bin/env node
// Line-height check (spec step 17). Usage, from apps/www:
//
//   bun run check:line-height
//
// No text-bearing element may rely on `line-height: normal`. "normal" is the font's own ascent +
// descent + line gap, so the same element gets a different line box in Inter, Vazirmatn, Altruvex
// Sans or a fallback face — EN and AR lines stop matching, and a font swap moves the page.
//
// This is the static half. It fails on any source that sets `normal`, directly or by accident:
//
//   (a) `line-height: normal` in CSS, or in a CSS string inside TS/TSX (inline styles, generated
//       HTML such as the transparency PDF);
//   (b) `lineHeight: "normal"` in a React style object;
//   (c) the Tailwind arbitrary value `leading-[normal]` (Tailwind's `leading-normal` is 1.5 and fine);
//   (d) the CSS `font:` shorthand without a `/line-height` part, which resets line-height to normal
//       (`font: inherit` and the other CSS-wide keywords are fine; canvas `ctx.font = ...` is not CSS
//       and is not matched);
//   (e) the root: globals.css must give `body` a line-height, so everything inherits a number
//       (Tailwind's preflight sets `font: inherit` on form controls, which carries it to them).
//
// The runtime half — every rendered element with its own text, computed `line-height: normal` —
// is in packages/brand-font/tools/font_loading.py (dist/font-loading-report.json,
// line_height_normal), because only a browser knows what a component ends up computing.

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const WWW = new URL("..", import.meta.url).pathname.replace(/\/$/, "");
const REPO = join(WWW, "..", "..");
// What apps/www renders: its own code, and @repo/ui (components and styles it imports).
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
  // `font:` as a CSS declaration: at line start, after `{` or `;`, or opening a CSS string. A
  // value with a `/` carries its own line-height; CSS-wide keywords inherit or reset as a whole.
  {
    id: "font-shorthand-without-line-height",
    re: /(?:^|[{;"'`]\s*)font\s*:\s*(?!inherit\b|initial\b|unset\b|revert\b|revert-layer\b|var\()([^;{}"'`\n]*)/gm,
    keep: (m) => !m[1].includes("/") && /\d/.test(m[1]),
  },
  // The same shorthand in a React style object: `{ font: "600 14px Inter" }`.
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

// (e) the root line-height every element inherits.
const globals = readFileSync(join(WWW, "app", "globals.css"), "utf8");
const bodyRule = [...globals.matchAll(/(?:^|\n)\s*body\s*\{([^}]*)\}/g)].some((m) => /line-height\s*:/.test(m[1]));
if (!bodyRule) {
  findings.push({ rule: "root-line-height", file: "apps/www/app/globals.css", line: 0, found: "body has no line-height" });
}

console.log(`line-height: ${scanned} files scanned, ${findings.length} finding(s)`);
for (const f of findings) console.log(`  ✗ ${f.file}:${f.line} [${f.rule}] ${f.found}`);
process.exit(findings.length ? 1 : 0);
