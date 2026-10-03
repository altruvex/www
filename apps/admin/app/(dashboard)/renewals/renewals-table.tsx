"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Button,
  LoadingIcon,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui";
import { CalendarClock } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";

import { DataTable, type Column } from "@/components/os/data-table";
import { EmptyState } from "@/components/os/empty-state";
import { EntityLink } from "@/components/os/entity-link";
import { StatusPill } from "@/components/ui/badge";
import { entityHref } from "@/lib/entity-links";
import { date, money } from "@/lib/format";
import type { RenewalRow } from "@/lib/renewals";

type Urgency = "all" | "attention" | "scheduled";

const URGENCY_LABEL: Record<Urgency, string> = {
  all: "Everything",
  attention: "Needs attention",
  scheduled: "Scheduled",
};

/** "in 12 days", "today", "3 days ago". */
function countdown(days: number | null): string {
  if (days === null) return "no date";
  if (days === 0) return "today";
  if (days < 0) return `${-days} day${days === -1 ? "" : "s"} ago`;
  return `in ${days} day${days === 1 ? "" : "s"}`;
}

/**
 * Renews one row — a retainer period or a service term — through the route
 * that owns it, and reads back what was invoiced. Both routes refuse with a
 * sentence, which is shown as is.
 */
async function renew(row: RenewalRow): Promise<string | null> {
  const endpoint = row.kind === "retainer" ? "/api/admin/maintenance" : "/api/admin/services";
  const body =
    row.kind === "retainer" ? { action: "subscription-renew", id: row.id } : { action: "renew", id: row.id };
  const response = await fetch(endpoint, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await response.json().catch(() => ({}))) as {
    success?: boolean;
    message?: string;
    billing?: { opened: true; amount: number; currency: string } | { opened: false; reason: string } | null;
  };
  if (!response.ok || !data.success) {
    toast.error(data.message ?? "The renewal was not recorded.");
    return null;
  }
  if (row.kind === "retainer") return data.message ?? "Renewed into the next period.";
  if (data.billing?.opened) return `Renewed — ${money(data.billing.amount, data.billing.currency)} is pending.`;
  if (data.billing && !data.billing.opened) return `Renewed. No payment opened: ${data.billing.reason}`;
  return "Renewed.";
}

export function RenewalsTable({ rows, clientScoped }: { rows: RenewalRow[]; clientScoped: boolean }) {
  const router = useRouter();
  const [urgency, setUrgency] = React.useState<Urgency>("all");
  const [pending, setPending] = React.useState<RenewalRow | null>(null);
  const [busy, setBusy] = React.useState(false);

  const visible = React.useMemo(
    () =>
      rows.filter((row) =>
        urgency === "all" ? true : urgency === "attention" ? row.needsAttention : !row.needsAttention,
      ),
    [rows, urgency],
  );

  const columns: Column<RenewalRow>[] = [
    {
      id: "client",
      header: "Client",
      cell: (row) => (
        <EntityLink type="client" id={row.clientId}>
          {row.clientLabel}
        </EntityLink>
      ),
      sortValue: (row) => row.clientLabel,
      searchValue: (row) => row.clientLabel,
    },
    {
      id: "what",
      header: "What",
      cell: (row) => (
        <div className="min-w-0">
          <EntityLink type={row.entityType} id={row.id}>
            {row.what}
          </EntityLink>
          {row.detail && <p className="truncate text-meta text-muted-foreground">{row.detail}</p>}
        </div>
      ),
      sortValue: (row) => row.what,
      searchValue: (row) => `${row.what} ${row.detail ?? ""}`,
    },
    {
      id: "kind",
      header: "Kind",
      cell: (row) => (row.kind === "retainer" ? "Retainer" : "Service"),
      sortValue: (row) => row.kind,
      hideable: true,
      defaultHidden: true,
    },
    {
      id: "amount",
      header: "Amount",
      align: "end",
      mono: true,
      cell: (row) =>
        row.amount !== null ? (
          money(row.amount, row.currency)
        ) : (
          <span className="text-subtle-foreground" title="Quoted plan with no monthly price set">
            no quote
          </span>
        ),
      sortValue: (row) => row.amount,
      hideable: true,
    },
    {
      id: "due",
      header: "Due",
      cell: (row) => (
        <div>
          <span className="font-mono tabular-nums">{row.dueAt ? date(row.dueAt) : "—"}</span>
          <p className="text-meta text-muted-foreground">
            {countdown(row.daysUntil)}
            {!row.autoRenew && row.kind === "retainer" && " · not renewing"}
          </p>
        </div>
      ),
      sortValue: (row) => row.daysUntil,
      minWidth: "sm",
    },
    {
      id: "urgency",
      header: "Status",
      cell: (row) => <StatusPill registry={row.urgency.registry} value={row.urgency.value} />,
      sortValue: (row) => row.rank,
    },
    {
      id: "action",
      header: "",
      align: "end",
      cell: (row) => (
        <div className="flex items-center justify-end gap-1.5">
          <Button
            size="sm"
            variant="outline"
            disabled={row.blocked !== null}
            title={row.blocked ?? undefined}
            onClick={(event) => {
              event.stopPropagation();
              setPending(row);
            }}
          >
            Renew
          </Button>
          {entityHref(row.entityType, row.id) && (
            <Button size="sm" variant="ghost" asChild>
              <Link href={entityHref(row.entityType, row.id)!}>Open</Link>
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <>
      <DataTable
        tableId="renewals"
        rows={visible}
        columns={columns}
        rowKey={(row) => row.key}
        searchPlaceholder="Search client or service…"
        initialSort={{ columnId: "urgency", dir: "asc" }}
        mobile={{ title: "what", subtitle: "client", meta: ["urgency", "due", "amount", "action"] }}
        toolbar={
          <Select value={urgency} onValueChange={(value) => setUrgency(value as Urgency)}>
            <SelectTrigger size="sm" aria-label="Urgency" className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(URGENCY_LABEL) as Urgency[]).map((value) => (
                <SelectItem key={value} value={value}>
                  {URGENCY_LABEL[value]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
        empty={
          <EmptyState
            icon={CalendarClock}
            title={
              rows.length === 0
                ? clientScoped
                  ? "Nothing renews for this client"
                  : "Nothing to renew"
                : `Nothing ${URGENCY_LABEL[urgency].toLowerCase()}`
            }
            body={
              rows.length === 0
                ? clientScoped
                  ? "This client has no live retainer and no dated service. Start a retainer on the maintenance screen or register a service on the services screen."
                  : "No live retainer and no dated service. Retainers start on the maintenance screen; services are registered on the services screen or opened by a signed proposal."
                : "Every row is in the other group — change the urgency filter to see it."
            }
          />
        }
      />

      {pending && (
        <AlertDialog open onOpenChange={(open) => !open && !busy && setPending(null)}>
          <AlertDialogContent className="max-w-lg">
            <AlertDialogHeader>
              <AlertDialogTitle>Renew {pending.what}</AlertDialogTitle>
              <AlertDialogDescription>
                {pending.clientLabel} · {pending.billingNote}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={busy}>Not now</AlertDialogCancel>
              <AlertDialogAction
                variant="brand"
                disabled={busy}
                onClick={async (event) => {
                  event.preventDefault();
                  setBusy(true);
                  try {
                    const message = await renew(pending);
                    if (message !== null) {
                      toast.success(message);
                      setPending(null);
                      router.refresh();
                    }
                  } catch {
                    toast.error("Could not reach the server.");
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                {busy && <LoadingIcon size="sm" />}
                Renew
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  );
}
