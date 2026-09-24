"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
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
  SheetDescription,
  SheetHeader,
  SheetTitle,
  Switch,
  Textarea,
} from "@repo/ui";

import type { ServiceRow } from "@/lib/client-services";
import {
  CLIENT_SERVICE_KINDS,
  DEFAULT_TERM_MONTHS,
  firstExpiry,
  KIND_LABEL,
  termLabel,
} from "@/lib/service-lifecycle";
import type { ClientServiceKind } from "@repo/database";

/** A client offered for a new service on a screen that is not already inside one. */
export interface ClientOption {
  id: string;
  label: string;
  projects: { id: string; name: string }[];
  products: { id: string; name: string }[];
}

export interface ServiceScope {
  /** Empty when the sheet should ask which client (see `clients`). */
  clientId: string;
  /** Offered as a picker when `clientId` is empty. */
  clients?: ClientOption[];
  /** Pre-selected when the sheet is opened from a project. */
  projectId?: string | null;
  projects: { id: string; name: string }[];
  products: { id: string; name: string }[];
  currency: string;
}

const NONE = "__none__";
const TERMS = [1, 3, 6, 12, 24, 36, 60, 120];
const CURRENCIES = ["EGP", "USD"];

const PLACEHOLDER: Record<ClientServiceKind, string> = {
  DOMAIN: "newlight.com",
  HOSTING: "Vercel Pro — production",
  BUSINESS_EMAIL: "Google Workspace — 5 seats",
  SSL_CERTIFICATE: "Wildcard *.newlight.com",
  SOFTWARE_LICENSE: "Figma Professional",
  OTHER: "What the client holds through us",
};

/** YYYY-MM-DD for a date input, in UTC — the dates are stored as UTC midnights. */
function dayValue(value: Date | string | null | undefined): string {
  if (!value) return "";
  const date = typeof value === "string" ? new Date(value) : value;
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
}

export interface ServiceResponse {
  success: boolean;
  message?: string;
  issues?: { message: string }[];
  /** Present when the action started a term: whether a payment was opened, or why not. */
  billing?:
    | { opened: true; amount: number; currency: string }
    | { opened: false; reason: string }
    | null;
}

/** Posts to the services route; null on any failure, after telling the operator why. */
async function send(
  router: ReturnType<typeof useRouter>,
  method: "POST" | "PATCH",
  body: unknown,
): Promise<ServiceResponse | null> {
  try {
    const res = await fetch("/api/admin/services", {
      method,
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.status === 401) {
      toast.error("Your session expired. Sign in again.");
      router.push("/login");
      return null;
    }
    const data = (await res.json()) as ServiceResponse;
    if (!data.success) {
      toast.error(data.issues?.[0]?.message ?? data.message ?? "That change could not be saved.");
      return null;
    }
    return data;
  } catch {
    toast.error("The request could not be sent. Check your connection.");
    return null;
  }
}

/** The line under a success toast saying what happened to the money. */
export function billingDescription(data: ServiceResponse | null): string | undefined {
  const billing = data?.billing;
  if (!billing) return undefined;
  return billing.opened
    ? `A pending payment of ${new Intl.NumberFormat("en-US", { style: "currency", currency: billing.currency, maximumFractionDigits: 0 }).format(billing.amount)} was added to the project.`
    : `No payment opened: ${billing.reason}`;
}

/**
 * "Read from registry" — fetches a domain's expiry over RDAP to pre-fill a
 * date field. It fills, it does not save: the operator still sees the date and
 * submits it, and a registry that has nothing to say says so.
 */
export function RegistryButton({
  domain,
  onFound,
}: {
  domain: string;
  onFound: (found: { expiresAt: string; registrar: string | null }) => void;
}) {
  const [busy, setBusy] = React.useState(false);
  async function lookup() {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/services/lookup?domain=${encodeURIComponent(domain)}`);
      const data = (await res.json()) as {
        success: boolean;
        message?: string;
        result?: { ok: true; expiresAt: string | null; registrar: string | null } | { ok: false; reason: string };
      };
      if (!data.success || !data.result) {
        toast.error(data.message ?? "The lookup failed.");
        return;
      }
      if (!data.result.ok || !data.result.expiresAt) {
        toast.warning("The registry has no date for this domain", {
          description: data.result.ok ? undefined : data.result.reason,
        });
        return;
      }
      onFound({ expiresAt: dayValue(data.result.expiresAt), registrar: data.result.registrar });
      toast.success(`Registry says ${dayValue(data.result.expiresAt)}`, {
        description: data.result.registrar ? `Registrar: ${data.result.registrar}` : undefined,
      });
    } catch {
      toast.error("The request could not be sent. Check your connection.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <Button type="button" variant="ghost" size="sm" onClick={lookup} disabled={busy || !domain.trim()}>
      {busy ? "Reading…" : "Read from registry"}
    </Button>
  );
}

export { send as sendServiceRequest };

/**
 * Adding or editing a client service.
 *
 * "Already registered" is the fork that matters: a service that exists at the
 * provider gets its real dates and starts raising renewal alerts; one that is
 * only agreed stays PENDING with no dates, because an invented expiry would
 * raise alerts against a day that never existed.
 */
export function ServiceSheet({
  scope,
  service,
  onClose,
}: {
  scope: ServiceScope;
  /** Present = edit. */
  service?: ServiceRow;
  onClose: () => void;
}) {
  const router = useRouter();
  const editing = Boolean(service);
  const [busy, setBusy] = React.useState(false);

  const [kind, setKind] = React.useState<ClientServiceKind>(service?.kind ?? "DOMAIN");
  const [name, setName] = React.useState(service?.name ?? "");
  const [provider, setProvider] = React.useState(service?.provider ?? "");
  const [reference, setReference] = React.useState(service?.reference ?? "");
  const [price, setPrice] = React.useState(service ? String(service.price) : "");
  const [cost, setCost] = React.useState(service?.cost != null ? String(service.cost) : "");
  const [currency, setCurrency] = React.useState(service?.currency ?? scope.currency);
  const [termMonths, setTermMonths] = React.useState(service?.termMonths ?? DEFAULT_TERM_MONTHS.DOMAIN);
  const [firstTermIncluded, setFirstTermIncluded] = React.useState(service?.firstTermIncluded ?? false);
  const [autoRenew, setAutoRenew] = React.useState(service?.autoRenew ?? false);
  const [projectId, setProjectId] = React.useState(service?.projectId ?? scope.projectId ?? NONE);
  const [productId, setProductId] = React.useState(service?.productId ?? NONE);
  const [notes, setNotes] = React.useState(service?.notes ?? "");

  const [registered, setRegistered] = React.useState(false);
  const [startedAt, setStartedAt] = React.useState(dayValue(new Date()));
  const [expiresAt, setExpiresAt] = React.useState(service?.expiresAt ? dayValue(service.expiresAt) : "");

  // Picking a client re-scopes the project and product lists — the server
  // refuses a project that belongs to somebody else, so offering one would be
  // offering a guaranteed error.
  const [pickedClientId, setPickedClientId] = React.useState(scope.clientId || scope.clients?.[0]?.id || "");
  const picked = scope.clientId ? null : scope.clients?.find((c) => c.id === pickedClientId) ?? null;
  const clientId = scope.clientId || pickedClientId;
  const projects = picked ? picked.projects : scope.projects;
  const products = picked ? picked.products : scope.products;

  const priceValue = Number(price);
  const priceOk = Number.isInteger(priceValue) && priceValue > 0;
  const costValue = cost.trim() === "" ? null : Number(cost);
  const costOk = costValue === null || (Number.isInteger(costValue) && costValue >= 0);
  const canSubmit = name.trim().length > 0 && priceOk && costOk && !busy && Boolean(scope.clientId || pickedClientId);

  // What the expiry will be if left blank, shown rather than applied silently.
  const derivedExpiry =
    registered && startedAt ? dayValue(firstExpiry(new Date(startedAt), termMonths)) : "";


  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!canSubmit) return;
    setBusy(true);

    const fields = {
      kind,
      name: name.trim(),
      provider: provider.trim() || null,
      reference: reference.trim() || null,
      currency,
      price: priceValue,
      cost: costValue,
      termMonths,
      firstTermIncluded,
      autoRenew,
      projectId: projectId === NONE ? null : projectId,
      productId: productId === NONE ? null : productId,
      notes: notes.trim() || null,
    };

    let saved: boolean;
    if (service) {
      saved = Boolean(await send(router, "PATCH", { action: "update", id: service.id, fields }));
      // The expiry is its own action server-side, so correcting it is audited
      // as a date change rather than buried inside a field edit.
      if (saved && service.status !== "PENDING" && expiresAt && expiresAt !== dayValue(service.expiresAt)) {
        saved = Boolean(await send(router, "PATCH", { action: "set-expiry", id: service.id, expiresAt }));
      }
    } else {
      saved = Boolean(await send(router, "POST", {
        clientId,
        ...fields,
        startedAt: registered && startedAt ? startedAt : null,
        expiresAt: registered && expiresAt ? expiresAt : null,
      }));
    }

    setBusy(false);
    if (!saved) return;
    toast.success(
      service
        ? `${name.trim()} saved.`
        : registered
          ? `${name.trim()} added — renewal alerts start 30 days before it expires.`
          : `${name.trim()} added as not registered. Mark it registered once it is bought.`,
    );
    onClose();
    router.refresh();
  }

  return (
    <Sheet open onOpenChange={(next) => !next && onClose()}>
      <SheetContent side="end" className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{editing ? `Edit ${service!.name}` : "Add a service"}</SheetTitle>
          <SheetDescription>
            A domain, hosting plan or anything else this client holds through Altruvex that
            has to be renewed.
          </SheetDescription>
        </SheetHeader>

        <form className="space-y-3 overflow-y-auto p-4" onSubmit={submit}>
          {!editing && !scope.clientId && scope.clients && (
            <FormField label="Client">
              <Select
                value={pickedClientId}
                onValueChange={(value) => {
                  setPickedClientId(value);
                  setProjectId(NONE);
                  setProductId(NONE);
                }}
              >
                <SelectTrigger className="w-full" aria-label="Client">
                  <SelectValue placeholder="Pick a client" />
                </SelectTrigger>
                <SelectContent>
                  {scope.clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
          )}

          <div className="grid grid-cols-2 gap-3">
            <FormField label="Type">
              <Select
                value={kind}
                onValueChange={(value) => {
                  const next = value as ClientServiceKind;
                  setKind(next);
                  if (!editing) setTermMonths(DEFAULT_TERM_MONTHS[next]);
                }}
              >
                <SelectTrigger className="w-full" aria-label="Type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CLIENT_SERVICE_KINDS.map((option) => (
                    <SelectItem key={option} value={option}>
                      {KIND_LABEL[option]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
            <FormField label="Provider">
              <Input
                value={provider}
                onChange={(e) => setProvider(e.target.value)}
                placeholder={kind === "DOMAIN" ? "Namecheap" : "Vercel"}
                maxLength={120}
              />
            </FormField>
          </div>

          <FormField label="Name">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={PLACEHOLDER[kind]}
              required
              maxLength={200}
              className={kind === "DOMAIN" ? "font-mono" : undefined}
            />
          </FormField>

          <div className="grid grid-cols-[1fr_5.5rem] gap-3">
            <FormField
              label="Client pays per term"
              hint={priceOk || price === "" ? undefined : "A whole amount above zero"}
            >
              <Input
                type="number"
                inputMode="numeric"
                min={1}
                step={1}
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                aria-invalid={price !== "" && !priceOk}
                className="font-mono tabular-nums"
                required
              />
            </FormField>
            <FormField label="Currency">
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger className="w-full" aria-label="Currency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map((code) => (
                    <SelectItem key={code} value={code}>
                      {code}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <FormField label="Term">
              <Select value={String(termMonths)} onValueChange={(v) => setTermMonths(Number(v))}>
                <SelectTrigger className="w-full" aria-label="Term">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(TERMS.includes(termMonths) ? TERMS : [...TERMS, termMonths].sort((a, b) => a - b)).map(
                    (months) => (
                      <SelectItem key={months} value={String(months)}>
                        {termLabel(months)}
                      </SelectItem>
                    ),
                  )}
                </SelectContent>
              </Select>
            </FormField>
            <FormField label="Our cost per term" hint="Internal. Never shown to the client.">
              <Input
                type="number"
                inputMode="numeric"
                min={0}
                step={1}
                value={cost}
                onChange={(e) => setCost(e.target.value)}
                aria-invalid={!costOk}
                className="font-mono tabular-nums"
              />
            </FormField>
          </div>

          <SwitchRow
            label="First term included in the project fee"
            hint="The contract's “Year 1 included”. Billing starts at the first renewal."
            checked={firstTermIncluded}
            onChange={setFirstTermIncluded}
          />
          <SwitchRow
            label="Provider renews it automatically"
            hint="Alerts still fire — the client still owes the next term."
            checked={autoRenew}
            onChange={setAutoRenew}
          />

          {(projects.length > 0 || products.length > 0) && (
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Project">
                <Select value={projectId} onValueChange={setProjectId}>
                  <SelectTrigger className="w-full" aria-label="Project">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>Not linked</SelectItem>
                    {projects.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>
              <FormField label="Serves product">
                <Select value={productId} onValueChange={setProductId}>
                  <SelectTrigger className="w-full" aria-label="Product">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>Not linked</SelectItem>
                    {products.map((product) => (
                      <SelectItem key={product.id} value={product.id}>
                        {product.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>
            </div>
          )}

          {!editing && (
            <div className="space-y-3 rounded-md border border-border p-3">
              <SwitchRow
                label="Already registered at the provider"
                hint={
                  registered
                    ? "Renewal alerts start 30 days before the expiry date."
                    : "Saved as not registered — no dates, no alerts, until you mark it registered."
                }
                checked={registered}
                onChange={setRegistered}
              />
              {registered && (
                <div className="grid grid-cols-2 gap-3">
                  <FormField label="Started">
                    <Input
                      type="date"
                      value={startedAt}
                      onChange={(e) => setStartedAt(e.target.value)}
                      required
                    />
                  </FormField>
                  <FormField
                    label="Expires"
                    hint={expiresAt ? "The provider's date." : `Blank = ${derivedExpiry || "start + term"}`}
                  >
                    <Input
                      type="date"
                      value={expiresAt}
                      min={startedAt || undefined}
                      onChange={(e) => setExpiresAt(e.target.value)}
                    />
                  </FormField>
                </div>
              )}
              {registered && kind === "DOMAIN" && (
                <RegistryButton
                  domain={name}
                  onFound={(found) => {
                    setExpiresAt(found.expiresAt);
                    if (!provider.trim() && found.registrar) setProvider(found.registrar);
                  }}
                />
              )}
            </div>
          )}

          {editing && service!.status !== "PENDING" && (
            <div className="space-y-1">
              <FormField label="Expires" hint="Correct it to what the provider's dashboard says.">
                <Input type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
              </FormField>
              {kind === "DOMAIN" && (
                <RegistryButton domain={name} onFound={(found) => setExpiresAt(found.expiresAt)} />
              )}
            </div>
          )}

          <FormField label="Reference" hint="Order or account id. Never a password.">
            <Input
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              maxLength={200}
              className="font-mono"
              autoComplete="off"
            />
          </FormField>

          <FormField label="Notes">
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} maxLength={2000} />
          </FormField>

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="brand" disabled={!canSubmit}>
              {busy ? "Saving…" : editing ? "Save changes" : "Add service"}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}

/** Registering a PENDING service: the day it was bought and the provider's expiry. */
export function ActivateServiceSheet({
  service,
  onClose,
}: {
  service: ServiceRow;
  onClose: () => void;
}) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);
  const [startedAt, setStartedAt] = React.useState(dayValue(new Date()));
  const [expiresAt, setExpiresAt] = React.useState("");
  const derived = startedAt ? dayValue(firstExpiry(new Date(startedAt), service.termMonths)) : "";

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!startedAt) return;
    setBusy(true);
    const saved = await send(router, "PATCH", {
      action: "activate",
      id: service.id,
      startedAt,
      expiresAt: expiresAt || null,
    });
    setBusy(false);
    if (!saved) return;
    toast.success(`${service.name} is registered — expires ${expiresAt || derived}.`, {
      description: billingDescription(saved),
    });
    onClose();
    router.refresh();
  }

  return (
    <Sheet open onOpenChange={(next) => !next && onClose()}>
      <SheetContent side="end" className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Mark {service.name} registered</SheetTitle>
          <SheetDescription>
            From here it counts down to its expiry and raises renewal alerts at 30, 14, 7 and 1
            days.
          </SheetDescription>
        </SheetHeader>
        <form className="space-y-3 p-4" onSubmit={submit}>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Registered on">
              <Input type="date" value={startedAt} onChange={(e) => setStartedAt(e.target.value)} required />
            </FormField>
            <FormField label="Expires" hint={expiresAt ? "The provider's date." : `Blank = ${derived}`}>
              <Input
                type="date"
                value={expiresAt}
                min={startedAt || undefined}
                onChange={(e) => setExpiresAt(e.target.value)}
              />
            </FormField>
          </div>
          {service.kind === "DOMAIN" && (
            <RegistryButton domain={service.name} onFound={(found) => setExpiresAt(found.expiresAt)} />
          )}
          <p className="text-meta text-subtle-foreground">
            {service.firstTermIncluded
              ? "The first term is inside the project fee, so no payment is opened now."
              : service.projectId
                ? `Opens a pending payment for the first term on ${service.projectName ?? "the project"}.`
                : "Not on a project — invoice the first term by hand."}
          </p>
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="brand" disabled={busy || !startedAt}>
              {busy ? "Saving…" : "Mark registered"}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}

function FormField({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block min-w-0 space-y-1">
      <span className="telemetry block text-subtle-foreground">{label}</span>
      {children}
      {hint && <span className="block text-meta text-subtle-foreground">{hint}</span>}
    </label>
  );
}

function SwitchRow({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  const id = React.useId();
  return (
    <div className="flex items-start justify-between gap-3">
      <label htmlFor={id} className="min-w-0">
        <span className="block text-base">{label}</span>
        <span className="block text-meta text-subtle-foreground">{hint}</span>
      </label>
      <Switch id={id} checked={checked} onCheckedChange={onChange} className="mt-0.5 shrink-0" />
    </div>
  );
}
