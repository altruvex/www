"use client";

import { DataTable, type Column } from "@/components/os/data-table";
import { StatusPill, ToneBadge } from "@/components/ui/badge";
import { money, date, dueLabel, when } from "@/lib/format";
import { statusOf, type Tone } from "@/lib/status";

export interface ProjectRow {
  id: string;
  name: string;
  clientId: string;
  clientName: string;
  phase: string;
  status: string;
  health: "healthy" | "atRisk" | "blocked" | "completed";
  targetLaunchDate: string | null;
  actualLaunchDate: string | null;
  stagingUrl: string | null;
  liveUrl: string | null;
  contractValue: number;
  currency: string;
  billedTotal: number;
  collected: number;
  hasOverduePayment: boolean;
  createdAt: string;
}

const HEALTH: Record<ProjectRow["health"], { label: string; tone: Tone }> = {
  healthy: { label: "Healthy", tone: "success" },
  atRisk: { label: "At risk", tone: "warning" },
  blocked: { label: "Blocked", tone: "danger" },
  completed: { label: "Completed", tone: "neutral" },
};

export function ProjectsTable({ rows }: { rows: ProjectRow[] }) {
  const columns: Column<ProjectRow>[] = [
    {
      id: "name",
      header: "Project",
      hideable: false,
      cell: (row) => (
        <span className="min-w-0">
          <span className="block truncate">{row.name}</span>
          <span className="block truncate text-meta font-normal text-subtle-foreground">
            {row.clientName}
          </span>
        </span>
      ),
      sortValue: (row) => row.name.toLowerCase(),
      searchValue: (row) => `${row.name} ${row.clientName} ${row.phase}`,
    },
    {
      id: "health",
      header: "Health",
      width: "112px",
      cell: (row) => <ToneBadge tone={HEALTH[row.health].tone}>{HEALTH[row.health].label}</ToneBadge>,
      sortValue: (row) => ["blocked", "atRisk", "healthy", "completed"].indexOf(row.health),
      searchValue: (row) => HEALTH[row.health].label,
    },
    {
      id: "phase",
      header: "Phase",
      width: "140px",
      cell: (row) => <StatusPill registry="projectPhase" value={row.phase} variant="dot" />,
      sortValue: (row) => row.phase,
      searchValue: (row) => statusOf("projectPhase", row.phase).label,
    },
    {
      id: "launch",
      header: "Launch",
      width: "140px",
      cell: (row) =>
        row.actualLaunchDate ? (
          <span className="text-success">Launched {date(row.actualLaunchDate)}</span>
        ) : row.targetLaunchDate ? (
          <span
            className={
              new Date(row.targetLaunchDate) < new Date() ? "text-danger" : "text-muted-foreground"
            }
          >
            {dueLabel(row.targetLaunchDate)}
          </span>
        ) : (
          <span className="text-subtle-foreground">No date set</span>
        ),
      sortValue: (row) =>
        row.targetLaunchDate ? new Date(row.targetLaunchDate).getTime() : Number.MAX_SAFE_INTEGER,
      minWidth: "lg",
    },
    {
      id: "billing",
      header: "Collected",
      width: "168px",
      cell: (row) => {
        const pct = row.billedTotal ? Math.round((row.collected / row.billedTotal) * 100) : 0;
        return (
          <span className="flex items-center gap-2">
            <span className="h-1 w-12 overflow-hidden rounded-full bg-surface-2">
              <span
                className={row.hasOverduePayment ? "block h-full bg-danger" : "block h-full bg-success"}
                style={{ width: `${pct}%` }}
              />
            </span>
            <span className="font-mono text-micro tabular-nums text-muted-foreground">
              {money(row.collected, row.currency, { compact: true })} / {money(row.billedTotal, row.currency, { compact: true })}
            </span>
          </span>
        );
      },
      sortValue: (row) => (row.billedTotal ? row.collected / row.billedTotal : 0),
      minWidth: "lg",
    },
    {
      id: "value",
      header: "Contract",
      width: "112px",
      align: "end",
      mono: true,
      cell: (row) => money(row.contractValue, row.currency),
      sortValue: (row) => row.contractValue,
      minWidth: "xl",
      defaultHidden: true,
    },
    {
      id: "created",
      header: "Started",
      width: "104px",
      align: "end",
      cell: (row) => (
        <span className="font-mono text-meta tabular-nums text-muted-foreground">
          {when(row.createdAt)}
        </span>
      ),
      sortValue: (row) => new Date(row.createdAt).getTime(),
    },
  ];

  return (
    <DataTable
      tableId="projects"
      rows={rows}
      columns={columns}
      rowKey={(row) => row.id}
      rowHref={(row) => `/projects/${row.id}`}
      searchPlaceholder="Search projects and clients…"
      initialSort={{ columnId: "health", dir: "asc" }}
      mobile={{ title: "name", subtitle: "phase", meta: ["health", "launch", "billing", "created"] }}
      empty={<div className="plane px-6 py-12 text-center text-muted-foreground">No projects.</div>}
    />
  );
}
