"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Archive, CheckCircle2, FilePlus2, Trash2 } from "lucide-react";
import { DataTable, type Column } from "@/components/os/data-table";
import { RowActions, useRecordDelete } from "@/components/os/delete-record";
import { EntityLink } from "@/components/os/entity-link";
import { StatusPill } from "@/components/ui/badge";
import { Avatar, DropdownMenuItem, Hint } from "@repo/ui";
import { ConfirmDialog } from "@/components/os/confirm-dialog";
import { LostReasonFields, useLostInput } from "@/components/os/lost-reason-fields";
import { contactLabel, money, phone as fmtPhone, when } from "@/lib/format";
import { statusOf } from "@/lib/status";
import { bulkChangeClientStatus } from "@/app/(dashboard)/_actions/clients";

export interface ClientRow {
  id: string;
  name: string | null;
  company: string | null;
  phone: string | null;
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
  activeProjectId: string | null;
}

export function ClientsTable({
  rows,
  showMoney,
  canEdit,
  canDelete,
  canPropose,
}: {
  rows: ClientRow[];
  showMoney: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canPropose: boolean;
}) {
  const del = useRecordDelete({ entity: "client" });
  const router = useRouter();
  const [, startTransition] = React.useTransition();
  const [losing, setLosing] = React.useState<ClientRow[] | null>(null);
  const lost = useLostInput();

  const allColumns: Column<ClientRow>[] = [
    {
      id: "client",
      header: "Client",
      hideable: false,
      cell: (row) => (
        <span className="flex items-center gap-2">
          <Avatar name={contactLabel(row)} size="sm" />
          <span className="min-w-0">
            <span className="block truncate">
              {row.company || row.name || row.email || "Unnamed"}
            </span>
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
        [
          row.company,
          row.name,
          row.phone,
          row.email,
          row.industry,
          row.activeProject,
        ]
          .filter(Boolean)
          .join(" "),
    },
    {
      id: "stage",
      header: "Stage",
      width: "132px",
      cell: (row) => (
        <StatusPill registry="pipelineStage" value={row.stage} variant="dot" />
      ),
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
        row.latestValue ? (
          money(row.latestValue, row.currency)
        ) : (
          <span className="text-subtle-foreground">—</span>
        ),
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
          <Hint
            label={
              row.mixedCurrency
                ? "This client has accepted work in more than one currency"
                : undefined
            }
          >
            <span className="text-success">
              {money(row.lifetimeValue, row.lifetimeCurrency)}
              {row.mixedCurrency && (
                <span className="ms-1 text-warning">*</span>
              )}
            </span>
          </Hint>
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
      sortValue: (row) =>
        row.proposalCount + row.contractCount + row.projectCount,
      minWidth: "xl",
    },
    {
      id: "project",
      header: "Active project",
      width: "18%",
      cell: (row) =>
        row.activeProject ? (
          <EntityLink
            type="project"
            id={row.activeProjectId}
            className="truncate"
          >
            {row.activeProject}
          </EntityLink>
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
      cell: (row) =>
        row.phone ? (
          <a
            href={`tel:${row.phone}`}
            className="text-muted-foreground hover:text-brand"
          >
            {fmtPhone(row.phone)}
          </a>
        ) : (
          <span className="text-subtle-foreground">—</span>
        ),
      searchValue: (row) => row.phone ?? "",
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

  const columns = showMoney
    ? allColumns
    : allColumns.filter((c) => c.id !== "value" && c.id !== "lifetime");

  function runBulk(status: string) {
    return (selected: ClientRow[]) => {
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

  const bulkActions = [
    ...(canEdit
      ? [
          {
            label: "Qualify",
            icon: CheckCircle2,
            onRun: runBulk("QUALIFIED"),
          },
          {
            label: "Mark lost",
            icon: Archive,
            destructive: true,
            onRun: (selected: ClientRow[]) => {
              lost.reset();
              setLosing(selected);
            },
          },
        ]
      : []),
    ...(canDelete
      ? [
          {
            label: "Delete",
            icon: Trash2,
            destructive: true,
            onRun: (selected: ClientRow[]) =>
              del.request(
                selected.map((row) => ({
                  id: row.id,
                  label: contactLabel(row),
                })),
              ),
          },
        ]
      : []),
  ];

  return (
    <>
      <DataTable
        tableId="clients"
        rows={rows}
        columns={columns}
        rowKey={(row) => row.id}
        rowHref={(row) => `/clients/${row.id}`}
        searchPlaceholder="Search clients, phones, projects…"
        initialSort={{ columnId: "updated", dir: "desc" }}
        selectable={bulkActions.length > 0}
        selectionNoun="client"
        mobile={{
          title: "client",
          subtitle: "phone",
          meta: showMoney
            ? ["stage", "value", "source", "updated"]
            : ["stage", "source", "updated"],
        }}
        bulkActions={bulkActions}
        rowActions={
          canDelete || canPropose
            ? (row) => (
                <RowActions
                  onDelete={
                    canDelete
                      ? () =>
                          del.request({
                            id: row.id,
                            label: contactLabel(row),
                          })
                      : undefined
                  }
                >
                  {canPropose && (
                    <DropdownMenuItem asChild>
                      <Link href={`/clients/${row.id}/new-proposal`}>
                        <FilePlus2 className="size-3.5" />
                        New proposal
                      </Link>
                    </DropdownMenuItem>
                  )}
                </RowActions>
              )
            : undefined
        }
        empty={
          <div className="plane px-6 py-12 text-center text-muted-foreground">
            No client matches.
          </div>
        }
      />
      {del.dialog}
      <ConfirmDialog
        open={losing !== null}
        onOpenChange={(open) => !open && setLosing(null)}
        tone="danger"
        title={`Mark ${losing?.length ?? 0} client${losing?.length === 1 ? "" : "s"} lost?`}
        consequence="They leave the pipeline board. Their proposals, contracts and history stay, and the status can be changed back."
        confirmLabel="Mark lost"
        confirmDisabled={!lost.ready}
        onConfirm={async () => {
          const result = await bulkChangeClientStatus(
            (losing ?? []).map((r) => r.id),
            "LOST",
            lost.value,
          );
          if (result.ok) {
            setLosing(null);
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
