import type { AppName, AuditReport, Finding } from "./types";
import { RULES, RULE_CHECKS, type Hit, type RuleCheck } from "./rules";
import { findRepoRoot, listFiles, maskComments, readLines } from "./scan";

export type { AppName, AuditReport, Finding, Rule, Severity, Category } from "./types";
export { RULES } from "./rules";

const ALL_APPS: AppName[] = ["www", "admin", "ui", "brand"];
const SNIPPET_MAX = 200;

/** `brand-allow: rule-a, rule-b` on the line itself or the line above. */
function allowed(raw: readonly string[], line: number, ruleId: string): boolean {
  for (const l of [line, line - 1]) {
    const text = raw[l];
    if (!text || !text.includes("brand-allow")) continue;
    const re = /brand-allow:\s*([\w-]+(?:[\s,]+[\w-]+)*)/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      if (m[1].split(/[\s,]+/).includes(ruleId)) return true;
    }
  }
  return false;
}

/** The trimmed line, windowed around the match when it is longer than 200 chars. */
function snippet(raw: string, index: number): string {
  const lead = raw.length - raw.trimStart().length;
  const text = raw.trim();
  if (text.length <= SNIPPET_MAX) return text;
  const at = Math.max(0, index - lead);
  const start = Math.max(0, Math.min(at - 60, text.length - (SNIPPET_MAX - 2)));
  const body = text.slice(start, start + SNIPPET_MAX - 2);
  return `${start > 0 ? "…" : ""}${body}${start + body.length < text.length ? "…" : ""}`.slice(0, SNIPPET_MAX);
}

function applies(check: RuleCheck, app: AppName, file: string, ext: string): boolean {
  if (!check.rule.apps.includes(app)) return false;
  if (!(check.exts as readonly string[]).includes(ext)) return false;
  return !check.skipFile?.(file, app);
}

/**
 * Scan the apps' source for code that leaves the Altruvex identity.
 * Server-only (node:fs). Repo root = the folder above `repoRoot ?? cwd` with turbo.json.
 */
export async function runAudit(
  opts: { repoRoot?: string; apps?: AppName[] } = {},
): Promise<AuditReport> {
  const repoRoot = findRepoRoot(opts.repoRoot ?? process.cwd());
  const apps = opts.apps && opts.apps.length > 0 ? opts.apps : ALL_APPS;
  const findings: Finding[] = [];
  const scanned: AuditReport["scanned"] = [];

  for (const app of apps) {
    const files = listFiles(repoRoot, app);
    scanned.push({ app, files: files.length });

    for (const src of files) {
      const checks = RULE_CHECKS.filter((c) => applies(c, app, src.file, src.ext));
      if (checks.length === 0) continue;
      const raw = readLines(src.abs);
      const code = maskComments(raw, src.ext);

      const push = (ruleId: string, line: number, hit: Hit): void => {
        if (allowed(raw, line, ruleId)) return;
        findings.push({
          ruleId,
          app,
          file: src.file,
          line: line + 1,
          column: hit.index + 1,
          match: hit.match,
          snippet: snippet(raw[line] ?? "", hit.index),
        });
      };

      for (const check of checks) {
        const id = check.rule.id;
        if (check.line) {
          for (let i = 0; i < code.length; i++) {
            const text = code[i];
            if (text.trim() === "") continue;
            for (const hit of check.line({
              app,
              repoRoot,
              file: src.file,
              ext: src.ext,
              code: text,
              raw: raw[i],
              index: i,
              codeLines: code,
            })) {
              push(id, i, hit);
            }
          }
        }
        if (check.file) {
          for (const hit of check.file({ app, repoRoot, file: src.file, ext: src.ext, codeLines: code, rawLines: raw })) {
            push(id, hit.line, hit);
          }
        }
      }
    }
  }

  const order = new Map(ALL_APPS.map((a, i) => [a, i]));
  findings.sort(
    (a, b) =>
      (order.get(a.app) ?? 0) - (order.get(b.app) ?? 0) ||
      a.file.localeCompare(b.file) ||
      a.line - b.line ||
      a.column - b.column,
  );

  return {
    generatedAt: new Date().toISOString(),
    scanned,
    rules: RULES,
    findings,
  };
}
