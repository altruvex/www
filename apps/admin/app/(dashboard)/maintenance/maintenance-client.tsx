"use client";

import type { AdminRequest, AdminSubscription } from "@/lib/maintenance-admin";
import { cn } from "@/lib/utils";
import {
  Badge,
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui";
import { Check, Copy, Loader2, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";

import { EmptyState } from "@/components/os/empty-state";
import { Panel } from "@/components/os/panel";
import { StatTile } from "@/components/os/stat-tile";

const REQUEST_STATUS_LABEL: Record<string, string> = {
  SUBMITTED: "Received",
  IN_PROGRESS: "In progress",
  COMPLETED: "Done",
  DECLINED: "Not proceeding",
};

const REQUEST_TONE: Record<string, "neutral" | "warning" | "success" | "danger"> = {
  SUBMITTED: "warning",
  IN_PROGRESS: "neutral",
  COMPLETED: "success",
  DECLINED: "danger",
};

const SUBSCRIPTION_STATUSES = ["ACTIVE", "PAUSED", "CANCELLED"] as const;

const shortDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });

function PortalLink({ token }: { token: string }) {
  const [copied, setCopied] = React.useState(false);

  const copy = React.useCallback(async () => {
    const url = `${window.location.origin}/client-portal/${token}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success("Portal link copied.");
    } catch {
      // Clipboard access can be denied; show the URL so it can still be copied.
      toast.info(url, { duration: 15000 });
    }
  }, [token]);

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
}: {
  subscriptions: readonly AdminSubscription[];
  clients: readonly { id: string; label: string }[];
  plans: readonly { id: string; name: string }[];
}) {
  const router = useRouter();
  const [busy, setBusy] = React.useState<string | null>(null);
  const [newClient, setNewClient] = React.useState("");
  const [newPlan, setNewPlan] = React.useState(plans[0]?.id ?? "");

  const send = React.useCallback(
    async (key: string, init: RequestInit): Promise<boolean> => {
      setBusy(key);
      try {
        const res = await fetch("/api/admin/maintenance", {
          headers: { "Content-Type": "application/json" },
          ...init,
        });
        const data = await res.json();
        if (res.status === 401) {
          toast.error("Your session expired. Sign in again.");
          return false;
        }
        if (!data.success) {
          toast.error(data.message ?? "The change could not be saved.");
          return false;
        }
        // The server owns cap counts and completion dates, so re-read rather
        // than guessing at the new state locally.
        router.refresh();
        return true;
      } catch {
        toast.error("The change could not be saved.");
        return false;
      } finally {
        setBusy(null);
      }
    },
    [router],
  );

  const totalOpen = subscriptions.reduce((n, s) => n + s.openRequests, 0);
  const active = subscriptions.filter((s) => s.status === "ACTIVE").length;
  const overCap = subscriptions.filter(
    (s) => s.requestsPerCycle !== null && s.requestsUsed >= s.requestsPerCycle,
  ).length;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Active retainers" value={active} sub={`${subscriptions.length} total`} />
        <StatTile
          label="Open requests"
          value={totalOpen}
          sub={totalOpen ? "Awaiting work" : "Nothing outstanding"}
          tone={totalOpen ? "warning" : "success"}
        />
        <StatTile
          label="At their cap"
          value={overCap}
          sub={overCap ? "Further work bills as overage" : "All within allowance"}
          tone={overCap ? "warning" : "neutral"}
        />
        <StatTile label="Plans offered" value={plans.length} sub="From the pricing schema" />
      </div>

      <Panel
        title="Start a retainer"
        description="One live plan per client. The portal link is generated with it."
      >
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex min-w-56 flex-col gap-1">
            <span className="text-meta uppercase tracking-wider text-muted-foreground">Client</span>
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
            <span className="text-meta uppercase tracking-wider text-muted-foreground">Plan</span>
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
          <Button
            size="sm"
            disabled={!newClient || !newPlan || busy === "create"}
            onClick={async () => {
              const ok = await send("create", {
                method: "POST",
                body: JSON.stringify({ clientId: newClient, planId: newPlan }),
              });
              if (ok) {
                toast.success("Maintenance plan started.");
                setNewClient("");
              }
            }}
          >
            {busy === "create" ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Plus className="size-3.5" />
            )}
            Start plan
          </Button>
        </div>
      </Panel>

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
              title={sub.clientName}
              description={`${sub.planName} · ${sub.planPriceLabel} · cycle ${shortDate(sub.cycleStart)}–${shortDate(sub.cycleEnd)}, renews in ${sub.daysUntilRenewal}d`}
              action={
                <div className="flex items-center gap-2">
                  <PortalLink token={sub.portalToken} />
                  <Select
                    value={sub.status}
                    onValueChange={(status) =>
                      send(`sub:${sub.id}`, {
                        method: "PATCH",
                        body: JSON.stringify({
                          action: "subscription-status",
                          id: sub.id,
                          status,
                        }),
                      })
                    }
                  >
                    <SelectTrigger size="sm" aria-label={`Status of ${sub.clientName}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SUBSCRIPTION_STATUSES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s.charAt(0) + s.slice(1).toLowerCase()}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              }
            >
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
                          <p className="mt-0.5 text-meta text-muted-foreground">{r.detail}</p>
                        )}
                        <p className="mt-1 flex flex-wrap items-center gap-2 text-meta text-muted-foreground">
                          <Badge tone={REQUEST_TONE[r.status] ?? "neutral"}>
                            {REQUEST_STATUS_LABEL[r.status] ?? r.status}
                          </Badge>
                          <span>sent {shortDate(r.submittedAt)}</span>
                          {r.completedAt && <span>· done {shortDate(r.completedAt)}</span>}
                          {!r.countsToCap && <Badge tone="warning">Overage</Badge>}
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
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

                        {/* Reclassifying changes what the client is billed and
                            what their portal shows as used, so it is logged. */}
                        <Button
                          size="sm"
                          variant="secondary"
                          disabled={busy === `bill:${r.id}`}
                          onClick={() =>
                            send(`bill:${r.id}`, {
                              method: "PATCH",
                              body: JSON.stringify({
                                action: "request-billing",
                                id: r.id,
                                countsToCap: !r.countsToCap,
                              }),
                            })
                          }
                        >
                          {busy === `bill:${r.id}` ? (
                            <Loader2 className="size-3.5 animate-spin" />
                          ) : r.countsToCap ? (
                            "Mark as overage"
                          ) : (
                            "Count to allowance"
                          )}
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          );
        })
      )}
    </div>
  );
}
