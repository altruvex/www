import { readdirSync, readFileSync, existsSync } from "node:fs";
import path from "node:path";
import type { AppName } from "./types";
import type { Ext } from "./rules";

/** Where each app's source lives, repo-relative. */
export const APP_ROOTS: Record<AppName, string> = {
  www: "apps/www",
  admin: "apps/admin",
  ui: "packages/ui/src",
  brand: "apps/brand",
};

const SKIP_DIRS = new Set([
  "node_modules",
  ".next",
  ".turbo",
  "dist",
  "out",
  "build",
  "coverage",
  "public",
  "generated",
  "scripts",
]);

/**
 * The token sources themselves: they are where the literals are supposed to
 * live. palette.ts mirrors tokens.css for documents (verify:palette).
 */
const TOKEN_FILES = new Set([
  "packages/ui/src/styles/tokens.css",
  "packages/ui/src/palette.ts",
  "apps/www/app/globals.css",
  "apps/admin/app/globals.css",
]);

const EXTS: readonly Ext[] = ["tsx", "ts", "css", "mdx"];

export interface SourceFile {
  app: AppName;
  /** repo-relative, forward slashes */
  file: string;
  ext: Ext;
  abs: string;
}

/** The folder above `start` that holds turbo.json. */
export function findRepoRoot(start: string): string {
  let dir = path.resolve(start);
  for (;;) {
    if (existsSync(path.join(dir, "turbo.json"))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) {
      throw new Error(`audit: no turbo.json above ${start}`);
    }
    dir = parent;
  }
}

function extOf(name: string): Ext | null {
  if (name.endsWith(".d.ts")) return null;
  const ext = name.slice(name.lastIndexOf(".") + 1);
  return (EXTS as readonly string[]).includes(ext) ? (ext as Ext) : null;
}

export function listFiles(repoRoot: string, app: AppName): SourceFile[] {
  const out: SourceFile[] = [];
  const walk = (absDir: string): void => {
    let entries;
    try {
      entries = readdirSync(absDir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      if (e.name.startsWith(".") && e.name !== ".") {
        if (e.isDirectory()) continue;
      }
      const abs = path.join(absDir, e.name);
      if (e.isDirectory()) {
        if (!SKIP_DIRS.has(e.name)) walk(abs);
        continue;
      }
      if (!e.isFile()) continue;
      const ext = extOf(e.name);
      if (!ext) continue;
      const file = path.relative(repoRoot, abs).split(path.sep).join("/");
      if (TOKEN_FILES.has(file)) continue;
      out.push({ app, file, ext, abs });
    }
  };
  walk(path.join(repoRoot, APP_ROOTS[app]));
  return out;
}

export function readLines(abs: string): string[] {
  return readFileSync(abs, "utf8").split(/\r?\n/);
}

/**
 * Blank out comments (and, in MDX, fenced and inline code) with spaces, so
 * columns still line up with the raw text. Deliberately simple: strings are not
 * tracked, so `/*` only opens a comment after whitespace or punctuation, and
 * `//` only after whitespace/punctuation and never as part of `://`.
 */
export function maskComments(lines: readonly string[], ext: Ext): string[] {
  const out: string[] = [];
  let inBlock = false;
  let inFence = false;
  const lineComments = ext === "ts" || ext === "tsx" || ext === "mdx";
  for (const raw of lines) {
    if (ext === "mdx" && /^\s*(```|~~~)/.test(raw)) {
      inFence = !inFence;
      out.push(" ".repeat(raw.length));
      continue;
    }
    if (inFence) {
      out.push(" ".repeat(raw.length));
      continue;
    }
    const chars = raw.split("");
    let i = 0;
    while (i < chars.length) {
      if (inBlock) {
        if (chars[i] === "*" && chars[i + 1] === "/") {
          chars[i] = " ";
          chars[i + 1] = " ";
          i += 2;
          inBlock = false;
        } else {
          chars[i] = " ";
          i += 1;
        }
        continue;
      }
      const prev = i === 0 ? " " : chars[i - 1];
      const opener = /[\s{(;,>=]/.test(prev);
      if (chars[i] === "/" && chars[i + 1] === "*" && opener) {
        inBlock = true;
        chars[i] = " ";
        chars[i + 1] = " ";
        i += 2;
        continue;
      }
      if (lineComments && chars[i] === "/" && chars[i + 1] === "/" && opener) {
        for (let j = i; j < chars.length; j++) chars[j] = " ";
        break;
      }
      if (ext === "mdx" && chars[i] === "<" && raw.startsWith("<!--", i)) {
        const end = raw.indexOf("-->", i + 4);
        const stop = end === -1 ? chars.length : end + 3;
        for (let j = i; j < stop; j++) chars[j] = " ";
        i = stop;
        continue;
      }
      if (ext === "mdx" && chars[i] === "`") {
        const end = raw.indexOf("`", i + 1);
        if (end !== -1) {
          for (let j = i; j <= end; j++) chars[j] = " ";
          i = end + 1;
          continue;
        }
      }
      i += 1;
    }
    out.push(chars.join(""));
  }
  return out;
}
