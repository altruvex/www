"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2, UserPlus } from "lucide-react";
import { DataTable, type Column } from "@/components/os/data-table";
import { RowActions, useRecordDelete } from "@/components/os/delete-record";
import { Button } from "@repo/ui";
import { money, when, phone as fmtPhone } from "@/lib/format";
import { EntityLink } from "@/components/os/entity-link";
import { convertEstimateToClient } from "@/app/(dashboard)/_actions/records";

export interface EstimateRow {
  id: string;
  name: string | null;
  phone: string;
  projectType: string;
  complexity: string;
  timeline: string;
  /** Display labels already resolved on the server; null when the lead predates the field. */
  brand: string | null;
  content: string | null;
  /** Unpriced scope notes the buyer ticked, as names. Empty for older leads. */
  scopeNotes: string[];
  note: string | null;
  priceMin: number;
  priceMax: number;
  weeksMin: number;
  weeksMax: number;
  createdAt: string;
  convertedAt: string | null;
  clientId: string | null;
  /** Display name of the converted client; null while unconverted. */
  clientName: string | null;
}

export function TransparencyTable({
  rows,
  focusId,
}: {
  rows: EstimateRow[];
  /** `?lead=` — the estimate the operator arrived for. Marked and scrolled to. */
  focusId?: string;
}) {
  const del = useRecordDelete({ entity: "transparencyLead" });
  const router = useRouter();
  const [busyId, setBusyId] = React.useState<string | null>(null);

  // The table renders each row twice (table and mobile card); only one of the
  // two is laid out at a given width, so the first marker with a box is the one.
  React.useEffect(() => {
    if (!focusId) return;
    const marker = Array.from(
      document.querySelectorAll<HTMLElement>(`[data-estimate-focus="${CSS.escape(focusId)}"]`),
    ).find((el) => el.getClientRects().length > 0);
    marker?.scrollIntoView({ block: "center" });
  }, [focusId]);

  const columns: Column<EstimateRow>[] = [
    {
      id: "who",
      header: "Who",
      hideable: false,
      cell: (row) =>
        row.id === focusId ? (
          <span
            data-estimate-focus={row.id}
            aria-current="true"
            className="flex items-center gap-1.5 truncate font-medium"
          >
            <span className="size-1.5 shrink-0 rounded-full bg-foreground" aria-hidden />
            <span className="truncate">{row.name || fmtPhone(row.phone)}</span>
          </span>
        ) : (
          <span className="truncate">{row.name || fmtPhone(row.phone)}</span>
        ),
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
      id: "brand",
      header: "Brand",
      width: "120px",
      cell: (row) => <span className="truncate text-muted-foreground">{row.brand ?? "—"}</span>,
      sortValue: (row) => row.brand ?? "",
      minWidth: "xl",
    },
    {
      id: "content",
      header: "Content",
      width: "130px",
      cell: (row) => <span className="truncate text-muted-foreground">{row.content ?? "—"}</span>,
      sortValue: (row) => row.content ?? "",
      minWidth: "xl",
    },
    {
      id: "scope",
      header: "Scope notes",
      width: "220px",
      cell: (row) =>
        row.scopeNotes.length === 0 ? (
          <span className="text-muted-foreground">—</span>
        ) : (
          <span className="flex flex-wrap gap-1">
            {row.scopeNotes.map((name) => (
              <span
                key={name}
                className="rounded-sm border border-border bg-surface px-1.5 py-0.5 text-meta text-muted-foreground"
              >
                {name}
              </span>
            ))}
          </span>
        ),
      sortValue: (row) => row.scopeNotes.length,
      searchValue: (row) => row.scopeNotes.join(" "),
      minWidth: "lg",
    },
    {
      id: "note",
      header: "Note",
      width: "200px",
      cell: (row) =>
        row.note ? (
          <span className="block truncate text-muted-foreground" title={row.note}>
            {row.note}
          </span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
      searchValue: (row) => row.note,
      minWidth: "xl",
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
      header: "Client",
      width: "160px",
      hideable: false,
      cell: (row) =>
        row.clientId ? (
          <EntityLink type="client" id={row.clientId} className="block truncate">
            {row.clientName ?? "Client"}
          </EntityLink>
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
    <>
      <DataTable
        tableId="transparency"
        rows={rows}
        columns={columns}
        rowKey={(row) => row.id}
        // Only converted estimates have somewhere to go; the rest are not links.
        rowHref={(row) => (row.clientId ? `/clients/${row.clientId}` : undefined)}
        searchPlaceholder="Search estimates…"
        initialSort={{ columnId: "at", dir: "desc" }}
        mobile={{ title: "who", subtitle: "project", meta: ["quote", "weeks", "scope", "converted", "at"] }}
        // A targeted estimate must be on screen, not behind "show more".
        pageSize={focusId ? null : undefined}
        selectable
        selectionNoun="lead"
        bulkActions={[
          {
            label: "Delete",
            icon: Trash2,
            destructive: true,
            onRun: (selected) =>
              del.request(selected.map((row) => ({ id: row.id, label: row.name ?? row.phone }))),
          },
        ]}
        rowActions={(row) => (
          <RowActions onDelete={() => del.request({ id: row.id, label: row.name ?? row.phone })} />
        )}
        empty={
          <div className="plane px-6 py-12 text-center text-muted-foreground">
            No estimates match.
          </div>
        }
      />
      {del.dialog}
    </>
  );
}
