"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Plus } from "lucide-react";

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

import { RowActions, useRecordDelete } from "@/components/os/delete-record";
import { when } from "@/lib/format";
import { statusOf } from "@/lib/status";
import { sendIncidentRequest } from "./incident-request";

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

type UserOption = { id: string; name: string | null; email: string };

const SEVERITIES = ["SEV1", "SEV2", "SEV3", "SEV4"] as const;
const STATUSES = [
  "INVESTIGATING",
  "IDENTIFIED",
  "MONITORING",
  "RESOLVED",
] as const;
const UNASSIGNED = "__unassigned__";
const NONE = "__none__";
const ANY = "__any__";

export function ProductScope({
  products,
}: {
  products: { id: string; name: string }[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const product = searchParams.get("product") ?? "";

  return (
    <Select
      value={product || ANY}
      onValueChange={(value) => {
        const next = new URLSearchParams(searchParams.toString());
        if (value === ANY) next.delete("product");
        else next.set("product", value);
        next.delete("page");
        const qs = next.toString();
        router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
      }}
    >
      <SelectTrigger
        className="h-[var(--control-h-sm)] w-44 pointer-coarse:h-11"
        aria-label="Product"
      >
        <SelectValue placeholder="All products" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ANY}>All products</SelectItem>
        {products.map((p) => (
          <SelectItem key={p.id} value={p.id}>
            {p.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function IncidentRowActions({
  id,
  number,
  title,
  status,
  canEdit,
  canDelete,
}: {
  id: string;
  number: number;
  title: string;
  status: string;
  canEdit: boolean;
  canDelete: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);
  const del = useRecordDelete({ entity: "incident" });

  async function move(next: string) {
    if (next === "RESOLVED") {
      router.push(`/incidents/${id}#update`);
      return;
    }
    setPending(true);
    const reopening = status === "RESOLVED";
    await sendIncidentRequest(
      router,
      "PATCH",
      { id, status: next },
      reopening
        ? "Incident reopened."
        : `Moved to ${statusOf("incidentStatus", next).label.toLowerCase()}.`,
    );
    setPending(false);
  }

  return (
    <div className="flex items-center gap-1.5">
      {canEdit && (
        <Select value={status} onValueChange={move} disabled={pending}>
          <SelectTrigger
            className="h-[var(--control-h-sm)] w-36 max-sm:w-32 pointer-coarse:h-11"
            aria-label={`Status for #${number} ${title}`}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUSES.map((value) => (
              <SelectItem key={value} value={value}>
                {status === "RESOLVED" && value !== "RESOLVED"
                  ? `Reopen: ${statusOf("incidentStatus", value).label.toLowerCase()}`
                  : statusOf("incidentStatus", value).label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
      {canDelete && (
        <>
          <RowActions
            onDelete={() => del.request({ id, label: `#${number} ${title}` })}
            deleteLabel="Delete incident"
          />
          {del.dialog}
        </>
      )}
    </div>
  );
}

export function OpenIncidentButton({
  products,
  users,
  defaultProductId,
  defaultDeploymentId,
  defaultOpen = false,
}: {
  products: ProductOption[];
  users: UserOption[];
  defaultProductId?: string;
  defaultDeploymentId?: string;
  defaultOpen?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [creating, setCreatingState] = React.useState(defaultOpen);

  const setCreating = (next: boolean) => {
    setCreatingState(next);
    if (!next && searchParams.has("new")) {
      const params = new URLSearchParams(searchParams.toString());
      params.delete("new");
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    }
  };

  return (
    <>
      <Button
        variant="brand"
        size="sm"
        className="pointer-coarse:min-h-11"
        onClick={() => setCreating(true)}
      >
        <Plus className="size-3.5" />
        Open incident
      </Button>
      <CreateIncidentSheet
        key={creating ? "open" : "closed"}
        open={creating}
        onOpenChange={setCreating}
        products={products}
        users={users}
        defaultProductId={defaultProductId}
        defaultDeploymentId={defaultDeploymentId}
        onSubmit={async (body) => {
          const done = await sendIncidentRequest(
            router,
            "POST",
            body,
            "Incident opened.",
          );
          if (done) setCreating(false);
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
  defaultProductId,
  defaultDeploymentId,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  products: ProductOption[];
  users: UserOption[];
  defaultProductId?: string;
  defaultDeploymentId?: string;
  onSubmit: (body: Record<string, unknown>) => Promise<void>;
}) {
  const [busy, setBusy] = React.useState(false);
  const [productId, setProductId] = React.useState(
    products.find((p) => p.id === defaultProductId)?.id ??
      products[0]?.id ??
      "",
  );
  const [title, setTitle] = React.useState("");
  const [detail, setDetail] = React.useState("");
  const [severity, setSeverity] = React.useState<string>("SEV3");
  const [ownerId, setOwnerId] = React.useState<string>(UNASSIGNED);
  const [deploymentId, setDeploymentId] = React.useState<string>(
    products
      .find((p) => p.id === productId)
      ?.deployments.find((d) => d.id === defaultDeploymentId)?.id ?? NONE,
  );

  const deployments =
    products.find((p) => p.id === productId)?.deployments ?? [];

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
              className="w-full rounded-ctl-xl border border-border-subtle bg-background px-2 py-1.5 text-base outline-none focus-visible:border-brand"
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
              <SelectTrigger
                className="w-full"
                aria-label="Suspected deployment"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>None</SelectItem>
                {deployments.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    #{d.number} · {d.environment.toLowerCase()} ·{" "}
                    {statusOf("deploymentStatus", d.status).label.toLowerCase()}{" "}
                    · {when(d.createdAt)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <div className="flex justify-end gap-2 pt-1">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="brand"
              disabled={busy || !title.trim()}
            >
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
      {hint && (
        <span className="block text-meta text-subtle-foreground">{hint}</span>
      )}
    </label>
  );
}
