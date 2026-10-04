"use client";

import type { AdminRequest } from "@/lib/maintenance-admin";
import { cn } from "@/lib/utils";
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
  DropdownMenuItem,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui";
import { LoadingIcon } from "@repo/ui";
import { Building2, Check, Copy, Plus } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/os/confirm-dialog";
import { RowActions, useRecordDelete } from "@/components/os/delete-record";
import { EmptyState } from "@/components/os/empty-state";
import { Panel } from "@/components/os/panel";
import { StatusPill } from "@/components/ui/badge";
import { money } from "@/lib/format";
import { StatTile } from "@/components/os/stat-tile";

import type { SubscriptionView } from "./subscription-view";

export const REQUEST_STATUS_LABEL: Record<string, string> = {
  SUBMITTED: "Received",
  IN_PROGRESS: "In progress",
  COMPLETED: "Done",
  DECLINED: "Not proceeding",
};

export const REQUEST_TONE: Record<
  string,
  "neutral" | "warning" | "success" | "danger"
> = {
  SUBMITTED: "warning",
  IN_PROGRESS: "neutral",
  COMPLETED: "success",
  DECLINED: "danger",
};

export const SUBSCRIPTION_STATUSES = [
  "TRIALING",
  "ACTIVE",
  "SUSPENDED",
  "PAUSED",
  "CANCELLED",
] as const;

const shortDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
const longDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

export interface IntervalOption {
  value: string;
  label: string;
  price: string | null;
}

export function IntervalChange({
  sub,
  intervals,
  busy,
  showMoney = false,
  onChange,
}: {
  sub: SubscriptionView;
  intervals: readonly IntervalOption[];
  busy: boolean;
  showMoney?: boolean;
  onChange: (interval: string) => Promise<boolean>;
}) {
  const [pending, setPending] = React.useState<IntervalOption | null>(null);

  return (
    <>
      <Select
        value={sub.billingInterval}
        disabled={sub.status === "CANCELLED" || intervals.length === 0}
        onValueChange={(value) => {
          const next = intervals.find((i) => i.value === value);
          if (next && next.value !== sub.billingInterval) setPending(next);
        }}
      >
        <SelectTrigger
          size="sm"
          aria-label={`Billing interval of ${sub.clientName}`}
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {intervals.map((i) => (
            <SelectItem key={i.value} value={i.value}>
              {i.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {pending && (
        <AlertDialog
          open
          onOpenChange={(next) => !next && !busy && setPending(null)}
        >
          <AlertDialogContent className="max-w-lg">
            <AlertDialogHeader>
              <AlertDialogTitle>
                Bill {sub.clientName} {pending.label.toLowerCase()}
              </AlertDialogTitle>
              <AlertDialogDescription>
                The current period runs to {longDate(sub.currentPeriodEnd)} and
                is not changed. The new interval and price apply from that
                renewal — nothing is prorated and nothing is charged today.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <p className="text-base">
              <span className="text-muted-foreground">
                From {shortDate(sub.currentPeriodEnd)}:{" "}
              </span>
              {showMoney && pending.price !== null ? (
                <span className="font-mono">{pending.price}</span>
              ) : (
                <span className="text-subtle-foreground">
                  {pending.label} — the figure is shown to finance roles
                </span>
              )}
            </p>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                variant="brand"
                disabled={busy}
                onClick={async (event) => {
                  event.preventDefault();
                  if (await onChange(pending.value)) setPending(null);
                }}
              >
                {busy && <LoadingIcon size="sm" />}
                Change billing
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  );
}

const STATUS_CHANGE: Record<
  (typeof SUBSCRIPTION_STATUSES)[number],
  {
    label: string;
    verb: string;
    past: string;
    consequence: string;
    destructive: boolean;
  }
> = {
  TRIALING: {
    label: "Trial",
    verb: "Move to trial",
    past: "moved to trial",
    consequence:
      "The retainer reads as a trial until its period ends; the allowance and portal stay open.",
    destructive: false,
  },
  ACTIVE: {
    label: "Active",
    verb: "Set active",
    past: "set active",
    consequence:
      "The retainer is live again. Its period dates are unchanged — if the period has already lapsed it will read as past due until it is renewed.",
    destructive: false,
  },
  PAUSED: {
    label: "Paused",
    verb: "Pause retainer",
    past: "paused",
    consequence:
      "The client keeps the portal link but the retainer is held: it will not read as past due and nothing further is invoiced until it is set active again.",
    destructive: false,
  },
  SUSPENDED: {
    label: "Suspended",
    verb: "Suspend retainer",
    past: "suspended",
    consequence:
      "Work stops for non-payment. The retainer is held exactly like a pause, but the audit trail records it as a suspension.",
    destructive: true,
  },
  CANCELLED: {
    label: "Cancelled",
    verb: "Cancel retainer",
    past: "cancelled",
    consequence:
      "The portal link stops working at once and the client can no longer send requests. Nothing further is invoiced. A cancelled retainer cannot be renewed or moved to another plan — start a new one instead.",
    destructive: true,
  },
};

export function StatusChange({
  sub,
  busy,
  onChange,
}: {
  sub: SubscriptionView;
  busy: boolean;
  onChange: (
    status: (typeof SUBSCRIPTION_STATUSES)[number],
  ) => Promise<boolean>;
}) {
  const [pending, setPending] = React.useState<
    (typeof SUBSCRIPTION_STATUSES)[number] | null
  >(null);
  const next = pending ? STATUS_CHANGE[pending] : null;

  return (
    <>
      <Select
        value={sub.status}
        onValueChange={(value) => {
          const status = SUBSCRIPTION_STATUSES.find((s) => s === value);
          if (status && status !== sub.status) setPending(status);
        }}
      >
        <SelectTrigger size="sm" aria-label={`Status of ${sub.clientName}`}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {SUBSCRIPTION_STATUSES.map((s) => (
            <SelectItem key={s} value={s}>
              {STATUS_CHANGE[s].label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {pending && next && (
        <AlertDialog
          open
          onOpenChange={(open) => !open && !busy && setPending(null)}
        >
          <AlertDialogContent className="max-w-lg">
            <AlertDialogHeader>
              <AlertDialogTitle>
                {next.verb} for {sub.clientName}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {next.consequence}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <p className="text-base">
              <span className="text-muted-foreground">{sub.planName} · </span>
              {STATUS_CHANGE[
                sub.status as (typeof SUBSCRIPTION_STATUSES)[number]
              ]?.label ?? sub.status}
              <span className="text-muted-foreground"> → </span>
              {next.label}
            </p>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={busy}>Keep as is</AlertDialogCancel>
              <AlertDialogAction
                variant={next.destructive ? "destructive" : "brand"}
                disabled={busy}
                onClick={async (event) => {
                  event.preventDefault();
                  if (await onChange(pending)) setPending(null);
                }}
              >
                {busy && <LoadingIcon size="sm" />}
                {next.verb}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  );
}

export function QuoteEditor({
  sub,
  busy,
  onSave,
}: {
  sub: SubscriptionView;
  busy: boolean;
  onSave: (quotedMonthlyPrice: number | null) => Promise<boolean>;
}) {
  const [draft, setDraft] = React.useState("");
  const typed = Number(draft);
  const valid = draft !== "" && Number.isInteger(typed) && typed > 0;

  return (
    <div className="mb-2 flex flex-wrap items-center gap-2">
      <span className="text-meta text-subtle-foreground">
        {sub.quotedMonthlyPrice === null
          ? "Quoted plan — no monthly price set yet, so nothing can be invoiced."
          : `Quoted at ${money(sub.quotedMonthlyPrice, sub.currency)} a month.`}{" "}
        A new figure applies from the next invoice; opened payments keep their
        amount.
      </span>
      <Input
        type="number"
        inputMode="numeric"
        min={1}
        step={1}
        placeholder={`${sub.currency} a month`}
        value={draft}
        disabled={busy}
        onChange={(e) => setDraft(e.target.value)}
        aria-label={`Quoted monthly price for ${sub.clientName}`}
        className="h-8 w-32 shrink-0"
      />
      <Button
        variant="outline"
        size="sm"
        disabled={busy || !valid}
        onClick={async () => {
          if (await onSave(typed)) setDraft("");
        }}
      >
        {sub.quotedMonthlyPrice === null
          ? "Set quoted price"
          : "Change quoted price"}
      </Button>
      {sub.quotedMonthlyPrice !== null && (
        <Button
          variant="ghost"
          size="sm"
          disabled={busy}
          onClick={() => onSave(null)}
        >
          Clear
        </Button>
      )}
    </div>
  );
}

export function PortalLink({ token, base }: { token: string; base: string }) {
  const [copied, setCopied] = React.useState(false);

  const copy = React.useCallback(async () => {
    const url = `${base}/client-portal/${token}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success("Portal link copied.");
    } catch {
      toast.info(url, { duration: 15000 });
    }
  }, [base, token]);

  return (
    <Button size="sm" variant="secondary" onClick={copy}>
      {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
      Portal link
    </Button>
  );
}

export function MaintenanceClient({
  subscriptions,
  clients,
  plans,
  portalBase,
  showMoney = false,
  canCreate = false,
  canEdit = false,
  canDelete = false,
  canOpenClient = false,
  defaultClientId,
  focusNew = false,
}: {
  subscriptions: readonly SubscriptionView[];
  portalBase: string;
  showMoney?: boolean;
  canCreate?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
  canOpenClient?: boolean;
  defaultClientId?: string;
  focusNew?: boolean;
  clients: readonly { id: string; label: string }[];
  plans: readonly {
    id: string;
    name: string;
    quoteOnly: boolean;
    intervals: readonly IntervalOption[];
  }[];
}) {
  const router = useRouter();
  const [busy, setBusy] = React.useState<string | null>(null);
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [newClient, setNewClient] = React.useState(
    clients.some((c) => c.id === defaultClientId) ? defaultClientId! : "",
  );
  const newFormRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!focusNew) return;
    newFormRef.current?.scrollIntoView({ block: "center" });
    const params = new URLSearchParams(searchParams.toString());
    params.delete("new");
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [newPlan, setNewPlan] = React.useState(plans[0]?.id ?? "");
  const [newInterval, setNewInterval] = React.useState("MONTHLY");
  const [newQuote, setNewQuote] = React.useState("");

  const chosenPlan = plans.find((p) => p.id === newPlan);
  const chosenInterval = chosenPlan?.intervals.find(
    (i) => i.value === newInterval,
  );
  const newQuoteValue = Number(newQuote);
  const newQuoteValid =
    newQuote !== "" && Number.isInteger(newQuoteValue) && newQuoteValue > 0;

  const request = React.useCallback(
    async (init: RequestInit): Promise<{ ok: boolean; message?: string }> => {
      try {
        const res = await fetch("/api/admin/maintenance", {
          headers: { "Content-Type": "application/json" },
          ...init,
        });
        const data = (await res.json().catch(() => ({}))) as {
          success?: boolean;
          message?: string;
        };
        if (res.status === 401)
          return { ok: false, message: "Your session expired. Sign in again." };
        if (!data.success)
          return {
            ok: false,
            message: data.message ?? "The change could not be saved.",
          };
        router.refresh();
        return {
          ok: true,
          message: typeof data.message === "string" ? data.message : undefined,
        };
      } catch {
        return { ok: false, message: "The change could not be saved." };
      }
    },
    [router],
  );

  const send = React.useCallback(
    async (
      key: string,
      init: RequestInit,
      options: { onSuccess?: (message: string | undefined) => void } = {},
    ): Promise<boolean> => {
      setBusy(key);
      try {
        const result = await request(init);
        if (!result.ok) {
          toast.error(result.message ?? "The change could not be saved.");
          return false;
        }
        options.onSuccess?.(result.message);
        return true;
      } finally {
        setBusy(null);
      }
    },
    [request],
  );

  const delSubscription = useRecordDelete({
    entity: "maintenanceSubscription",
  });
  const delRequest = useRecordDelete({ entity: "maintenanceRequest" });

  const totalOpen = subscriptions.reduce((n, s) => n + s.openRequests, 0);
  const active = subscriptions.filter(
    (s) => s.effectiveStatus === "ACTIVE",
  ).length;
  const needsBilling = subscriptions.filter(
    (s) => s.renewalUrgency === "overdue" || s.renewalUrgency === "due-soon",
  ).length;
  const overCap = subscriptions.filter(
    (s) => s.requestsPerCycle !== null && s.requestsUsed >= s.requestsPerCycle,
  ).length;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label="Active retainers"
          value={active}
          sub={`${subscriptions.length} total`}
        />
        <StatTile
          label="Open requests"
          value={totalOpen}
          sub={totalOpen ? "Awaiting work" : "Nothing outstanding"}
          tone={totalOpen ? "warning" : "success"}
        />
        <StatTile
          label="At their cap"
          value={overCap}
          sub={
            overCap ? "Further work bills as overage" : "All within allowance"
          }
          tone={overCap ? "warning" : "neutral"}
        />
        <StatTile
          label="Needs billing"
          value={needsBilling}
          sub={needsBilling ? "Overdue or due within 30 days" : "Nothing due"}
          tone={needsBilling ? "warning" : "success"}
        />
      </div>

      {canCreate && (
        <div ref={newFormRef} id="new-retainer" className="scroll-mt-20">
        <Panel
          title="Start a retainer"
          description="One live plan per client. The portal link is generated with it."
        >
          <div className="flex flex-wrap items-end gap-3">
            <label className="flex min-w-56 flex-col gap-1">
              <span className="text-meta uppercase tracking-wider text-muted-foreground">
                Client
              </span>
              <Select value={newClient} onValueChange={setNewClient}>
                <SelectTrigger size="sm" aria-label="Client">
                  <SelectValue placeholder="Choose a client" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>
            <label className="flex min-w-44 flex-col gap-1">
              <span className="text-meta uppercase tracking-wider text-muted-foreground">
                Plan
              </span>
              <Select value={newPlan} onValueChange={setNewPlan}>
                <SelectTrigger size="sm" aria-label="Plan">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {plans.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>
            <label className="flex min-w-36 flex-col gap-1">
              <span className="text-meta uppercase tracking-wider text-muted-foreground">
                Billed
              </span>
              <Select value={newInterval} onValueChange={setNewInterval}>
                <SelectTrigger size="sm" aria-label="Billing interval">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {chosenPlan?.intervals.map((i) => (
                    <SelectItem key={i.value} value={i.value}>
                      {i.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>
            {chosenPlan?.quoteOnly ? (
              showMoney ? (
                <label className="flex min-w-36 flex-col gap-1">
                  <span className="text-meta uppercase tracking-wider text-muted-foreground">
                    Quoted / month
                  </span>
                  <Input
                    type="number"
                    inputMode="numeric"
                    min={1}
                    step={1}
                    placeholder="EGP a month"
                    value={newQuote}
                    onChange={(e) => setNewQuote(e.target.value)}
                    aria-label="Quoted monthly price"
                    className="h-8"
                  />
                </label>
              ) : (
                <span className="pb-1.5 text-meta text-subtle-foreground">
                  A quoted plan needs its monthly figure, which a finance role
                  sets.
                </span>
              )
            ) : (
              chosenInterval &&
              showMoney &&
              chosenInterval.price !== null && (
                <span className="pb-1.5 font-mono text-base text-muted-foreground">
                  {chosenInterval.price}
                </span>
              )
            )}
            <Button
              variant="brand"
              size="sm"
              disabled={
                !newClient ||
                !newPlan ||
                busy === "create" ||
                (chosenPlan?.quoteOnly === true &&
                  !(showMoney && newQuoteValid))
              }
              onClick={async () => {
                const ok = await send(
                  "create",
                  {
                    method: "POST",
                    body: JSON.stringify({
                      clientId: newClient,
                      planId: newPlan,
                      billingInterval: newInterval,
                      ...(chosenPlan?.quoteOnly && newQuoteValid
                        ? { quotedMonthlyPrice: newQuoteValue }
                        : {}),
                    }),
                  },
                  {
                    onSuccess: (message) =>
                      toast.success(message ?? "Retainer started."),
                  },
                );
                if (ok) {
                  setNewClient("");
                  setNewQuote("");
                }
              }}
            >
              {busy === "create" ? (
                <LoadingIcon size="sm" />
              ) : (
                <Plus className="size-3.5" />
              )}
              Start plan
            </Button>
          </div>
        </Panel>
        </div>
      )}

      {subscriptions.length === 0 ? (
        <EmptyState
          title="No maintenance retainers yet"
          body="Start one above. The client gets a portal link where they can send requests and see what is left of their allowance."
        />
      ) : (
        subscriptions.map((sub) => {
          const cap = sub.requestsPerCycle;
          const atCap = cap !== null && sub.requestsUsed >= cap;
          return (
            <Panel
              key={sub.id}
              title={
                <Link
                  href={`/maintenance/${sub.id}`}
                  className="hover:text-brand hover:underline"
                >
                  {sub.clientName}
                </Link>
              }
              description={`${sub.planName} · ${sub.billingIntervalLabel}${
                sub.billingIntervalPending
                  ? ` from ${shortDate(sub.renewsAt)}`
                  : ""
              }${
                showMoney
                  ? ` · ${[sub.planPriceLabel, sub.planPriceSuffix].filter(Boolean).join(" ")}`
                  : ""
              } · ${sub.effectiveStatusLabel} · ${
                sub.daysUntilRenewal < 0
                  ? `renewal ${Math.abs(sub.daysUntilRenewal)}d overdue`
                  : sub.autoRenew
                    ? `renews in ${sub.daysUntilRenewal}d`
                    : `ends in ${sub.daysUntilRenewal}d — not renewing`
              }`}
              action={
                <div className="flex items-center gap-2">
                  <PortalLink token={sub.portalToken} base={portalBase} />
                  {canEdit && (
                    <IntervalChange
                      sub={sub}
                      intervals={sub.intervalPrices}
                      showMoney={showMoney}
                      busy={busy === `interval:${sub.id}`}
                      onChange={async (billingInterval) => {
                        const ok = await send(`interval:${sub.id}`, {
                          method: "PATCH",
                          body: JSON.stringify({
                            action: "subscription-interval",
                            id: sub.id,
                            billingInterval,
                          }),
                        });
                        if (ok)
                          toast.success(
                            "Billing interval changed from the next renewal.",
                          );
                        return ok;
                      }}
                    />
                  )}
                  {canEdit && (
                    <StatusChange
                      sub={sub}
                      busy={busy === `sub:${sub.id}`}
                      onChange={async (status) => {
                        const ok = await send(`sub:${sub.id}`, {
                          method: "PATCH",
                          body: JSON.stringify({
                            action: "subscription-status",
                            id: sub.id,
                            status,
                          }),
                        });
                        if (ok)
                          toast.success(
                            `Retainer ${STATUS_CHANGE[status].past}.`,
                          );
                        return ok;
                      }}
                    />
                  )}
                  {(canDelete || canOpenClient) && (
                    <RowActions
                      onDelete={
                        canDelete
                          ? () =>
                              delSubscription.request({
                                id: sub.id,
                                label: `${sub.planName} · ${sub.clientName}`,
                              })
                          : undefined
                      }
                      deleteLabel="Delete retainer"
                    >
                      {canOpenClient && (
                        <DropdownMenuItem asChild>
                          <Link href={`/clients/${sub.clientId}`}>
                            <Building2 className="size-3.5" />
                            Open client
                          </Link>
                        </DropdownMenuItem>
                      )}
                    </RowActions>
                  )}
                </div>
              }
            >
              {sub.quoteOnly &&
                sub.status !== "CANCELLED" &&
                showMoney &&
                canEdit && (
                  <QuoteEditor
                    sub={sub}
                    busy={busy === `quote:${sub.id}`}
                    onSave={async (quotedMonthlyPrice) => {
                      const ok = await send(`quote:${sub.id}`, {
                        method: "PATCH",
                        body: JSON.stringify({
                          action: "subscription-quote",
                          id: sub.id,
                          quotedMonthlyPrice,
                        }),
                      });
                      if (ok) {
                        toast.success(
                          quotedMonthlyPrice === null
                            ? "Quoted price cleared."
                            : "Quoted price set from the next invoice.",
                        );
                      }
                      return ok;
                    }}
                  />
                )}
              {sub.currentPeriodPayment ? (
                <p className="mb-2 flex items-center gap-2 text-base">
                  <span className="text-muted-foreground">
                    This period&rsquo;s invoice
                  </span>
                  {showMoney && sub.currentPeriodPayment.amount !== null && (
                    <span className="font-mono">
                      {money(sub.currentPeriodPayment.amount, sub.currency)}
                    </span>
                  )}
                  <StatusPill
                    registry="paymentStatus"
                    value={sub.currentPeriodPayment.status}
                    variant="dot"
                  />
                  {sub.currentPeriodPayment.dueDate && (
                    <span className="text-meta text-subtle-foreground">
                      due {shortDate(sub.currentPeriodPayment.dueDate)}
                    </span>
                  )}
                </p>
              ) : (
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <p className="text-meta text-subtle-foreground">
                    No invoice recorded for this period — it opened before
                    renewals wrote payments.
                  </p>
                  {sub.status !== "CANCELLED" && canEdit && (
                    <ConfirmDialog
                      trigger={
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={sub.currentPeriodInvoiceAmount === null}
                        >
                          Record invoice for this period
                        </Button>
                      }
                      title={`Record this period's invoice for ${sub.clientName}`}
                      body={`${sub.planName} · ${longDate(sub.currentPeriodStart)} → ${longDate(sub.currentPeriodEnd)}`}
                      consequence={`Opens a pending payment of ${
                        showMoney && sub.currentPeriodInvoiceAmount !== null
                          ? money(sub.currentPeriodInvoiceAmount, sub.currency)
                          : "the plan's price at this period's interval"
                      } for the current period. No money is taken: it is marked paid by hand on the payments screen. A period that already has its payment is not invoiced twice.`}
                      confirmLabel="Record invoice"
                      onConfirm={async () => {
                        const result = await request({
                          method: "PATCH",
                          body: JSON.stringify({
                            action: "subscription-record-invoice",
                            id: sub.id,
                          }),
                        });
                        return result.ok
                          ? {
                              ok: true,
                              message:
                                result.message ??
                                "Invoice recorded for this period.",
                            }
                          : result;
                      }}
                    />
                  )}
                </div>
              )}

              <p className="mb-4 text-base">
                {cap === null ? (
                  <span className="text-muted-foreground">
                    Quote-only plan — no published request allowance.
                  </span>
                ) : (
                  <>
                    <span className={cn("font-mono", atCap && "text-warning")}>
                      {sub.requestsUsed} of {cap}
                    </span>{" "}
                    <span className="text-muted-foreground">
                      included requests used this cycle
                      {atCap && " — further work bills as overage"}
                    </span>
                  </>
                )}
              </p>

              {sub.requests.length === 0 ? (
                <p className="text-base text-muted-foreground">
                  No requests yet from this client.
                </p>
              ) : (
                <ul className="space-y-3">
                  {sub.requests.map((r: AdminRequest) => (
                    <li
                      key={r.id}
                      className="grid gap-2 border-b border-border pb-3 last:border-0 last:pb-0 md:grid-cols-[1fr_auto] md:items-start"
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
                          <span>sent {shortDate(r.submittedAt)}</span>
                          {r.completedAt && (
                            <span>· done {shortDate(r.completedAt)}</span>
                          )}
                          {!r.countsToCap && (
                            <Badge tone="warning">Overage</Badge>
                          )}
                        </p>
                      </div>

                      {(canEdit || canDelete) && (
                        <div className="flex flex-wrap items-center gap-2">
                          {canEdit && (
                            <Select
                              value={r.status}
                              onValueChange={(status) =>
                                send(`req:${r.id}`, {
                                  method: "PATCH",
                                  body: JSON.stringify({
                                    action: "request-status",
                                    id: r.id,
                                    status,
                                  }),
                                })
                              }
                            >
                              <SelectTrigger
                                size="sm"
                                aria-label={`Status of ${r.title}`}
                              >
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
                          )}

                          {canEdit && (
                            <ConfirmDialog
                              trigger={
                                <Button size="sm" variant="secondary">
                                  {r.countsToCap
                                    ? "Mark as overage"
                                    : "Count to allowance"}
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
                                r.countsToCap
                                  ? "Mark as overage"
                                  : "Count to allowance"
                              }
                              onConfirm={async () => {
                                const result = await request({
                                  method: "PATCH",
                                  body: JSON.stringify({
                                    action: "request-billing",
                                    id: r.id,
                                    countsToCap: !r.countsToCap,
                                  }),
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
                          )}

                          {canDelete && (
                            <RowActions
                              onDelete={() =>
                                delRequest.request({ id: r.id, label: r.title })
                              }
                              deleteLabel="Delete request"
                            />
                          )}
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          );
        })
      )}

      {delSubscription.dialog}
      {delRequest.dialog}
    </div>
  );
}
