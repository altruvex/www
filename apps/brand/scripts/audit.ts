/**
 * Brand drift audit.
 *   bun scripts/audit.ts [--app www|admin|ui] [--json]
 * Prints rule → count → first file:line hits; exits 1 if any `error` finding.
 */
import { runAudit, type AppName, type Finding, type Rule } from "../lib/audit";

const APPS: readonly AppName[] = ["www", "admin", "ui"];
const FIRST_N = 5;

function parseArgs(argv: readonly string[]): { apps?: AppName[]; json: boolean } {
  const apps: AppName[] = [];
  let json = false;
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--json") json = true;
    else if (arg === "--app" || arg.startsWith("--app=")) {
      const value = arg === "--app" ? argv[++i] : arg.slice("--app=".length);
      for (const v of (value ?? "").split(",")) {
        if (!(APPS as readonly string[]).includes(v)) {
          console.error(`audit: unknown app "${v}" (expected ${APPS.join("|")})`);
          process.exit(2);
        }
        apps.push(v as AppName);
      }
    } else {
      console.error(`audit: unknown argument "${arg}"`);
      process.exit(2);
    }
  }
  return { apps: apps.length > 0 ? apps : undefined, json };
}

function summary(rules: readonly Rule[], findings: readonly Finding[]): string {
  const byRule = new Map<string, Finding[]>();
  for (const f of findings) {
    const list = byRule.get(f.ruleId) ?? [];
    list.push(f);
    byRule.set(f.ruleId, list);
  }
  const rank = { error: 0, warn: 1, info: 2 } as const;
  const lines: string[] = [];
  const sorted = [...rules].sort(
    (a, b) => rank[a.severity] - rank[b.severity] || a.id.localeCompare(b.id),
  );
  for (const rule of sorted) {
    const list = byRule.get(rule.id);
    if (!list) continue;
    lines.push(`${rule.severity.toUpperCase().padEnd(5)} ${rule.id} · ${list.length}  — ${rule.title}`);
    for (const f of list.slice(0, FIRST_N)) {
      lines.push(`        ${f.file}:${f.line}:${f.column}  ${f.match}`);
    }
    if (list.length > FIRST_N) lines.push(`        … ${list.length - FIRST_N} more`);
  }
  return lines.join("\n");
}

async function main(): Promise<void> {
  const { apps, json } = parseArgs(process.argv.slice(2));
  const started = performance.now();
  const report = await runAudit({ apps });
  const ms = Math.round(performance.now() - started);
  const errors = report.findings.filter(
    (f) => report.rules.find((r) => r.id === f.ruleId)?.severity === "error",
  ).length;

  if (json) {
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  } else {
    const files = report.scanned.map((s) => `${s.app} ${s.files}`).join(", ");
    console.log(`brand audit — ${files} files · ${report.findings.length} findings · ${ms} ms\n`);
    console.log(summary(report.rules, report.findings) || "clean");
    console.log(`\n${errors} error(s)`);
  }
  process.exit(errors > 0 ? 1 : 0);
}

void main();
