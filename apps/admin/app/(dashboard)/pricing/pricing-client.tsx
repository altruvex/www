"use client";

import { Construction, Loader2 } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";
import { Panel } from "@/components/os/panel";
import { StatTile } from "@/components/os/stat-tile";
import { Button, Input } from "@repo/ui";
import { cn } from "@/lib/utils";

/** Serialisable view of resolved pricing, built on the server. */
export interface PricingSnapshot {
  cells: {
    serviceId: string; complexityId: string; serviceName: string; bandName: string;
    priceMin: number; priceMax: number; weeksMin: number; weeksMax: number;
  }[];
  tiers: { id: string; buyerLabel: string; serviceId: string; complexityId: string; display: string }[];
  maintenance: {
    id: string; name: string; price: number | null; requestsPerCycle: number | null;
    overageHourlyRate: number | null; internalHourEquivalent: number | null; status: string;
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

const egp = (n: number) => new Intl.NumberFormat("en-US").format(n);

/** Client-visible only when active. Everything else carries a SOON badge. */
function SoonBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-sm border border-border bg-surface px-1.5 py-0.5 text-meta uppercase tracking-wider text-muted-foreground">
      <Construction className="size-3" />
      Soon
    </span>
  );
}

function useSave() {
  const [saving, setSaving] = React.useState<string | null>(null);

  const save = React.useCallback(
    async (key: string, body: Record<string, unknown>): Promise<boolean> => {
      setSaving(key);
      try {
        const res = await fetch("/api/admin/pricing", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
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
        if (data.changes === 0) {
          toast.success("No change to save.");
        } else if (data.publicSiteRevalidated) {
          toast.success(`Saved — ${data.changes} field(s) updated and live.`);
        } else {
          // Saved is saved. Say so plainly, and be specific about the delay
          // rather than letting it read as a failure.
          toast.success(`Saved — ${data.changes} field(s) updated.`, {
            description:
              "The public site will pick this up within 5 minutes; it could not be refreshed immediately.",
          });
        }
        return true;
      } catch {
        toast.error("The change could not be saved.");
        return false;
      } finally {
        setSaving(null);
      }
    },
    [],
  );

  return { saving, save };
}

function NumberField({
  label, value, onChange, disabled, suffix,
}: {
  label: string; value: number | null; onChange: (v: number | null) => void;
  disabled?: boolean; suffix?: string;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-meta uppercase tracking-wider text-muted-foreground">{label}</span>
      <span className="flex items-center gap-1.5">
        <Input
          type="number"
          inputMode="numeric"
          value={value ?? ""}
          disabled={disabled}
          onChange={(e) =>
            onChange(e.target.value === "" ? null : Number(e.target.value))
          }
          className="font-mono"
        />
        {suffix && <span className="text-meta text-muted-foreground">{suffix}</span>}
      </span>
    </label>
  );
}

export function PricingClient({ snapshot }: { snapshot: PricingSnapshot }) {
  const { saving, save } = useSave();
  const [cells, setCells] = React.useState(snapshot.cells);
  const [plans, setPlans] = React.useState(snapshot.maintenance);
  const [packages, setPackages] = React.useState(snapshot.consulting);
  const [addons, setAddons] = React.useState(snapshot.addons);
  const [terms, setTerms] = React.useState(snapshot.terms);

  const tierFor = React.useCallback(
    (serviceId: string, complexityId: string) =>
      snapshot.tiers.find((t) => t.serviceId === serviceId && t.complexityId === complexityId),
    [snapshot.tiers],
  );

  const plannedCount = addons.filter((a) => a.status !== "active").length;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label="Source"
          value={snapshot.overridden ? "Edited here" : "Shipped defaults"}
          sub={snapshot.overridden ? "At least one value has been changed" : "Nothing overridden yet"}
        />
        <StatTile label="Published tiers" value={snapshot.tiers.length} sub="Cards on /pricing" />
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
        title="Project price matrix"
        description="Service × complexity. Tier cards on /pricing read these cells — a card cannot disagree with what the estimator quotes."
      >
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-border">
                {["Service", "Band", "Published as", "Min (EGP)", "Max (EGP)", "Weeks min", "Weeks max", ""].map((h) => (
                  <th key={h} className="py-2 pe-3 text-meta uppercase tracking-wider text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {cells.map((cell, i) => {
                const tier = tierFor(cell.serviceId, cell.complexityId);
                const key = `cell:${cell.serviceId}:${cell.complexityId}`;
                const patch = (next: Partial<typeof cell>) =>
                  setCells((prev) => prev.map((c, j) => (j === i ? { ...c, ...next } : c)));
                return (
                  <tr key={key} className="border-b border-border align-middle">
                    <td className="py-2 pe-3 text-base text-foreground">{cell.serviceName}</td>
                    <td className="py-2 pe-3 text-base text-muted-foreground">{cell.bandName}</td>
                    <td className="py-2 pe-3 text-base">
                      {tier ? (
                        <span className="text-foreground">{tier.buyerLabel}</span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    {(["priceMin", "priceMax", "weeksMin", "weeksMax"] as const).map((field) => (
                      <td key={field} className="py-2 pe-3">
                        <Input
                          type="number"
                          value={cell[field]}
                          onChange={(e) => patch({ [field]: Number(e.target.value) } as Partial<typeof cell>)}
                          className="w-28 font-mono"
                        />
                      </td>
                    ))}
                    <td className="py-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={saving === key}
                        onClick={() =>
                          save(key, {
                            kind: "cell",
                            serviceId: cell.serviceId,
                            complexityId: cell.complexityId,
                            priceMin: cell.priceMin,
                            priceMax: cell.priceMax,
                            weeksMin: cell.weeksMin,
                            weeksMax: cell.weeksMax,
                          })
                        }
                      >
                        {saving === key ? <Loader2 className="size-3.5 animate-spin" /> : "Save"}
                      </Button>
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
              const key = `maintenance:${plan.id}`;
              const patch = (next: Partial<typeof plan>) =>
                setPlans((prev) => prev.map((p, j) => (j === i ? { ...p, ...next } : p)));
              return (
                <div key={plan.id} className="space-y-2 border-b border-border pb-4 last:border-0">
                  <div className="flex items-center justify-between">
                    <span className="text-base font-medium text-foreground">{plan.name}</span>
                    {plan.status !== "active" && <SoonBadge />}
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <NumberField
                      label="Price (blank = custom quote)"
                      value={plan.price}
                      onChange={(v) => patch({ price: v })}
                      suffix="EGP/mo"
                    />
                    <NumberField
                      label="Requests / month"
                      value={plan.requestsPerCycle}
                      onChange={(v) => patch({ requestsPerCycle: v })}
                    />
                    <NumberField
                      label="Overage rate"
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
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={saving === key}
                    onClick={() =>
                      save(key, {
                        kind: "maintenance",
                        id: plan.id,
                        price: plan.price,
                        requestsPerCycle: plan.requestsPerCycle,
                        overageHourlyRate: plan.overageHourlyRate,
                        internalHourEquivalent: plan.internalHourEquivalent,
                        status: plan.status,
                      })
                    }
                  >
                    {saving === key ? <Loader2 className="size-3.5 animate-spin" /> : "Save plan"}
                  </Button>
                </div>
              );
            })}
          </div>
        </Panel>

        <Panel title="Consulting" description="Fixed-scope engagements.">
          <div className="space-y-5">
            {packages.map((pkg, i) => {
              const key = `consulting:${pkg.id}`;
              const patch = (next: Partial<typeof pkg>) =>
                setPackages((prev) => prev.map((p, j) => (j === i ? { ...p, ...next } : p)));
              return (
                <div key={pkg.id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-base font-medium text-foreground">{pkg.name}</span>
                    {pkg.status !== "active" && <SoonBadge />}
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <NumberField label="Fixed price" value={pkg.price}
                      onChange={(v) => patch({ price: v ?? 0 })} suffix="EGP" />
                    <NumberField label="Duration" value={pkg.durationBusinessDays}
                      onChange={(v) => patch({ durationBusinessDays: v ?? 1 })} suffix="business days" />
                  </div>
                  <Button size="sm" variant="secondary" disabled={saving === key}
                    onClick={() =>
                      save(key, {
                        kind: "consulting", id: pkg.id, price: pkg.price,
                        durationBusinessDays: pkg.durationBusinessDays, status: pkg.status,
                      })
                    }>
                    {saving === key ? <Loader2 className="size-3.5 animate-spin" /> : "Save package"}
                  </Button>
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
            const key = `addon:${addon.id}`;
            const patch = (next: Partial<typeof addon>) =>
              setAddons((prev) => prev.map((a, j) => (j === i ? { ...a, ...next } : a)));
            const computed =
              addon.costBasis === null
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
                  {addon.status !== "active" && <SoonBadge />}
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
                    onChange={(v) => patch({ markupValue: v ?? 0 })}
                  />
                  <div className="flex flex-col gap-1">
                    <span className="text-meta uppercase tracking-wider text-muted-foreground">Client pays</span>
                    <span className={cn("font-mono text-base", computed === null && "text-muted-foreground")}>
                      {computed === null ? "Pricing pending" : `${egp(computed)} EGP`}
                    </span>
                  </div>
                </div>
                <Button size="sm" variant="secondary" disabled={saving === key}
                  onClick={() =>
                    save(key, {
                      kind: "addon", id: addon.id, costBasis: addon.costBasis,
                      markupType: addon.markupType, markupValue: addon.markupValue,
                      billingCycle: addon.billingCycle, status: addon.status,
                    })
                  }>
                  {saving === key ? <Loader2 className="size-3.5 animate-spin" /> : "Save add-on"}
                </Button>
              </div>
            );
          })}
        </div>
      </Panel>

      <Panel
        title="Commercial terms"
        description="Published on /transparency and used by every generated contract."
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <NumberField label="VAT %" value={Math.round(terms.vatRate * 100)}
            onChange={(v) => setTerms({ ...terms, vatRate: (v ?? 0) / 100 })} />
          <NumberField label="Revision rate" value={terms.revisionHourlyRate}
            onChange={(v) => setTerms({ ...terms, revisionHourlyRate: v ?? 0 })} suffix="EGP/hr" />
          <NumberField label="Revision rate (USD-native)" value={terms.revisionHourlyRateUsd}
            onChange={(v) => setTerms({ ...terms, revisionHourlyRateUsd: v ?? 0 })} suffix="USD/hr" />
          <NumberField label="Included rounds" value={terms.includedRevisionRounds}
            onChange={(v) => setTerms({ ...terms, includedRevisionRounds: v ?? 0 })} />
          <NumberField label="Milestone 1" value={terms.paymentSplitFirst}
            onChange={(v) => setTerms({ ...terms, paymentSplitFirst: v ?? 0 })} suffix="%" />
          <NumberField label="Milestone 2" value={terms.paymentSplitSecond}
            onChange={(v) => setTerms({ ...terms, paymentSplitSecond: v ?? 0 })} suffix="%" />
          <NumberField label="Final" value={terms.paymentSplitFinal}
            onChange={(v) => setTerms({ ...terms, paymentSplitFinal: v ?? 0 })} suffix="%" />
          <NumberField label="USD rate" value={terms.usdEgpRate}
            onChange={(v) => setTerms({ ...terms, usdEgpRate: v ?? 1 })} suffix="EGP/USD" />
          <NumberField label="Proposal validity" value={terms.proposalValidityDays}
            onChange={(v) => setTerms({ ...terms, proposalValidityDays: v ?? 1 })} suffix="days" />
          <NumberField label="Post-launch warranty" value={terms.postLaunchWarrantyDays}
            onChange={(v) => setTerms({ ...terms, postLaunchWarrantyDays: v ?? 0 })} suffix="days" />
        </div>
        <p className="mt-3 text-meta text-muted-foreground">
          Milestones total{" "}
          <span className={cn(
            "font-mono",
            terms.paymentSplitFirst + terms.paymentSplitSecond + terms.paymentSplitFinal !== 100 &&
              "text-destructive",
          )}>
            {terms.paymentSplitFirst + terms.paymentSplitSecond + terms.paymentSplitFinal}%
          </span>
          . The USD revision rate is a separate price list, not a conversion of the EGP rate.
        </p>
        <Button className="mt-3" size="sm" variant="secondary" disabled={saving === "terms"}
          onClick={() => save("terms", { kind: "terms", ...terms })}>
          {saving === "terms" ? <Loader2 className="size-3.5 animate-spin" /> : "Save terms"}
        </Button>
      </Panel>

      <Panel title="Change history" description="Every pricing change, with who made it.">
        {snapshot.history.length === 0 ? (
          <p className="text-base text-muted-foreground">
            No pricing changes recorded. Everything is showing its shipped default.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-border">
                  {["When", "Entity", "Field", "From", "To", "By"].map((h) => (
                    <th key={h} className="py-2 pe-3 text-meta uppercase tracking-wider text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {snapshot.history.map((h) => (
                  <tr key={h.id} className="border-b border-border">
                    <td className="py-2 pe-3 font-mono text-meta text-muted-foreground">
                      {new Date(h.createdAt).toLocaleString("en-GB")}
                    </td>
                    <td className="py-2 pe-3 text-base text-foreground">{h.entityType} · {h.entityId}</td>
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
  );
}
