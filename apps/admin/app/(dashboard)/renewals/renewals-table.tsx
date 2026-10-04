"use client";

import { Button, Hint, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@repo/ui";
import { CalendarClock, Mail, RefreshCw } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import * as React from "react";

import { ConfirmDialog } from "@/components/os/confirm-dialog";
import { DataTable, type BulkAction, type Column } from "@/components/os/data-table";
import { EmptyState } from "@/components/os/empty-state";
import { EntityLink } from "@/components/os/entity-link";
import { inspectHref } from "@/components/os/inspect-sheet";
import { StatusPill } from "@/components/ui/badge";
import { reportOutcome, runPerRow } from "@/lib/bulk-outcome";
import { entityHref } from "@/lib/entity-links";
import { date, money } from "@/lib/format";
import type { RenewalRow } from "@/lib/renewals";

type Urgency = "all" | "attention" | "scheduled";

export interface CanRenew {
  retainer: boolean;
  service: boolean;
}

const CANNOT_RENEW: Record<RenewalRow["kind"], string> = {
  retainer: "Your role cannot renew retainers — that needs edit access to payments",
  service: "Your role cannot renew services — that needs edit access to projects",
};

const URGENCY_LABEL: Record<Urgency, string> = {
  all: "Everything",
  attention: "Needs attention",
  scheduled: "Scheduled",
};

function countdown(days: number | null): string {
  if (days === null) return "no date";
  if (days === 0) return "today";
  if (days < 0) return `${-days} day${days === -1 ? "" : "s"} ago`;
  return `in ${days} day${days === 1 ? "" : "s"}`;
}

async function renew(row: RenewalRow): Promise<{ ok: boolean; message?: string }> {
  const endpoint = row.kind === "retainer" ? "/api/admin/maintenance" : "/api/admin/services";
  const body =
    row.kind === "retainer" ? { action: "subscription-renew", id: row.id } : { action: "renew", id: row.id };
  try {
    const response = await fetch(endpoint, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = (await response.json().catch(() => ({}))) as {
      success?: boolean;
      message?: string;
      billing?: { opened: true; amount?: number; currency?: string } | { opened: false; reason: string } | null;
    };
    if (!response.ok || !data.success) {
      return { ok: false, message: data.message ?? "The renewal was not recorded." };
    }
    if (row.kind === "retainer") return { ok: true, message: data.message ?? "Renewed into the next period." };
    if (data.billing?.opened && (data.billing.amount == null || !data.billing.currency)) {
      return { ok: true, message: "Renewed — a payment is pending." };
    }
    if (data.billing?.opened) {
      return { ok: true, message: `Renewed — ${money(data.billing.amount, data.billing.currency)} is pending.` };
    }
    if (data.billing && !data.billing.opened) {
      return { ok: true, message: `Renewed. No payment opened: ${data.billing.reason}` };
    }
    return { ok: true, message: "Renewed." };
  } catch {
    return { ok: false, message: "Could not reach the server." };
  }
}

async function remindByEmail(row: RenewalRow): Promise<{ ok: boolean; message?: string }> {
  try {
    const response = await fetch(`/api/admin/services/${encodeURIComponent(row.id)}/remind`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ channel: "email" }),
    });
    const data = (await response.json().catch(() => ({}))) as { success?: boolean; message?: string };
    if (!response.ok || data.success === false) {
      return { ok: false, message: data.message ?? "The reminder was not sent." };
    }
    return { ok: true };
  } catch {
    return { ok: false, message: "Could not reach the server." };
  }
}

function RenewDialog({ row, trigger }: { row: RenewalRow; trigger: React.ReactElement<{ onClick?: React.MouseEventHandler }> }) {
  const router = useRouter();
  return (
    <ConfirmDialog
      trigger={trigger}
      title={`Renew ${row.what}`}
      body={
        <span>
          {row.clientLabel}
          {row.dueAt && ` · ${row.kind === "retainer" ? "period ends" : "expires"} ${date(row.dueAt)}`}
        </span>
      }
      consequence={
        row.amount !== null
          ? `Opens a pending payment of ${money(row.amount, row.currency)}. ${row.billingNote}`
          : row.billingNote
      }
      confirmLabel="Renew"
      onConfirm={async () => {
        const result = await renew(row);
        if (result.ok) router.refresh();
        return result;
      }}
    />
  );
}

function RenewButton({
  row,
  canRenew,
  size = "sm",
  variant = "outline",
}: {
  row: RenewalRow;
  canRenew: CanRenew;
  size?: "sm";
  variant?: "outline" | "brand";
}) {
  const blocked = canRenew[row.kind] ? row.blocked : CANNOT_RENEW[row.kind];
  if (blocked !== null) {
    return (
      <Hint label={blocked}>
        <span className="inline-flex">
          <Button size={size} variant={variant} disabled aria-label={`Renew — ${blocked}`}>
            <RefreshCw className="size-3.5" />
            Renew
          </Button>
        </span>
      </Hint>
    );
  }
  return (
    <RenewDialog
      row={row}
      trigger={
        <Button size={size} variant={variant} onClick={(event) => event.stopPropagation()}>
          <RefreshCw className="size-3.5" />
          Renew
        </Button>
      }
    />
  );
}

export function RenewalInspectorActions({ row, canRenew }: { row: RenewalRow; canRenew: CanRenew }) {
  const href = entityHref(row.entityType, row.id);
  return (
    <div className="flex flex-wrap gap-2">
      <RenewButton row={row} canRenew={canRenew} variant="brand" />
      {href && (
        <Button size="sm" variant="outline" asChild>
          <Link href={href}>Open {row.kind === "retainer" ? "retainer" : "service"}</Link>
        </Button>
      )}
      <Button size="sm" variant="ghost" asChild>
        <Link href={`/clients/${row.clientId}`}>Open client</Link>
      </Button>
    </div>
  );
}

export function RenewalsTable({
  rows,
  clientScoped,
  attentionOnly = false,
  canRenew,
  canRemind,
}: {
  rows: RenewalRow[];
  clientScoped: boolean;
  attentionOnly?: boolean;
  canRenew: CanRenew;
  canRemind: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [urgency, setUrgency] = React.useState<Urgency>(attentionOnly ? "attention" : "all");

  const visible = React.useMemo(
    () =>
      rows.filter((row) =>
        urgency === "all" ? true : urgency === "attention" ? row.needsAttention : !row.needsAttention,
      ),
    [rows, urgency],
  );

  const blockedReason = (row: RenewalRow): string | null =>
    canRenew[row.kind] ? row.blocked : CANNOT_RENEW[row.kind];

  const renewActions: BulkAction<RenewalRow>[] =
    canRenew.retainer || canRenew.service
      ? [
          {
            label: "Renew",
            icon: RefreshCw,
            confirm: (selected) => {
              const blocked = selected.filter((row) => blockedReason(row) !== null).length;
              const renewing = selected.length - blocked;
              const billed = selected.filter((row) => blockedReason(row) === null && row.amount !== null).length;
              return {
                title: `Renew ${renewing} of ${selected.length} selected`,
                description:
                  "Each one renews into its next term from the date its current period ends, not from today.",
                consequence: [
                  billed > 0 &&
                    `Up to ${billed} pending payment${billed === 1 ? "" : "s"} will open — one per renewed term that has a price in its project's currency.`,
                  blocked > 0 && `${blocked} cannot renew and will be skipped with the reason.`,
                ]
                  .filter(Boolean)
                  .join(" ") || undefined,
                confirmLabel: "Renew",
                tone: "default",
              };
            },
            onRun: async (selected) => {
              const outcome = await runPerRow(
                selected,
                (row) => `${row.clientLabel} · ${row.what}`,
                async (row) => {
                  const blocked = blockedReason(row);
                  return blocked !== null ? { ok: false, message: blocked } : renew(row);
                },
              );
              if (outcome.done > 0) router.refresh();
              return reportOutcome(outcome, { done: (n) => `${n} renewed` });
            },
          },
        ]
      : [];

  const remindActions: BulkAction<RenewalRow>[] = canRemind
    ? [
        {
          label: "Send reminder",
          icon: Mail,
          confirm: (selected) => {
            const services = selected.filter((row) => row.kind === "service").length;
            const skipped = selected.length - services;
            return {
              title: services === 0 ? "No services selected" : `Email ${services} client${services === 1 ? "" : "s"}`,
              description: `${services} real email${services === 1 ? "" : "s"} will be sent, one per service, using the standard renewal wording. Each is recorded on the client.`,
              consequence:
                skipped > 0
                  ? `${skipped} retainer${skipped === 1 ? "" : "s"} selected will be refused: reminders cover services only.`
                  : "A reminder cannot be unsent.",
              confirmLabel: "Send emails",
              tone: "default",
            };
          },
          onRun: async (selected) => {
            const outcome = await runPerRow(
              selected,
              (row) => `${row.clientLabel} · ${row.what}`,
              async (row) =>
                row.kind !== "service"
                  ? { ok: false, message: "Retainers have no renewal reminder — only services do." }
                  : remindByEmail(row),
            );
            if (outcome.done > 0) router.refresh();
            return reportOutcome(outcome, { done: (n) => `${n} reminder${n === 1 ? "" : "s"} emailed` });
          },
        },
      ]
    : [];
  const bulkActions = [...renewActions, ...remindActions];

  const clientId = searchParams.get("client");
  const withoutAttention = new URLSearchParams(searchParams.toString());
  withoutAttention.delete("attention");
  const hrefWithoutAttention = withoutAttention.toString() ? `${pathname}?${withoutAttention.toString()}` : pathname;
  const scoped = clientId ? `?client=${encodeURIComponent(clientId)}` : "";

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
          <Hint label="Quoted plan with no monthly price set">
            <span className="text-subtle-foreground">no quote</span>
          </Hint>
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
        <div className="flex items-center justify-end gap-1.5" onClick={(event) => event.stopPropagation()}>
          <RenewButton row={row} canRenew={canRenew} />
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
    <DataTable
      tableId="renewals"
      rows={visible}
      columns={columns}
      rowKey={(row) => row.key}
      onRowClick={(row) => router.push(inspectHref(pathname, searchParams, row.key), { scroll: false })}
      searchPlaceholder="Search client or service…"
      initialSort={{ columnId: "urgency", dir: "asc" }}
      selectable={bulkActions.length > 0}
      selectionNoun="renewal"
      bulkActions={bulkActions}
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
              ? attentionOnly
                ? "Nothing needs attention"
                : clientScoped
                  ? "Nothing renews for this client"
                  : "Nothing to renew"
              : `Nothing ${URGENCY_LABEL[urgency].toLowerCase()}`
          }
          body={
            rows.length === 0
              ? attentionOnly
                ? "No retainer period or service term is lapsed or due soon. Remove the \"Needs attention\" filter to see what is scheduled."
                : clientScoped
                  ? "This client has no live retainer and no dated service. Start a retainer on the maintenance screen or register a service on the services screen."
                  : "No live retainer and no dated service. Retainers start on the maintenance screen; services are registered on the services screen or opened by a signed proposal."
              : "Every row is in the other group — change the urgency filter to see it."
          }
          action={
            rows.length > 0 ? (
              <Button variant="outline" onClick={() => setUrgency("all")}>
                Show everything
              </Button>
            ) : attentionOnly ? (
              <Button variant="outline" asChild>
                <Link href={hrefWithoutAttention}>Show all renewals</Link>
              </Button>
            ) : (
              <>
                <Button variant="outline" asChild>
                  <Link href={`/maintenance${scoped}`}>Open maintenance</Link>
                </Button>
                <Button variant="ghost" asChild>
                  <Link href={`/services${scoped}`}>Open services</Link>
                </Button>
              </>
            )
          }
        />
      }
    />
  );
}
