"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { UserPlus } from "lucide-react";
import { DataTable, type Column } from "@/components/os/data-table";
import { StatusPill } from "@/components/ui/badge";
import { Button } from "@repo/ui";
import { when, truncate, phone as fmtPhone } from "@/lib/format";
import { statusOf } from "@/lib/status";
import { convertSubmissionToClient } from "@/app/(dashboard)/_actions/records";

export interface SubmissionRow {
  id: string;
  name: string;
  phone: string;
  message: string;
  serviceInterest: string | null;
  projectTimeline: string | null;
  budget: string | null;
  status: string;
  priority: string;
  locale: string;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  referrer: string | null;
  submittedAt: string;
  viewed: boolean;
  clientId: string | null;
}

export function SubmissionsTable({ rows }: { rows: SubmissionRow[] }) {
  const router = useRouter();
  const [busyId, setBusyId] = React.useState<string | null>(null);

  async function convert(id: string) {
    setBusyId(id);
    try {
      const result = await convertSubmissionToClient(id);
      toast.success(result.created ? "Lead created" : "Linked to the existing client", {
        description: result.created
          ? "The submission is untouched and now referenced by the client."
          : "A client already existed on this phone number, so nothing was duplicated.",
      });
      router.push(`/clients/${result.clientId}`);
    } catch (error) {
      toast.error("Could not convert", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setBusyId(null);
    }
  }

  const columns: Column<SubmissionRow>[] = [
    {
      id: "name",
      header: "From",
      hideable: false,
      cell: (row) => (
        <span className="flex items-center gap-1.5">
          {!row.viewed && (
            <span className="size-1.5 shrink-0 rounded-full bg-info" title="Not opened yet" />
          )}
          <span className="truncate">{row.name}</span>
        </span>
      ),
      sortValue: (row) => row.name.toLowerCase(),
      searchValue: (row) => `${row.name} ${row.phone} ${row.message}`,
    },
    {
      id: "message",
      header: "Message",
      width: "260px",
      cell: (row) => (
        <span className="truncate text-muted-foreground">{truncate(row.message, 110)}</span>
      ),
      minWidth: "md",
    },
    {
      id: "interest",
      header: "Interest",
      width: "148px",
      cell: (row) =>
        row.serviceInterest ? (
          <span className="truncate text-muted-foreground">
            {statusOf("serviceType", row.serviceInterest).label}
          </span>
        ) : (
          <span className="text-subtle-foreground">—</span>
        ),
      sortValue: (row) => row.serviceInterest ?? "",
      minWidth: "xl",
    },
    {
      id: "attribution",
      header: "Attribution",
      width: "160px",
      mono: true,
      cell: (row) =>
        row.utmSource || row.referrer ? (
          <span className="truncate text-subtle-foreground">
            {row.utmSource ?? hostOf(row.referrer)}
            {row.utmCampaign && ` / ${row.utmCampaign}`}
          </span>
        ) : (
          <span className="text-subtle-foreground">direct</span>
        ),
      sortValue: (row) => row.utmSource ?? "",
      searchValue: (row) => `${row.utmSource ?? ""} ${row.utmCampaign ?? ""} ${row.referrer ?? ""}`,
      minWidth: "xl",
      defaultHidden: true,
    },
    {
      id: "status",
      header: "Status",
      width: "128px",
      cell: (row) => <StatusPill registry="submissionStatus" value={row.status} variant="dot" />,
      sortValue: (row) => row.status,
    },
    {
      id: "phone",
      header: "Phone",
      width: "148px",
      mono: true,
      cell: (row) => fmtPhone(row.phone),
      searchValue: (row) => row.phone,
      minWidth: "xl",
      defaultHidden: true,
    },
    {
      id: "convert",
      header: "Lead",
      width: "128px",
      hideable: false,
      cell: (row) =>
        row.clientId ? (
          <span className="text-success">Converted</span>
        ) : (
          <Button
            size="sm"
            variant="outline"
            disabled={busyId === row.id}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              void convert(row.id);
            }}
          >
            <UserPlus className="size-3" />
            Convert
          </Button>
        ),
      sortValue: (row) => (row.clientId ? 1 : 0),
    },
    {
      id: "received",
      header: "Received",
      width: "112px",
      align: "end",
      cell: (row) => (
        <span className="font-mono text-meta tabular-nums text-muted-foreground">
          {when(row.submittedAt)}
        </span>
      ),
      sortValue: (row) => new Date(row.submittedAt).getTime(),
    },
  ];

  return (
    <DataTable
      tableId="submissions"
      rows={rows}
      columns={columns}
      rowKey={(row) => row.id}
      rowHref={(row) => `/submissions/${row.id}`}
      searchPlaceholder="Search the raw messages…"
      initialSort={{ columnId: "received", dir: "desc" }}
      mobile={{ title: "name", subtitle: "message", meta: ["status", "interest", "received"] }}
      empty={<div className="plane px-6 py-12 text-center text-muted-foreground">No submissions.</div>}
    />
  );
}

function hostOf(url: string | null) {
  if (!url) return "direct";
  try {
    return new URL(url).hostname;
  } catch {
    return url.slice(0, 24);
  }
}
