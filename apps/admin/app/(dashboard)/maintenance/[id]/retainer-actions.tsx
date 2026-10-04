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
import { RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/os/confirm-dialog";
import type { AdminRequest } from "@/lib/maintenance-admin";
import { date, money } from "@/lib/format";

import {
  IntervalChange,
  PortalLink,
  QuoteEditor,
  REQUEST_STATUS_LABEL,
  REQUEST_TONE,
  StatusChange,
} from "../maintenance-client";
import type { SubscriptionView } from "../subscription-view";

export interface PlanOption {
  id: string;
  name: string;
  quoteOnly: boolean;
  price: string | null;
}

function useMaintenanceSend() {
  const router = useRouter();
  const [busy, setBusy] = React.useState<string | null>(null);

  const request = React.useCallback(
    async (
      body: Record<string, unknown>,
    ): Promise<{ ok: boolean; message?: string }> => {
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
          return {
            ok: false,
            message: data.message ?? "That change was not saved.",
          };
        }
        router.refresh();
        return { ok: true, message: data.message };
      } catch {
        return { ok: false, message: "Could not reach the server." };
      }
    },
    [router],
  );

  const send = React.useCallback(
    async (
      key: string,
      body: Record<string, unknown>,
    ): Promise<string | null> => {
      setBusy(key);
      try {
        const result = await request(body);
        if (!result.ok) {
          toast.error(result.message ?? "That change was not saved.");
          return null;
        }
        return result.message ?? "";
      } finally {
        setBusy(null);
      }
    },
    [request],
  );

  return { busy, send, request };
}

function PlanChange({
  sub,
  plans,
  busy,
  showMoney,
  onChange,
}: {
  sub: SubscriptionView;
  plans: readonly PlanOption[];
  busy: boolean;
  showMoney: boolean;
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
        <AlertDialog
          open
          onOpenChange={(open) => !open && !busy && setPending(null)}
        >
          <AlertDialogContent className="max-w-lg">
            <AlertDialogHeader>
              <AlertDialogTitle>
                Move {sub.clientName} to {pending.name}
              </AlertDialogTitle>
              <AlertDialogDescription>
                The new plan&apos;s request allowance applies from now. The
                price applies from the {date(sub.currentPeriodEnd)} renewal —
                the current period and its invoice are unchanged, nothing is
                prorated and nothing is charged today.
                {pending.quoteOnly
                  ? " The new plan publishes no price: the retainer bills from its quoted monthly figure, which you set on this page."
                  : sub.quotedMonthlyPrice !== null
                    ? " The quoted monthly figure is cleared, because the new plan publishes its own price."
                    : ""}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <p className="text-base">
              <span className="text-muted-foreground">
                {current?.name ?? sub.planName} →{" "}
              </span>
              {pending.name}
              <span className="text-muted-foreground">
                {" "}
                · from {date(sub.currentPeriodEnd)}:{" "}
              </span>
              {showMoney && pending.price !== null ? (
                <span className="font-mono">{pending.price}</span>
              ) : (
                <span className="text-subtle-foreground">
                  the new plan&apos;s price (shown to finance roles)
                </span>
              )}
            </p>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={busy}>
                Keep {current?.name ?? sub.planName}
              </AlertDialogCancel>
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

export function RetainerActions({
  sub,
  plans,
  portalBase,
  showMoney = false,
  canEdit = false,
}: {
  sub: SubscriptionView;
  plans: readonly PlanOption[];
  portalBase: string;
  showMoney?: boolean;
  canEdit?: boolean;
}) {
  const { busy, send, request } = useMaintenanceSend();
  const periodFigure =
    showMoney && sub.currentPeriodInvoiceAmount !== null
      ? money(sub.currentPeriodInvoiceAmount, sub.currency)
      : "the plan's price at this period's interval";
  const cancelled = sub.status === "CANCELLED";
  const canInvoice = sub.invoiceAmount !== null;

  if (!canEdit) {
    return (
      <div className="space-y-3 p-3">
        <p className="text-meta text-subtle-foreground">
          Changing this retainer — its status, plan, billing or renewal — needs
          a finance role.
        </p>
        <div className="[&>*]:w-full [&>*]:justify-start">
          <PortalLink token={sub.portalToken} base={portalBase} />
        </div>
      </div>
    );
  }

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
          showMoney={showMoney}
          busy={busy === "plan"}
          onChange={async (planId) => {
            const message = await send("plan", {
              action: "subscription-plan",
              id: sub.id,
              planId,
            });
            if (message !== null) toast.success(message || "Plan changed.");
            return message !== null;
          }}
        />
      </Field>

      <Field label="Billing">
        <IntervalChange
          sub={sub}
          intervals={sub.intervalPrices}
          showMoney={showMoney}
          busy={busy === "interval"}
          onChange={async (billingInterval) => {
            const message = await send("interval", {
              action: "subscription-interval",
              id: sub.id,
              billingInterval,
            });
            if (message !== null)
              toast.success(message || "Billing interval changed.");
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
            {sub.autoRenew
              ? "On — lapses as past due"
              : "Off — ends with the period"}
          </span>
        </label>
      </Field>

      {sub.quoteOnly && showMoney && (
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
        <RenewRetainer sub={sub} showMoney={showMoney} size="sm" />
        {!canInvoice && !cancelled && (
          <p className="text-meta text-subtle-foreground">
            Cannot renew until the quoted monthly price is set.
          </p>
        )}
        {sub.currentPeriodPayment === null &&
          sub.currentPeriodInvoiceAmount !== null &&
          !cancelled && (
            <ConfirmDialog
              trigger={
                <Button size="sm" variant="outline">
                  Record this period&apos;s invoice
                </Button>
              }
              title={`Record this period's invoice for ${sub.clientName}`}
              body={`${sub.planName} · ${date(sub.currentPeriodStart)} → ${date(sub.currentPeriodEnd)}`}
              consequence={`Opens a pending payment of ${periodFigure} for the current period. No money is taken: it is marked paid by hand on the payments screen. A period that already has its payment is not invoiced twice.`}
              confirmLabel="Record invoice"
              onConfirm={async () => {
                const result = await request({
                  action: "subscription-record-invoice",
                  id: sub.id,
                });
                return result.ok
                  ? { ok: true, message: result.message || "Invoice recorded." }
                  : result;
              }}
            />
          )}
        <PortalLink token={sub.portalToken} base={portalBase} />
      </div>
    </div>
  );
}

export function RenewRetainer({
  sub,
  showMoney = false,
  size,
  label = "Renew into the next period",
}: {
  sub: SubscriptionView;
  showMoney?: boolean;
  size?: "sm";
  label?: string;
}) {
  const { request } = useMaintenanceSend();
  const [renewOpen, setRenewOpen] = React.useState(false);
  const invoiceFigure =
    showMoney && sub.invoiceAmount !== null
      ? money(sub.invoiceAmount, sub.currency)
      : "the plan's price at this interval";
  const cancelled = sub.status === "CANCELLED";
  const canInvoice = sub.invoiceAmount !== null;

  return (
    <>
      <Button
        size={size}
        variant="brand"
        disabled={cancelled || !canInvoice}
        onClick={() => setRenewOpen(true)}
      >
        <RefreshCw className="size-3.5" aria-hidden />
        {label}
      </Button>
      <ConfirmDialog
        open={renewOpen}
        onOpenChange={setRenewOpen}
        title={`Renew ${sub.clientName}`}
        body={`Opens the next ${sub.billingIntervalLabel.toLowerCase()} period from ${date(
          sub.currentPeriodEnd,
        )} — anchored to the period that ended, not to today.`}
        consequence={`Opens a pending payment of ${invoiceFigure} for the new period. No money is taken; a period that already has its payment is not invoiced twice.`}
        confirmLabel="Renew"
        cancelLabel="Not now"
        onConfirm={async () => {
          const result = await request({
            action: "subscription-renew",
            id: sub.id,
          });
          return result.ok
            ? { ok: true, message: result.message || "Renewed." }
            : result;
        }}
      />
    </>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="telemetry shrink-0 text-subtle-foreground">{label}</span>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

export function RetainerRequests({
  sub,
  canEdit = false,
}: {
  sub: SubscriptionView;
  canEdit?: boolean;
}) {
  const { busy, send, request } = useMaintenanceSend();

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
            {r.detail && (
              <p className="mt-0.5 text-meta text-muted-foreground">
                {r.detail}
              </p>
            )}
            <p className="mt-1 flex flex-wrap items-center gap-2 text-meta text-muted-foreground">
              <Badge tone={REQUEST_TONE[r.status] ?? "neutral"}>
                {REQUEST_STATUS_LABEL[r.status] ?? r.status}
              </Badge>
              <span>sent {date(r.submittedAt)}</span>
              {r.completedAt && <span>· done {date(r.completedAt)}</span>}
              {!r.countsToCap && <Badge tone="warning">Overage</Badge>}
            </p>
          </div>

          {canEdit && (
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
                  {Object.entries(REQUEST_STATUS_LABEL).map(
                    ([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ),
                  )}
                </SelectContent>
              </Select>
              <ConfirmDialog
                trigger={
                  <Button size="sm" variant="outline">
                    {r.countsToCap ? "Mark as overage" : "Count to allowance"}
                  </Button>
                }
                title={
                  r.countsToCap
                    ? `Mark “${r.title}” as overage`
                    : `Count “${r.title}” to the allowance`
                }
                body={`${sub.clientName} · ${sub.planName}`}
                consequence={
                  r.countsToCap
                    ? "The request stops counting against this cycle's included allowance and becomes billable as overage. Nothing is invoiced by this step — the overage is priced and recorded on the payments screen — and the client's portal shows it as billable."
                    : "The request counts against this cycle's included allowance again and is no longer billable as overage. Any payment already recorded for it is not touched."
                }
                confirmLabel={
                  r.countsToCap ? "Mark as overage" : "Count to allowance"
                }
                onConfirm={async () => {
                  const result = await request({
                    action: "request-billing",
                    id: r.id,
                    countsToCap: !r.countsToCap,
                  });
                  return result.ok
                    ? {
                        ok: true,
                        message: r.countsToCap
                          ? "Marked as overage."
                          : "Counted against the allowance.",
                      }
                    : result;
                }}
              />
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}
