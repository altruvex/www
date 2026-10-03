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
  Badge,
  Button,
  LoadingIcon,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
} from "@repo/ui";
import { useRouter } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";

import type { AdminRequest, AdminSubscription } from "@/lib/maintenance-admin";
import { date, money } from "@/lib/format";

import {
  IntervalChange,
  PortalLink,
  QuoteEditor,
  REQUEST_STATUS_LABEL,
  REQUEST_TONE,
  StatusChange,
} from "../maintenance-client";

/** A plan the retainer can be moved to, worded by the server. */
export interface PlanOption {
  id: string;
  name: string;
  /** True when the plan publishes no price and bills from a quote. */
  quoteOnly: boolean;
  /** One invoice at this retainer's interval on that plan, or the quote wording. */
  price: string;
}

/**
 * Sends one mutation to the maintenance route and re-reads the page.
 *
 * Returns the server's own sentence on success (the route words what a
 * renewal or a plan change actually did), or null on refusal — which is
 * already toasted here so every caller does not repeat it.
 */
function useMaintenanceSend() {
  const router = useRouter();
  const [busy, setBusy] = React.useState<string | null>(null);

  const send = React.useCallback(
    async (key: string, body: Record<string, unknown>): Promise<string | null> => {
      setBusy(key);
      try {
        const response = await fetch("/api/admin/maintenance", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const data = (await response.json().catch(() => ({}))) as {
          success?: boolean;
          message?: string;
        };
        if (!response.ok || !data.success) {
          toast.error(data.message ?? "That change was not saved.");
          return null;
        }
        router.refresh();
        return data.message ?? "";
      } catch {
        toast.error("Could not reach the server.");
        return null;
      } finally {
        setBusy(null);
      }
    },
    [router],
  );

  return { busy, send };
}

/**
 * Moves a retainer to another plan, after the operator has read what moves
 * now (the allowance) and what moves at the renewal (the price).
 */
function PlanChange({
  sub,
  plans,
  busy,
  onChange,
}: {
  sub: AdminSubscription;
  plans: readonly PlanOption[];
  busy: boolean;
  onChange: (planId: string) => Promise<boolean>;
}) {
  const [pending, setPending] = React.useState<PlanOption | null>(null);
  const current = plans.find((p) => p.id === sub.planId);

  return (
    <>
      <Select
        value={sub.planId}
        disabled={sub.status === "CANCELLED" || plans.length === 0}
        onValueChange={(value) => {
          const next = plans.find((p) => p.id === value);
          if (next && next.id !== sub.planId) setPending(next);
        }}
      >
        <SelectTrigger size="sm" aria-label={`Plan of ${sub.clientName}`}>
          <SelectValue placeholder={sub.planName} />
        </SelectTrigger>
        <SelectContent>
          {plans.map((p) => (
            <SelectItem key={p.id} value={p.id}>
              {p.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {pending && (
        <AlertDialog open onOpenChange={(open) => !open && !busy && setPending(null)}>
          <AlertDialogContent className="max-w-lg">
            <AlertDialogHeader>
              <AlertDialogTitle>
                Move {sub.clientName} to {pending.name}
              </AlertDialogTitle>
              <AlertDialogDescription>
                The new plan&apos;s request allowance applies from now. The price applies from
                the {date(sub.currentPeriodEnd)} renewal — the current period and its invoice are
                unchanged, nothing is prorated and nothing is charged today.
                {pending.quoteOnly
                  ? " The new plan publishes no price: the retainer bills from its quoted monthly figure, which you set on this page."
                  : sub.quotedMonthlyPrice !== null
                    ? " The quoted monthly figure is cleared, because the new plan publishes its own price."
                    : ""}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <p className="text-base">
              <span className="text-muted-foreground">{current?.name ?? sub.planName} → </span>
              {pending.name}
              <span className="text-muted-foreground"> · from {date(sub.currentPeriodEnd)}: </span>
              <span className="font-mono">{pending.price}</span>
            </p>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={busy}>Keep {current?.name ?? sub.planName}</AlertDialogCancel>
              <AlertDialogAction
                variant="brand"
                disabled={busy}
                onClick={async (event) => {
                  event.preventDefault();
                  if (await onChange(pending.id)) setPending(null);
                }}
              >
                {busy && <LoadingIcon size="sm" />}
                Change plan
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  );
}

/**
 * The retainer's controls, stacked in the aside of /maintenance/[id].
 *
 * Every control that commits the client to something — status, interval,
 * plan, renewal — confirms first and shows the figure the server will bill;
 * auto-renew and the quote are reversible and save on change.
 */
export function RetainerActions({
  sub,
  plans,
  portalBase,
}: {
  sub: AdminSubscription;
  plans: readonly PlanOption[];
  portalBase: string;
}) {
  const { busy, send } = useMaintenanceSend();
  const [renewOpen, setRenewOpen] = React.useState(false);
  const cancelled = sub.status === "CANCELLED";
  const canInvoice = sub.invoiceAmount !== null;

  return (
    <div className="space-y-3 p-3">
      <Field label="Status">
        <StatusChange
          sub={sub}
          busy={busy === "status"}
          onChange={async (status) => {
            const message = await send("status", {
              action: "subscription-status",
              id: sub.id,
              status,
            });
            if (message !== null) toast.success("Status changed.");
            return message !== null;
          }}
        />
      </Field>

      <Field label="Plan">
        <PlanChange
          sub={sub}
          plans={plans}
          busy={busy === "plan"}
          onChange={async (planId) => {
            const message = await send("plan", { action: "subscription-plan", id: sub.id, planId });
            if (message !== null) toast.success(message || "Plan changed.");
            return message !== null;
          }}
        />
      </Field>

      <Field label="Billing">
        <IntervalChange
          sub={sub}
          intervals={sub.intervalPrices}
          busy={busy === "interval"}
          onChange={async (billingInterval) => {
            const message = await send("interval", {
              action: "subscription-interval",
              id: sub.id,
              billingInterval,
            });
            if (message !== null) toast.success(message || "Billing interval changed.");
            return message !== null;
          }}
        />
      </Field>

      <Field label="Auto-renew">
        <label className="flex items-center gap-2 text-base">
          <Switch
            checked={sub.autoRenew}
            disabled={cancelled || busy === "auto-renew"}
            aria-label={`Auto-renew ${sub.clientName}`}
            onCheckedChange={async (autoRenew) => {
              const message = await send("auto-renew", {
                action: "subscription-auto-renew",
                id: sub.id,
                autoRenew,
              });
              if (message !== null)
                toast.success(
                  autoRenew
                    ? "Renews on its own; a lapsed period reads as past due."
                    : "Will not renew; the retainer expires when the period ends.",
                );
            }}
          />
          <span className="text-muted-foreground">
            {sub.autoRenew ? "On — lapses as past due" : "Off — ends with the period"}
          </span>
        </label>
      </Field>

      {sub.quoteOnly && (
        <QuoteEditor
          sub={sub}
          busy={busy === "quote"}
          onSave={async (quotedMonthlyPrice) => {
            const message = await send("quote", {
              action: "subscription-quote",
              id: sub.id,
              quotedMonthlyPrice,
            });
            if (message !== null) toast.success(message || "Quote saved.");
            return message !== null;
          }}
        />
      )}

      <div className="flex flex-col gap-1.5 border-t border-border pt-3 [&>*]:w-full [&>*]:justify-start">
        <Button
          size="sm"
          variant="brand"
          disabled={cancelled || !canInvoice || busy === "renew"}
          onClick={() => setRenewOpen(true)}
        >
          Renew into the next period
        </Button>
        {!canInvoice && !cancelled && (
          <p className="text-meta text-subtle-foreground">
            Cannot renew until the quoted monthly price is set.
          </p>
        )}
        {sub.currentPeriodPayment === null && canInvoice && !cancelled && (
          <Button
            size="sm"
            variant="outline"
            disabled={busy === "record-invoice"}
            onClick={async () => {
              const message = await send("record-invoice", {
                action: "subscription-record-invoice",
                id: sub.id,
              });
              if (message !== null) toast.success(message || "Invoice recorded.");
            }}
          >
            {busy === "record-invoice" && <LoadingIcon size="sm" />}
            Record this period&apos;s invoice
          </Button>
        )}
        <PortalLink token={sub.portalToken} base={portalBase} />
      </div>

      {renewOpen && (
        <AlertDialog open onOpenChange={(open) => !open && busy !== "renew" && setRenewOpen(false)}>
          <AlertDialogContent className="max-w-lg">
            <AlertDialogHeader>
              <AlertDialogTitle>Renew {sub.clientName}</AlertDialogTitle>
              <AlertDialogDescription>
                Opens the next {sub.billingIntervalLabel.toLowerCase()} period from{" "}
                {date(sub.currentPeriodEnd)} — anchored to the period that ended, not to today —
                and a pending payment for it. A period that already has its payment is not
                invoiced twice.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <p className="text-base">
              <span className="text-muted-foreground">Invoice: </span>
              <span className="font-mono">
                {sub.invoiceAmount !== null ? money(sub.invoiceAmount, sub.currency) : "—"}
              </span>
            </p>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={busy === "renew"}>Not now</AlertDialogCancel>
              <AlertDialogAction
                variant="brand"
                disabled={busy === "renew"}
                onClick={async (event) => {
                  event.preventDefault();
                  const message = await send("renew", { action: "subscription-renew", id: sub.id });
                  if (message !== null) {
                    toast.success(message || "Renewed.");
                    setRenewOpen(false);
                  }
                }}
              >
                {busy === "renew" && <LoadingIcon size="sm" />}
                Renew
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="telemetry shrink-0 text-subtle-foreground">{label}</span>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

/**
 * The client's requests on this retainer, with the same status and billing
 * controls as the maintenance list — one place decides the wording.
 */
export function RetainerRequests({ sub }: { sub: AdminSubscription }) {
  const { busy, send } = useMaintenanceSend();

  if (sub.requests.length === 0) {
    return (
      <p className="px-3 py-6 text-center text-base text-muted-foreground">
        No requests yet from this client.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-border">
      {sub.requests.map((r: AdminRequest) => (
        <li
          key={r.id}
          className="grid gap-2 px-3 py-3 md:grid-cols-[1fr_auto] md:items-start"
        >
          <div className="min-w-0">
            <p className="text-base text-foreground">{r.title}</p>
            {r.detail && <p className="mt-0.5 text-meta text-muted-foreground">{r.detail}</p>}
            <p className="mt-1 flex flex-wrap items-center gap-2 text-meta text-muted-foreground">
              <Badge tone={REQUEST_TONE[r.status] ?? "neutral"}>
                {REQUEST_STATUS_LABEL[r.status] ?? r.status}
              </Badge>
              <span>sent {date(r.submittedAt)}</span>
              {r.completedAt && <span>· done {date(r.completedAt)}</span>}
              {!r.countsToCap && <Badge tone="warning">Overage</Badge>}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={r.status}
              disabled={busy === `req:${r.id}`}
              onValueChange={async (status) => {
                const message = await send(`req:${r.id}`, {
                  action: "request-status",
                  id: r.id,
                  status,
                });
                if (message !== null) toast.success("Request updated.");
              }}
            >
              <SelectTrigger size="sm" aria-label={`Status of ${r.title}`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(REQUEST_STATUS_LABEL).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              size="sm"
              variant="outline"
              disabled={busy === `bill:${r.id}`}
              onClick={async () => {
                const message = await send(`bill:${r.id}`, {
                  action: "request-billing",
                  id: r.id,
                  countsToCap: !r.countsToCap,
                });
                if (message !== null)
                  toast.success(
                    r.countsToCap ? "Marked as overage." : "Counted against the allowance.",
                  );
              }}
            >
              {r.countsToCap ? "Mark as overage" : "Count to allowance"}
            </Button>
          </div>
        </li>
      ))}
    </ul>
  );
}
