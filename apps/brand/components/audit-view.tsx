"use client";

import { useMemo, useState } from "react";
import type { AppName, Category, Finding, Rule, Severity } from "@/lib/audit/types";
import { cn } from "@/lib/cn";

export type ViewRule = Rule & { sourceHref: string };
export type ViewFinding = Finding & { href: string };

const SEVERITIES: Severity[] = ["error", "warn", "info"];
const APPS: AppName[] = ["www", "admin", "ui"];

const SEVERITY_TONE: Record<Severity, string> = {
  error: "border-danger/40 text-danger",
  warn: "border-warning/40 text-warning",
  info: "border-border-strong text-muted-foreground",
};

type Grouping = "rule" | "file";

function Toggle<T extends string>({
  label,
  value,
  options,
  onChange,
  count,
  all = true,
}: {
  label: string;
  all?: boolean;
  value: T | "all";
  options: T[];
  onChange: (v: T | "all") => void;
  count?: (v: T) => number;
}): React.ReactElement {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap items-center gap-1">
      <span className="me-2 text-meta text-muted-foreground">{label}</span>
      {((all ? ["all", ...options] : options) as (T | "all")[]).map((o) => (
        <button
          key={o}
          type="button"
          aria-pressed={value === o}
          onClick={() => onChange(o)}
          className={cn(
            "h-8 rounded-ctl-sm border px-3 text-md transition-colors duration-(--motion-hover)",
            value === o
              ? "border-foreground bg-foreground text-background"
              : "border-border-subtle text-muted-foreground hover:border-foreground/45 hover:text-foreground",
          )}
        >
          {o}
          {o !== "all" && count ? <span className="ms-1.5 tabular-nums opacity-70">{count(o)}</span> : null}
        </button>
      ))}
    </div>
  );
}

function SeverityBadge({ severity }: { severity: Severity }): React.ReactElement {
  return (
    <span className={cn("inline-flex h-6 items-center rounded-full border px-2.5 text-meta", SEVERITY_TONE[severity])}>
      {severity}
    </span>
  );
}

/** The snippet with the offending text marked. */
function Snippet({ snippet, match }: { snippet: string; match: string }): React.ReactElement {
  const at = match ? snippet.indexOf(match) : -1;
  if (at === -1) return <code className="break-all text-muted-foreground">{snippet}</code>;
  return (
    <code className="break-all text-muted-foreground">
      {snippet.slice(0, at)}
      <mark className="rounded-ctl-xs bg-warning/20 px-0.5 text-foreground">{match}</mark>
      {snippet.slice(at + match.length)}
    </code>
  );
}

function Row({ f, showRule, rule }: { f: ViewFinding; showRule: boolean; rule?: ViewRule }): React.ReactElement {
  return (
    <li className="grid gap-1.5 border-t border-border-subtle py-3 first:border-t-0">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <a
          href={f.href}
          className="text-md text-foreground underline decoration-border-mid underline-offset-2 hover:decoration-foreground"
        >
          {showRule ? `${f.file}:${f.line}:${f.column}` : `:${f.line}:${f.column}`}
        </a>
        {!showRule && rule && (
          <span className="flex items-center gap-2 text-meta text-muted-foreground">
            <SeverityBadge severity={rule.severity} />
            {rule.title}
          </span>
        )}
        <span className="text-meta text-muted-foreground">{f.app}</span>
      </div>
      <p className="text-meta">
        <Snippet snippet={f.snippet} match={f.match} />
      </p>
    </li>
  );
}

function RuleCard({ rule, findings }: { rule: ViewRule; findings: ViewFinding[] }): React.ReactElement {
  return (
    <article className="rounded-panel-sm border border-border-subtle p-5 sm:p-6">
      <header className="mb-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)] lg:gap-10">
        <div>
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <SeverityBadge severity={rule.severity} />
            <span className="text-meta text-muted-foreground">
              {rule.category} · {rule.id}
            </span>
          </div>
          <h3>{rule.title}</h3>
          <p className="mt-1 text-md tabular-nums text-muted-foreground">
            {findings.length} {findings.length === 1 ? "finding" : "findings"}
          </p>
        </div>
        <dl className="grid gap-2 text-md">
          <div>
            <dt className="text-meta text-muted-foreground">Why</dt>
            <dd>{rule.why}</dd>
          </div>
          <div>
            <dt className="text-meta text-muted-foreground">Fix</dt>
            <dd>{rule.fix}</dd>
          </div>
          <div>
            <dt className="text-meta text-muted-foreground">Source</dt>
            <dd>
              <a
                href={rule.sourceHref}
                className="text-foreground/80 underline decoration-border-mid underline-offset-2 hover:decoration-foreground"
              >
                {rule.source}
              </a>
            </dd>
          </div>
        </dl>
      </header>
      <ul>
        {findings.map((f) => (
          <Row key={`${f.file}:${f.line}:${f.column}`} f={f} showRule />
        ))}
      </ul>
    </article>
  );
}

export function AuditView({
  rules,
  findings,
  scanned,
  generatedAt,
}: {
  rules: ViewRule[];
  findings: ViewFinding[];
  scanned: { app: AppName; files: number }[];
  generatedAt: string;
}): React.ReactElement {
  const [app, setApp] = useState<AppName | "all">("all");
  const [severity, setSeverity] = useState<Severity | "all">("all");
  const [category, setCategory] = useState<Category | "all">("all");
  const [query, setQuery] = useState("");
  const [grouping, setGrouping] = useState<Grouping>("rule");

  const ruleById = useMemo(() => new Map(rules.map((r) => [r.id, r])), [rules]);
  const categories = useMemo(() => [...new Set(rules.map((r) => r.category))], [rules]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return findings.filter((f) => {
      const r = ruleById.get(f.ruleId);
      if (!r) return false;
      if (app !== "all" && f.app !== app) return false;
      if (severity !== "all" && r.severity !== severity) return false;
      if (category !== "all" && r.category !== category) return false;
      if (q && !`${f.file} ${f.snippet} ${r.id} ${r.title}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [findings, ruleById, app, severity, category, query]);

  const bySeverity = (s: Severity): number => findings.filter((f) => ruleById.get(f.ruleId)?.severity === s).length;
  const byApp = (a: AppName): number => findings.filter((f) => f.app === a).length;
  const byCategory = (c: Category): number => findings.filter((f) => ruleById.get(f.ruleId)?.category === c).length;

  const groups = useMemo(() => {
    const map = new Map<string, ViewFinding[]>();
    for (const f of visible) {
      const key = grouping === "rule" ? f.ruleId : f.file;
      map.set(key, [...(map.get(key) ?? []), f]);
    }
    const rank = (id: string): number => SEVERITIES.indexOf(ruleById.get(id)?.severity ?? "info");
    return [...map].sort(([a, fa], [b, fb]) =>
      grouping === "rule" ? rank(a) - rank(b) || fb.length - fa.length : fb.length - fa.length || a.localeCompare(b),
    );
  }, [visible, grouping, ruleById]);

  const clean = rules.filter((r) => !findings.some((f) => f.ruleId === r.id));

  return (
    <div className="space-y-10">
      <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-panel-sm border border-border-subtle bg-border-subtle sm:grid-cols-4">
        {[
          ["Findings", findings.length],
          ["Errors", bySeverity("error")],
          ["Warnings", bySeverity("warn")],
          ["Files scanned", scanned.reduce((n, s) => n + s.files, 0)],
        ].map(([label, n]) => (
          <div key={label} className="bg-background p-4 sm:p-5">
            <dt className="text-meta text-muted-foreground">{label}</dt>
            <dd className="mt-1 text-3xl font-semibold tabular-nums">{n}</dd>
          </div>
        ))}
      </dl>
      <p className="text-meta text-muted-foreground">
        {scanned.map((s) => `${s.app} ${s.files} files`).join(" · ")} · scanned{" "}
        {new Date(generatedAt).toLocaleTimeString("en-GB")}
      </p>

      <div className="space-y-3">
        <Toggle label="Severity" value={severity} options={SEVERITIES} onChange={setSeverity} count={bySeverity} />
        <Toggle label="App" value={app} options={APPS} onChange={setApp} count={byApp} />
        <Toggle label="Category" value={category} options={categories} onChange={setCategory} count={byCategory} />
        <Toggle<Grouping>
          label="Group by"
          value={grouping}
          options={["rule", "file"]}
          all={false}
          onChange={(v) => setGrouping(v === "all" ? "rule" : v)}
        />
        <label className="flex flex-wrap items-center gap-3">
          <span className="text-meta text-muted-foreground">Search</span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="file, class, rule…"
            className="h-8 w-full max-w-sm rounded-ctl-sm border border-foreground/45 bg-transparent px-3 text-md placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          />
        </label>
      </div>

      <p className="text-md text-muted-foreground" aria-live="polite">
        {visible.length} of {findings.length} shown
      </p>

      {groups.length === 0 ? (
        <p className="rounded-panel-sm border border-border-subtle p-6 text-md text-muted-foreground">
          Nothing matches these filters.
        </p>
      ) : grouping === "rule" ? (
        <div className="space-y-6">
          {groups.map(([id, list]) => {
            const rule = ruleById.get(id);
            return rule ? <RuleCard key={id} rule={rule} findings={list} /> : null;
          })}
        </div>
      ) : (
        <div className="space-y-6">
          {groups.map(([file, list]) => (
            <article key={file} className="rounded-panel-sm border border-border-subtle p-5 sm:p-6">
              <h3 className="mb-2 break-all text-lg">{file}</h3>
              <ul>
                {list.map((f) => (
                  <Row key={`${f.ruleId}:${f.line}:${f.column}`} f={f} showRule={false} rule={ruleById.get(f.ruleId)} />
                ))}
              </ul>
            </article>
          ))}
        </div>
      )}

      <section className="border-t border-border-subtle pt-6">
        <h2 className="mb-4">Rules with nothing to report</h2>
        <ul className="grid gap-x-10 gap-y-2 text-md sm:grid-cols-2">
          {clean.map((r) => (
            <li key={r.id} className="flex items-baseline gap-2">
              <span className="text-meta text-muted-foreground">{r.category}</span>
              <span>{r.title}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
