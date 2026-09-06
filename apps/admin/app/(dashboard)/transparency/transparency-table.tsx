"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { UserPlus } from "lucide-react";
import { DataTable, type Column } from "@/components/os/data-table";
import { Button } from "@repo/ui";
import { money, when, phone as fmtPhone } from "@/lib/format";
import { convertEstimateToClient } from "@/app/(dashboard)/_actions/records";

export interface EstimateRow {
  id: string;
  name: string | null;
  phone: string;
  projectType: string;
  complexity: string;
  timeline: string;
  priceMin: number;
  priceMax: number;
  weeksMin: number;
  weeksMax: number;
  createdAt: string;
  convertedAt: string | null;
  clientId: string | null;
}

export function TransparencyTable({ rows }: { rows: EstimateRow[] }) {
  const router = useRouter();
  const [busyId, setBusyId] = React.useState<string | null>(null);

  const columns: Column<EstimateRow>[] = [
    {
      id: "who",
      header: "Who",
      hideable: false,
      cell: (row) => <span className="truncate">{row.name || fmtPhone(row.phone)}</span>,
      sortValue: (row) => (row.name ?? row.phone).toLowerCase(),
      searchValue: (row) => `${row.name ?? ""} ${row.phone} ${row.projectType}`,
    },
    {
      id: "project",
      header: "Project",
      width: "150px",
      cell: (row) => (
        <span className="truncate text-muted-foreground">
          {row.projectType}
          <span className="ms-1.5 text-subtle-foreground">{row.complexity}</span>
        </span>
      ),
      sortValue: (row) => row.projectType,
    },
    {
      id: "quote",
      header: "Quoted",
      width: "158px",
      align: "end",
      mono: true,
      cell: (row) => `${money(row.priceMin)} – ${money(row.priceMax)}`,
      sortValue: (row) => (row.priceMin + row.priceMax) / 2,
    },
    {
      id: "weeks",
      header: "Weeks",
      width: "80px",
      align: "end",
      mono: true,
      cell: (row) => `${row.weeksMin}–${row.weeksMax}`,
      sortValue: (row) => row.weeksMin,
      minWidth: "xl",
    },
    {
      id: "timeline",
      header: "Urgency",
      width: "116px",
      cell: (row) => <span className="text-muted-foreground">{row.timeline}</span>,
      sortValue: (row) => row.timeline,
      minWidth: "xl",
      defaultHidden: true,
    },
    {
      id: "converted",
      header: "Lead",
      width: "116px",
      hideable: false,
      cell: (row) =>
        row.clientId ? (
          <span className="text-success">Converted</span>
        ) : (
          <Button
            size="sm"
            variant="outline"
            disabled={busyId === row.id}
            onClick={async (e) => {
              e.preventDefault();
              e.stopPropagation();
              setBusyId(row.id);
              try {
                const result = await convertEstimateToClient(row.id);
                toast.success(result.created ? "Lead created" : "Linked to an existing client");
                router.push(`/clients/${result.clientId}`);
              } catch (error) {
                toast.error("Could not convert", {
                  description: error instanceof Error ? error.message : "Unknown error",
                });
                setBusyId(null);
              }
            }}
          >
            <UserPlus className="size-3" />
            Convert
          </Button>
        ),
      sortValue: (row) => (row.clientId ? 1 : 0),
    },
    {
      id: "at",
      header: "Completed",
      width: "100px",
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
      tableId="transparency"
      rows={rows}
      columns={columns}
      rowKey={(row) => row.id}
      // Only converted estimates have somewhere to go; the rest are not links.
      rowHref={(row) => (row.clientId ? `/clients/${row.clientId}` : undefined)}
      searchPlaceholder="Search estimates…"
      initialSort={{ columnId: "at", dir: "desc" }}
      mobile={{ title: "who", subtitle: "project", meta: ["quote", "weeks", "converted", "at"] }}
      empty={<div className="plane px-6 py-12 text-center text-muted-foreground">No estimates.</div>}
    />
  );
}
