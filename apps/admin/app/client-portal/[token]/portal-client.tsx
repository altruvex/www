"use client";

import type { PortalView } from "@/lib/client-portal";
import { cn } from "@/lib/utils";
import { Button, Input, LoadingIcon } from "@repo/ui";
import { CheckCircle2, Clock, XCircle } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";

const STATUS_LABEL: Record<string, string> = {
  SUBMITTED: "Received",
  IN_PROGRESS: "In progress",
  COMPLETED: "Done",
  DECLINED: "Not proceeding",
};

// The in-progress row shows the system's loading indicator rather than a
// lucide glyph, so "working" looks the same here as it does in every button.
const InProgressIcon = ({ className }: { className?: string }) => (
  <LoadingIcon size="md" className={className} />
);

const STATUS_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  SUBMITTED: Clock,
  IN_PROGRESS: InProgressIcon,
  COMPLETED: CheckCircle2,
  DECLINED: XCircle,
};

const dateOf = (iso: string) =>
  new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

export function PortalClient({
  token,
  initial,
}: {
  token: string;
  initial: PortalView;
}) {
  const [portal, setPortal] = React.useState(initial);
  const [title, setTitle] = React.useState("");
  const [detail, setDetail] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);

  const cap = portal.requestsPerCycle;
  const remaining = portal.requestsRemaining;
  const atCap = remaining !== null && remaining === 0;

  const refresh = React.useCallback(async () => {
    try {
      const res = await fetch(`/api/client-portal/${token}`, { cache: "no-store" });
      const data = await res.json();
      if (data.success) setPortal(data.portal as PortalView);
    } catch {
      // A failed refresh leaves the last good view on screen, which is more
      // useful than replacing it with an error.
    }
  }, [token]);

  const submit = React.useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault();
      if (title.trim().length < 4) {
        toast.error("Please give the request a short title.");
        return;
      }
      setSubmitting(true);
      try {
        const res = await fetch(`/api/client-portal/${token}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: title.trim(), detail: detail.trim() || null }),
        });
        const data = await res.json();
        if (!data.success) {
          toast.error(data.message ?? "The request could not be submitted.");
          return;
        }
        // Over the cap is not a failure — it is accepted and quoted. Say so
        // clearly rather than dressing it up as an error or hiding it.
        if (data.overCap) {
          toast.warning("Request received — beyond this cycle's allowance", {
            description: data.message,
          });
        } else {
          toast.success(data.message ?? "Request received.");
        }
        setTitle("");
        setDetail("");
        await refresh();
      } catch {
        toast.error("The request could not be submitted.");
      } finally {
        setSubmitting(false);
      }
    },
    [token, title, detail, refresh],
  );

  return (
    <main className="mx-auto w-full max-w-3xl px-5 py-10 md:py-16">
      <header className="mb-8">
        <p className="text-meta uppercase tracking-wider text-muted-foreground">
          Maintenance portal
        </p>
        <h1 className="mt-1 text-2xl font-medium tracking-tight text-foreground">
          {portal.clientName}
        </h1>
      </header>

      <section className="mb-6 rounded-lg border border-border bg-surface p-5 md:p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <div>
            <p className="text-meta uppercase tracking-wider text-muted-foreground">Plan</p>
            <p className="mt-1 text-lg font-medium text-foreground">
              {portal.planName}
              <span className="ms-2 font-mono text-base text-muted-foreground">
                {portal.planPriceLabel}
                {!portal.isCustomQuote && " / month"}
              </span>
            </p>
          </div>
          {portal.subscriptionStatus !== "ACTIVE" && (
            <span className="rounded-sm border border-border px-2 py-0.5 text-meta uppercase tracking-wider text-muted-foreground">
              {portal.subscriptionStatus.toLowerCase()}
            </span>
          )}
        </div>

        <div className="mt-5 border-t border-border pt-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-meta uppercase tracking-wider text-muted-foreground">
              This cycle
            </p>
            <p className="text-meta text-muted-foreground">
              {dateOf(portal.cycleStart)} – {dateOf(portal.cycleEnd)} · renews in{" "}
              {portal.daysUntilRenewal} day{portal.daysUntilRenewal === 1 ? "" : "s"}
            </p>
          </div>

          {cap === null ? (
            <p className="mt-2 text-base text-foreground">
              Your plan is scoped individually — there is no fixed request allowance.
            </p>
          ) : (
            <>
              <p className="mt-2 text-base text-foreground">
                <span className="font-mono text-lg">
                  {portal.requestsUsed} of {cap}
                </span>{" "}
                edit requests used
                {remaining !== null && remaining > 0 && (
                  <span className="text-muted-foreground"> · {remaining} remaining</span>
                )}
              </p>
              <div
                className="mt-2 flex h-1.5 w-full gap-1 overflow-hidden rounded-full"
                role="img"
                aria-label={`${portal.requestsUsed} of ${cap} requests used`}
              >
                {Array.from({ length: cap }, (_, i) => (
                  <span
                    key={i}
                    className={cn(
                      "h-full flex-1 rounded-full",
                      i < portal.requestsUsed ? "bg-foreground" : "bg-border",
                    )}
                  />
                ))}
              </div>
            </>
          )}

          {portal.overageNote && (
            <p className="mt-3 text-meta text-muted-foreground">{portal.overageNote}</p>
          )}
        </div>
      </section>

      <section className="mb-6 rounded-lg border border-border bg-surface p-5 md:p-6">
        <h2 className="text-base font-medium text-foreground">Request a change</h2>
        {atCap && (
          <p className="mt-2 text-meta text-muted-foreground">
            You have used this cycle&apos;s included requests. You can still send
            one — it will be quoted as additional work before anything starts.
          </p>
        )}
        <form onSubmit={submit} className="mt-4 space-y-3">
          <label className="block">
            <span className="text-meta uppercase tracking-wider text-muted-foreground">
              What needs changing?
            </span>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Swap the homepage hero image"
              maxLength={200}
              className="mt-1"
            />
          </label>
          <label className="block">
            <span className="text-meta uppercase tracking-wider text-muted-foreground">
              Any detail (optional)
            </span>
            <textarea
              value={detail}
              onChange={(e) => setDetail(e.target.value)}
              rows={3}
              maxLength={4000}
              className="mt-1 w-full rounded-sm border border-border bg-background px-3 py-2 text-base text-foreground outline-none focus-visible:border-border-strong"
              placeholder="New image is in the shared drive, folder /brand/2026."
            />
          </label>
          <Button type="submit" disabled={submitting}>
            {submitting ? <LoadingIcon size="md" /> : "Send request"}
          </Button>
        </form>
      </section>

      <section className="rounded-lg border border-border bg-surface p-5 md:p-6">
        <h2 className="mb-4 text-base font-medium text-foreground">Your requests</h2>
        {portal.history.length === 0 ? (
          <p className="text-base text-muted-foreground">
            No requests yet. Anything you send will appear here with its status.
          </p>
        ) : (
          <ul className="space-y-3">
            {portal.history.map((r) => {
              const Icon = STATUS_ICON[r.status] ?? Clock;
              return (
                <li
                  key={r.id}
                  className="flex gap-3 border-b border-border pb-3 last:border-0 last:pb-0"
                >
                  <Icon
                    className={cn(
                      "mt-0.5 size-4 shrink-0",
                      r.status === "COMPLETED" ? "text-success" : "text-muted-foreground",
                    )}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-base text-foreground">{r.title}</p>
                    {r.detail && (
                      <p className="mt-0.5 text-meta text-muted-foreground">{r.detail}</p>
                    )}
                    <p className="mt-1 text-meta text-muted-foreground">
                      {STATUS_LABEL[r.status] ?? r.status} · sent {dateOf(r.submittedAt)}
                      {!r.countsToCap && " · additional work"}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </main>
  );
}
