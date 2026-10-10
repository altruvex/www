"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import {
  BadgeCheck,
  CalendarPlus,
  CheckCircle2,
  FilePlus2,
  Phone,
  PhoneOutgoing,
  Trash2,
  UserRound,
  XCircle,
} from "lucide-react";
import { DataTable, type Column } from "@/components/os/data-table";
import { RowActions, useRecordDelete } from "@/components/os/delete-record";
import { StatusPill, ToneBadge } from "@/components/ui/badge";
import { Avatar, DropdownMenuItem, Hint } from "@repo/ui";
import { ConfirmDialog } from "@/components/os/confirm-dialog";
import { LostReasonFields, useLostInput } from "@/components/os/lost-reason-fields";
import { inspectHref } from "@/components/os/inspect-sheet";
import { cn } from "@/lib/utils";
import { contactLabel, money, phone as fmtPhone, when } from "@/lib/format";
import { workingDueLabel } from "@/lib/working-days";
import { statusOf } from "@/lib/status";
import { scoreTone, type ScoreBand } from "@/lib/lead-score";
import {
  bulkChangeClientStatus,
  changeClientStatus,
} from "@/app/(dashboard)/_actions/clients";
import { HEALTH_DISPLAY, PRIORITY_DISPLAY, SLA_DISPLAY } from "@/components/os/sales-display";
import { WhyHint } from "@/components/os/why-hint";

export type LeadValue =
  | { kind: "quoted"; total: number; currency: string }
  | { kind: "estimate"; min: number; max: number }
  | null;

/** One queue row, already read by the sales engine on the server. */
export interface LeadRow {
  id: string;
  name: string | null;
  company: string | null;
  phone: string | null;
  email: string | null;
  source: string;
  utmSource: string | null;
  status: string;
  /** Derived stage (pipelineStage registry). */
  stage: string;
  /** Still before the proposal, so contact/qualify still apply. */
  isLead: boolean;
  score: number;
  scoreBand: ScoreBand;
  scoreReasons: string[];
  priority: { level: string; why: string[] };
  health: { state: string; why: string[] };
  /** `overdue` is the engine's business-day rule, decided on the server. */
  next: { kind: string; label: string; due: string | null; overdue: boolean };
  sla: { state: string; dueAt: string | null };
  owner: string | null;
  value: LeadValue;
  lastActivityAt: string | null;
  createdAt: string;
  /** Position in the engine order (priority, then due), for the default sort. */
  order: number;
}

const label = (row: LeadRow) => contactLabel(row);

export function LeadsTable({
  rows,
  canEdit,
  canDelete,
  canSchedule,
  canPropose,
  canOpenClient,
}: {
  rows: LeadRow[];
  canEdit: boolean;
  canDelete: boolean;
  canSchedule: boolean;
  canPropose: boolean;
  canOpenClient: boolean;
}) {
  const del = useRecordDelete({ entity: "client" });
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = React.useTransition();
  const [losing, setLosing] = React.useState<LeadRow[] | null>(null);
  const lost = useLostInput();

  function runBulk(status: string) {
    return (selected: LeadRow[]) => {
      startTransition(async () => {
        const result = await bulkChangeClientStatus(
          selected.map((r) => r.id),
          status,
        );
        if (result.ok) {
          toast.success(result.message);
          router.refresh();
        } else {
          toast.error("Nothing was changed", { description: result.message });
        }
      });
    };
  }

  function markOne(row: LeadRow, status: string) {
    startTransition(async () => {
      const result = await changeClientStatus(row.id, status);
      if (result.ok) {
        toast.success(result.message ?? "Saved.");
        router.refresh();
      } else {
        toast.error("Nothing was changed", { description: result.message });
      }
    });
  }

  function askLost(selected: LeadRow[]) {
    lost.reset();
    setLosing(selected);
  }

  const hasRowActions =
    canEdit || canDelete || canSchedule || canPropose || canOpenClient;

  const bulkActions = [
    ...(canEdit
      ? [
          {
            label: "Mark contacted",
            icon: CheckCircle2,
            onRun: runBulk("CONTACTED"),
          },
          { label: "Qualify", icon: CheckCircle2, onRun: runBulk("QUALIFIED") },
          {
            label: "Mark lost",
            icon: XCircle,
            destructive: true,
            onRun: askLost,
          },
        ]
      : []),
    ...(canDelete
      ? [
          {
            label: "Delete",
            icon: Trash2,
            destructive: true,
            onRun: (selected: LeadRow[]) =>
              del.request(selected.map((row) => ({ id: row.id, label: label(row) }))),
          },
        ]
      : []),
  ];

  const columns: Column<LeadRow>[] = [
    {
      id: "name",
      header: "Lead",
      hideable: false,
      cell: (row) => (
        <span className="flex items-center gap-2">
          <Avatar name={contactLabel(row)} size="sm" />
          <span className="truncate">{row.company || row.name || row.email || "Unnamed"}</span>
        </span>
      ),
      sortValue: (row) => (row.company || row.name || "").toLowerCase(),
      searchValue: (row) =>
        [row.company, row.name, row.phone, row.email].filter(Boolean).join(" "),
    },
    {
      id: "stage",
      header: "Stage",
      width: "128px",
      cell: (row) => <StatusPill registry="pipelineStage" value={row.stage} variant="dot" />,
      sortValue: (row) => row.stage,
      searchValue: (row) => statusOf("pipelineStage", row.stage).label,
    },
    {
      id: "priority",
      header: "Priority",
      width: "96px",
      cell: (row) => {
        const p = PRIORITY_DISPLAY[row.priority.level] ?? PRIORITY_DISPLAY.LOW;
        return (
          <WhyHint title={`${p.label} priority`} why={row.priority.why}>
            <ToneBadge tone={p.tone}>{p.label}</ToneBadge>
          </WhyHint>
        );
      },
      // Lower order = earlier in the engine ranking; negate so "desc" reads top-first.
      sortValue: (row) => -row.order,
      searchValue: (row) => PRIORITY_DISPLAY[row.priority.level]?.label ?? "",
    },
    {
      id: "health",
      header: "Health",
      width: "128px",
      cell: (row) => {
        const h = HEALTH_DISPLAY[row.health.state] ?? HEALTH_DISPLAY.HEALTHY;
        return (
          <WhyHint title={h.label} why={row.health.why}>
            <ToneBadge tone={h.tone}>{h.label}</ToneBadge>
          </WhyHint>
        );
      },
      sortValue: (row) =>
        ["STALLED", "AT_RISK", "NEEDS_ATTENTION", "HEALTHY", "CLOSED"].indexOf(row.health.state),
      searchValue: (row) => HEALTH_DISPLAY[row.health.state]?.label ?? "",
    },
    {
      id: "next",
      header: "Next action",
      width: "220px",
      cell: (row) =>
        row.next.kind === "NONE" ? (
          <span className="text-subtle-foreground">—</span>
        ) : (
          <span className="flex min-w-0 flex-col">
            <span className="truncate">{row.next.label}</span>
            {row.next.due && (
              <span
                className={cn(
                  "font-mono text-micro tabular-nums",
                  row.next.overdue
                    ? "text-danger"
                    : "text-muted-foreground",
                )}
              >
                {workingDueLabel(row.next.due)}
              </span>
            )}
          </span>
        ),
      sortValue: (row) => (row.next.due ? new Date(row.next.due).getTime() : Infinity),
      searchValue: (row) => row.next.label,
    },
    {
      id: "owner",
      header: "Owner",
      width: "120px",
      cell: (row) =>
        row.owner ? (
          <span className="truncate text-muted-foreground">{row.owner}</span>
        ) : (
          <span className="text-subtle-foreground">Unassigned</span>
        ),
      sortValue: (row) => row.owner ?? "",
      searchValue: (row) => row.owner ?? "unassigned",
      minWidth: "lg",
    },
    {
      id: "sla",
      header: "Reply",
      width: "120px",
      cell: (row) => {
        const s = SLA_DISPLAY[row.sla.state];
        if (!s) return <span className="text-subtle-foreground">—</span>;
        return (
          <span className="flex flex-col">
            <ToneBadge tone={s.tone}>{s.label}</ToneBadge>
            {row.sla.dueAt && (
              <span className="font-mono text-micro tabular-nums text-muted-foreground">
                {when(row.sla.dueAt)}
              </span>
            )}
          </span>
        );
      },
      sortValue: (row) =>
        SLA_DISPLAY[row.sla.state] && row.sla.dueAt ? new Date(row.sla.dueAt).getTime() : Infinity,
      minWidth: "lg",
    },
    {
      id: "value",
      header: "Value",
      width: "140px",
      cell: (row) =>
        row.value?.kind === "quoted" ? (
          <span className="flex flex-col">
            <span className="font-mono text-meta tabular-nums">
              {money(row.value.total, row.value.currency, { compact: true })}
            </span>
            <span className="text-micro text-muted-foreground">Quoted</span>
          </span>
        ) : row.value?.kind === "estimate" ? (
          <Hint label="What the public estimator showed, not a stated budget or a quote">
            <span tabIndex={0} className="flex flex-col rounded-sm focus-visible:outline-2 focus-visible:outline-ring">
              <span className="font-mono text-meta tabular-nums text-muted-foreground">
                {money(row.value.min, "EGP", { compact: true })}–
                {money(row.value.max, "EGP", { compact: true })}
              </span>
              <span className="text-micro text-muted-foreground">Estimate</span>
            </span>
          </Hint>
        ) : (
          <span className="text-subtle-foreground">—</span>
        ),
      // Quoted and estimated are different claims; sorting only compares the figure.
      sortValue: (row) =>
        row.value?.kind === "quoted" ? row.value.total : row.value?.kind === "estimate" ? row.value.max : 0,
      minWidth: "xl",
    },
    {
      id: "activity",
      header: "Last activity",
      width: "112px",
      align: "end",
      cell: (row) => (
        <Hint label={`Arrived ${when(row.createdAt)}`}>
          <span className="font-mono text-meta tabular-nums text-muted-foreground">
            {row.lastActivityAt ? when(row.lastActivityAt) : "None yet"}
          </span>
        </Hint>
      ),
      sortValue: (row) => new Date(row.lastActivityAt ?? row.createdAt).getTime(),
    },
    {
      id: "score",
      header: "Score",
      width: "150px",
      cell: (row) => (
        <Hint
          label={
            <span className="block space-y-0.5">
              <span className="block font-medium">How this score was built</span>
              {row.scoreReasons.map((reason) => (
                <span key={reason} className="block font-mono text-micro">
                  {reason}
                </span>
              ))}
            </span>
          }
        >
          <span className="inline-flex items-center gap-1.5">
            <span className="h-1 w-8 overflow-hidden rounded-full bg-surface-2">
              <span
                className={cn(
                  "block h-full rounded-full",
                  scoreTone(row.score) === "success"
                    ? "bg-success"
                    : scoreTone(row.score) === "warning"
                      ? "bg-warning"
                      : "bg-neutral",
                )}
                style={{ width: `${row.score}%` }}
              />
            </span>
            <span className="font-mono text-meta tabular-nums">{row.score}</span>
            <span className="truncate text-meta text-muted-foreground">{row.scoreBand}</span>
          </span>
        </Hint>
      ),
      sortValue: (row) => row.score,
      minWidth: "lg",
    },
    {
      id: "source",
      header: "Source",
      width: "128px",
      cell: (row) => (
        <span className="truncate text-muted-foreground">
          {statusOf("clientSource", row.source).label}
          {row.utmSource && (
            <span className="ms-1 font-mono text-micro text-subtle-foreground">
              {row.utmSource}
            </span>
          )}
        </span>
      ),
      sortValue: (row) => row.source,
      searchValue: (row) => `${row.source} ${row.utmSource ?? ""}`,
      minWidth: "xl",
      defaultHidden: true,
    },
    {
      id: "phone",
      header: "Phone",
      width: "148px",
      mono: true,
      cell: (row) =>
        row.phone ? (
          <a
            href={`tel:${row.phone}`}
            className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-brand"
          >
            <Phone className="size-3" aria-hidden />
            {fmtPhone(row.phone)}
          </a>
        ) : (
          <span className="text-subtle-foreground">—</span>
        ),
      searchValue: (row) => row.phone ?? "",
      minWidth: "xl",
      defaultHidden: true,
    },
  ];

  return (
    <>
      <DataTable
        tableId="leads-queue"
        rows={rows}
        columns={columns}
        rowKey={(row) => row.id}
        onRowClick={(row) =>
          router.push(inspectHref(pathname, searchParams, row.id), {
            scroll: false,
          })
        }
        searchPlaceholder="Search leads by name, company, phone, owner…"
        initialSort={{ columnId: "priority", dir: "desc" }}
        selectable={bulkActions.length > 0}
        selectionNoun="lead"
        mobile={{
          title: "name",
          subtitle: "next",
          meta: ["priority", "health", "stage"],
        }}
        bulkActions={bulkActions}
        rowActions={
          hasRowActions
            ? (row) => (
                <RowActions
                  onDelete={
                    canDelete
                      ? () => del.request({ id: row.id, label: label(row) })
                      : undefined
                  }
                >
                  {canEdit &&
                    row.isLead &&
                    row.status !== "CONTACTED" &&
                    row.status !== "QUALIFIED" && (
                      <DropdownMenuItem onSelect={() => markOne(row, "CONTACTED")}>
                        <PhoneOutgoing className="size-3.5" />
                        Mark contacted
                      </DropdownMenuItem>
                    )}
                  {canEdit && row.isLead && row.status !== "QUALIFIED" && (
                    <DropdownMenuItem onSelect={() => markOne(row, "QUALIFIED")}>
                      <BadgeCheck className="size-3.5" />
                      Qualify
                    </DropdownMenuItem>
                  )}
                  {canSchedule && (
                    <DropdownMenuItem asChild>
                      <Link href={`/calendar?new=meeting&client=${row.id}`}>
                        <CalendarPlus className="size-3.5" />
                        Schedule a meeting
                      </Link>
                    </DropdownMenuItem>
                  )}
                  {canPropose && (
                    <DropdownMenuItem asChild>
                      <Link href={`/clients/${row.id}/new-proposal`}>
                        <FilePlus2 className="size-3.5" />
                        New proposal
                      </Link>
                    </DropdownMenuItem>
                  )}
                  {canOpenClient && (
                    <DropdownMenuItem asChild>
                      <Link href={`/clients/${row.id}`}>
                        <UserRound className="size-3.5" />
                        Open client
                      </Link>
                    </DropdownMenuItem>
                  )}
                  {canEdit && row.status !== "LOST" && row.stage !== "SIGNED" && (
                    <DropdownMenuItem onSelect={() => askLost([row])}>
                      <XCircle className="size-3.5" />
                      Mark lost
                    </DropdownMenuItem>
                  )}
                </RowActions>
              )
            : undefined
        }
        empty={
          <div className="plane px-6 py-12 text-center text-muted-foreground">
            No leads.
          </div>
        }
      />
      {del.dialog}
      <ConfirmDialog
        open={losing !== null}
        onOpenChange={(open) => !open && setLosing(null)}
        tone="danger"
        title={
          losing?.length === 1
            ? "Mark this lead lost?"
            : `Mark ${losing?.length ?? 0} leads lost?`
        }
        consequence="They leave the work queue. Their history stays, and the status can be changed back from the client page."
        confirmLabel="Mark lost"
        confirmDisabled={!lost.ready}
        onConfirm={async () => {
          const ids = (losing ?? []).map((r) => r.id);
          const result =
            ids.length === 1
              ? await changeClientStatus(ids[0], "LOST", lost.value)
              : await bulkChangeClientStatus(ids, "LOST", lost.value);
          if (result.ok) {
            setLosing(null);
            toast.success(result.message ?? "Saved.");
            router.refresh();
          }
          return result;
        }}
      >
        <LostReasonFields value={lost.value} onChange={lost.setValue} />
      </ConfirmDialog>
    </>
  );
}
