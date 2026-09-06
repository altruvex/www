"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Archive, CheckCircle2 } from "lucide-react";
import { DataTable, type Column } from "@/components/os/data-table";
import { StatusPill } from "@/components/ui/badge";
import { Avatar } from "@repo/ui";
import { money, phone as fmtPhone, when } from "@/lib/format";
import { statusOf } from "@/lib/status";
import { bulkSetClientStatus } from "@/app/(dashboard)/_actions/records";

export interface ClientRow {
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
  stage: string;
  lifetimeValue: number;
  lifetimeCurrency: string;
  mixedCurrency: boolean;
  latestValue: number | null;
  currency: string;
  proposalCount: number;
  contractCount: number;
  projectCount: number;
  messageCount: number;
  activeProject: string | null;
}

export function ClientsTable({ rows }: { rows: ClientRow[] }) {
  const router = useRouter();
  const [, startTransition] = React.useTransition();

  const columns: Column<ClientRow>[] = [
    {
      id: "client",
      header: "Client",
      hideable: false,
      cell: (row) => (
        <span className="flex items-center gap-2">
          <Avatar name={row.company ?? row.name ?? row.phone} size="sm" />
          <span className="min-w-0">
            <span className="block truncate">{row.company || row.name || "Unnamed"}</span>
            {row.company && row.name && (
              <span className="block truncate text-meta font-normal text-subtle-foreground">
                {row.name}
              </span>
            )}
          </span>
        </span>
      ),
      sortValue: (row) => (row.company || row.name || "").toLowerCase(),
      searchValue: (row) =>
        [row.company, row.name, row.phone, row.email, row.industry, row.activeProject]
          .filter(Boolean)
          .join(" "),
    },
    {
      id: "stage",
      header: "Stage",
      width: "132px",
      cell: (row) => <StatusPill registry="pipelineStage" value={row.stage} variant="dot" />,
      sortValue: (row) => row.stage,
      searchValue: (row) => statusOf("pipelineStage", row.stage).label,
    },
    {
      id: "value",
      header: "Latest deal",
      width: "120px",
      align: "end",
      mono: true,
      cell: (row) =>
        row.latestValue ? money(row.latestValue, row.currency) : <span className="text-subtle-foreground">—</span>,
      sortValue: (row) => row.latestValue ?? 0,
    },
    {
      id: "lifetime",
      header: "Accepted",
      width: "120px",
      align: "end",
      mono: true,
      cell: (row) =>
        row.lifetimeValue ? (
          <span
            className="text-success"
            title={row.mixedCurrency ? "This client has accepted work in more than one currency" : undefined}
          >
            {money(row.lifetimeValue, row.lifetimeCurrency)}
            {row.mixedCurrency && <span className="ms-1 text-warning">*</span>}
          </span>
        ) : (
          <span className="text-subtle-foreground">—</span>
        ),
      sortValue: (row) => row.lifetimeValue,
      minWidth: "xl",
    },
    {
      id: "records",
      header: "Records",
      width: "128px",
      cell: (row) => (
        <span className="font-mono text-micro tabular-nums text-muted-foreground">
          {row.proposalCount}P · {row.contractCount}C · {row.projectCount}Pr
        </span>
      ),
      sortValue: (row) => row.proposalCount + row.contractCount + row.projectCount,
      minWidth: "xl",
    },
    {
      id: "project",
      header: "Active project",
      width: "18%",
      cell: (row) =>
        row.activeProject ? (
          <span className="truncate">{row.activeProject}</span>
        ) : (
          <span className="text-subtle-foreground">—</span>
        ),
      sortValue: (row) => row.activeProject ?? "",
      minWidth: "xl",
      defaultHidden: true,
    },
    {
      id: "source",
      header: "Source",
      width: "124px",
      cell: (row) => (
        <span className="truncate text-muted-foreground">
          {statusOf("clientSource", row.source).label}
        </span>
      ),
      sortValue: (row) => row.source,
      minWidth: "lg",
    },
    {
      id: "phone",
      header: "Phone",
      width: "148px",
      mono: true,
      cell: (row) => (
        <a href={`tel:${row.phone}`} className="text-muted-foreground hover:text-brand">
          {fmtPhone(row.phone)}
        </a>
      ),
      searchValue: (row) => row.phone,
      minWidth: "xl",
      defaultHidden: true,
    },
    {
      id: "updated",
      header: "Activity",
      width: "116px",
      align: "end",
      cell: (row) => (
        <span className="font-mono text-meta tabular-nums text-muted-foreground">
          {when(row.updatedAt)}
        </span>
      ),
      sortValue: (row) => new Date(row.updatedAt).getTime(),
    },
  ];

  function runBulk(status: string, label: string) {
    return (selected: ClientRow[]) => {
      startTransition(async () => {
        try {
          await bulkSetClientStatus(selected.map((r) => r.id), status);
          toast.success(`${selected.length} client${selected.length === 1 ? "" : "s"} ${label}`);
          router.refresh();
        } catch (error) {
          toast.error("Could not update", {
            description: error instanceof Error ? error.message : "Unknown error",
          });
        }
      });
    };
  }

  return (
    <DataTable
      tableId="clients"
      rows={rows}
      columns={columns}
      rowKey={(row) => row.id}
      rowHref={(row) => `/clients/${row.id}`}
      searchPlaceholder="Search clients, phones, projects…"
      initialSort={{ columnId: "updated", dir: "desc" }}
      selectable
      mobile={{ title: "client", subtitle: "phone", meta: ["stage", "value", "source", "updated"] }}
      bulkActions={[
        { label: "Qualify", icon: CheckCircle2, onRun: runBulk("QUALIFIED", "qualified") },
        { label: "Mark lost", icon: Archive, destructive: true, onRun: runBulk("LOST", "marked lost") },
      ]}
      empty={<div className="plane px-6 py-12 text-center text-muted-foreground">No clients.</div>}
    />
  );
}
