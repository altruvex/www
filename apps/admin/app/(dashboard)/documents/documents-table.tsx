"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Download, FolderOpen, Trash2 } from "lucide-react";
import { Button } from "@repo/ui";
import { DataTable, type BulkAction, type Column } from "@/components/os/data-table";
import { EmptyState } from "@/components/os/empty-state";
import { useRecordDelete, type DeleteTarget } from "@/components/os/delete-record";
import { EntityLink } from "@/components/os/entity-link";
import { inspectHref } from "@/components/os/inspect-sheet";
import { StatusPill } from "@/components/ui/badge";
import { when } from "@/lib/format";
import type { RegistryName } from "@/lib/status";

export interface DocumentRow {
  id: string;
  name: string;
  category: string;
  url: string;
  ownerName: string;
  clientId: string;
  clientName: string;
  entityHref: string;
  entityLabel: string;
  status: string;
  statusRegistry: RegistryName;
  createdAt: string;
  updatedAt: string;
}

function ownersOf(selected: DocumentRow[], label: "Proposal" | "Contract"): DeleteTarget[] {
  const owners = new Map<string, DeleteTarget>();
  for (const row of selected) {
    if (row.entityLabel !== label) continue;
    const id = row.entityHref.split("/").pop();
    if (id && !owners.has(id)) owners.set(id, { id, label: `${row.name.replace(/ \((PDF|signed)\)$/, "")} · ${row.clientName}` });
  }
  return [...owners.values()];
}

export function DocumentsTable({
  rows,
  filtered,
  canDeleteProposals,
  canDeleteContracts,
}: {
  rows: DocumentRow[];
  canDeleteProposals: boolean;
  canDeleteContracts: boolean;
  filtered: string | null;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const delProposals = useRecordDelete({ entity: "proposal" });
  const delContracts = useRecordDelete({ entity: "contract" });

  const bulkOf = (
    label: "Proposal" | "Contract",
    noun: string,
    chain: string,
    request: (targets: DeleteTarget[]) => void,
  ): BulkAction<DocumentRow> => ({
    label: `Delete ${noun}s`,
    icon: Trash2,
    destructive: true,
    confirm: (selected) => {
      const n = ownersOf(selected, label).length;
      return {
        title: n === 0 ? `No ${noun}s selected` : `Delete ${n} ${noun}${n === 1 ? "" : "s"}`,
        description: `This deletes the whole ${noun} record, not just its file${n === 0 ? "" : ` — ${n} ${noun}${n === 1 ? "" : "s"} in all`}. ${chain}`,
        consequence: "Protected records are kept and each one is named with the reason. The next step shows exactly what goes.",
        confirmLabel: "Continue",
        tone: "danger",
      };
    },
    onRun: (selected) => {
      const targets = ownersOf(selected, label);
      if (targets.length === 0) {
        return { ok: false, message: `None of the selected files belong to a ${noun}.` };
      }
      request(targets);
      return undefined;
    },
  });
  const bulkActions = [
    canDeleteProposals &&
      bulkOf(
        "Proposal",
        "proposal",
        "A proposal takes its contract, the project and the payments with it.",
        delProposals.request,
      ),
    canDeleteContracts &&
      bulkOf(
        "Contract",
        "contract",
        "A contract takes its project and the payments with it.",
        delContracts.request,
      ),
  ].filter((a): a is BulkAction<DocumentRow> => a !== false);

  const columns: Column<DocumentRow>[] = [
    {
      id: "name",
      header: "Document",
      hideable: false,
      cell: (row) => <span className="truncate">{row.name}</span>,
      sortValue: (row) => row.name.toLowerCase(),
      searchValue: (row) => `${row.name} ${row.category} ${row.clientName}`,
    },
    {
      id: "category",
      header: "Category",
      width: "132px",
      cell: (row) => <span className="text-muted-foreground">{row.category}</span>,
      sortValue: (row) => row.category,
      minWidth: "xl",
    },
    {
      id: "client",
      header: "Client",
      width: "160px",
      cell: (row) => (
        <EntityLink type="client" id={row.clientId} muted className="truncate">
          {row.clientName}
        </EntityLink>
      ),
      sortValue: (row) => row.clientName.toLowerCase(),
      minWidth: "md",
    },
    {
      id: "entity",
      header: "Belongs to",
      width: "112px",
      cell: (row) => (
        <Link href={row.entityHref} className="text-muted-foreground hover:text-brand">
          {row.entityLabel}
        </Link>
      ),
      minWidth: "xl",
    },
    {
      id: "status",
      header: "Record status",
      width: "128px",
      cell: (row) => <StatusPill registry={row.statusRegistry} value={row.status} variant="dot" />,
      sortValue: (row) => row.status,
      minWidth: "lg",
    },
    {
      id: "owner",
      header: "Owner",
      width: "128px",
      cell: (row) => <span className="truncate text-muted-foreground">{row.ownerName}</span>,
      sortValue: (row) => row.ownerName,
      minWidth: "xl",
      defaultHidden: true,
    },
    {
      id: "created",
      header: "Created",
      width: "100px",
      align: "end",
      cell: (row) => (
        <span className="font-mono text-meta tabular-nums text-muted-foreground">
          {when(row.createdAt)}
        </span>
      ),
      sortValue: (row) => new Date(row.createdAt).getTime(),
    },
    {
      id: "open",
      header: "",
      width: "68px",
      align: "end",
      hideable: false,
      cell: (row) => (
        <a
          href={row.url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex h-6 items-center gap-1 rounded-sm border border-border px-1.5 text-meta hover:bg-surface"
          onClick={(e) => e.stopPropagation()}
        >
          <Download className="size-3" aria-hidden />
          Open
        </a>
      ),
    },
  ];

  return (
    <>
    <DataTable
      tableId="documents"
      rows={rows}
      columns={columns}
      rowKey={(row) => row.id}
      rowHref={(row) => inspectHref(pathname, searchParams, row.id)}
      searchPlaceholder="Search documents…"
      initialSort={{ columnId: "created", dir: "desc" }}
      selectable={bulkActions.length > 0}
      selectionNoun="document"
      bulkActions={bulkActions.length > 0 ? bulkActions : undefined}
      mobile={{ title: "name", subtitle: "client", meta: ["category", "status", "created"] }}
      empty={
        <EmptyState
          icon={FolderOpen}
          title={filtered ? `No documents in “${filtered}”` : "No documents in this view"}
          body={
            filtered
              ? "Nothing of this kind has been generated yet. Pick another chip above, or All."
              : "Nothing here matches the search. Clear it to see every generated file."
          }
          action={
            filtered ? (
              <Button variant="outline" size="sm" asChild>
                <Link href={clearedHref(pathname, searchParams)}>Clear filters</Link>
              </Button>
            ) : (
              <Button variant="outline" size="sm" asChild>
                <Link href="/proposals">Open proposals</Link>
              </Button>
            )
          }
        />
      }
    />
    {delProposals.dialog}
    {delContracts.dialog}
    </>
  );
}

function clearedHref(pathname: string, searchParams: URLSearchParams | null) {
  const params = new URLSearchParams(searchParams?.toString());
  params.delete("type");
  params.delete("inspect");
  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}
