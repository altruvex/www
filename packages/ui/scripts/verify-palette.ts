/**
 * Fails when src/palette.ts (the palette as values, for documents) drifts from
 * the CSS it mirrors: styles/tokens.css for every token, apps/www globals.css
 * for the gradient stops. Run: bun run verify:palette
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { GRADIENT_VIA_HSL, PALETTE_HSL } from "../src/palette";

const root = join(import.meta.dir, "..");
const tokens = readFileSync(join(root, "src/styles/tokens.css"), "utf8");
const www = readFileSync(join(root, "../../apps/www/app/globals.css"), "utf8");

function block(css: string, selector: string): Map<string, string> {
  const start = css.indexOf(`\n${selector} {`);
  if (start < 0) throw new Error(`no ${selector} block`);
  const body = css.slice(start, css.indexOf("\n}", start));
  return new Map([...body.matchAll(/(--[\w-]+):\s*([^;]+);/g)].map((m) => [m[1]!, m[2]!.trim()]));
}

const light = block(tokens, ":root");
const dark = new Map([...light, ...block(tokens, ".dark")]);

function resolve(vars: Map<string, string>, name: string, depth = 0): string {
  const raw = vars.get(`--${name}`);
  if (raw === undefined) throw new Error(`--${name} is not in tokens.css`);
  const ref = raw.match(/^var\(--([\w-]+)\)$/);
  return ref && depth < 8 ? resolve(vars, ref[1]!, depth + 1) : raw;
}

const failures: string[] = [];
for (const [mode, vars] of [["light", light], ["dark", dark]] as const) {
  for (const [name, value] of Object.entries(PALETTE_HSL[mode])) {
    const actual = resolve(vars, name);
    if (actual !== value) failures.push(`${mode} --${name}: palette.ts "${value}" ≠ tokens.css "${actual}"`);
  }
}

for (const [name, stops] of Object.entries(GRADIENT_VIA_HSL)) {
  const lightRule = www.match(new RegExp(`\\.accent-${name}[,\\s][^{]*\\{[^}]*--grad-via:\\s*hsl\\(([^)]+)\\)`));
  const darkRule = www.match(new RegExp(`\\.dark \\.accent-${name}[,\\s][^{]*\\{[^}]*--grad-via:\\s*hsl\\(([^)]+)\\)`));
  if (lightRule?.[1] !== stops.light) failures.push(`gradient ${name} light via: "${stops.light}" ≠ "${lightRule?.[1]}"`);
  if (darkRule?.[1] !== stops.dark) failures.push(`gradient ${name} dark via: "${stops.dark}" ≠ "${darkRule?.[1]}"`);
}

if (failures.length) {
  console.error(`palette.ts disagrees with the CSS:\n  ${failures.join("\n  ")}`);
  process.exit(1);
}
console.log(`palette ok — ${Object.keys(PALETTE_HSL.light).length + Object.keys(PALETTE_HSL.dark).length} tokens and ${Object.keys(GRADIENT_VIA_HSL).length} gradients match the CSS`);
