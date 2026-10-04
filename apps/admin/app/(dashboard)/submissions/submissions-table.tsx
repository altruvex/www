"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Building2, Trash2, UserPlus } from "lucide-react";
import { DataTable, type Column } from "@/components/os/data-table";
import { RowActions, useRecordDelete } from "@/components/os/delete-record";
import { StatusPill } from "@/components/ui/badge";
import { Button, DropdownMenuItem, Hint } from "@repo/ui";
import { inspectHref } from "@/components/os/inspect-sheet";
import { when, truncate, phone as fmtPhone } from "@/lib/format";
import { statusOf } from "@/lib/status";
import { EntityLink } from "@/components/os/entity-link";
import { convertedLeadSteps } from "./lead-steps";
import { convertSubmission } from "@/app/(dashboard)/_actions/clients";

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
  clientName: string | null;
}

export function SubmissionsTable({
  rows,
  canConvert,
  canDelete,
  canOpenClient,
  canPropose,
  canSchedule,
}: {
  rows: SubmissionRow[];
  canConvert: boolean;
  canDelete: boolean;
  canOpenClient: boolean;
  canPropose: boolean;
  canSchedule: boolean;
}) {
  const del = useRecordDelete({ entity: "submission" });
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [busyId, setBusyId] = React.useState<string | null>(null);

  async function convert(id: string) {
    setBusyId(id);
    const result = await convertSubmission(id);
    setBusyId(null);
    if (result.ok) {
      if (result.linked) toast.success(result.message);
      else toast.warning(result.message);
      router.push(`/clients/${result.clientId}`);
    } else {
      toast.error("Could not convert", { description: result.message });
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
            <Hint label="Not opened yet">
              <span className="size-1.5 shrink-0 rounded-full bg-info">
                <span className="sr-only">Not opened yet</span>
              </span>
            </Hint>
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
        <span className="truncate text-muted-foreground">
          {truncate(row.message, 110)}
        </span>
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
      searchValue: (row) =>
        `${row.utmSource ?? ""} ${row.utmCampaign ?? ""} ${row.referrer ?? ""}`,
      minWidth: "xl",
      defaultHidden: true,
    },
    {
      id: "status",
      header: "Status",
      width: "128px",
      cell: (row) => (
        <StatusPill
          registry="submissionStatus"
          value={row.status}
          variant="dot"
        />
      ),
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
        ) : !canConvert || row.status === "SPAM" ? (
          <span className="text-subtle-foreground">—</span>
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
    <>
      <DataTable
        tableId="submissions"
        rows={rows}
        columns={columns}
        rowKey={(row) => row.id}
        onRowClick={(row) =>
          router.push(inspectHref(pathname, searchParams, row.id), {
            scroll: false,
          })
        }
        searchPlaceholder="Search the raw messages…"
        initialSort={{ columnId: "received", dir: "desc" }}
        mobile={{
          title: "name",
          subtitle: "message",
          meta: ["status", "convert", "interest", "received"],
        }}
        selectable={canDelete}
        selectionNoun="submission"
        bulkActions={
          canDelete
            ? [
                {
                  label: "Delete",
                  icon: Trash2,
                  destructive: true,
                  onRun: (selected) =>
                    del.request(
                      selected.map((row) => ({ id: row.id, label: row.name })),
                    ),
                },
              ]
            : undefined
        }
        rowActions={(row) => {
          const convertible =
            !row.clientId && canConvert && row.status !== "SPAM";
          const steps = row.clientId
            ? [canOpenClient, canPropose, canSchedule].some(Boolean)
            : convertible;
          if (!steps && !canDelete) return null;
          return (
            <RowActions
              onDelete={
                canDelete
                  ? () => del.request({ id: row.id, label: row.name })
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
            No submissions match.
          </div>
        }
      />
      {del.dialog}
    </>
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
