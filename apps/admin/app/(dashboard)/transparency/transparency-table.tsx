"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Building2, Trash2, UserPlus } from "lucide-react";
import { DataTable, type Column } from "@/components/os/data-table";
import { RowActions, useRecordDelete } from "@/components/os/delete-record";
import { DropdownMenuItem, Hint } from "@repo/ui";
import { inspectHref } from "@/components/os/inspect-sheet";
import { money, when, phone as fmtPhone } from "@/lib/format";
import { EntityLink } from "@/components/os/entity-link";
import { convertedLeadSteps } from "../submissions/lead-steps";
import { convertEstimate } from "@/app/(dashboard)/_actions/clients";
import { ConvertEstimateButton } from "./convert-estimate-button";

export interface EstimateRow {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  projectType: string;
  complexity: string;
  timeline: string;
  brand: string | null;
  content: string | null;
  scopeNotes: string[];
  note: string | null;
  priceMin: number;
  priceMax: number;
  weeksMin: number;
  weeksMax: number;
  createdAt: string;
  convertedAt: string | null;
  clientId: string | null;
  clientName: string | null;
}

export function TransparencyTable({
  rows,
  focusId,
  canConvert,
  canDelete,
  canOpenClient,
  canPropose,
  canSchedule,
}: {
  rows: EstimateRow[];
  focusId?: string;
  canConvert: boolean;
  canDelete: boolean;
  canOpenClient: boolean;
  canPropose: boolean;
  canSchedule: boolean;
}) {
  const del = useRecordDelete({ entity: "transparencyLead" });
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [busyId, setBusyId] = React.useState<string | null>(null);

  async function convert(id: string) {
    setBusyId(id);
    const result = await convertEstimate(id);
    setBusyId(null);
    if (result.ok) {
      if (result.linked) toast.success(result.message);
      else toast.warning(result.message);
      router.push(`/clients/${result.clientId}`);
    } else {
      toast.error("Could not convert", { description: result.message });
    }
  }

  React.useEffect(() => {
    if (!focusId) return;
    const marker = Array.from(
      document.querySelectorAll<HTMLElement>(
        `[data-estimate-focus="${CSS.escape(focusId)}"]`,
      ),
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
            <span
              className="size-1.5 shrink-0 rounded-full bg-foreground"
              aria-hidden
            />
            <span className="truncate">{row.name || row.email || fmtPhone(row.phone)}</span>
          </span>
        ) : (
          <span className="truncate">{row.name || row.email || fmtPhone(row.phone)}</span>
        ),
      sortValue: (row) => (row.name || row.email || row.phone || "").toLowerCase(),
      searchValue: (row) =>
        `${row.name ?? ""} ${row.email ?? ""} ${row.phone ?? ""} ${row.projectType}`,
    },
    {
      id: "project",
      header: "Project",
      width: "150px",
      cell: (row) => (
        <span className="truncate text-muted-foreground">
          {row.projectType}
          <span className="ms-1.5 text-subtle-foreground">
            {row.complexity}
          </span>
        </span>
      ),
      sortValue: (row) => row.projectType,
    },
    {
      id: "brand",
      header: "Brand",
      width: "120px",
      cell: (row) => (
        <span className="truncate text-muted-foreground">
          {row.brand ?? "—"}
        </span>
      ),
      sortValue: (row) => row.brand ?? "",
      minWidth: "xl",
    },
    {
      id: "content",
      header: "Content",
      width: "130px",
      cell: (row) => (
        <span className="truncate text-muted-foreground">
          {row.content ?? "—"}
        </span>
      ),
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
                className="rounded-ctl-xs border border-border-subtle bg-surface px-1.5 py-0.5 text-meta text-muted-foreground"
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
          <Hint label={row.note}>
            <span className="block truncate text-muted-foreground">
              {row.note}
            </span>
          </Hint>
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
      cell: (row) => (
        <span className="text-muted-foreground">{row.timeline}</span>
      ),
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
          <EntityLink
            type="client"
            id={row.clientId}
            className="block truncate"
          >
            {row.clientName ?? "Client"}
          </EntityLink>
        ) : canConvert ? (
          <ConvertEstimateButton leadId={row.id} size="sm" />
        ) : (
          <span className="text-subtle-foreground">Not converted</span>
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
        onRowClick={(row) =>
          router.push(inspectHref(pathname, searchParams, row.id), {
            scroll: false,
          })
        }
        searchPlaceholder="Search estimates…"
        initialSort={{ columnId: "at", dir: "desc" }}
        mobile={{
          title: "who",
          subtitle: "project",
          meta: ["quote", "weeks", "scope", "converted", "at"],
        }}
        pageSize={focusId ? null : undefined}
        selectable={canDelete}
        selectionNoun="estimate"
        bulkActions={
          canDelete
            ? [
                {
                  label: "Delete",
                  icon: Trash2,
                  destructive: true,
                  onRun: (selected) =>
                    del.request(
                      selected.map((row) => ({
                        id: row.id,
                        label: row.name || row.email || row.phone || "Estimate lead",
                      })),
                    ),
                },
              ]
            : undefined
        }
        rowActions={(row) => {
          const convertible = !row.clientId && canConvert;
          const steps = row.clientId
            ? [canOpenClient, canPropose, canSchedule].some(Boolean)
            : convertible;
          if (!steps && !canDelete) return null;
          return (
            <RowActions
              onDelete={
                canDelete
                  ? () =>
                      del.request({ id: row.id, label: row.name || row.email || row.phone || "Estimate lead" })
                  : undefined
              }
            >
              {convertible && (
                <DropdownMenuItem
                  disabled={busyId === row.id}
                  onSelect={() => void convert(row.id)}
                >
                  <UserPlus className="size-3.5" />
                  Convert to client
                </DropdownMenuItem>
              )}
              {row.clientId && canOpenClient && (
                <DropdownMenuItem asChild>
                  <Link href={`/clients/${row.clientId}`}>
                    <Building2 className="size-3.5" />
                    Open client
                  </Link>
                </DropdownMenuItem>
              )}
              {row.clientId &&
                convertedLeadSteps(row.clientId, {
                  propose: canPropose,
                  schedule: canSchedule,
                }).map((step) => (
                  <DropdownMenuItem key={step.key} asChild>
                    <Link href={step.href}>
                      <step.icon className="size-3.5" />
                      {step.label}
                    </Link>
                  </DropdownMenuItem>
                ))}
            </RowActions>
          );
        }}
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
