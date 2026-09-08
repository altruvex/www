"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button, Switch } from "@repo/ui";

import { Panel } from "@/components/os/panel";
import { StatusPill, ToneBadge } from "@/components/ui/badge";
import type { AdminSubscription } from "@/lib/maintenance-admin";
import { date } from "@/lib/format";
import { statusOf } from "@/lib/status";
import { cn } from "@/lib/utils";

/**
 * Renewals (§10).
 *
 * The requirement this answers is "do not make the operator open every client
 * to discover what is expiring". Anything needing money or a decision inside the
 * horizon appears here, sorted by how late it is.
 *
 * Two states that a naive "days until renewal" list would conflate are kept
 * apart deliberately:
 *   overdue  — auto-renewing, the date passed, payment is not recorded.
 *   ending   — auto-renew is OFF. Not a renewal at all, a scheduled churn event.
 *              It needs to be visible BEFORE the date, not discovered after it.
 */
export function RenewalsPanel({ subscriptions }: { subscriptions: readonly AdminSubscription[] }) {
  const router = useRouter();
  const [busy, setBusy] = React.useState<string | null>(null);

  const due = subscriptions
    .filter((s) => s.renewalUrgency !== "scheduled" && s.renewalUrgency !== "none")
    .sort((a, b) => a.daysUntilRenewal - b.daysUntilRenewal);

  async function send(id: string, body: unknown, okMessage: string) {
    setBusy(id);
    try {
      const res = await fetch("/api/admin/maintenance", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.status === 401) {
        toast.error("Your session expired. Sign in again.");
        router.push("/login");
        return;
      }
      const data = (await res.json()) as { success: boolean; message?: string };
      if (!data.success) {
        toast.error(data.message ?? "That change could not be saved.");
        return;
      }
      toast.success(okMessage);
      router.refresh();
    } catch {
      toast.error("The request could not be sent. Check your connection.");
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
          Every retainer is inside its paid period with auto-renewal on. A retainer
          appears here once it is within 30 days of its renewal date, once it lapses
          unpaid, or as soon as auto-renewal is switched off.
        </p>
      </Panel>
    );
  }

  return (
    <Panel
      title="Renewals"
      description={`${due.length} retainer${due.length === 1 ? "" : "s"} need a decision`}
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
                  <Link
                    href={`/clients/${sub.clientId}`}
                    className="hover:text-brand hover:underline"
                  >
                    {sub.clientName}
                  </Link>
                </p>
                <p className="truncate text-meta text-subtle-foreground">
                  {sub.planName} · {sub.planPriceLabel} ·{" "}
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

              <label className="flex shrink-0 items-center gap-1.5">
                <Switch
                  checked={sub.autoRenew}
                  disabled={isBusy}
                  onCheckedChange={(checked) =>
                    send(
                      sub.id,
                      { action: "subscription-auto-renew", id: sub.id, autoRenew: checked },
                      checked
                        ? "Auto-renewal on."
                        : `Auto-renewal off — expires ${date(sub.renewsAt)}.`,
                    )
                  }
                  aria-label={`Auto-renew ${sub.clientName}`}
                />
                <span className="text-meta text-subtle-foreground">Auto</span>
              </label>

              <Button
                variant="outline"
                size="sm"
                disabled={isBusy}
                onClick={() =>
                  send(
                    sub.id,
                    { action: "subscription-renew", id: sub.id },
                    "Renewed into the next period.",
                  )
                }
              >
                {isBusy ? "Working…" : "Mark renewed"}
              </Button>
            </li>
          );
        })}
      </ul>

      <p className="border-t border-border px-3 py-2 text-meta text-subtle-foreground">
        &ldquo;Mark renewed&rdquo; records that the period was collected and moves the
        retainer into the next one — it does not take a payment. No payment provider is
        connected to this system.
      </p>
    </Panel>
  );
}
