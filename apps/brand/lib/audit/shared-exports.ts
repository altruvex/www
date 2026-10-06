import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { maskComments } from "./scan";

/** The two public entry points of @repo/ui, repo-relative. */
const ENTRY_POINTS = ["packages/ui/src/index.ts", "packages/ui/src/www/index.ts"] as const;

const cache = new Map<string, ReadonlySet<string>>();

function resolveModule(fromFile: string, spec: string): string | null {
  const base = path.resolve(path.dirname(fromFile), spec);
  for (const candidate of [
    `${base}.ts`,
    `${base}.tsx`,
    path.join(base, "index.ts"),
    path.join(base, "index.tsx"),
  ]) {
    if (existsSync(candidate)) return candidate;
  }
  return null;
}

const DECLARATION_RE =
  /\bexport\s+(?:declare\s+)?(?:async\s+)?(?:function\*?|const|let|var|class|enum)\s+([A-Za-z_$][\w$]*)/g;
const NAMED_EXPORT_RE = /\bexport\s*\{([^}]*)\}(?:\s*from\s*["']([^"']+)["'])?/g;
const STAR_EXPORT_RE = /\bexport\s*\*\s*from\s*["']([^"']+)["']/g;

/** Value names a file exports, following `export * from "./x"` into relative modules. */
function collect(abs: string, names: Set<string>, seen: Set<string>): void {
  if (seen.has(abs)) return;
  seen.add(abs);
  const lines = readFileSync(abs, "utf8").split(/\r?\n/);
  const text = maskComments(lines, "ts").join("\n");

  for (const m of text.matchAll(DECLARATION_RE)) names.add(m[1]);

  for (const m of text.matchAll(NAMED_EXPORT_RE)) {
    for (const part of m[1].split(",")) {
      const item = part.trim();
      if (!item || /^type\s/.test(item)) continue;
      const alias = /\bas\s+([A-Za-z_$][\w$]*)$/.exec(item);
      const name = alias ? alias[1] : item;
      if (/^[A-Za-z_$][\w$]*$/.test(name)) names.add(name);
    }
  }

  for (const m of text.matchAll(STAR_EXPORT_RE)) {
    if (!m[1].startsWith(".")) continue;
    const next = resolveModule(abs, m[1]);
    if (next) collect(next, names, seen);
  }
}

/**
 * Every value `@repo/ui` and `@repo/ui/www` export, read from the two index
 * files at audit time (never a hard-coded list). Throws when an entry point is
 * missing or yields nothing, so the mirror rule can never pass vacuously.
 */
export function sharedExportNames(repoRoot: string): ReadonlySet<string> {
  const hit = cache.get(repoRoot);
  if (hit) return hit;
  const names = new Set<string>();
  for (const entry of ENTRY_POINTS) {
    const abs = path.join(repoRoot, entry);
    if (!existsSync(abs)) throw new Error(`audit: shared entry point missing: ${entry}`);
    const before = names.size;
    collect(abs, names, new Set());
    if (names.size === before) throw new Error(`audit: no exports found in ${entry}`);
  }
  cache.set(repoRoot, names);
  return names;
}
