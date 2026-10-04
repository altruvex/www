"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/os/confirm-dialog";
import { Panel } from "@/components/os/panel";
import { Soon } from "@/components/os/soon";
import { StatTile } from "@/components/os/stat-tile";
import { formatMoney, maintenanceIntervalPrice } from "@repo/pricing-schema";
import { Button, Input } from "@repo/ui";
import { cn } from "@/lib/utils";

export interface PricingSnapshot {
  cells: {
    serviceId: string; complexityId: string; serviceName: string; bandName: string;
    priceMin: number; priceMax: number; weeksMin: number; weeksMax: number;
  }[];
  publishedRanges: number;
  maintenance: {
    id: string; name: string; price: number | null; requestsPerCycle: number | null;
    overageHourlyRate: number | null; internalHourEquivalent: number | null; status: string;
    activeRetainers: number;
    repriceNote: string;
  }[];
  consulting: { id: string; name: string; price: number; durationBusinessDays: number; status: string }[];
  addons: {
    id: string; name: string; category: string; costBasis: number | null;
    markupType: string; markupValue: number; billingCycle: string; status: string; bundles: string[];
  }[];
  terms: {
    vatRate: number; revisionHourlyRate: number; revisionHourlyRateUsd: number;
    includedRevisionRounds: number; paymentSplitFirst: number; paymentSplitSecond: number;
    paymentSplitFinal: number; proposalValidityDays: number; postLaunchWarrantyDays: number;
    usdEgpRate: number; usdRateReviewedOn: string;
  };
  overridden: boolean;
  history: {
    id: string; entityType: string; entityId: string; field: string;
    oldValue: string | null; newValue: string | null; changedBy: string | null; createdAt: string;
  }[];
}

type Draft<T> = { [K in keyof T]: T[K] extends number ? number | null : T[K] };

interface FieldSpec<T> {
  key: keyof T;
  label: string;
  nullable?: boolean;
  nullLabel?: string;
  suffix?: string;
}

interface Change {
  label: string;
  before: string;
  after: string;
}

const num = new Intl.NumberFormat("en-US");

function show(value: unknown, nullLabel = "blank"): string {
  if (value === null || value === undefined || value === "") return nullLabel;
  if (typeof value === "number") return num.format(value);
  return String(value);
}

function diff<T extends object>(before: T, draft: Draft<T>, fields: FieldSpec<T>[]): Change[] {
  const out: Change[] = [];
  for (const field of fields) {
    const a = before[field.key] as unknown;
    const b = draft[field.key] as unknown;
    if (a === b) continue;
    const nullLabel = field.nullable ? field.nullLabel : "blank";
    out.push({
      label: field.label + (field.suffix ? ` (${field.suffix})` : ""),
      before: show(a, nullLabel),
      after: show(b, nullLabel),
    });
  }
  return out;
}

function blanks<T extends object>(draft: Draft<T>, fields: FieldSpec<T>[]): string[] {
  return fields
    .filter((field) => !field.nullable && (draft[field.key] as unknown) === null)
    .map((field) => field.label);
}

type SaveResult = { ok: boolean; message?: string };

function useSave() {
  const router = useRouter();
  return React.useCallback(
    async (body: Record<string, unknown>): Promise<SaveResult> => {
      try {
        const res = await fetch("/api/admin/pricing", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const data = (await res.json().catch(() => ({}))) as {
          success?: boolean;
          message?: string;
          changes?: number;
          publicSiteRevalidated?: boolean;
        };
        if (res.status === 401) return { ok: false, message: "Your session expired. Sign in again." };
        if (!data.success) return { ok: false, message: data.message ?? "The change could not be saved." };
        router.refresh();
        if (data.changes === 0) return { ok: true, message: "No change to save." };
        if (data.publicSiteRevalidated) return { ok: true, message: `Saved — ${data.changes} field(s) updated and live.` };
        return {
          ok: true,
          message: `Saved — ${data.changes} field(s) updated. The public site picks this up within 5 minutes.`,
        };
      } catch {
        return { ok: false, message: "Could not reach the server." };
      }
    },
    [router],
  );
}

const CanEditContext = React.createContext(true);

function NumberField({
  label, value, onChange, suffix, invalid,
}: {
  label: string; value: number | null; onChange: (v: number | null) => void;
  suffix?: string; invalid?: boolean;
}) {
  const canEdit = React.useContext(CanEditContext);
  return (
    <label className="flex flex-col gap-1">
      <span className="text-meta uppercase tracking-wider text-muted-foreground">{label}</span>
      <span className="flex items-center gap-1.5">
        <Input
          type="number"
          inputMode="decimal"
          value={value ?? ""}
          disabled={!canEdit}
          aria-invalid={invalid || undefined}
          onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
          className={cn("font-mono", invalid && "border-destructive")}
        />
        {suffix && <span className="text-meta text-muted-foreground">{suffix}</span>}
      </span>
    </label>
  );
}

function SaveDiff({
  label, title, changes, missing, consequence, onConfirm,
}: {
  label: string;
  title: string;
  changes: Change[];
  missing: string[];
  consequence: React.ReactNode;
  onConfirm: () => Promise<SaveResult>;
}) {
  const canEdit = React.useContext(CanEditContext);
  if (!canEdit) return null;
  if (missing.length > 0) {
    return (
      <div className="space-y-1">
        <Button size="sm" variant="secondary" disabled>
          {label}
        </Button>
        <p className="text-meta text-destructive">
          Blank: {missing.join(", ")}. A blank field is never saved as 0 — type the value or restore the old one.
        </p>
      </div>
    );
  }
  if (changes.length === 0) {
    return (
      <Button size="sm" variant="secondary" disabled>
        No change
      </Button>
    );
  }
  return (
    <ConfirmDialog
      trigger={
        <Button size="sm" variant="secondary">
          {label}
        </Button>
      }
      title={title}
      body={
        <dl className="space-y-1 font-mono text-meta">
          {changes.map((change) => (
            <div key={change.label} className="flex flex-wrap items-baseline gap-x-2">
              <dt className="font-sans text-muted-foreground">{change.label}</dt>
              <dd>
                <span className="text-muted-foreground line-through">{change.before}</span>
                <span className="mx-1.5 text-muted-foreground">→</span>
                <span className="font-medium text-foreground">{change.after}</span>
              </dd>
            </div>
          ))}
        </dl>
      }
      consequence={consequence}
      confirmLabel={`Save ${changes.length} change${changes.length === 1 ? "" : "s"}`}
      onConfirm={onConfirm}
    />
  );
}

const PUBLIC_CONSEQUENCE =
  "Written as an override on top of the shipped default. Public pages, the estimator and every new proposal read the new value; proposals and payments already issued keep theirs.";

type Cell = PricingSnapshot["cells"][number];
type Plan = PricingSnapshot["maintenance"][number];
type Pkg = PricingSnapshot["consulting"][number];
type Addon = PricingSnapshot["addons"][number];

const CELL_FIELDS: FieldSpec<Cell>[] = [
  { key: "priceMin", label: "Min", suffix: "EGP" },
  { key: "priceMax", label: "Max", suffix: "EGP" },
  { key: "weeksMin", label: "Weeks min" },
  { key: "weeksMax", label: "Weeks max" },
];

const PLAN_FIELDS: FieldSpec<Plan>[] = [
  { key: "price", label: "Price", suffix: "EGP/mo", nullable: true, nullLabel: "custom quote" },
  { key: "requestsPerCycle", label: "Requests / month", nullable: true, nullLabel: "uncapped" },
  { key: "overageHourlyRate", label: "Overage rate", suffix: "EGP/hr", nullable: true, nullLabel: "none" },
  { key: "internalHourEquivalent", label: "Internal hours", suffix: "hrs", nullable: true, nullLabel: "none" },
];

const PKG_FIELDS: FieldSpec<Pkg>[] = [
  { key: "price", label: "Fixed price", suffix: "EGP" },
  { key: "durationBusinessDays", label: "Duration", suffix: "business days" },
];

const ADDON_FIELDS: FieldSpec<Addon>[] = [
  { key: "costBasis", label: "Our cost", suffix: "EGP", nullable: true, nullLabel: "pending" },
  { key: "markupValue", label: "Margin" },
];

interface TermsDraft {
  vatPercent: number;
  revisionHourlyRate: number;
  revisionHourlyRateUsd: number;
  includedRevisionRounds: number;
  paymentSplitFirst: number;
  paymentSplitSecond: number;
  paymentSplitFinal: number;
  proposalValidityDays: number;
  postLaunchWarrantyDays: number;
  usdEgpRate: number;
}

const TERMS_FIELDS: FieldSpec<TermsDraft>[] = [
  { key: "vatPercent", label: "VAT", suffix: "%" },
  { key: "revisionHourlyRate", label: "Revision rate", suffix: "EGP/hr" },
  { key: "revisionHourlyRateUsd", label: "Revision rate (USD-native)", suffix: "USD/hr" },
  { key: "includedRevisionRounds", label: "Included rounds" },
  { key: "paymentSplitFirst", label: "Milestone 1", suffix: "%" },
  { key: "paymentSplitSecond", label: "Milestone 2", suffix: "%" },
  { key: "paymentSplitFinal", label: "Final", suffix: "%" },
  { key: "usdEgpRate", label: "USD rate", suffix: "EGP/USD" },
  { key: "proposalValidityDays", label: "Proposal validity", suffix: "days" },
  { key: "postLaunchWarrantyDays", label: "Post-launch warranty", suffix: "days" },
];

function termsDraft(terms: PricingSnapshot["terms"]): TermsDraft {
  return {
    vatPercent: Math.round(terms.vatRate * 100),
    revisionHourlyRate: terms.revisionHourlyRate,
    revisionHourlyRateUsd: terms.revisionHourlyRateUsd,
    includedRevisionRounds: terms.includedRevisionRounds,
    paymentSplitFirst: terms.paymentSplitFirst,
    paymentSplitSecond: terms.paymentSplitSecond,
    paymentSplitFinal: terms.paymentSplitFinal,
    proposalValidityDays: terms.proposalValidityDays,
    postLaunchWarrantyDays: terms.postLaunchWarrantyDays,
    usdEgpRate: terms.usdEgpRate,
  };
}

const PLANNED_REASON = "Marked planned in the pricing schema. Clients never see it until its status is active.";

export function PricingClient({ snapshot, canEdit = true }: { snapshot: PricingSnapshot; canEdit?: boolean }) {
  const save = useSave();
  const [cells, setCells] = React.useState<Draft<Cell>[]>(snapshot.cells);
  const [plans, setPlans] = React.useState<Draft<Plan>[]>(snapshot.maintenance);
  const [packages, setPackages] = React.useState<Draft<Pkg>[]>(snapshot.consulting);
  const [addons, setAddons] = React.useState<Draft<Addon>[]>(snapshot.addons);
  const [terms, setTerms] = React.useState<Draft<TermsDraft>>(() => termsDraft(snapshot.terms));

  const [seenSnapshot, setSeenSnapshot] = React.useState(snapshot);
  if (seenSnapshot !== snapshot) {
    setSeenSnapshot(snapshot);
    setCells(snapshot.cells);
    setPlans(snapshot.maintenance);
    setPackages(snapshot.consulting);
    setAddons(snapshot.addons);
    setTerms(termsDraft(snapshot.terms));
  }

  const plannedCount = addons.filter((a) => a.status !== "active").length;
  const termsBefore = React.useMemo(() => termsDraft(snapshot.terms), [snapshot.terms]);
  const splitTotal = (terms.paymentSplitFirst ?? 0) + (terms.paymentSplitSecond ?? 0) + (terms.paymentSplitFinal ?? 0);

  return (
    <CanEditContext value={canEdit}>
    <div className="space-y-4">
      {!canEdit && (
        <p className="text-meta text-muted-foreground">
          Read-only: changing a price needs edit access to settings. Your role can read every figure here but not save one.
        </p>
      )}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label="Source"
          value={snapshot.overridden ? "Edited here" : "Shipped defaults"}
          sub={snapshot.overridden ? "At least one value has been changed" : "Nothing overridden yet"}
        />
        <StatTile label="Published ranges" value={snapshot.publishedRanges} sub="Unnamed cells on /pricing" />
        <StatTile
          label="Maintenance plans"
          value={plans.filter((p) => p.status === "active").length}
          sub="Client-visible"
        />
        <StatTile
          label="Add-ons pending"
          value={plannedCount}
          sub={plannedCount ? "Hidden from clients until priced" : "All published"}
          tone={plannedCount ? "warning" : "success"}
        />
      </div>

      <Panel
        className="bg-none bg-card"
        title="Project price matrix"
        description="Service × complexity. The public range grid, the estimator and every proposal read these cells — none of them can quote a figure this table does not carry."
      >
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-start">
            <thead>
              <tr className="border-b border-border">
                {["Service", "Band", "Min (EGP)", "Max (EGP)", "Weeks min", "Weeks max", ""].map((h, i) => (
                  <th
                    key={h || "action"}
                    className={cn(
                      "py-2 pe-3 text-start text-meta uppercase tracking-wider text-muted-foreground",
                      i === 0 && "sticky start-0 z-10 bg-card",
                    )}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {cells.map((cell, i) => {
                const before = snapshot.cells[i];
                const patch = (next: Partial<Draft<Cell>>) =>
                  setCells((prev) => prev.map((c, j) => (j === i ? { ...c, ...next } : c)));
                const missing = blanks(cell, CELL_FIELDS);
                return (
                  <tr key={`${cell.serviceId}:${cell.complexityId}`} className="border-b border-border align-middle">
                    <td className="sticky start-0 z-10 bg-card py-2 pe-3 text-base text-foreground">{cell.serviceName}</td>
                    <td className="py-2 pe-3 text-base text-muted-foreground">{cell.bandName}</td>
                    {(["priceMin", "priceMax", "weeksMin", "weeksMax"] as const).map((field) => (
                      <td key={field} className="py-2 pe-3">
                        <Input
                          type="number"
                          inputMode="decimal"
                          value={cell[field] ?? ""}
                          disabled={!canEdit}
                          aria-label={`${cell.serviceName} ${cell.bandName} ${field}`}
                          aria-invalid={cell[field] === null || undefined}
                          onChange={(e) =>
                            patch({ [field]: e.target.value === "" ? null : Number(e.target.value) } as Partial<Draft<Cell>>)
                          }
                          className={cn("w-28 font-mono", cell[field] === null && "border-destructive")}
                        />
                      </td>
                    ))}
                    <td className="py-2">
                      <SaveDiff
                        label="Save"
                        title={`Save ${cell.serviceName} · ${cell.bandName}`}
                        changes={diff(before, cell, CELL_FIELDS)}
                        missing={missing}
                        consequence={PUBLIC_CONSEQUENCE}
                        onConfirm={() =>
                          save({
                            kind: "cell",
                            serviceId: cell.serviceId,
                            complexityId: cell.complexityId,
                            priceMin: cell.priceMin,
                            priceMax: cell.priceMax,
                            weeksMin: cell.weeksMin,
                            weeksMax: cell.weeksMax,
                          })
                        }
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Maintenance plans" description="Scope is a cap on edit requests, never hours.">
          <div className="space-y-5">
            {plans.map((plan, i) => {
              const before = snapshot.maintenance[i];
              const patch = (next: Partial<Draft<Plan>>) =>
                setPlans((prev) => prev.map((p, j) => (j === i ? { ...p, ...next } : p)));
              const annual = maintenanceIntervalPrice({ price: plan.price }, "annual");
              return (
                <div key={plan.id} className="space-y-2 border-b border-border pb-4 last:border-0">
                  <div className="flex items-center justify-between">
                    <span className="text-base font-medium text-foreground">{plan.name}</span>
                    {plan.status !== "active" && <Soon reason={PLANNED_REASON} />}
                  </div>
                  <p className="text-meta text-muted-foreground">
                    Billed yearly:{" "}
                    <span className="font-mono">
                      {annual === null ? "custom quote" : `${formatMoney(annual, "en")} / year`}
                    </span>
                    {annual !== null && " — read-only, follows the monthly price"}
                  </p>
                  <p className="text-meta text-muted-foreground">{plan.repriceNote}</p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <NumberField
                      label="Price (blank = custom quote)"
                      value={plan.price}
                      onChange={(v) => patch({ price: v })}
                      suffix="EGP/mo"
                    />
                    <NumberField
                      label="Requests / month (blank = uncapped)"
                      value={plan.requestsPerCycle}
                      onChange={(v) => patch({ requestsPerCycle: v })}
                    />
                    <NumberField
                      label="Overage rate (blank = none)"
                      value={plan.overageHourlyRate}
                      onChange={(v) => patch({ overageHourlyRate: v })}
                      suffix="EGP/hr"
                    />
                    <NumberField
                      label="Internal hours — never shown to clients"
                      value={plan.internalHourEquivalent}
                      onChange={(v) => patch({ internalHourEquivalent: v })}
                      suffix="hrs"
                    />
                  </div>
                  <SaveDiff
                    label="Save plan"
                    title={`Save ${plan.name}`}
                    changes={diff(before, plan, PLAN_FIELDS)}
                    missing={blanks(plan, PLAN_FIELDS)}
                    consequence={
                      <>
                        {PUBLIC_CONSEQUENCE} {before.repriceNote}
                      </>
                    }
                    onConfirm={() =>
                      save({
                        kind: "maintenance",
                        id: plan.id,
                        price: plan.price,
                        requestsPerCycle: plan.requestsPerCycle,
                        overageHourlyRate: plan.overageHourlyRate,
                        internalHourEquivalent: plan.internalHourEquivalent,
                        status: plan.status,
                      })
                    }
                  />
                </div>
              );
            })}
          </div>
          <p className="mt-4 flex items-center gap-1.5 text-meta text-subtle-foreground">
            Adding, renaming or retiring a plan
            <Soon reason="Plans are rows of the pricing schema, not database records: there is no plan table to write a new one into. Fields above are overrides on the shipped plans." />
          </p>
        </Panel>

        <Panel title="Consulting" description="Fixed-scope engagements.">
          <div className="space-y-5">
            {packages.map((pkg, i) => {
              const before = snapshot.consulting[i];
              const patch = (next: Partial<Draft<Pkg>>) =>
                setPackages((prev) => prev.map((p, j) => (j === i ? { ...p, ...next } : p)));
              return (
                <div key={pkg.id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-base font-medium text-foreground">{pkg.name}</span>
                    {pkg.status !== "active" && <Soon reason={PLANNED_REASON} />}
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <NumberField label="Fixed price" value={pkg.price} invalid={pkg.price === null}
                      onChange={(v) => patch({ price: v })} suffix="EGP" />
                    <NumberField label="Duration" value={pkg.durationBusinessDays} invalid={pkg.durationBusinessDays === null}
                      onChange={(v) => patch({ durationBusinessDays: v })} suffix="business days" />
                  </div>
                  <SaveDiff
                    label="Save package"
                    title={`Save ${pkg.name}`}
                    changes={diff(before, pkg, PKG_FIELDS)}
                    missing={blanks(pkg, PKG_FIELDS)}
                    consequence={PUBLIC_CONSEQUENCE}
                    onConfirm={() =>
                      save({
                        kind: "consulting", id: pkg.id, price: pkg.price,
                        durationBusinessDays: pkg.durationBusinessDays, status: pkg.status,
                      })
                    }
                  />
                </div>
              );
            })}
          </div>
        </Panel>
      </div>

      <Panel
        title="Pass-through add-ons"
        description="Billed at cost plus a stated margin, always as their own line item. An add-on with no cost basis is never priced and never shown to a client."
      >
        <div className="space-y-5">
          {addons.map((addon, i) => {
            const before = snapshot.addons[i];
            const patch = (next: Partial<Draft<Addon>>) =>
              setAddons((prev) => prev.map((a, j) => (j === i ? { ...a, ...next } : a)));
            const computed =
              addon.costBasis === null || addon.markupValue === null
                ? null
                : addon.markupType === "percent"
                  ? addon.costBasis + Math.round((addon.costBasis * addon.markupValue) / 100)
                  : addon.costBasis + addon.markupValue;
            return (
              <div key={addon.id} className="space-y-2 border-b border-border pb-4 last:border-0">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-base font-medium text-foreground">
                    {addon.name}
                    {addon.bundles.length > 0 && (
                      <span className="ms-2 text-meta text-muted-foreground">
                        bundles {addon.bundles.join(", ")}
                      </span>
                    )}
                  </span>
                  {addon.status !== "active" && <Soon reason={PLANNED_REASON} />}
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  <NumberField
                    label="Our cost (blank = pending)"
                    value={addon.costBasis}
                    onChange={(v) => patch({ costBasis: v })}
                    suffix="EGP"
                  />
                  <NumberField
                    label={addon.markupType === "percent" ? "Margin %" : "Margin (EGP)"}
                    value={addon.markupValue}
                    invalid={addon.markupValue === null}
                    onChange={(v) => patch({ markupValue: v })}
                  />
                  <div className="flex flex-col gap-1">
                    <span className="text-meta uppercase tracking-wider text-muted-foreground">Client pays</span>
                    <span className={cn("font-mono text-base", computed === null && "text-muted-foreground")}>
                      {computed === null ? "Pricing pending" : `${num.format(computed)} EGP`}
                    </span>
                  </div>
                </div>
                <SaveDiff
                  label="Save add-on"
                  title={`Save ${addon.name}`}
                  changes={diff(before, addon, ADDON_FIELDS)}
                  missing={blanks(addon, ADDON_FIELDS)}
                  consequence={PUBLIC_CONSEQUENCE}
                  onConfirm={() =>
                    save({
                      kind: "addon", id: addon.id, costBasis: addon.costBasis,
                      markupType: addon.markupType, markupValue: addon.markupValue,
                      billingCycle: addon.billingCycle, status: addon.status,
                    })
                  }
                />
              </div>
            );
          })}
        </div>
      </Panel>

      <Panel
        title="Commercial terms"
        description="Published on /pricing and used by every generated proposal and contract."
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {TERMS_FIELDS.map((field) => (
            <NumberField
              key={String(field.key)}
              label={field.label}
              suffix={field.suffix}
              value={terms[field.key]}
              invalid={terms[field.key] === null}
              onChange={(v) => setTerms((prev) => ({ ...prev, [field.key]: v }))}
            />
          ))}
        </div>
        <p className="mt-3 text-meta text-muted-foreground">
          Milestones total{" "}
          <span className={cn("font-mono", splitTotal !== 100 && "text-destructive")}>{splitTotal}%</span>. The USD
          revision rate is a separate price list, not a conversion of the EGP rate.
        </p>
        <div className="mt-3">
          <SaveDiff
            label="Save terms"
            title="Save commercial terms"
            changes={diff(termsBefore, terms, TERMS_FIELDS)}
            missing={blanks(terms, TERMS_FIELDS)}
            consequence={
              splitTotal !== 100
                ? `The milestones total ${splitTotal}%, not 100% — the server will refuse this. ${PUBLIC_CONSEQUENCE}`
                : PUBLIC_CONSEQUENCE
            }
            onConfirm={() => {
              const { vatPercent, ...rest } = terms;
              if (vatPercent === null) {
                toast.error("VAT is blank.");
                return Promise.resolve({ ok: false, message: "VAT is blank." });
              }
              return save({
                kind: "terms",
                ...rest,
                vatRate: vatPercent / 100,
                usdRateReviewedOn: snapshot.terms.usdRateReviewedOn,
              });
            }}
          />
        </div>
      </Panel>

      <Panel className="bg-none bg-card" title="Change history" description="Every pricing change, with who made it.">
        {snapshot.history.length === 0 ? (
          <p className="text-base text-muted-foreground">
            No pricing changes recorded. Everything is showing its shipped default.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-start">
              <thead>
                <tr className="border-b border-border">
                  {["When", "Entity", "Field", "From", "To", "By"].map((h, i) => (
                    <th
                      key={h}
                      className={cn(
                        "py-2 pe-3 text-start text-meta uppercase tracking-wider text-muted-foreground",
                        i === 0 && "sticky start-0 z-10 bg-card",
                      )}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {snapshot.history.map((h) => (
                  <tr key={h.id} className="border-b border-border">
                    <td className="sticky start-0 z-10 whitespace-nowrap bg-card py-2 pe-3 font-mono text-meta text-muted-foreground">
                      {new Date(h.createdAt).toLocaleString("en-GB")}
                    </td>
                    <td className="py-2 pe-3 whitespace-nowrap text-base text-foreground">{h.entityType} · {h.entityId}</td>
                    <td className="py-2 pe-3 font-mono text-meta">{h.field}</td>
                    <td className="py-2 pe-3 font-mono text-meta text-muted-foreground">{h.oldValue ?? "—"}</td>
                    <td className="py-2 pe-3 font-mono text-meta text-foreground">{h.newValue ?? "—"}</td>
                    <td className="py-2 text-meta text-muted-foreground">{h.changedBy ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
    </CanEditContext>
  );
}
