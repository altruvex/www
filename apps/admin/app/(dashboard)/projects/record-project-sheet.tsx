"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { History } from "lucide-react";
import { CURRENCIES, type Currency } from "@repo/pricing-schema";
import {
  Button,
  Checkbox,
  Field,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@repo/ui";
import { recordPastProject } from "@/app/(dashboard)/_actions/projects";
import { useSheetSide } from "@/app/(dashboard)/calendar/sheet-shell";
import { SearchSelect } from "@/components/os/combobox-select";
import { DateField } from "@/components/os/date-field";

export interface RecordClientOption {
  id: string;
  label: string;
  known?: {
    website: string | null;
    proposalCurrency: string | null;
    products: {
      id: string;
      name: string;
      productionUrl: string | null;
      stagingUrl: string | null;
    }[];
    services: {
      id: string;
      name: string;
      kindLabel: string;
      isDomain: boolean;
      currency: string;
    }[];
  };
}

type Known = NonNullable<RecordClientOption["known"]>;
type KnownField = "name" | "currency" | "liveUrl" | "stagingUrl";

function domainUrl(name: string): string | null {
  const host = name
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "");
  return /^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(host) ? `https://${host}` : null;
}

function prefillFor(known: Known | undefined) {
  const product = known?.products[0];
  const domain = known?.services.find((x) => x.isDomain && domainUrl(x.name));
  const live: [string, string] | null = product?.productionUrl
    ? [product.productionUrl, `product “${product.name}”`]
    : known?.website
      ? [known.website, "client website"]
      : domain
        ? [domainUrl(domain.name) ?? "", `domain ${domain.name}`]
        : null;
  const currency: [string, string] | null = known?.services[0]
    ? [
        known.services[0].currency,
        `${known.services[0].kindLabel.toLowerCase()} billing`,
      ]
    : known?.proposalCurrency
      ? [known.proposalCurrency, "last proposal"]
      : null;
  const sources = [
    product ? `product “${product.name}”` : null,
    live && live[1] !== `product “${product?.name}”` ? live[1] : null,
    currency ? currency[1] : null,
  ].filter((x): x is string => x !== null);
  return {
    name: product?.name ?? "",
    liveUrl: live?.[0] ?? "",
    stagingUrl: product?.stagingUrl ?? "",
    currency: toCurrency(currency?.[0]),
    sources,
  };
}

function knownFor(clients: RecordClientOption[], id: string) {
  return clients.find((c) => c.id === id)?.known;
}

function toCurrency(code: string | null | undefined): Currency {
  return code && (CURRENCIES as readonly string[]).includes(code)
    ? (code as Currency)
    : CURRENCIES[0];
}

export function RecordProjectButton({
  clients,
  preset,
}: {
  clients: RecordClientOption[];
  preset?: { clientId: string | null } | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [open, setOpen] = React.useState(preset != null);

  function close() {
    setOpen(false);
    if (searchParams.has("new")) {
      const next = new URLSearchParams(searchParams.toString());
      next.delete("new");
      const query = next.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, {
        scroll: false,
      });
    }
  }

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <History className="size-3.5" aria-hidden />
        Record a past project
      </Button>
      {open && (
        <RecordProjectSheet
          clients={clients}
          initialClientId={preset?.clientId ?? null}
          onClose={close}
          onRecorded={() => setOpen(false)}
        />
      )}
    </>
  );
}

function RecordProjectSheet({
  clients,
  initialClientId,
  onClose,
  onRecorded,
}: {
  clients: RecordClientOption[];
  initialClientId: string | null;
  onClose: () => void;
  onRecorded: () => void;
}) {
  const router = useRouter();
  const sheet = useSheetSide();
  const [clientId, setClientId] = React.useState(
    initialClientId && clients.some((c) => c.id === initialClientId)
      ? initialClientId
      : "",
  );
  const initial = prefillFor(knownFor(clients, clientId));
  const [name, setName] = React.useState(initial.name);
  const [currency, setCurrency] = React.useState<Currency>(initial.currency);
  const [status, setStatus] = React.useState<"COMPLETED" | "ACTIVE">(
    "COMPLETED",
  );
  const [liveUrl, setLiveUrl] = React.useState(initial.liveUrl);
  const [stagingUrl, setStagingUrl] = React.useState(initial.stagingUrl);
  const [actualLaunchDate, setActualLaunchDate] = React.useState("");
  const [completedAt, setCompletedAt] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [skipped, setSkipped] = React.useState<Set<string>>(() => new Set());
  const touched = React.useRef(new Set<KnownField>());

  function pickClient(id: string) {
    setClientId(id);
    setSkipped(new Set());
    const next = prefillFor(knownFor(clients, id));
    if (!touched.current.has("name")) setName(next.name);
    if (!touched.current.has("liveUrl")) setLiveUrl(next.liveUrl);
    if (!touched.current.has("stagingUrl")) setStagingUrl(next.stagingUrl);
    if (!touched.current.has("currency")) setCurrency(next.currency);
  }

  const known = knownFor(clients, clientId);
  const filledFrom = prefillFor(known).sources;
  const attachable = [
    ...(known?.products ?? []).map((x) => ({
      id: x.id,
      type: "product" as const,
      label: x.name,
      detail: "Product",
    })),
    ...(known?.services ?? []).map((x) => ({
      id: x.id,
      type: "service" as const,
      label: x.name,
      detail: x.kindLabel,
    })),
  ];
  function toggle(id: string, attach: boolean) {
    setSkipped((prev) => {
      const next = new Set(prev);
      if (attach) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const canSubmit = clientId !== "" && name.trim() !== "";

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!canSubmit || busy) return;
    setBusy(true);
    try {
      const result = await recordPastProject({
        clientId,
        name,
        currency,
        status,
        liveUrl,
        stagingUrl,
        actualLaunchDate,
        completedAt: status === "COMPLETED" ? completedAt : "",
        attachProductIds: attachable
          .filter((x) => x.type === "product" && !skipped.has(x.id))
          .map((x) => x.id),
        attachServiceIds: attachable
          .filter((x) => x.type === "service" && !skipped.has(x.id))
          .map((x) => x.id),
      });
      if (!result.ok) {
        toast.error("Project not recorded", { description: result.message });
        return;
      }
      toast.success("Project recorded", { description: result.message });
      router.push(`/projects/${result.projectId}`);
      router.refresh();
      onRecorded();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet open onOpenChange={(next) => !next && !busy && onClose()}>
      <SheetContent side={sheet.side} width="md" className={sheet.className}>
        <SheetHeader>
          <SheetTitle>Record a past project</SheetTitle>
          <SheetDescription>
            Work built before this system existed. It is kept without a proposal
            or a contract — nothing is invented to fill that gap — and no
            payments, tasks or services are created. What the client&apos;s record
            already holds is filled in; leave a date empty when it is not known.
          </SheetDescription>
        </SheetHeader>
        <SheetBody className="overflow-y-auto">
          <form className="space-y-3" onSubmit={submit}>
            <Field
              label="Client"
              hint={
                clients.length === 0
                  ? "No client yet — add the client first, then record the project."
                  : filledFrom.length > 0
                    ? `Filled from this client's record (${filledFrom.join(", ")}) — check it, then add what is missing.`
                    : clientId
                      ? "Nothing on this client's record yet — fill the project in by hand."
                      : undefined
              }
            >
              {clients.length === 0 ? (
                <Button asChild variant="outline" size="sm">
                  <Link href="/clients/new">Add a client</Link>
                </Button>
              ) : (
                <SearchSelect
                  value={clientId}
                  onChange={pickClient}
                  options={clients.map((c) => ({
                    value: c.id,
                    label: c.label,
                  }))}
                  ariaLabel="Client"
                  placeholder="Pick the client"
                  searchPlaceholder="Search clients"
                />
              )}
            </Field>

            <Field label="Project">
              <Input
                value={name}
                onChange={(event) => {
                  touched.current.add("name");
                  setName(event.target.value);
                }}
                placeholder="Company website, 2024"
                required
                maxLength={200}
                autoComplete="off"
              />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field
                label="Billed in"
                hint="The currency later charges on this project use."
              >
                <Select
                  value={currency}
                  onValueChange={(value) => {
                    touched.current.add("currency");
                    setCurrency(toCurrency(value));
                  }}
                >
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
              </Field>
              <Field label="State">
                <Select
                  value={status}
                  onValueChange={(value) =>
                    setStatus(value === "ACTIVE" ? "ACTIVE" : "COMPLETED")
                  }
                >
                  <SelectTrigger className="w-full" aria-label="State">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="COMPLETED">Finished</SelectItem>
                    <SelectItem value="ACTIVE">Still supported</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            </div>

            <Field label="Live URL">
              <Input
                type="url"
                inputMode="url"
                value={liveUrl}
                onChange={(event) => {
                  touched.current.add("liveUrl");
                  setLiveUrl(event.target.value);
                }}
                placeholder="https://"
                autoComplete="off"
              />
            </Field>

            <Field label="Staging URL">
              <Input
                type="url"
                inputMode="url"
                value={stagingUrl}
                onChange={(event) => {
                  touched.current.add("stagingUrl");
                  setStagingUrl(event.target.value);
                }}
                placeholder="https://"
                autoComplete="off"
              />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Launched" hint="Leave empty if unknown.">
                <DateField
                  value={actualLaunchDate}
                  onChange={setActualLaunchDate}
                  ariaLabel="Launched"
                />
              </Field>
              {status === "COMPLETED" && (
                <Field label="Completed" hint="Leave empty if unknown.">
                  <DateField
                    value={completedAt}
                    onChange={setCompletedAt}
                    ariaLabel="Completed"
                  />
                </Field>
              )}
            </div>

            {attachable.length > 0 && (
              <Field
                label="Attach to this project"
                hint="This client's products and services that belong to no project yet. Untick what was not part of this work."
              >
                <ul className="space-y-1">
                  {attachable.map((item) => (
                    <li key={item.id}>
                      <label className="flex min-h-11 items-center gap-2.5 sm:min-h-8">
                        <Checkbox
                          checked={!skipped.has(item.id)}
                          onCheckedChange={(value) =>
                            toggle(item.id, value === true)
                          }
                          className="border-foreground/45 hover:border-foreground/70"
                        />
                        <span className="text-base">{item.label}</span>
                        <span className="text-meta text-muted-foreground">
                          {item.detail}
                        </span>
                      </label>
                    </li>
                  ))}
                </ul>
              </Field>
            )}

            <div className="flex justify-end gap-2 pt-1">
              <Button
                type="button"
                variant="ghost"
                className="pointer-coarse:h-11"
                onClick={onClose}
                disabled={busy}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="brand"
                className="pointer-coarse:h-11"
                disabled={busy || !canSubmit}
              >
                {busy ? "Recording…" : "Record project"}
              </Button>
            </div>
          </form>
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}
