"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui";

import { when } from "@/lib/format";
import { statusOf } from "@/lib/status";
import { sendIncidentRequest } from "../incident-request";

const SEVERITIES = ["SEV1", "SEV2", "SEV3", "SEV4"] as const;
const STATUSES = ["INVESTIGATING", "IDENTIFIED", "MONITORING", "RESOLVED"] as const;
const KEEP = "__keep__";
const NONE = "__none__";

/**
 * Posts a timeline update, optionally moving the status with it. This is the
 * only place an incident is resolved or reopened from its page, so the note and
 * the move always land together in one update.
 */
export function PostUpdate({ id, status }: { id: string; status: string }) {
  const router = useRouter();
  const [note, setNote] = React.useState("");
  const [next, setNext] = React.useState<string>(KEEP);
  const [busy, setBusy] = React.useState(false);

  const resolved = status === "RESOLVED";
  const target = next === KEEP ? null : next;
  const resolving = target === "RESOLVED";
  const reopening = resolved && target !== null && target !== "RESOLVED";
  const needsNote = resolving || target === null;

  const submitLabel = resolving ? "Resolve" : reopening ? "Reopen" : target ? "Move and post" : "Post update";

  return (
    <form
      id="update"
      className="scroll-mt-20 space-y-2"
      onSubmit={async (event) => {
        event.preventDefault();
        const body = note.trim();
        if (needsNote && !body) {
          toast.error(
            resolving
              ? "Say what fixed it before resolving — an unexplained incident teaches nothing."
              : "Write the update first.",
          );
          return;
        }
        setBusy(true);
        const done = await sendIncidentRequest(
          router,
          "PATCH",
          {
            id,
            ...(body ? { update: body } : {}),
            ...(target ? { status: target } : {}),
            ...(resolving ? { resolution: body } : {}),
          },
          resolving ? "Incident resolved." : reopening ? "Incident reopened." : target ? "Status moved and update posted." : "Update posted.",
        );
        setBusy(false);
        if (done) {
          setNote("");
          setNext(KEEP);
        }
      }}
    >
      <textarea
        value={note}
        onChange={(event) => setNote(event.target.value)}
        rows={3}
        maxLength={5000}
        aria-label="Update"
        className="w-full rounded-sm border border-border bg-background px-2 py-1.5 text-base outline-none focus-visible:border-brand"
        placeholder={
          resolving
            ? "What fixed it, and what would stop it happening again."
            : "What you found, what you tried, what happens next."
        }
      />
      <div className="flex flex-wrap items-center justify-end gap-2">
        <Select value={next} onValueChange={setNext}>
          <SelectTrigger className="w-full sm:w-52" aria-label="Status change">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={KEEP}>
              Keep status ({statusOf("incidentStatus", status).label.toLowerCase()})
            </SelectItem>
            {STATUSES.filter((s) => s !== status).map((s) => (
              <SelectItem key={s} value={s}>
                {resolved
                  ? `Reopen as ${statusOf("incidentStatus", s).label.toLowerCase()}`
                  : s === "RESOLVED"
                    ? "Resolve"
                    : `Move to ${statusOf("incidentStatus", s).label.toLowerCase()}`}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          type="submit"
          variant="brand"
          disabled={busy || (needsNote && !note.trim())}
          className="w-full sm:w-auto"
        >
          {busy ? "Saving…" : submitLabel}
        </Button>
      </div>
      {reopening && (
        <p className="text-meta text-subtle-foreground">
          Reopening clears the resolved time and the resolution. The old fix stays in the
          timeline below.
        </p>
      )}
    </form>
  );
}

/**
 * Severity, owner and suspected deployment. Each applies on its own when
 * picked: these are single facts, and a separate Save button would let the
 * screen show a value the database does not hold.
 */
export function ManageIncident({
  id,
  severity,
  ownerId,
  deploymentId,
  users,
  deployments,
}: {
  id: string;
  severity: string;
  ownerId: string | null;
  deploymentId: string | null;
  users: { id: string; name: string | null; email: string }[];
  deployments: { id: string; number: number; environment: string; status: string; createdAt: string }[];
}) {
  const router = useRouter();
  const [busy, setBusy] = React.useState<string | null>(null);

  async function patch(field: string, body: Record<string, unknown>, message: string) {
    setBusy(field);
    await sendIncidentRequest(router, "PATCH", { id, ...body }, message);
    setBusy(null);
  }

  return (
    <div className="space-y-3 p-3">
      <Labelled label="Severity">
        <Select
          value={severity}
          disabled={busy !== null}
          onValueChange={(value) => patch("severity", { severity: value }, `Severity set to ${value}.`)}
        >
          <SelectTrigger className="w-full" aria-label="Severity">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SEVERITIES.map((value) => (
              <SelectItem key={value} value={value}>
                {value} · {statusOf("incidentSeverity", value).hint}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Labelled>

      <Labelled label="Owner">
        <Select
          value={ownerId ?? NONE}
          disabled={busy !== null}
          onValueChange={(value) => {
            const user = users.find((u) => u.id === value);
            patch(
              "owner",
              { ownerId: value === NONE ? null : value },
              user ? `Owned by ${user.name || user.email}.` : "Owner cleared.",
            );
          }}
        >
          <SelectTrigger className="w-full" aria-label="Owner">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE}>Unowned</SelectItem>
            {users.map((user) => (
              <SelectItem key={user.id} value={user.id}>
                {user.name || user.email}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Labelled>

      <Labelled
        label="Suspected deployment"
        hint={deployments.length ? undefined : "This product has no deployments reported by CI."}
      >
        <Select
          value={deploymentId ?? NONE}
          disabled={busy !== null || (deployments.length === 0 && !deploymentId)}
          onValueChange={(value) => {
            const d = deployments.find((x) => x.id === value);
            patch(
              "deployment",
              { deploymentId: value === NONE ? null : value },
              d ? `Linked to deployment #${d.number}.` : "Deployment link cleared.",
            );
          }}
        >
          <SelectTrigger className="w-full" aria-label="Suspected deployment">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE}>None</SelectItem>
            {deployments.map((d) => (
              <SelectItem key={d.id} value={d.id}>
                #{d.number} · {d.environment.toLowerCase()} ·{" "}
                {statusOf("deploymentStatus", d.status).label.toLowerCase()} · {when(d.createdAt)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Labelled>
    </div>
  );
}

function Labelled({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <span className="telemetry block text-subtle-foreground">{label}</span>
      {children}
      {hint && <span className="block text-meta text-subtle-foreground">{hint}</span>}
    </div>
  );
}
