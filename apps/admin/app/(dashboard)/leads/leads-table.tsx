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
  MessageCircle,
  Phone,
  PhoneOutgoing,
  Trash2,
  UserRound,
  XCircle,
} from "lucide-react";
import { DataTable, type Column } from "@/components/os/data-table";
import { RowActions, useRecordDelete } from "@/components/os/delete-record";
import { StatusPill } from "@/components/ui/badge";
import { Avatar, DropdownMenuItem, Hint } from "@repo/ui";
import { ConfirmDialog } from "@/components/os/confirm-dialog";
import { inspectHref } from "@/components/os/inspect-sheet";
import {
  InlineSelect,
  type InlineCommitResult,
} from "@/components/os/inline-select";
import { cn } from "@/lib/utils";
import { when, phone as fmtPhone, money } from "@/lib/format";
import { optionsOf, statusOf, WRITABLE_STATUSES } from "@/lib/status";
import { scoreTone } from "@/lib/lead-score";
import {
  bulkChangeClientStatus,
  changeClientPriority,
  changeClientStatus,
} from "@/app/(dashboard)/_actions/clients";

const STATUS_OPTIONS = optionsOf("submissionStatus").filter((o) =>
  WRITABLE_STATUSES.has(o.value),
);
const PRIORITY_OPTIONS = optionsOf("priority");

async function commit(
  run: Promise<{ ok: boolean; message?: string }>,
): Promise<InlineCommitResult> {
  const result = await run;
  return {
    ok: result.ok,
    message: result.message ?? (result.ok ? "Saved." : "Nothing was changed."),
  };
}

export interface LeadRow {
  id: string;
  name: string | null;
  company: string | null;
  phone: string;
  email: string | null;
  industry: string | null;
  source: string;
  status: string;
  priority: string;
  createdAt: string;
  updatedAt: string;
  budget: string | null;
  timeline: string | null;
  serviceInterest: string | null;
  utmSource: string | null;
  estimateMin: number | null;
  estimateMax: number | null;
  stage: string;
  score: number;
  scoreReasons: string[];
  messageCount: number;
  inboundCount: number;
}

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
  const [losingOne, setLosingOne] = React.useState<{
    row: LeadRow;
    settle: (result: InlineCommitResult) => void;
  } | null>(null);

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
            onRun: (selected: LeadRow[]) => setLosing(selected),
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
              del.request(
                selected.map((row) => ({
                  id: row.id,
                  label: row.company || row.name || row.phone,
                })),
              ),
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
          <Avatar name={row.company ?? row.name ?? row.phone} size="sm" />
          <span className="truncate">
            {row.company || row.name || "Unnamed"}
          </span>
        </span>
      ),
      sortValue: (row) => (row.company || row.name || "").toLowerCase(),
      searchValue: (row) =>
        [row.company, row.name, row.phone, row.email, row.industry]
          .filter(Boolean)
          .join(" "),
    },
    {
      id: "score",
      header: "Score",
      width: "76px",
      cell: (row) => (
        <Hint
          label={
            <span className="block space-y-0.5">
              <span className="block font-medium">
                How this score was built
              </span>
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
            <span className="font-mono text-meta tabular-nums">
              {row.score}
            </span>
          </span>
        </Hint>
      ),
      sortValue: (row) => row.score,
    },
    {
      id: "status",
      header: "Status",
      width: "120px",
      cell: (row) =>
        canEdit && WRITABLE_STATUSES.has(row.status) ? (
          <InlineSelect
            ariaLabel={`Status for ${row.company || row.name || row.phone}`}
            value={row.status}
            options={STATUS_OPTIONS}
            display={(value) => (
              <StatusPill
                registry="submissionStatus"
                value={value}
                variant="dot"
              />
            )}
            onCommit={(next) =>
              next === "LOST"
                ? new Promise<InlineCommitResult>((settle) =>
                    setLosingOne({ row, settle }),
                  )
                : commit(changeClientStatus(row.id, next))
            }
          />
        ) : (
          <StatusPill
            registry="submissionStatus"
            value={row.status}
            variant="dot"
          />
        ),
      sortValue: (row) => row.status,
      searchValue: (row) => statusOf("submissionStatus", row.status).label,
    },
    {
      id: "priority",
      header: "Priority",
      width: "96px",
      cell: (row) =>
        canEdit ? (
          <InlineSelect
            ariaLabel={`Priority for ${row.company || row.name || row.phone}`}
            value={row.priority}
            options={PRIORITY_OPTIONS}
            display={(value) => (
              <StatusPill registry="priority" value={value} variant="dot" />
            )}
            onCommit={(next) => commit(changeClientPriority(row.id, next))}
          />
        ) : (
          <StatusPill registry="priority" value={row.priority} variant="dot" />
        ),
      sortValue: (row) =>
        ["LOW", "MEDIUM", "HIGH", "URGENT"].indexOf(row.priority),
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
      minWidth: "lg",
    },
    {
      id: "budget",
      header: "Budget",
      width: "116px",
      cell: (row) =>
        row.budget ? (
          <span className="text-muted-foreground">
            {statusOf("budgetRange", row.budget).label}
          </span>
        ) : row.estimateMax ? (
          <Hint label="From the public estimator, not a stated budget">
            <span className="font-mono text-meta tabular-nums text-muted-foreground">
              ~{money(row.estimateMax, "EGP", { compact: true })}
            </span>
          </Hint>
        ) : (
          <span className="text-subtle-foreground">—</span>
        ),
      sortValue: (row) => row.estimateMax ?? 0,
      minWidth: "xl",
    },
    {
      id: "timeline",
      header: "Timeline",
      width: "104px",
      cell: (row) =>
        row.timeline ? (
          <StatusPill
            registry="projectTimeline"
            value={row.timeline}
            variant="dot"
          />
        ) : (
          <span className="text-subtle-foreground">—</span>
        ),
      sortValue: (row) =>
        ["IMMEDIATE", "SOON", "PLANNING", "EXPLORING"].indexOf(
          row.timeline ?? "EXPLORING",
        ),
      minWidth: "xl",
      defaultHidden: true,
    },
    {
      id: "phone",
      header: "Phone",
      width: "148px",
      mono: true,
      cell: (row) => (
        <a
          href={`tel:${row.phone}`}
          className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-brand"
        >
          <Phone className="size-3" aria-hidden />
          {fmtPhone(row.phone)}
        </a>
      ),
      searchValue: (row) => row.phone,
      minWidth: "xl",
    },
    {
      id: "messages",
      header: "Replies",
      width: "64px",
      align: "end",
      cell: (row) =>
        row.inboundCount > 0 ? (
          <Hint
            label={`${row.inboundCount} from the client of ${row.messageCount} total`}
          >
            <span className="inline-flex items-center gap-1 font-mono text-meta tabular-nums text-muted-foreground">
              <MessageCircle className="size-3" aria-hidden />
              {row.inboundCount}
            </span>
          </Hint>
        ) : (
          <span className="text-subtle-foreground">—</span>
        ),
      sortValue: (row) => row.inboundCount,
      defaultHidden: true,
    },
    {
      id: "age",
      header: "Arrived",
      width: "112px",
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
    <>
      <DataTable
        tableId="leads"
        rows={rows}
        columns={columns}
        rowKey={(row) => row.id}
        onRowClick={(row) =>
          router.push(inspectHref(pathname, searchParams, row.id), {
            scroll: false,
          })
        }
        searchPlaceholder="Search leads by name, company, phone…"
        initialSort={{ columnId: "score", dir: "desc" }}
        selectable={bulkActions.length > 0}
        selectionNoun="lead"
        mobile={{
          title: "name",
          subtitle: "phone",
          meta: ["status", "score", "source", "age"],
        }}
        bulkActions={bulkActions}
        rowActions={
          hasRowActions
            ? (row) => (
                <RowActions
                  onDelete={
                    canDelete
                      ? () =>
                          del.request({
                            id: row.id,
                            label: row.company || row.name || row.phone,
                          })
                      : undefined
                  }
                >
                  {canEdit &&
                    row.status !== "CONTACTED" &&
                    row.status !== "QUALIFIED" && (
                      <DropdownMenuItem
                        onSelect={() => markOne(row, "CONTACTED")}
                      >
                        <PhoneOutgoing className="size-3.5" />
                        Mark contacted
                      </DropdownMenuItem>
                    )}
                  {canEdit && row.status !== "QUALIFIED" && (
                    <DropdownMenuItem
                      onSelect={() => markOne(row, "QUALIFIED")}
                    >
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
        open={losingOne !== null}
        onOpenChange={(open) => {
          if (!open && losingOne) {
            losingOne.settle({ ok: true, message: "Nothing changed." });
            setLosingOne(null);
          }
        }}
        tone="danger"
        title="Mark this lead lost?"
        consequence="It leaves the open leads. Its history stays, and the status can be changed back from the client page."
        confirmLabel="Mark lost"
        onConfirm={async () => {
          if (!losingOne) return;
          const { row, settle } = losingOne;
          const result = await changeClientStatus(row.id, "LOST");
          if (result.ok) {
            settle({ ok: true, message: result.message ?? "Saved." });
            setLosingOne(null);
            return;
          }
          return result;
        }}
      />
      <ConfirmDialog
        open={losing !== null}
        onOpenChange={(open) => !open && setLosing(null)}
        tone="danger"
        title={`Mark ${losing?.length ?? 0} lead${losing?.length === 1 ? "" : "s"} lost?`}
        consequence="They leave the open leads. Their history stays, and the status can be changed back from the client page."
        confirmLabel="Mark lost"
        onConfirm={async () => {
          const result = await bulkChangeClientStatus(
            (losing ?? []).map((r) => r.id),
            "LOST",
          );
          if (result.ok) {
            setLosing(null);
            router.refresh();
          }
          return result;
        }}
      />
    </>
  );
}
