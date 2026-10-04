"use client";

import { CheckCircle2, Clock, Send, XCircle } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";

import { Button, Field, Input, LoadingIcon, Textarea } from "@repo/ui";

import { PortalShell } from "@/app/portal/[token]/portal-shell";
import { List, ListRow } from "@/components/os/list-row";
import { Panel } from "@/components/os/panel";
import { StatusPill } from "@/components/ui/badge";
import type { PortalContact, PortalView } from "@/lib/client-portal";
import { date } from "@/lib/format";
import type { Tone } from "@/lib/status";
import { cn } from "@/lib/utils";

const REQUEST_STATE: Record<string, { label: string; tone: Tone; icon: React.ReactNode }> = {
  SUBMITTED: { label: "Received", tone: "neutral", icon: <Clock /> },
  IN_PROGRESS: { label: "In progress", tone: "info", icon: <LoadingIcon size="md" /> },
  COMPLETED: { label: "Done", tone: "success", icon: <CheckCircle2 /> },
  DECLINED: { label: "Not proceeding", tone: "neutral", icon: <XCircle /> },
};

const TITLE_MIN = 4;
const TITLE_MAX = 200;
const DETAIL_MAX = 4000;

export function PortalClient({
  token,
  initial,
  contact,
}: {
  token: string;
  initial: PortalView;
  contact: PortalContact;
}) {
  const [portal, setPortal] = React.useState(initial);
  const [title, setTitle] = React.useState("");
  const [detail, setDetail] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [titleError, setTitleError] = React.useState<string | undefined>();
  const [stale, setStale] = React.useState(false);

  const cap = portal.requestsPerCycle;
  const remaining = portal.requestsRemaining;
  const atCap = remaining !== null && remaining === 0;
  const resetDays = portal.daysUntilAllowanceReset;

  const refresh = React.useCallback(async () => {
    try {
      const res = await fetch(`/api/client-portal/${token}`, { cache: "no-store" });
      const data = await res.json();
      if (data.success) {
        setPortal(data.portal as PortalView);
        setStale(false);
        return;
      }
      setStale(true);
    } catch {
      setStale(true);
    }
  }, [token]);

  const submit = React.useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault();
      const cleanTitle = title.trim();
      if (cleanTitle.length < TITLE_MIN) {
        setTitleError("Give the request a short title — a few words is enough.");
        return;
      }
      setTitleError(undefined);
      setSubmitting(true);
      try {
        const res = await fetch(`/api/client-portal/${token}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: cleanTitle, detail: detail.trim() || null }),
        });
        const data = await res.json();
        if (!data.success) {
          toast.error(data.message ?? "The request could not be sent.");
          return;
        }
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
        toast.error("The request could not be sent. Check your connection and try again.");
      } finally {
        setSubmitting(false);
      }
    },
    [token, title, detail, refresh],
  );

  return (
    <PortalShell
      kind="maintenance"
      title={portal.clientName}
      subtitle={
        <>
          <span className="font-medium text-foreground">{portal.planName}</span>
          {" · "}
          {portal.planPriceLabel}
          {portal.planPriceSuffix && ` ${portal.planPriceSuffix}`}
        </>
      }
      trailing={<StatusPill registry="subscriptionStatus" value={portal.subscriptionStatus} />}
      contact={contact}
      contactSubject={`Maintenance plan — ${portal.clientName}`}
    >
      <Panel
        title="This cycle"
        description={`${date(portal.cycleStart)} – ${date(portal.cycleEnd)} · allowance resets in ${resetDays} day${resetDays === 1 ? "" : "s"}`}
      >
        {cap === null ? (
          <p className="text-base text-foreground">
            Your plan is scoped individually — there is no fixed request allowance.
          </p>
        ) : (
          <>
            <p className="text-base text-foreground">
              <span className="text-lg font-semibold tabular-nums">
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
        <p className="mt-3 text-meta text-muted-foreground">
          {portal.autoRenew ? "Renews on" : "Ends on"} {date(portal.renewsAt)}
          {portal.overageNote && <> · {portal.overageNote}</>}
        </p>
        {stale && (
          <p className="mt-2 text-meta text-warning" role="status">
            The counts above may be out of date — the page could not refresh after your last
            request. Reload to see the latest.
          </p>
        )}
      </Panel>

      <Panel
        title="Request a change"
        description={
          !portal.canRequest
            ? undefined
            : atCap
              ? "You have used this cycle's included requests. You can still send one — it will be quoted as additional work before anything starts."
              : "Tell us what needs changing. A person reads every request."
        }
      >
        {!portal.canRequest ? (
          <p className="text-base text-muted-foreground">
            Requests are paused while the plan is{" "}
            {portal.subscriptionStatus.toLowerCase().replace("_", " ")}. Message the team below
            and we will sort it out.
          </p>
        ) : (
          <form onSubmit={submit} className="space-y-3" noValidate>
            <Field label="What needs changing?" error={titleError}>
              <Input
                name="title"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  if (titleError) setTitleError(undefined);
                }}
                placeholder="Swap the homepage hero image"
                minLength={TITLE_MIN}
                maxLength={TITLE_MAX}
                autoComplete="off"
                required
                className="pointer-coarse:min-h-11"
              />
            </Field>
            <Field label="Any detail (optional)">
              <Textarea
                name="detail"
                value={detail}
                onChange={(e) => setDetail(e.target.value)}
                rows={3}
                maxLength={DETAIL_MAX}
                placeholder="New image is in the shared drive, folder /brand/2026."
              />
            </Field>
            <div className="flex justify-end">
              <Button type="submit" variant="brand" size="lg" disabled={submitting}>
                {submitting ? <LoadingIcon size="md" /> : <Send aria-hidden />}
                {submitting ? "Sending" : "Send request"}
              </Button>
            </div>
          </form>
        )}
      </Panel>

      <Panel title="Your requests" flush>
        {portal.history.length === 0 ? (
          <p className="p-3 text-base text-muted-foreground">
            No requests yet. Anything you send appears here with its status.
          </p>
        ) : (
          <List label="Your requests">
            {portal.history.map((r) => {
              const state = REQUEST_STATE[r.status] ?? REQUEST_STATE.SUBMITTED;
              return (
                <ListRow
                  key={r.id}
                  icon={state.icon}
                  tone={state.tone}
                  title={r.title}
                  meta={
                    <>
                      {state.label} · sent {date(r.submittedAt)}
                      {r.completedAt && ` · done ${date(r.completedAt)}`}
                      {!r.countsToCap && " · additional work"}
                    </>
                  }
                  expandable={
                    r.detail ? (
                      <p className="whitespace-pre-wrap text-base text-muted-foreground">{r.detail}</p>
                    ) : undefined
                  }
                />
              );
            })}
          </List>
        )}
      </Panel>
    </PortalShell>
  );
}
