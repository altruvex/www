"use me";
"use client";

import * as React from "react";
import {
  Sparkles,
  Zap,
  Play,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ArrowRight,
  RefreshCw,
  Power,
  Layers,
} from "lucide-react";
import { DataTable, type Column } from "@/components/os/data-table";
import { ToneBadge } from "@/components/ui/badge";
import { dateTime, when } from "@/lib/format";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { segmentClass } from "@/components/ui/segmented-control";

export interface AutomationRule {
  id: string;
  name: string;
  description: string;
  trigger: string;
  condition: string;
  actions: string[];
  enabled: boolean;
  runCount: number;
  lastRunAt: string | null;
  category: "sales" | "crm" | "finance" | "delivery";
}

export interface AutomationRun {
  id: string;
  ruleId: string;
  ruleName: string;
  trigger: string;
  targetEntity: string;
  status: "SUCCESS" | "FAILED" | "PENDING";
  latencyMs: number;
  executedAt: string;
}

export function AutomationsClient({
  initialRules,
  initialRuns,
}: {
  initialRules: AutomationRule[];
  initialRuns: AutomationRun[];
}) {
  const [rules, setRules] = React.useState<AutomationRule[]>(initialRules);
  const [runs, setRuns] = React.useState<AutomationRun[]>(initialRuns);
  const [activeTab, setActiveTab] = React.useState<"rules" | "history">("rules");

  const toggleRule = (ruleId: string) => {
    setRules((prev) =>
      prev.map((r) => {
        if (r.id === ruleId) {
          const next = !r.enabled;
          toast.success(`Automation ${r.name} is now ${next ? "active" : "paused"}`);
          return { ...r, enabled: next };
        }
        return r;
      })
    );
  };

  const testRunRule = (rule: AutomationRule) => {
    const newRun: AutomationRun = {
      id: `run-${Date.now()}`,
      ruleId: rule.id,
      ruleName: rule.name,
      trigger: rule.trigger,
      targetEntity: "Manual Simulation Trigger",
      status: "SUCCESS",
      latencyMs: Math.floor(Math.random() * 120) + 40,
      executedAt: new Date().toISOString(),
    };

    setRuns((prev) => [newRun, ...prev]);
    setRules((prev) =>
      prev.map((r) =>
        r.id === rule.id
          ? { ...r, runCount: r.runCount + 1, lastRunAt: new Date().toISOString() }
          : r
      )
    );
    toast.success(`Executed automation: ${rule.name}`);
  };

  const runColumns: Column<AutomationRun>[] = [
    {
      id: "rule",
      header: "Automation Rule",
      hideable: false,
      cell: (row) => (
        <span className="min-w-0">
          <span className="block truncate font-medium text-foreground">{row.ruleName}</span>
          <span className="block font-mono text-micro text-subtle-foreground">{row.trigger}</span>
        </span>
      ),
      sortValue: (row) => row.ruleName,
      searchValue: (row) => `${row.ruleName} ${row.trigger} ${row.targetEntity}`,
    },
    {
      id: "target",
      header: "Target Entity",
      cell: (row) => (
        <span className="truncate font-mono text-meta text-muted-foreground">{row.targetEntity}</span>
      ),
    },
    {
      id: "status",
      header: "Status",
      width: "110px",
      cell: (row) => (
        <ToneBadge tone={row.status === "SUCCESS" ? "success" : row.status === "FAILED" ? "danger" : "warning"}>
          {row.status.toLowerCase()}
        </ToneBadge>
      ),
      sortValue: (row) => row.status,
    },
    {
      id: "latency",
      header: "Duration",
      width: "110px",
      align: "end",
      mono: true,
      cell: (row) => <span className="text-muted-foreground">{row.latencyMs}ms</span>,
      sortValue: (row) => row.latencyMs,
    },
    {
      id: "executedAt",
      header: "Executed",
      width: "140px",
      mono: true,
      cell: (row) => (
        <span className="text-subtle-foreground" title={dateTime(row.executedAt)}>
          {when(row.executedAt)}
        </span>
      ),
      sortValue: (row) => new Date(row.executedAt).getTime(),
    },
  ];

  const activeRulesCount = rules.filter((r) => r.enabled).length;

  return (
    <div className="space-y-4">
      {/* View Switcher Tabs */}
      <div className="flex items-center justify-between">
        <div role="radiogroup" aria-label="View" className="flex items-center gap-1.5">
          <button
            type="button"
            role="radio"
            aria-checked={activeTab === "rules"}
            onClick={() => setActiveTab("rules")}
            className={cn(segmentClass({ selected: activeTab === "rules" }), "whitespace-nowrap")}
          >
            <Zap className="size-3.5" />
            <span>Active Rules</span>
            <span className="rounded-full bg-surface-2 px-1.5 font-mono text-micro tabular-nums text-muted-foreground">
              {activeRulesCount} active
            </span>
          </button>

          <button
            type="button"
            role="radio"
            aria-checked={activeTab === "history"}
            onClick={() => setActiveTab("history")}
            className={cn(segmentClass({ selected: activeTab === "history" }), "whitespace-nowrap")}
          >
            <Clock className="size-3.5" />
            <span>Execution Log</span>
            <span className="rounded-full bg-surface-2 px-1.5 font-mono text-micro tabular-nums text-muted-foreground">
              {runs.length}
            </span>
          </button>
        </div>
      </div>

      {activeTab === "rules" ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {rules.map((rule) => (
            <div
              key={rule.id}
              className={cn(
                "rounded-xl border bg-card p-5 space-y-4 transition-all shadow-2xs",
                rule.enabled ? "border-border" : "border-border/60 opacity-70 bg-surface/30"
              )}
            >
              {/* Card Header */}
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-md text-foreground">{rule.name}</span>
                    <ToneBadge tone={rule.enabled ? "success" : "neutral"}>
                      {rule.enabled ? "Active" : "Paused"}
                    </ToneBadge>
                  </div>
                  <p className="text-meta text-muted-foreground leading-relaxed">
                    {rule.description}
                  </p>
                </div>

                {/* Power Toggle Button */}
                <button
                  onClick={() => toggleRule(rule.id)}
                  title={rule.enabled ? "Pause automation" : "Activate automation"}
                  className={cn(
                    "flex size-8 shrink-0 items-center justify-center rounded-lg border transition-colors cursor-pointer",
                    rule.enabled
                      ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20 hover:bg-emerald-500/20"
                      : "bg-muted text-muted-foreground border-border hover:bg-surface"
                  )}
                >
                  <Power className="size-4" />
                </button>
              </div>

              {/* Trigger & Condition Box */}
              <div className="rounded-lg border border-border/70 bg-surface/40 p-3 space-y-2 text-meta">
                <div className="flex items-baseline gap-2">
                  <span className="font-mono text-micro uppercase tracking-wider text-muted-foreground font-semibold">
                    Trigger:
                  </span>
                  <code className="font-mono text-micro text-brand bg-brand-soft/20 px-1.5 py-0.5 rounded">
                    {rule.trigger}
                  </code>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="font-mono text-micro uppercase tracking-wider text-muted-foreground font-semibold">
                    Condition:
                  </span>
                  <span className="text-muted-foreground">{rule.condition}</span>
                </div>
              </div>

              {/* Action Steps */}
              <div className="space-y-1.5">
                <span className="font-mono text-micro uppercase tracking-wider text-muted-foreground font-semibold block">
                  Actions Executed:
                </span>
                <ul className="space-y-1">
                  {rule.actions.map((act, i) => (
                    <li key={i} className="flex items-center gap-2 text-meta text-foreground">
                      <span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand font-mono text-micro font-bold">
                        {i + 1}
                      </span>
                      <span>{act}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Card Footer */}
              <div className="border-t border-border/60 pt-3 flex items-center justify-between text-meta text-muted-foreground">
                <div className="flex items-center gap-3">
                  <span>
                    Executed: <strong className="font-mono text-foreground">{rule.runCount}</strong> times
                  </span>
                  {rule.lastRunAt && (
                    <span className="font-mono">
                      Last: {when(rule.lastRunAt)}
                    </span>
                  )}
                </div>

                <Button variant="link" size="sm" className="px-0" onClick={() => testRunRule(rule)}>
                  <Play />
                  Test run
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <DataTable
          tableId="automations-history"
          rows={runs}
          columns={runColumns}
          rowKey={(r) => r.id}
          searchPlaceholder="Search automation runs…"
          empty={<div className="plane px-6 py-12 text-center text-muted-foreground">No execution history recorded.</div>}
        />
      )}
    </div>
  );
}
