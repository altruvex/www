"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button, Switch } from "@repo/ui";

import { ConfirmDialog } from "@/components/os/confirm-dialog";
import { EntityLink } from "@/components/os/entity-link";
import { Panel } from "@/components/os/panel";
import { StatusPill, ToneBadge } from "@/components/ui/badge";
import { date, money } from "@/lib/format";
import { statusOf } from "@/lib/status";
import { cn } from "@/lib/utils";

import type { SubscriptionView } from "./subscription-view";

export function RenewalsPanel({
  subscriptions,
  showMoney = false,
  canEdit = false,
}: {
  subscriptions: readonly SubscriptionView[];
  showMoney?: boolean;
  canEdit?: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = React.useState<string | null>(null);
  const [confirming, setConfirming] = React.useState<SubscriptionView | null>(
    null,
  );

  const due = subscriptions
    .filter(
      (s) => s.renewalUrgency !== "scheduled" && s.renewalUrgency !== "none",
    )
    .sort((a, b) => a.daysUntilRenewal - b.daysUntilRenewal);

  async function request(
    body: unknown,
  ): Promise<{ ok: boolean; message?: string }> {
    try {
      const res = await fetch("/api/admin/maintenance", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.status === 401) {
        router.push("/login");
        return { ok: false, message: "Your session expired. Sign in again." };
      }
      const data = (await res.json().catch(() => ({}))) as {
        success?: boolean;
        message?: string;
      };
      if (!data.success)
        return {
          ok: false,
          message: data.message ?? "That change could not be saved.",
        };
      router.refresh();
      return { ok: true, message: data.message };
    } catch {
      return {
        ok: false,
        message: "The request could not be sent. Check your connection.",
      };
    }
  }

  async function send(id: string, body: unknown, okMessage: string) {
    setBusy(id);
    try {
      const result = await request(body);
      if (!result.ok)
        toast.error(result.message ?? "That change could not be saved.");
      else toast.success(okMessage);
    } finally {
      setBusy(null);
    }
  }

  if (due.length === 0) {
    return (
      <Panel
        title="Renewals"
        description="Nothing needs a decision in the next 30 days"
        flush
      >
        <p className="px-3 py-6 text-base text-muted-foreground">
          Every retainer is inside its paid period with auto-renewal on. A
          retainer appears here once it is within 30 days of its renewal date,
          once it lapses unpaid, or as soon as auto-renewal is switched off.
        </p>
      </Panel>
    );
  }

  return (
    <Panel
      title="Renewals"
      description={`${due.length} retainer${due.length === 1 ? " needs" : "s need"} a decision`}
      flush
    >
      <ul className="divide-y divide-border">
        {due.map((sub) => {
          const urgency = statusOf("renewalUrgency", sub.renewalUrgency);
          const isBusy = busy === sub.id;
          return (
            <li
              key={sub.id}
              className={cn(
                "flex flex-wrap items-center gap-x-3 gap-y-2 px-3 py-2.5",
                isBusy && "opacity-60",
              )}
            >
              <ToneBadge tone={urgency.tone} className="shrink-0">
                {urgency.label}
              </ToneBadge>

              <div className="min-w-0 flex-1">
                <p className="truncate text-base font-medium">
                  <EntityLink type="client" id={sub.clientId}>
                    {sub.clientName}
                  </EntityLink>
                </p>
                <p className="truncate text-meta text-subtle-foreground">
                  {sub.planName}
                  {showMoney && ` · ${sub.planPriceLabel}`}
                  {showMoney &&
                    sub.planPriceSuffix &&
                    ` ${sub.planPriceSuffix}`}{" "}
                  ·{" "}
                  {sub.daysUntilRenewal < 0
                    ? `${Math.abs(sub.daysUntilRenewal)} days overdue`
                    : `in ${sub.daysUntilRenewal} days`}
                  {" · "}
                  {date(sub.renewsAt)}
                </p>
              </div>

              <StatusPill
                registry="subscriptionStatus"
                value={sub.effectiveStatus}
                variant="dot"
                className="shrink-0"
              />

              {sub.currentPeriodPayment && (
                <span className="flex shrink-0 items-center gap-1.5 text-meta text-subtle-foreground">
                  {showMoney &&
                    sub.currentPeriodPayment.amount !== null &&
                    money(sub.currentPeriodPayment.amount, sub.currency)}
                  <StatusPill
                    registry="paymentStatus"
                    value={sub.currentPeriodPayment.status}
                    variant="dot"
                  />
                </span>
              )}

              {canEdit && (
                <label className="flex shrink-0 items-center gap-1.5">
                  <Switch
                    checked={sub.autoRenew}
                    disabled={isBusy}
                    onCheckedChange={(checked) =>
                      send(
                        sub.id,
                        {
                          action: "subscription-auto-renew",
                          id: sub.id,
                          autoRenew: checked,
                        },
                        checked
                          ? "Auto-renewal on."
                          : `Auto-renewal off — expires ${date(sub.renewsAt)}.`,
                      )
                    }
                    aria-label={`Auto-renew ${sub.clientName}`}
                  />
                  <span className="text-meta text-subtle-foreground">Auto</span>
                </label>
              )}

              {canEdit && (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isBusy}
                  onClick={() => setConfirming(sub)}
                >
                  {isBusy ? "Working…" : "Mark renewed"}
                </Button>
              )}
            </li>
          );
        })}
      </ul>

      {confirming && (
        <ConfirmDialog
          open
          onOpenChange={(open) => !open && setConfirming(null)}
          title={`Mark ${confirming.clientName} renewed`}
          body={`${confirming.planName} · next period starts ${date(confirming.currentPeriodEnd)}, anchored to the period that ended rather than to today.`}
          consequence={`Opens a pending payment of ${
            showMoney && confirming.invoiceAmount !== null
              ? money(confirming.invoiceAmount, confirming.currency)
              : "the plan's price at this interval"
          } for the new period. No money is taken; a period that already has its payment is not invoiced twice.`}
          confirmLabel="Mark renewed"
          cancelLabel="Not now"
          onConfirm={async () => {
            const result = await request({
              action: "subscription-renew",
              id: confirming.id,
            });
            if (!result.ok) return result;
            return {
              ok: true,
              message: result.message ?? "Renewed into the next period.",
            };
          }}
        />
      )}

      <p className="border-t border-border px-3 py-2 text-meta text-subtle-foreground">
        &ldquo;Mark renewed&rdquo; moves the retainer into its next period and
        opens that period&rsquo;s invoice as a pending payment at the
        plan&rsquo;s published price — a quote-only plan bills from its quoted
        monthly price. It does not take the money: no payment provider is
        connected, so the payment is marked paid by hand on the payments screen.
      </p>
    </Panel>
  );
}
