"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Plus, ShieldAlert } from "lucide-react";

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
import { EntityLink } from "@/components/os/entity-link";
import { RowActions, useRecordDelete } from "@/components/os/delete-record";
import { Panel } from "@/components/os/panel";
import { StatusPill } from "@/components/ui/badge";
import { when } from "@/lib/format";
import { statusOf } from "@/lib/status";
import { cn } from "@/lib/utils";
import { sendIncidentRequest } from "./incident-request";

export interface IncidentRecord {
  id: string;
  number: number;
  title: string;
  severity: string;
  status: string;
  productId: string;
  productName: string;
  clientId: string;
  clientName: string;
  ownerName: string | null;
  deploymentId: string | null;
  deploymentNumber: number | null;
  detectedAt: string;
  lastUpdate: { body: string; author: string; at: string } | null;
}

export interface ProductOption {
  id: string;
  name: string;
  status: string;
  deployments: {
    id: string;
    number: number;
    environment: string;
    status: string;
    createdAt: string;
  }[];
}

const SEVERITIES = ["SEV1", "SEV2", "SEV3", "SEV4"] as const;
const STATUSES = ["INVESTIGATING", "IDENTIFIED", "MONITORING", "RESOLVED"] as const;
const UNASSIGNED = "__unassigned__";
const NONE = "__none__";
const ANY = "__any__";

/**
 * The incident list, its filters, and the two mutations that belong on a list:
 * open one, move one. Everything else — the timeline, resolving with a note,
 * reopening, owner and severity — lives on the incident's own page.
 */
export function IncidentsClient({
  records,
  products,
  users,
  filters,
  chips,
  filtered,
  clearHref,
  defaultProductId,
}: {
  records: IncidentRecord[];
  products: ProductOption[];
  users: { id: string; name: string | null; email: string }[];
  filters: { status: string; severity: string; product: string };
  /** Removable chips for every active filter, rendered on the server. */
  chips: React.ReactNode;
  /** The list is narrower than "open incidents on every product". */
  filtered: boolean;
  clearHref: string | null;
  defaultProductId?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [creating, setCreating] = React.useState(false);
  const [pending, setPending] = React.useState<string | null>(null);
  const del = useRecordDelete({ entity: "incident" });

  const apply = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams.toString());
    if (!value || value === ANY) next.delete(key);
    else next.set(key, value);
    const qs = next.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  };

  async function move(incident: IncidentRecord, status: string) {
    // Resolving needs an explanation, so it goes to the incident's page where
    // there is somewhere to type one, rather than failing at the API.
    if (status === "RESOLVED") {
      router.push(`/incidents/${incident.id}#update`);
      return;
    }
    setPending(incident.id);
    const reopening = incident.status === "RESOLVED";
    await sendIncidentRequest(
      router,
      "PATCH",
      { id: incident.id, status },
      reopening ? "Incident reopened." : `Moved to ${statusOf("incidentStatus", status).label.toLowerCase()}.`,
    );
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

  const openCount = records.filter((r) => r.status !== "RESOLVED").length;
  const title =
    filters.status === "all"
      ? "All incidents"
      : filters.status
        ? `${statusOf("incidentStatus", filters.status).label} incidents`
        : "Open incidents";

  return (
    <>
      <Panel
        title={title}
        description={
          filtered
            ? `${records.length} matching the filters · the tiles above count every product`
            : filters.status === "all"
              ? `${records.length} total · ${openCount} open`
              : `${records.length} shown`
        }
        action={
          <Button variant="brand" size="sm" onClick={() => setCreating(true)}>
            <Plus className="size-3.5" />
            Open incident
          </Button>
        }
        flush
      >
        <div className="flex flex-wrap items-center gap-2 border-b border-border p-2">
          <Select value={filters.status || ANY} onValueChange={(v) => apply("status", v)}>
            <SelectTrigger className="w-[calc(50%-0.25rem)] sm:w-40" aria-label="Status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ANY}>Open</SelectItem>
              {STATUSES.map((status) => (
                <SelectItem key={status} value={status}>
                  {statusOf("incidentStatus", status).label}
                </SelectItem>
              ))}
              <SelectItem value="all">All, including resolved</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filters.severity || ANY} onValueChange={(v) => apply("severity", v)}>
            <SelectTrigger className="w-[calc(50%-0.25rem)] sm:w-36" aria-label="Severity">
              <SelectValue placeholder="Any severity" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ANY}>Any severity</SelectItem>
              {SEVERITIES.map((severity) => (
                <SelectItem key={severity} value={severity}>
                  {severity}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filters.product || ANY} onValueChange={(v) => apply("product", v)}>
            <SelectTrigger className="w-full sm:w-44" aria-label="Product">
              <SelectValue placeholder="All products" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ANY}>All products</SelectItem>
              {products.map((product) => (
                <SelectItem key={product.id} value={product.id}>
                  {product.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {chips && (
          <div className="flex flex-wrap items-center gap-1.5 border-b border-border px-2 py-2">
            {chips}
          </div>
        )}

        {records.length === 0 ? (
          filtered || filters.status === "all" ? (
            <div className="px-3 py-10 text-center">
              <p className="text-md font-semibold">No incident matches</p>
              <p className="mt-1 text-base text-muted-foreground">
                Nothing fits every filter above. Remove a chip to widen the list.
              </p>
              {clearHref && (
                <Button asChild variant="outline" size="sm" className="mt-3">
                  <Link href={clearHref}>Clear filters</Link>
                </Button>
              )}
            </div>
          ) : (
            <div className="px-3 py-10 text-center">
              <p className="text-md font-semibold">Nothing is broken</p>
              <p className="mt-1 text-base text-muted-foreground">
                No open incident on any product. Open one when something needs a name, an
                owner and a timeline.
              </p>
              <Button asChild variant="ghost" size="sm" className="mt-3">
                <Link href="/incidents?status=all">See past incidents</Link>
              </Button>
            </div>
          )
        ) : (
          <ul className="divide-y divide-border">
            {records.map((incident) => (
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

                <div className="min-w-0 flex-1 basis-48">
                  <Link
                    href={`/incidents/${incident.id}`}
                    className="block max-w-full truncate text-base font-medium hover:underline"
                  >
                    <span className="font-mono text-meta text-subtle-foreground">
                      #{incident.number}
                    </span>{" "}
                    {incident.title}
                  </Link>
                  <p className="truncate text-meta text-subtle-foreground">
                    <EntityLink type="product" id={incident.productId} muted>
                      {incident.productName}
                    </EntityLink>
                    {" · "}
                    <EntityLink type="client" id={incident.clientId} muted>
                      {incident.clientName}
                    </EntityLink>
                    {" · "}
                    {incident.ownerName ?? "Unowned"}
                    {" · detected "}
                    {when(incident.detectedAt)}
                    {incident.deploymentId && incident.deploymentNumber != null && (
                      <>
                        {" · after "}
                        <EntityLink type="deployment" id={incident.deploymentId} muted>
                          deploy #{incident.deploymentNumber}
                        </EntityLink>
                      </>
                    )}
                  </p>
                  {incident.lastUpdate && (
                    <p className="mt-0.5 truncate text-meta text-muted-foreground">
                      {incident.lastUpdate.author}: {incident.lastUpdate.body}
                    </p>
                  )}
                </div>

                <div className="flex shrink-0 items-center gap-1.5">
                  <Select
                    value={incident.status}
                    onValueChange={(value) => move(incident, value)}
                    disabled={pending === incident.id}
                  >
                    <SelectTrigger className="w-36" aria-label={`Status for ${incident.title}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUSES.map((status) => (
                        <SelectItem key={status} value={status}>
                          {incident.status === "RESOLVED" && status !== "RESOLVED"
                            ? `Reopen: ${statusOf("incidentStatus", status).label.toLowerCase()}`
                            : statusOf("incidentStatus", status).label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <RowActions
                    onDelete={() =>
                      del.request({ id: incident.id, label: `#${incident.number} ${incident.title}` })
                    }
                    deleteLabel="Delete incident"
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <CreateIncidentSheet
        // Remounting on open resets the form to the current product filter.
        key={creating ? "open" : "closed"}
        open={creating}
        onOpenChange={setCreating}
        products={products}
        users={users}
        defaultProductId={defaultProductId}
        onSubmit={async (body) => {
          const done = await sendIncidentRequest(router, "POST", body, "Incident opened.");
          if (done) setCreating(false);
        }}
      />

      {del.dialog}
    </>
  );
}

function CreateIncidentSheet({
  open,
  onOpenChange,
  products,
  users,
  defaultProductId,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  products: ProductOption[];
  users: { id: string; name: string | null; email: string }[];
  defaultProductId?: string;
  onSubmit: (body: Record<string, unknown>) => Promise<void>;
}) {
  const [busy, setBusy] = React.useState(false);
  const [productId, setProductId] = React.useState(
    products.find((p) => p.id === defaultProductId)?.id ?? products[0]?.id ?? "",
  );
  const [title, setTitle] = React.useState("");
  const [detail, setDetail] = React.useState("");
  const [severity, setSeverity] = React.useState<string>("SEV3");
  const [ownerId, setOwnerId] = React.useState<string>(UNASSIGNED);
  const [deploymentId, setDeploymentId] = React.useState<string>(NONE);

  const deployments = products.find((p) => p.id === productId)?.deployments ?? [];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="end" className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Open an incident</SheetTitle>
        </SheetHeader>
        <form
          className="space-y-3 overflow-y-auto p-4"
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
              deploymentId: deploymentId === NONE ? null : deploymentId,
            });
            setBusy(false);
          }}
        >
          <Field label="Product">
            <Select
              value={productId}
              onValueChange={(value) => {
                setProductId(value);
                // A deployment belongs to one product; the API would refuse it.
                setDeploymentId(NONE);
              }}
            >
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
                      {value} · {statusOf("incidentSeverity", value).hint}
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

          <Field
            label="Suspected deployment"
            hint={
              deployments.length
                ? "Optional. The deploy you think caused it — changeable later."
                : "This product has no deployments reported by CI yet."
            }
          >
            <Select
              value={deploymentId}
              onValueChange={setDeploymentId}
              disabled={deployments.length === 0}
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
          </Field>

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
