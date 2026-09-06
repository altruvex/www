"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CheckCircle2, MessageCircle, Phone, XCircle } from "lucide-react";
import { DataTable, type Column } from "@/components/os/data-table";
import { StatusPill } from "@/components/ui/badge";
import { Hint } from "@/components/ui/tooltip";
import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { when, phone as fmtPhone, money } from "@/lib/format";
import { statusOf } from "@/lib/status";
import { scoreTone } from "@/lib/lead-score";
import { bulkSetClientStatus } from "@/app/(dashboard)/_actions/records";

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

export function LeadsTable({ rows }: { rows: LeadRow[] }) {
  const router = useRouter();
  const [, startTransition] = React.useTransition();

  function runBulk(status: string, label: string) {
    return (selected: LeadRow[]) => {
      startTransition(async () => {
        try {
          await bulkSetClientStatus(
            selected.map((r) => r.id),
            status,
          );
          toast.success(`${selected.length} lead${selected.length === 1 ? "" : "s"} ${label}`);
          router.refresh();
        } catch (error) {
          toast.error("Could not update", {
            description: error instanceof Error ? error.message : "Unknown error",
          });
        }
      });
    };
  }

  const columns: Column<LeadRow>[] = [
    {
      id: "name",
      header: "Lead",
      hideable: false,
      cell: (row) => (
        <span className="flex items-center gap-2">
          <Avatar name={row.company ?? row.name ?? row.phone} size="sm" />
          <span className="truncate">{row.company || row.name || "Unnamed"}</span>
        </span>
      ),
      sortValue: (row) => (row.company || row.name || "").toLowerCase(),
      searchValue: (row) =>
        [row.company, row.name, row.phone, row.email, row.industry].filter(Boolean).join(" "),
    },
    {
      id: "score",
      header: "Score",
      width: "76px",
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
          </span>
        </Hint>
      ),
      sortValue: (row) => row.score,
    },
    {
      id: "status",
      header: "Status",
      width: "120px",
      cell: (row) => <StatusPill registry="submissionStatus" value={row.status} variant="dot" />,
      sortValue: (row) => row.status,
      searchValue: (row) => statusOf("submissionStatus", row.status).label,
    },
    {
      id: "priority",
      header: "Priority",
      width: "96px",
      cell: (row) => <StatusPill registry="priority" value={row.priority} variant="dot" />,
      sortValue: (row) => ["LOW", "MEDIUM", "HIGH", "URGENT"].indexOf(row.priority),
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
          <span className="text-muted-foreground">{statusOf("budgetRange", row.budget).label}</span>
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
          <StatusPill registry="projectTimeline" value={row.timeline} variant="dot" />
        ) : (
          <span className="text-subtle-foreground">—</span>
        ),
      sortValue: (row) =>
        ["IMMEDIATE", "SOON", "PLANNING", "EXPLORING"].indexOf(row.timeline ?? "EXPLORING"),
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
          <span
            className="inline-flex items-center gap-1 font-mono text-meta tabular-nums text-muted-foreground"
            title={`${row.inboundCount} from the client of ${row.messageCount} total`}
          >
            <MessageCircle className="size-3" aria-hidden />
            {row.inboundCount}
          </span>
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
    <DataTable
      tableId="leads"
      rows={rows}
      columns={columns}
      rowKey={(row) => row.id}
      rowHref={(row) => `/clients/${row.id}`}
      searchPlaceholder="Search leads by name, company, phone…"
      initialSort={{ columnId: "score", dir: "desc" }}
      selectable
      mobile={{ title: "name", subtitle: "phone", meta: ["status", "score", "source", "age"] }}
      bulkActions={[
        {
          label: "Mark contacted",
          icon: CheckCircle2,
          onRun: runBulk("CONTACTED", "marked contacted"),
        },
        {
          label: "Qualify",
          icon: CheckCircle2,
          onRun: runBulk("QUALIFIED", "qualified"),
        },
        {
          label: "Mark lost",
          icon: XCircle,
          destructive: true,
          onRun: runBulk("LOST", "marked lost"),
        },
      ]}
      empty={<div className="plane px-6 py-12 text-center text-muted-foreground">No leads.</div>}
    />
  );
}
