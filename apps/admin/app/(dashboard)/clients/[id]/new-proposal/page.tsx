"use client";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { LoadingIcon } from "@/components/loading-icon";
import { INTENT_ACCENTS, suggestIntentAccent } from "@/lib/intent-accent";
import { getDefaultLineItems } from "@/lib/proposal-content";
import {
  calculateEstimate,
  type BrandIdentity,
  type Complexity,
  type ContentReadiness,
  type ProjectType,
  type Timeline,
} from "@repo/pricing";
import { Plus, Trash2 } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

interface ClientSummary {
  id: string;
  name: string | null;
  phone: string;
  company: string | null;
  industry: string | null;
}

const PROJECT_TYPES: { value: ProjectType; label: string }[] = [
  { value: "website", label: "Corporate Website" },
  { value: "webapp", label: "Custom Web Application" },
  { value: "ecommerce", label: "E-Commerce System" },
  { value: "pwa", label: "Progressive Web App" },
];

const COMPLEXITIES: { value: Complexity; label: string }[] = [
  { value: "basic", label: "Basic" },
  { value: "standard", label: "Standard" },
  { value: "premium", label: "Premium" },
];

const TIMELINES: { value: Timeline; label: string }[] = [
  { value: "urgent", label: "Urgent" },
  { value: "standard", label: "Standard" },
  { value: "flexible", label: "Flexible" },
];

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

function CardOption({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-xl border px-4 py-3 text-sm font-medium text-start transition-colors",
        selected
          ? "border-brand bg-brand/10 text-brand"
          : "border-border bg-muted/50 text-foreground hover:bg-muted",
      )}
    >
      {label}
    </button>
  );
}

export default function NewProposalPage() {
  const params = useParams();
  const router = useRouter();
  const clientId = params.id as string;

  const [client, setClient] = useState<ClientSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [projectType, setProjectType] = useState<ProjectType | null>(null);
  const [complexity, setComplexity] = useState<Complexity | null>(null);
  const [timeline, setTimeline] = useState<Timeline | null>(null);
  const [brandIdentity, setBrandIdentity] = useState<BrandIdentity | null>(null);
  const [contentReadiness, setContentReadiness] = useState<ContentReadiness | null>(null);
  const [currency, setCurrency] = useState<"EGP" | "USD">("EGP");
  const [accentName, setAccentName] = useState<string | null>(null);

  const [timelineWeeks, setTimelineWeeks] = useState<number | null>(null);
  const [lineItems, setLineItems] = useState<{ name: string; amount: number }[]>([]);

  const fetchClient = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/clients/${clientId}`);
      const data = await response.json();
      if (data.success) {
        setClient(data.client);
        setAccentName(suggestIntentAccent(data.client.industry));
      } else {
        toast.error(data.message || "Failed to load client");
      }
    } catch (error: unknown) {
      console.error("Error fetching client:", error);
      toast.error("Failed to load client");
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchClient();
  }, [fetchClient]);

  const estimate = useMemo(() => {
    if (!projectType || !complexity || !timeline) return null;
    return calculateEstimate({
      projectType,
      complexity,
      timeline,
      brandIdentity,
      contentReadiness,
    });
  }, [projectType, complexity, timeline, brandIdentity, contentReadiness]);

  // Seed the editable line items + weeks from the live estimate — the
  // midpoint of the range is the starting point, not the final number
  // (§5.1 rule 3: Ali hand-edits before generating). Re-derived during
  // render (not an Effect) whenever the estimate or currency changes, per
  // React's own guidance for state that starts from a prop but stays
  // independently editable afterward.
  const estimateSignature = estimate
    ? `${estimate.minPrice}-${estimate.maxPrice}-${estimate.minWeeks}-${estimate.maxWeeks}-${currency}`
    : null;
  const [syncedSignature, setSyncedSignature] = useState<string | null>(null);

  if (estimate && estimateSignature !== syncedSignature) {
    setSyncedSignature(estimateSignature);
    const midPrice = Math.round((estimate.minPrice + estimate.maxPrice) / 2 / 500) * 500;
    const midWeeks = Math.round((estimate.minWeeks + estimate.maxWeeks) / 2);
    const priceInCurrency = currency === "USD" ? Math.round(midPrice / 50 / 10) * 10 : midPrice;
    setLineItems(getDefaultLineItems(priceInCurrency));
    setTimelineWeeks(midWeeks);
  }

  const totalPrice = lineItems.reduce((sum, item) => sum + item.amount, 0);

  const updateLineItem = (index: number, patch: Partial<{ name: string; amount: number }>) => {
    setLineItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, ...patch } : item)),
    );
  };

  const addLineItem = () => {
    setLineItems((prev) => [...prev, { name: "New item", amount: 0 }]);
  };

  const removeLineItem = (index: number) => {
    setLineItems((prev) => prev.filter((_, i) => i !== index));
  };

  const canGenerate =
    projectType && complexity && timeline && timelineWeeks && lineItems.length > 0 && accentName;

  const handleGenerate = async () => {
    if (!canGenerate) return;
    setSubmitting(true);
    try {
      const response = await fetch("/api/admin/proposals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId,
          projectType,
          complexity,
          timelineWeeks,
          currency,
          lineItems,
          accentName,
        }),
      });
      const data = await response.json();
      if (data.success) {
        toast.success("Proposal generated");
        router.push(`/clients/${clientId}`);
      } else {
        toast.error(data.message || "Failed to generate proposal");
      }
    } catch (error: unknown) {
      console.error("Error generating proposal:", error);
      toast.error("Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <LoadingIcon size={24} />
      </div>
    );
  }

  if (!client) {
    return null;
  }

  return (
    <div className="p-6 space-y-8 max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold">New Proposal</h1>
        <p className="text-muted-foreground mt-1">
          For {client.name || client.company || client.phone}
        </p>
      </div>

      <div className="liquid-glass rounded-2xl p-6 space-y-6">
        <div>
          <label className="text-sm font-medium mb-2 block">What are we building?</label>
          <div className="grid grid-cols-2 gap-2">
            {PROJECT_TYPES.map((option) => (
              <CardOption
                key={option.value}
                label={option.label}
                selected={projectType === option.value}
                onClick={() => setProjectType(option.value)}
              />
            ))}
          </div>
        </div>

        <div>
          <label className="text-sm font-medium mb-2 block">Complexity</label>
          <div className="grid grid-cols-3 gap-2">
            {COMPLEXITIES.map((option) => (
              <CardOption
                key={option.value}
                label={option.label}
                selected={complexity === option.value}
                onClick={() => setComplexity(option.value)}
              />
            ))}
          </div>
        </div>

        <div>
          <label className="text-sm font-medium mb-2 block">Timeline urgency</label>
          <div className="grid grid-cols-3 gap-2">
            {TIMELINES.map((option) => (
              <CardOption
                key={option.value}
                label={option.label}
                selected={timeline === option.value}
                onClick={() => setTimeline(option.value)}
              />
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Brand readiness</label>
            <Select
              value={brandIdentity ?? undefined}
              onValueChange={(v) => setBrandIdentity(v as BrandIdentity)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Optional" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="complete">Complete</SelectItem>
                <SelectItem value="partial">Partial</SelectItem>
                <SelectItem value="scratch">From scratch</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Content readiness</label>
            <Select
              value={contentReadiness ?? undefined}
              onValueChange={(v) => setContentReadiness(v as ContentReadiness)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Optional" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="provide">Client provides</SelectItem>
                <SelectItem value="need-help">Needs help</SelectItem>
                <SelectItem value="unsure">Unsure</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {estimate && (
          <div className="rounded-xl bg-muted/50 p-4 text-sm">
            <p className="text-muted-foreground">
              Estimator range:{" "}
              <span className="font-medium text-foreground">
                {formatCurrency(estimate.minPrice, "EGP")} – {formatCurrency(estimate.maxPrice, "EGP")}
              </span>{" "}
              · {estimate.minWeeks}–{estimate.maxWeeks} weeks
            </p>
            <p className="text-muted-foreground/70 text-xs mt-1">
              A proposal commits to one number — edit the line items below.
            </p>
          </div>
        )}
      </div>

      {estimate && (
        <div className="liquid-glass rounded-2xl p-6 space-y-6">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">Color world</label>
            <Select value={accentName ?? undefined} onValueChange={setAccentName}>
              <SelectTrigger className="w-[320px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.values(INTENT_ACCENTS).map((accent) => (
                  <SelectItem key={accent.accentName} value={accent.accentName}>
                    {accent.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">Currency</label>
            <Select value={currency} onValueChange={(v) => setCurrency(v as "EGP" | "USD")}>
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="EGP">EGP</SelectItem>
                <SelectItem value="USD">USD</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">Timeline (weeks)</label>
            <input
              type="number"
              min={1}
              value={timelineWeeks ?? ""}
              onChange={(e) => setTimelineWeeks(parseInt(e.target.value, 10) || 1)}
              className="w-[120px] rounded-lg border border-border bg-muted/50 px-3 py-1.5 text-sm text-end"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium">Line items</label>
              <Button variant="outline" size="sm" onClick={addLineItem}>
                <Plus className="h-3.5 w-3.5" />
                Add item
              </Button>
            </div>
            <div className="space-y-2">
              {lineItems.map((item, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={item.name}
                    onChange={(e) => updateLineItem(i, { name: e.target.value })}
                    className="flex-1 rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm"
                  />
                  <input
                    type="number"
                    value={item.amount}
                    onChange={(e) => updateLineItem(i, { amount: parseInt(e.target.value, 10) || 0 })}
                    className="w-[140px] rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm text-end"
                  />
                  <button
                    type="button"
                    onClick={() => removeLineItem(i)}
                    className="p-2 text-muted-foreground hover:text-destructive transition-colors"
                    aria-label="Remove item"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-border">
            <span className="text-lg font-medium">Total</span>
            <span className="text-lg font-medium">{formatCurrency(totalPrice, currency)}</span>
          </div>

          <Button
            variant="brand"
            className="w-full h-12 rounded-xl"
            disabled={!canGenerate || submitting}
            aria-busy={submitting}
            onClick={handleGenerate}
          >
            {submitting ? "Generating…" : "Generate proposal"}
          </Button>
        </div>
      )}
    </div>
  );
}
