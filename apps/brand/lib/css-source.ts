import "server-only";
import { readFileSync } from "node:fs";
import path from "node:path";
import { repoRoot } from "./repo";

/** One declaration as written in a source stylesheet. */
export interface CssDecl {
  property: string;
  value: string;
  /** Selector chain, outermost first, e.g. ["@layer base", "h1"]. */
  context: string[];
  file: string;
  line: number;
}

/** The stylesheets that define the identity. Order matters: later files override earlier ones. */
export const SOURCE_FILES = [
  "packages/ui/src/styles/tokens.css",
  "packages/ui/src/styles/liquid-glass.css",
  "packages/brand-font/dist/web/tokens.css",
  "apps/www/app/globals.css",
] as const;

function stripComments(css: string): string {
  // Keep newlines so line numbers survive.
  return css.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "));
}

/**
 * A small brace-depth parser. It is enough for hand-written token files:
 * nested at-rules, multi-line values, and no strings containing braces.
 */
export function parseCss(source: string, file: string): CssDecl[] {
  const css = stripComments(source);
  const decls: CssDecl[] = [];
  const stack: string[] = [];
  let buf = "";
  let bufLine = 1;
  let line = 1;
  let parens = 0;

  for (let i = 0; i < css.length; i++) {
    const ch = css[i];
    if (ch === "\n") line++;
    if (buf.trim() === "" && ch.trim() !== "") bufLine = line;

    if (ch === "(") parens++;
    if (ch === ")") parens--;

    if (parens === 0 && ch === "{") {
      stack.push(buf.trim().replace(/\s+/g, " "));
      buf = "";
      continue;
    }
    if (parens === 0 && (ch === ";" || ch === "}")) {
      const text = buf.trim();
      const colon = text.indexOf(":");
      if (stack.length > 0 && colon > 0 && !text.startsWith("@")) {
        decls.push({
          property: text.slice(0, colon).trim(),
          value: text.slice(colon + 1).trim().replace(/\s+/g, " "),
          context: [...stack],
          file,
          line: bufLine,
        });
      }
      buf = "";
      if (ch === "}") stack.pop();
      continue;
    }
    buf += ch;
  }
  return decls;
}

let cache: { at: number; decls: CssDecl[] } | null = null;

/** Every declaration in the identity stylesheets. Re-read when older than a second, so edits show on refresh. */
export function identityDecls(): CssDecl[] {
  if (cache && Date.now() - cache.at < 1000) return cache.decls;
  const root = repoRoot();
  const decls = SOURCE_FILES.flatMap((rel) =>
    parseCss(readFileSync(path.join(root, rel), "utf8"), rel),
  );
  cache = { at: Date.now(), decls };
  return decls;
}

export function contextLabel(context: string[]): string {
  return context.join(" › ");
}

/** Custom-property declarations only, keyed by name, in source order. */
export function tokenDecls(): Map<string, CssDecl[]> {
  const map = new Map<string, CssDecl[]>();
  for (const d of identityDecls()) {
    if (!d.property.startsWith("--")) continue;
    const list = map.get(d.property) ?? [];
    list.push(d);
    map.set(d.property, list);
  }
  return map;
}

/** Declarations of the rule whose last selector matches exactly. */
export function ruleDecls(selector: string, within?: string): CssDecl[] {
  return identityDecls().filter(
    (d) =>
      d.context[d.context.length - 1] === selector &&
      (within === undefined || d.context.includes(within)),
  );
}

/** Resolve a value's var() chain against the light :root declarations. */
export function resolveLight(name: string, depth = 0): string | undefined {
  const decl = tokenDecls()
    .get(name)
    ?.find((d) => d.context.length === 1 && d.context[0] === ":root");
  if (!decl || depth > 8) return decl?.value;
  return decl.value.replace(/var\((--[\w-]+)\)/g, (m, inner: string) => resolveLight(inner, depth + 1) ?? m);
}

/** "channels" tokens are consumed as hsl(var(--x)); "color" tokens are complete colours. */
export function tokenKind(name: string): "channels" | "color" {
  const resolved = resolveLight(name) ?? "";
  return /^\d/.test(resolved) ? "channels" : "color";
}
