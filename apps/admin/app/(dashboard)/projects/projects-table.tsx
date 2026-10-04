"use client";

import type * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Building2, ListPlus, Pause, Play, Wallet } from "lucide-react";
import { DropdownMenuItem } from "@repo/ui";

import { DataTable, type BulkAction, type Column } from "@/components/os/data-table";
import { EntityLink } from "@/components/os/entity-link";
import { InlineSelect } from "@/components/os/inline-select";
import { RowActions, useRecordDelete } from "@/components/os/delete-record";
import { StatusPill, ToneBadge } from "@/components/ui/badge";
import { reportOutcome, runPerRow } from "@/lib/bulk-outcome";
import { money, date, dueLabel, when } from "@/lib/format";
import { optionsOf, statusOf, type Tone } from "@/lib/status";
import { changeProjectHold, changeProjectPhase } from "@/app/(dashboard)/_actions/inline-edit";

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
  contractValue: number | null;
  currency: string;
  billedTotal: number;
  collected: number;
  hasOverduePayment: boolean;
  createdAt: string;
  recorded: boolean;
}

const HEALTH: Record<ProjectRow["health"], { label: string; tone: Tone }> = {
  healthy: { label: "Healthy", tone: "success" },
  atRisk: { label: "At risk", tone: "warning" },
  blocked: { label: "Blocked", tone: "danger" },
  completed: { label: "Completed", tone: "neutral" },
};

export function ProjectsTable({
  rows,
  showMoney,
  canDelete,
  canEdit = false,
  canOpenClient = false,
  canAddTask = false,
  canOpenPayments = false,
  toolbar,
}: {
  rows: ProjectRow[];
  showMoney: boolean;
  canDelete: boolean;
  canEdit?: boolean;
  canOpenClient?: boolean;
  canAddTask?: boolean;
  canOpenPayments?: boolean;
  toolbar?: React.ReactNode;
}) {
  const del = useRecordDelete({ entity: "project" });
  const router = useRouter();

  async function setHold(row: ProjectRow, status: "ACTIVE" | "ON_HOLD") {
    const result = await changeProjectHold(row.id, status);
    if (!result.ok) toast.error(result.message);
    else if (result.message === "Nothing changed.") toast(result.message);
    else {
      toast.success(result.message);
      router.refresh();
    }
  }

  async function bulkHold(selected: ProjectRow[], status: "ACTIVE" | "ON_HOLD") {
    const outcome = await runPerRow(
      selected,
      (row) => row.name,
      async (row) => {
        const result = await changeProjectHold(row.id, status);
        return { ...result, unchanged: result.ok && result.message === "Nothing changed." };
      },
    );
    if (outcome.done > 0) router.refresh();
    return reportOutcome(outcome, {
      done: (n) => `${n} project${n === 1 ? "" : "s"} ${status === "ON_HOLD" ? "put on hold" : "resumed"}`,
      unchanged: (n) => `${n} already ${status === "ON_HOLD" ? "on hold" : "active"}`,
    });
  }
  const bulkActions: BulkAction<ProjectRow>[] = canEdit
    ? [
        { label: "Put on hold", icon: Pause, onRun: (selected) => bulkHold(selected, "ON_HOLD") },
        { label: "Resume", icon: Play, onRun: (selected) => bulkHold(selected, "ACTIVE") },
      ]
    : [];

  const allColumns: Column<ProjectRow>[] = [
    {
      id: "name",
      header: "Project",
      hideable: false,
      cell: (row) => <span className="block truncate">{row.name}</span>,
      sortValue: (row) => row.name.toLowerCase(),
      searchValue: (row) => `${row.name} ${row.clientName} ${row.phase}`,
    },
    {
      id: "client",
      header: "Client",
      width: "180px",
      cell: (row) => (
        <EntityLink type="client" id={row.clientId} muted className="block truncate">
          {row.clientName}
        </EntityLink>
      ),
      sortValue: (row) => row.clientName.toLowerCase(),
      searchValue: (row) => row.clientName,
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
      cell: (row) =>
        canEdit ? (
          <InlineSelect
            ariaLabel={`Phase for ${row.name}`}
            value={row.phase}
            options={optionsOf("projectPhase")}
            display={(value) => <StatusPill registry="projectPhase" value={value} variant="dot" />}
            onCommit={(next) => changeProjectPhase(row.id, next)}
          />
        ) : (
          <StatusPill registry="projectPhase" value={row.phase} variant="dot" />
        ),
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
      cell: (row) =>
        row.recorded ? (
          <span className="text-meta text-muted-foreground">Recorded</span>
        ) : (
          <span className="font-mono text-meta tabular-nums text-muted-foreground">
            {when(row.createdAt)}
          </span>
        ),
      sortValue: (row) => new Date(row.createdAt).getTime(),
    },
  ];

  const MONEY = new Set(["billing", "value"]);
  const columns = showMoney ? allColumns : allColumns.filter((c) => !MONEY.has(c.id));

  return (
    <>
      <DataTable
        tableId="projects"
        rows={rows}
        columns={columns}
        rowKey={(row) => row.id}
        rowHref={(row) => `/projects/${row.id}`}
        searchPlaceholder="Search projects and clients…"
        initialSort={{ columnId: "health", dir: "asc" }}
        toolbar={toolbar}
        selectable={bulkActions.length > 0}
        selectionNoun="project"
        bulkActions={bulkActions}
        mobile={{
          title: "name",
          subtitle: "client",
          meta: showMoney ? ["health", "phase", "launch", "billing"] : ["health", "phase", "launch"],
        }}
        rowActions={
          canDelete || canEdit || canOpenClient || canAddTask || canOpenPayments
            ? (row) => {
                const live = row.status === "ACTIVE" || row.status === "ON_HOLD";
                return (
                  <RowActions
                    onDelete={canDelete ? () => del.request({ id: row.id, label: row.name }) : undefined}
                  >
                    {canOpenClient && (
                      <DropdownMenuItem asChild>
                        <Link href={`/clients/${row.clientId}`}>
                          <Building2 className="size-3.5" />
                          Open client
                        </Link>
                      </DropdownMenuItem>
                    )}
                    {canAddTask && live && (
                      <DropdownMenuItem asChild>
                        <Link href={`/tasks?project=${row.id}&new=task`}>
                          <ListPlus className="size-3.5" />
                          Add a task
                        </Link>
                      </DropdownMenuItem>
                    )}
                    {canEdit && row.status === "ACTIVE" && (
                      <DropdownMenuItem onSelect={() => void setHold(row, "ON_HOLD")}>
                        <Pause className="size-3.5" />
                        Put on hold
                      </DropdownMenuItem>
                    )}
                    {canEdit && row.status === "ON_HOLD" && (
                      <DropdownMenuItem onSelect={() => void setHold(row, "ACTIVE")}>
                        <Play className="size-3.5" />
                        Resume
                      </DropdownMenuItem>
                    )}
                    {canOpenPayments && (
                      <DropdownMenuItem asChild>
                        <Link href={`/payments?project=${row.id}`}>
                          <Wallet className="size-3.5" />
                          Payments
                        </Link>
                      </DropdownMenuItem>
                    )}
                  </RowActions>
                );
              }
            : undefined
        }
        empty={<div className="plane px-6 py-12 text-center text-muted-foreground">No projects.</div>}
      />
      {del.dialog}
    </>
  );
}
