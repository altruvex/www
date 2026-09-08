"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, ShieldAlert } from "lucide-react";
import { toast } from "sonner";

import {
  Button,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@repo/ui";

import { EmptyState } from "@/components/os/empty-state";
import { Panel } from "@/components/os/panel";
import { StatusPill } from "@/components/ui/badge";
import { dateTime, when } from "@/lib/format";
import { cn } from "@/lib/utils";

export interface IncidentRecord {
  id: string;
  number: number;
  title: string;
  detail: string | null;
  severity: string;
  status: string;
  productId: string;
  productName: string;
  clientName: string;
  ownerId: string | null;
  ownerName: string | null;
  deploymentNumber: number | null;
  detectedAt: string;
  acknowledgedAt: string | null;
  resolvedAt: string | null;
  resolution: string | null;
  lastUpdate: { body: string; author: string; at: string } | null;
}

const SEVERITIES = ["SEV1", "SEV2", "SEV3", "SEV4"] as const;
const STATUSES = ["INVESTIGATING", "IDENTIFIED", "MONITORING", "RESOLVED"] as const;
const UNASSIGNED = "__unassigned__";

/**
 * The incident list and its two mutations: open one, move one.
 *
 * Resolving requires a note. The API enforces that too — this is the second
 * line, not the only one — because an incident history with no causes in it is
 * a list of dates nobody can learn from.
 */
export function IncidentsClient({
  records,
  products,
  users,
}: {
  records: IncidentRecord[];
  products: { id: string; name: string; status: string }[];
  users: { id: string; name: string | null; email: string }[];
}) {
  const router = useRouter();
  const [creating, setCreating] = React.useState(false);
  const [pending, setPending] = React.useState<string | null>(null);
  const [active, setActive] = React.useState<IncidentRecord | null>(null);
  const [showResolved, setShowResolved] = React.useState(false);

  const open = records.filter((r) => r.status !== "RESOLVED");
  const resolved = records.filter((r) => r.status === "RESOLVED");
  const visible = showResolved ? records : open;

  async function send(body: unknown, method: "POST" | "PATCH", okMessage: string) {
    const res = await fetch("/api/admin/incidents", {
      method,
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.status === 401) {
      toast.error("Your session expired. Sign in again.");
      router.push("/login");
      return false;
    }
    const data = (await res.json()) as { success: boolean; message?: string };
    if (!data.success) {
      toast.error(data.message ?? "That did not work.");
      return false;
    }
    toast.success(okMessage);
    router.refresh();
    return true;
  }

  async function move(incident: IncidentRecord, status: string) {
    // Resolving needs an explanation, so it goes through the detail panel where
    // there is somewhere to type one, rather than failing at the API.
    if (status === "RESOLVED") {
      setActive(incident);
      return;
    }
    setPending(incident.id);
    await send({ id: incident.id, status }, "PATCH", `Moved to ${status.toLowerCase()}.`);
    setPending(null);
  }

  if (products.length === 0) {
    return (
      <EmptyState
        icon={ShieldAlert}
        title="No products to raise an incident against"
        body="An incident is always about a product Altruvex operates — that is what makes it actionable rather than a note. Add a product first."
        action={
          <Button asChild variant="outline">
            <Link href="/products">Open products</Link>
          </Button>
        }
      />
    );
  }

  return (
    <>
      <Panel
        title={showResolved ? "All incidents" : "Open incidents"}
        description={
          showResolved
            ? `${records.length} total`
            : `${open.length} open · ${resolved.length} resolved`
        }
        action={
          <div className="flex items-center gap-1.5">
            {resolved.length > 0 && (
              <Button variant="ghost" size="sm" onClick={() => setShowResolved((v) => !v)}>
                {showResolved ? "Open only" : "Show resolved"}
              </Button>
            )}
            <Button variant="brand" size="sm" onClick={() => setCreating(true)}>
              <Plus className="size-3.5" />
              Open incident
            </Button>
          </div>
        }
        flush
      >
        {visible.length === 0 ? (
          <div className="px-3 py-10 text-center">
            <p className="text-md font-semibold">Nothing is broken</p>
            <p className="mt-1 text-base text-muted-foreground">
              No open incident on any product. Open one when something needs a name, an
              owner and a timeline.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {visible.map((incident) => (
              <li
                key={incident.id}
                className={cn(
                  "flex flex-wrap items-start gap-x-3 gap-y-2 px-3 py-2.5",
                  pending === incident.id && "opacity-60",
                )}
              >
                <StatusPill
                  registry="incidentSeverity"
                  value={incident.severity}
                  className="mt-0.5 shrink-0"
                />

                <div className="min-w-0 flex-1">
                  <button
                    type="button"
                    onClick={() => setActive(incident)}
                    className="block max-w-full truncate text-start text-base font-medium hover:underline"
                  >
                    {incident.title}
                  </button>
                  <p className="truncate text-meta text-subtle-foreground">
                    <Link
                      href={`/products/${incident.productId}`}
                      className="hover:text-foreground hover:underline"
                    >
                      {incident.productName}
                    </Link>
                    {" · "}
                    {incident.ownerName ?? "Unowned"}
                    {" · detected "}
                    {when(incident.detectedAt)}
                    {incident.deploymentNumber != null
                      ? ` · after deploy #${incident.deploymentNumber}`
                      : ""}
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-1.5">
                  <StatusPill registry="incidentStatus" value={incident.status} variant="dot" />
                  {incident.status !== "RESOLVED" && (
                    <Select
                      value={incident.status}
                      onValueChange={(value) => move(incident, value)}
                      disabled={pending === incident.id}
                    >
                      <SelectTrigger
                        className="w-36"
                        aria-label={`Status for ${incident.title}`}
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUSES.map((status) => (
                          <SelectItem key={status} value={status}>
                            {status.charAt(0) + status.slice(1).toLowerCase()}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <CreateIncidentSheet
        open={creating}
        onOpenChange={setCreating}
        products={products}
        users={users}
        onSubmit={async (body) => {
          const done = await send(body, "POST", "Incident opened.");
          if (done) setCreating(false);
        }}
      />

      <IncidentDetailSheet
        // Remounting per incident resets the form without an effect.
        key={active?.id ?? "none"}
        incident={active}
        users={users}
        onOpenChange={(open) => !open && setActive(null)}
        onSubmit={async (body) => {
          const done = await send(body, "PATCH", "Incident updated.");
          if (done) setActive(null);
        }}
      />
    </>
  );
}

function CreateIncidentSheet({
  open,
  onOpenChange,
  products,
  users,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  products: { id: string; name: string }[];
  users: { id: string; name: string | null; email: string }[];
  onSubmit: (body: Record<string, unknown>) => Promise<void>;
}) {
  const [busy, setBusy] = React.useState(false);
  const [productId, setProductId] = React.useState(products[0]?.id ?? "");
  const [title, setTitle] = React.useState("");
  const [detail, setDetail] = React.useState("");
  const [severity, setSeverity] = React.useState<string>("SEV3");
  const [ownerId, setOwnerId] = React.useState<string>(UNASSIGNED);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="end" className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Open an incident</SheetTitle>
        </SheetHeader>
        <form
          className="space-y-3 p-4"
          onSubmit={async (event) => {
            event.preventDefault();
            if (!title.trim() || !productId) return;
            setBusy(true);
            await onSubmit({
              productId,
              title: title.trim(),
              detail: detail.trim() || null,
              severity,
              ownerId: ownerId === UNASSIGNED ? null : ownerId,
            });
            setBusy(false);
            setTitle("");
            setDetail("");
          }}
        >
          <Field label="Product">
            <Select value={productId} onValueChange={setProductId}>
              <SelectTrigger className="w-full" aria-label="Product">
                <SelectValue placeholder="Pick a product" />
              </SelectTrigger>
              <SelectContent>
                {products.map((product) => (
                  <SelectItem key={product.id} value={product.id}>
                    {product.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field label="What is wrong">
            <Input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Checkout returns 500 on card payment"
              required
              maxLength={300}
            />
          </Field>

          <Field label="Detail" hint="What you know so far. Optional.">
            <textarea
              value={detail}
              onChange={(event) => setDetail(event.target.value)}
              rows={4}
              maxLength={5000}
              className="w-full rounded-sm border border-border bg-background px-2 py-1.5 text-base outline-none focus-visible:border-brand"
              placeholder="Started after the 14:02 deploy. Only affects card, not bank transfer."
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Severity">
              <Select value={severity} onValueChange={setSeverity}>
                <SelectTrigger className="w-full" aria-label="Severity">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SEVERITIES.map((value) => (
                    <SelectItem key={value} value={value}>
                      {value}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field label="Owner">
              <Select value={ownerId} onValueChange={setOwnerId}>
                <SelectTrigger className="w-full" aria-label="Owner">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={UNASSIGNED}>Unowned</SelectItem>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name || user.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="brand" disabled={busy || !title.trim()}>
              {busy ? "Opening…" : "Open incident"}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}

function IncidentDetailSheet({
  incident,
  users,
  onOpenChange,
  onSubmit,
}: {
  incident: IncidentRecord | null;
  users: { id: string; name: string | null; email: string }[];
  onOpenChange: (open: boolean) => void;
  onSubmit: (body: Record<string, unknown>) => Promise<void>;
}) {
  const [busy, setBusy] = React.useState(false);
  const [note, setNote] = React.useState("");
  // Seeded from the incident, then owned by the form. Correct because the
  // caller remounts this component per incident via `key` — syncing it back in
  // an effect would fight the operator's own edits mid-typing.
  const [ownerId, setOwnerId] = React.useState<string>(incident?.ownerId ?? UNASSIGNED);

  if (!incident) return null;
  const isResolved = incident.status === "RESOLVED";

  return (
    <Sheet open onOpenChange={onOpenChange}>
      <SheetContent side="end" className="w-full sm:max-w-lg">
        <SheetHeader>
          <SheetTitle className="pe-6">{incident.title}</SheetTitle>
        </SheetHeader>

        <div className="space-y-4 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill registry="incidentSeverity" value={incident.severity} />
            <StatusPill registry="incidentStatus" value={incident.status} />
            <span className="text-meta text-subtle-foreground">
              #{incident.number} · {incident.productName}
            </span>
          </div>

          <dl className="grid grid-cols-2 gap-x-4 gap-y-2">
            <Meta label="Client">{incident.clientName}</Meta>
            <Meta label="Owner">{incident.ownerName ?? "Unowned"}</Meta>
            <Meta label="Detected">{dateTime(incident.detectedAt)}</Meta>
            <Meta label="Acknowledged">
              {incident.acknowledgedAt ? dateTime(incident.acknowledgedAt) : "—"}
            </Meta>
            {incident.resolvedAt && (
              <Meta label="Resolved">{dateTime(incident.resolvedAt)}</Meta>
            )}
            {incident.deploymentNumber != null && (
              <Meta label="Suspected deploy">#{incident.deploymentNumber}</Meta>
            )}
          </dl>

          {incident.detail && (
            <div>
              <p className="telemetry text-subtle-foreground">Detail</p>
              <p className="mt-1 whitespace-pre-wrap text-base">{incident.detail}</p>
            </div>
          )}

          {incident.resolution && (
            <div>
              <p className="telemetry text-subtle-foreground">Resolution</p>
              <p className="mt-1 whitespace-pre-wrap text-base">{incident.resolution}</p>
            </div>
          )}

          {incident.lastUpdate && (
            <div>
              <p className="telemetry text-subtle-foreground">Latest update</p>
              <p className="mt-1 whitespace-pre-wrap text-base">{incident.lastUpdate.body}</p>
              <p className="mt-0.5 text-meta text-subtle-foreground">
                {incident.lastUpdate.author} · {when(incident.lastUpdate.at)}
              </p>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3">
            <Button asChild variant="outline" size="sm">
              <Link href={`/logs?product=${incident.productId}&level=ERROR`}>
                Error logs
              </Link>
            </Button>
            <Button asChild variant="ghost" size="sm">
              <Link href={`/products/${incident.productId}?tab=deployments`}>
                Deployments
              </Link>
            </Button>
          </div>

          {!isResolved && (
            <form
              className="space-y-3 border-t border-border pt-3"
              onSubmit={async (event) => {
                event.preventDefault();
                setBusy(true);
                await onSubmit({
                  id: incident.id,
                  status: "RESOLVED",
                  resolution: note.trim(),
                  ownerId: ownerId === UNASSIGNED ? null : ownerId,
                });
                setBusy(false);
              }}
            >
              <Field label="Owner">
                <Select value={ownerId} onValueChange={setOwnerId}>
                  <SelectTrigger className="w-full" aria-label="Owner">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={UNASSIGNED}>Unowned</SelectItem>
                    {users.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.name || user.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              <Field
                label="What fixed it"
                hint="Required to resolve — an incident with no cause recorded teaches nothing."
              >
                <textarea
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  rows={3}
                  maxLength={5000}
                  required
                  className="w-full rounded-sm border border-border bg-background px-2 py-1.5 text-base outline-none focus-visible:border-brand"
                  placeholder="Reverted the 14:02 deploy. The payment adapter dropped its currency field."
                />
              </Field>

              <div className="flex flex-wrap justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={busy}
                  onClick={async () => {
                    setBusy(true);
                    await onSubmit({
                      id: incident.id,
                      ...(note.trim() ? { update: note.trim() } : {}),
                      ownerId: ownerId === UNASSIGNED ? null : ownerId,
                    });
                    setBusy(false);
                  }}
                >
                  Save without resolving
                </Button>
                <Button type="submit" variant="brand" disabled={busy || !note.trim()}>
                  {busy ? "Resolving…" : "Resolve"}
                </Button>
              </div>
            </form>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1">
      <span className="telemetry block text-subtle-foreground">{label}</span>
      {children}
      {hint && <span className="block text-meta text-subtle-foreground">{hint}</span>}
    </label>
  );
}

function Meta({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="telemetry text-subtle-foreground">{label}</dt>
      <dd className="truncate text-base">{children}</dd>
    </div>
  );
}
