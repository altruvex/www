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

import { DateField } from "@/components/os/date-field";
import { SearchSelect } from "@/components/os/combobox-select";
import type { ServiceScreenRow } from "@/lib/client-services";
import {
  CLIENT_SERVICE_KINDS,
  DEFAULT_TERM_MONTHS,
  firstExpiry,
  KIND_LABEL,
  termLabel,
} from "@/lib/service-lifecycle";
import type { ClientServiceKind } from "@repo/database";
import { CURRENCIES } from "@repo/pricing-schema";

export interface ProjectOption {
  id: string;
  name: string;
  currency?: string | null;
}

export interface ClientOption {
  id: string;
  label: string;
  projects: ProjectOption[];
  products: { id: string; name: string }[];
}

export interface ServiceScope {
  clientId: string;
  clients?: ClientOption[];
  projectId?: string | null;
  projects: ProjectOption[];
  products: { id: string; name: string }[];
  currency: string;
}

const NONE = "__none__";
const TERMS = [1, 3, 6, 12, 24, 36, 60, 120];
const ONE_TIME = "one-time";

const PLACEHOLDER: Record<ClientServiceKind, string> = {
  DOMAIN: "newlight.com",
  HOSTING: "Vercel Pro — production",
  BUSINESS_EMAIL: "Google Workspace — 5 seats",
  SSL_CERTIFICATE: "Wildcard *.newlight.com",
  SOFTWARE_LICENSE: "Figma Professional",
  OTHER: "What the client holds through us",
};

function dayValue(value: Date | string | null | undefined): string {
  if (!value) return "";
  const date = typeof value === "string" ? new Date(value) : value;
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
}

export interface ServiceResponse {
  success: boolean;
  message?: string;
  issues?: { message: string }[];
  billing?:
    | { opened: true; amount?: number; currency?: string }
    | { opened: false; reason: string }
    | null;
}

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

export function billingDescription(data: ServiceResponse | null): string | undefined {
  const billing = data?.billing;
  if (!billing) return undefined;
  if (!billing.opened) return `No payment opened: ${billing.reason}`;
  const { amount, currency } = billing;
  if (amount == null || !currency) return "A pending payment was added to the project.";
  return `A pending payment of ${new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 0 }).format(amount)} was added to the project.`;
}

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

export function ServiceSheet({
  scope,
  service,
  showMoney = false,
  onClose,
}: {
  scope: ServiceScope;
  service?: ServiceScreenRow;
  showMoney?: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const editing = Boolean(service);
  const [busy, setBusy] = React.useState(false);

  const [kind, setKind] = React.useState<ClientServiceKind>(service?.kind ?? "DOMAIN");
  const [name, setName] = React.useState(service?.name ?? "");
  const [provider, setProvider] = React.useState(service?.provider ?? "");
  const [reference, setReference] = React.useState(service?.reference ?? "");
  const [price, setPrice] = React.useState(service?.price != null ? String(service.price) : "");
  const [cost, setCost] = React.useState(service?.cost != null ? String(service.cost) : "");
  const [currency, setCurrency] = React.useState(service?.currency ?? scope.currency);
  const [termMonths, setTermMonths] = React.useState<number | null>(
    service ? service.termMonths : DEFAULT_TERM_MONTHS.DOMAIN,
  );
  const oneTime = termMonths === null;
  const [firstTermIncluded, setFirstTermIncluded] = React.useState(service?.firstTermIncluded ?? false);
  const [autoRenew, setAutoRenew] = React.useState(service?.autoRenew ?? false);
  const [projectId, setProjectId] = React.useState(service?.projectId ?? scope.projectId ?? NONE);
  const [productId, setProductId] = React.useState(service?.productId ?? NONE);
  const [notes, setNotes] = React.useState(service?.notes ?? "");

  const [registered, setRegistered] = React.useState(false);
  const [startedAt, setStartedAt] = React.useState(dayValue(new Date()));
  const [expiresAt, setExpiresAt] = React.useState(service?.expiresAt ? dayValue(service.expiresAt) : "");

  const [pickedClientId, setPickedClientId] = React.useState(scope.clientId || scope.clients?.[0]?.id || "");
  const picked = scope.clientId ? null : scope.clients?.find((c) => c.id === pickedClientId) ?? null;
  const clientId = scope.clientId || pickedClientId;
  const projects = picked ? picked.projects : scope.projects;
  const products = picked ? picked.products : scope.products;

  const priceValue = Number(price);
  const moneyFields = showMoney || !service;
  const priceOk = !moneyFields || (Number.isInteger(priceValue) && priceValue > 0);
  const costValue = cost.trim() === "" ? null : Number(cost);
  const costOk = costValue === null || (Number.isInteger(costValue) && costValue >= 0);
  const canSubmit = name.trim().length > 0 && priceOk && costOk && !busy && Boolean(scope.clientId || pickedClientId);

  const derivedExpiry =
    registered && startedAt && termMonths !== null
      ? dayValue(firstExpiry(new Date(startedAt), termMonths))
      : "";


  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!canSubmit) return;
    setBusy(true);

    const fields = {
      kind,
      name: name.trim(),
      provider: provider.trim() || null,
      reference: reference.trim() || null,
      ...(moneyFields ? { currency, price: priceValue } : {}),
      ...(showMoney ? { cost: costValue } : {}),
      termMonths,
      firstTermIncluded: oneTime ? false : firstTermIncluded,
      autoRenew: oneTime ? false : autoRenew,
      projectId: projectId === NONE ? null : projectId,
      productId: productId === NONE ? null : productId,
      notes: notes.trim() || null,
    };

    let saved: boolean;
    if (service) {
      saved = Boolean(await send(router, "PATCH", { action: "update", id: service.id, fields }));
      if (saved && !oneTime && service.status !== "PENDING" && expiresAt && expiresAt !== dayValue(service.expiresAt)) {
        saved = Boolean(await send(router, "PATCH", { action: "set-expiry", id: service.id, expiresAt }));
      }
    } else {
      saved = Boolean(await send(router, "POST", {
        clientId,
        ...fields,
        startedAt: registered && startedAt ? startedAt : null,
        expiresAt: registered && !oneTime && expiresAt ? expiresAt : null,
      }));
    }

    setBusy(false);
    if (!saved) return;
    toast.success(
      service
        ? `${name.trim()} saved.`
        : oneTime
          ? registered
            ? `${name.trim()} added as bought — it never renews.`
            : `${name.trim()} added as not bought yet. Mark it bought once it is.`
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
              <SearchSelect
                ariaLabel="Client"
                value={pickedClientId}
                onChange={(value) => {
                  setPickedClientId(value);
                  setProjectId(NONE);
                  setProductId(NONE);
                  const latest = scope.clients?.find((c) => c.id === value)?.projects[0];
                  setCurrency(latest?.currency ?? scope.currency);
                }}
                options={scope.clients.map((client) => ({ value: client.id, label: client.label }))}
                placeholder="Pick a client"
                searchPlaceholder="Search clients"
              />
            </FormField>
          )}

          <div className="grid grid-cols-2 gap-3">
            <FormField label="Type">
              <Select
                value={kind}
                onValueChange={(value) => {
                  const next = value as ClientServiceKind;
                  setKind(next);
                  if (!editing && !oneTime) setTermMonths(DEFAULT_TERM_MONTHS[next]);
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

          {moneyFields && (
            <div className="grid grid-cols-[1fr_5.5rem] gap-3">
              <FormField
                label={oneTime ? "Client pays" : "Client pays per term"}
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
          )}

          <div className={showMoney ? "grid grid-cols-2 gap-3" : undefined}>
            <FormField label="Term" hint={oneTime ? "Bought once. Billed once, never renews." : undefined}>
              <Select
                value={termMonths === null ? ONE_TIME : String(termMonths)}
                onValueChange={(v) => setTermMonths(v === ONE_TIME ? null : Number(v))}
              >
                <SelectTrigger className="w-full" aria-label="Term">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ONE_TIME}>{termLabel(null)}</SelectItem>
                  {(termMonths === null || TERMS.includes(termMonths)
                    ? TERMS
                    : [...TERMS, termMonths].sort((a, b) => a - b)
                  ).map((months) => (
                    <SelectItem key={months} value={String(months)}>
                      {termLabel(months)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
            {showMoney && (
              <FormField label={oneTime ? "Our cost" : "Our cost per term"} hint="Internal. Never shown to the client.">
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
            )}
          </div>

          {!oneTime && (
            <>
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
            </>
          )}

          {(projects.length > 0 || products.length > 0) && (
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Project">
                <SearchSelect
                  ariaLabel="Project"
                  value={projectId}
                  onChange={(value) => {
                    setProjectId(value);
                    if (editing) return;
                    const projectCurrency = projects.find((p) => p.id === value)?.currency;
                    if (projectCurrency) setCurrency(projectCurrency);
                  }}
                  options={[
                    { value: NONE, label: "Not linked" },
                    ...projects.map((project) => ({ value: project.id, label: project.name })),
                  ]}
                  searchPlaceholder="Search projects"
                />
              </FormField>
              <FormField label="Serves product">
                <SearchSelect
                  ariaLabel="Product"
                  value={productId}
                  onChange={setProductId}
                  options={[
                    { value: NONE, label: "Not linked" },
                    ...products.map((product) => ({ value: product.id, label: product.name })),
                  ]}
                  searchPlaceholder="Search products"
                />
              </FormField>
            </div>
          )}

          {!editing && (
            <div className="space-y-3 rounded-md border border-border p-3">
              <SwitchRow
                label={oneTime ? "Already bought" : "Already registered at the provider"}
                hint={
                  oneTime
                    ? registered
                      ? "Owned from the date below. No expiry, no alerts — ever."
                      : "Saved as not bought yet, until you mark it bought."
                    : registered
                      ? "Renewal alerts start 30 days before the expiry date."
                      : "Saved as not registered — no dates, no alerts, until you mark it registered."
                }
                checked={registered}
                onChange={setRegistered}
              />
              {registered && (
                <div className="grid grid-cols-2 gap-3">
                  <FormField label={oneTime ? "Bought on" : "Started"}>
                    <DateField value={startedAt} onChange={setStartedAt} />
                  </FormField>
                  {!oneTime && (
                    <FormField
                      label="Expires"
                      hint={expiresAt ? "The provider's date." : `Blank = ${derivedExpiry || "start + term"}`}
                    >
                      <DateField value={expiresAt} min={startedAt || undefined} onChange={setExpiresAt} />
                    </FormField>
                  )}
                </div>
              )}
              {registered && !oneTime && kind === "DOMAIN" && (
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

          {editing && !oneTime && service!.status !== "PENDING" && (
            <div className="space-y-1">
              <FormField label="Expires" hint="Correct it to what the provider's dashboard says.">
                <DateField value={expiresAt} onChange={setExpiresAt} />
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

export function ActivateServiceSheet({
  service,
  onClose,
}: {
  service: ServiceScreenRow;
  onClose: () => void;
}) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);
  const [startedAt, setStartedAt] = React.useState(dayValue(new Date()));
  const [expiresAt, setExpiresAt] = React.useState("");
  const oneTime = service.termMonths === null;
  const derived =
    startedAt && service.termMonths !== null
      ? dayValue(firstExpiry(new Date(startedAt), service.termMonths))
      : "";

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!startedAt) return;
    setBusy(true);
    const saved = await send(router, "PATCH", {
      action: "activate",
      id: service.id,
      startedAt,
      expiresAt: oneTime ? null : expiresAt || null,
    });
    setBusy(false);
    if (!saved) return;
    toast.success(
      oneTime
        ? `${service.name} is bought — it never renews.`
        : `${service.name} is registered — expires ${expiresAt || derived}.`,
      { description: billingDescription(saved) },
    );
    onClose();
    router.refresh();
  }

  return (
    <Sheet open onOpenChange={(next) => !next && onClose()}>
      <SheetContent side="end" className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Mark {service.name} {oneTime ? "bought" : "registered"}</SheetTitle>
          <SheetDescription>
            {oneTime
              ? "Bought once: no expiry, no renewal alerts, ever."
              : "From here it counts down to its expiry and raises renewal alerts at 30, 14, 7 and 1 days."}
          </SheetDescription>
        </SheetHeader>
        <form className="space-y-3 p-4" onSubmit={submit}>
          <div className="grid grid-cols-2 gap-3">
            <FormField label={oneTime ? "Bought on" : "Registered on"}>
              <DateField value={startedAt} onChange={setStartedAt} />
            </FormField>
            {!oneTime && (
              <FormField label="Expires" hint={expiresAt ? "The provider's date." : `Blank = ${derived}`}>
                <DateField value={expiresAt} min={startedAt || undefined} onChange={setExpiresAt} />
              </FormField>
            )}
          </div>
          {!oneTime && service.kind === "DOMAIN" && (
            <RegistryButton domain={service.name} onFound={(found) => setExpiresAt(found.expiresAt)} />
          )}
          <p className="text-meta text-subtle-foreground">
            {oneTime
              ? service.projectId
                ? `Opens the one pending payment for the purchase on ${service.projectName ?? "the project"}.`
                : "Not on a project, so no payment row is opened here — record the purchase on the payments screen when you invoice it."
              : service.firstTermIncluded
                ? "The first term is inside the project fee, so no payment is opened now."
                : service.projectId
                  ? `Opens a pending payment for the first term on ${service.projectName ?? "the project"}.`
                  : "Not on a project, so no payment row is opened here — record the first term on the payments screen when you invoice it."}
          </p>
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="brand" disabled={busy || !startedAt}>
              {busy ? "Saving…" : oneTime ? "Mark bought" : "Mark registered"}
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
