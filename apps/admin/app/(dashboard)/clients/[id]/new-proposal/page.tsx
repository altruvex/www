"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  AlertTriangle,
  Check,
  Images,
  Loader2,
  Send,
  SlidersHorizontal,
} from "lucide-react";
import {
  calculateEstimate,
  MAX_DELIVERY_WEEKS,
  egpToUsd,
  type BrandIdentityId as BrandIdentity,
  type ComplexityId as Complexity,
  type ContentReadinessId as ContentReadiness,
  type ServiceId as ProjectType,
  type TimelineId as Timeline,
} from "@repo/pricing-schema";
import { cn } from "@/lib/utils";
import { Button } from "@repo/ui";
import { SegmentedControl, segmentClass } from "@repo/ui";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui";
import { PageHeader, MetaItem } from "@/components/os/page-header";
import { Panel } from "@/components/os/panel";
import { EmptyState } from "@/components/os/empty-state";
import { Skeleton } from "@repo/ui";
import {
  ProposalContentEditor,
  PROPOSAL_GROUPS,
  groupIssueCounts,
  timelineWeeks,
  unassignedIssues,
  type ProposalGroupId,
} from "@/components/proposal/content-editor";
import {
  PriceControl,
  type PricePreset,
} from "@/components/proposal/price-control";
import { INTENT_ACCENTS, suggestIntentAccent } from "@/lib/intent-accent";
import { buildDefaultProposalContent } from "@/lib/proposal-defaults";
import {
  discountAmount,
  formatPercent,
  investmentTotal,
  netTotal,
  paymentPercentTotal,
  validateProposalContent,
  type ProposalContent,
  type ValidationIssue,
} from "@/lib/proposal-schema";

/**
 * The proposal builder.
 *
 * Restructured around the DOCUMENT rather than the schema: a rail of the seven
 * slides plus setup and preview, and one editor pane at a time. The old screen
 * was a single 800-line scroll in which "the pricing table" and "slide 5" were
 * the same thing but never said so.
 *
 * Everything that determines the generated deck is unchanged — the same
 * estimator call, the same seeding rule, the same `ProposalContent`, the same
 * two POST bodies. This is navigation and presentation only.
 */

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

type RailId = "setup" | ProposalGroupId | "preview";

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

export default function NewProposalPage() {
  const params = useParams();
  const router = useRouter();
  const clientId = params.id as string;

  const [client, setClient] = React.useState<ClientSummary | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [previewing, setPreviewing] = React.useState(false);
  const [previewSlides, setPreviewSlides] = React.useState<string[] | null>(
    null,
  );
  const [rail, setRail] = React.useState<RailId>("setup");

  const [projectType, setProjectType] = React.useState<ProjectType | null>(
    null,
  );
  const [complexity, setComplexity] = React.useState<Complexity | null>(null);
  const [timeline, setTimeline] = React.useState<Timeline | null>(null);
  const [brandIdentity, setBrandIdentity] =
    React.useState<BrandIdentity | null>(null);
  const [contentReadiness, setContentReadiness] =
    React.useState<ContentReadiness | null>(null);
  const [currency, setCurrency] = React.useState<"EGP" | "USD">("EGP");
  const [accentName, setAccentName] = React.useState<string | null>(null);

  // The whole editable deck. Seeded once from the estimator, then owned by
  // the admin — nothing downstream re-derives it.
  const [content, setContent] = React.useState<ProposalContent | null>(null);

  const fetchClient = React.useCallback(async () => {
    try {
      setLoading(true);
      setLoadError(null);
      const response = await fetch(`/api/admin/clients/${clientId}`);
      const data = await response.json();
      if (data.success) {
        setClient(data.client);
        setAccentName(suggestIntentAccent(data.client.industry));
      } else {
        setLoadError(data.message || "Failed to load client");
      }
    } catch (error: unknown) {
      console.error("Error fetching client:", error);
      setLoadError("The client record could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchClient();
  }, [fetchClient]);

  const estimate = React.useMemo(() => {
    if (!projectType || !complexity || !timeline) return null;
    return calculateEstimate({
      serviceId: projectType,
      complexityId: complexity,
      timeline,
      brandIdentity,
      contentReadiness,
    });
  }, [projectType, complexity, timeline, brandIdentity, contentReadiness]);

  // Seed the editable content from the live estimate — the midpoint of the
  // range is a starting point, not the final number (§5.1 rule 3: Ali edits
  // before generating). Re-seeding only happens when the estimator inputs
  // change, so hand edits are never silently overwritten.
  const estimateSignature =
    estimate && projectType && client
      ? `${projectType}-${estimate.minPrice}-${estimate.maxPrice}-${estimate.minWeeks}-${estimate.maxWeeks}-${currency}`
      : null;
  const [syncedSignature, setSyncedSignature] = React.useState<string | null>(
    null,
  );

  if (
    estimate &&
    projectType &&
    client &&
    estimateSignature !== syncedSignature
  ) {
    setSyncedSignature(estimateSignature);
    const midPrice =
      Math.round((estimate.minPrice + estimate.maxPrice) / 2 / 500) * 500;
    const midWeeks = Math.round((estimate.minWeeks + estimate.maxWeeks) / 2);
    // The USD rate is the schema's fixed, quarterly-reviewed figure — it used
    // to be a bare `/ 50` here, which meant a rate change had to be remembered
    // in two places.
    const priceInCurrency = currency === "USD" ? egpToUsd(midPrice) : midPrice;
    setContent(
      buildDefaultProposalContent({
        clientName: client.name
          ? `${client.name}${client.company ? ` – ${client.company}` : ""}`
          : client.company || client.phone,
        clientCompany: client.company || client.name || "Client",
        industry: client.industry,
        projectType,
        currency,
        totalPrice: priceInCurrency,
        timelineWeeks: midWeeks,
      }),
    );
    setPreviewSlides(null);
  }

  // Same schema the server gate runs — the form can't disagree with it.
  const validation = React.useMemo(
    () =>
      content
        ? validateProposalContent(content)
        : { ok: false, issues: [] as ValidationIssue[] },
    [content],
  );

  const issueCounts = React.useMemo(
    () => groupIssueCounts(validation.issues),
    [validation.issues],
  );

  // A schema error that belongs to no group has no field to attach to. Rare,
  // but silent failure is the one thing this screen must not do.
  const orphanIssues = React.useMemo(
    () => unassignedIssues(validation.issues),
    [validation.issues],
  );

  const canGenerate = Boolean(
    projectType && complexity && accentName && content && validation.ok,
  );

  const postContent = async (url: string) =>
    fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clientId,
        projectType,
        complexity,
        accentName,
        content,
      }),
    });

  const handlePreview = async () => {
    if (!content || !validation.ok) return;
    setPreviewing(true);
    setPreviewSlides(null);
    setRail("preview");
    try {
      const response = await postContent("/api/admin/proposals/preview");
      const data = await response.json();
      if (data.success) {
        setPreviewSlides(data.slides);
      } else {
        toast.error(data.message || "Preview failed");
      }
    } catch (error: unknown) {
      console.error("Error rendering preview:", error);
      toast.error("Preview failed", {
        description: "Nothing was saved — the deck was only being rendered.",
      });
    } finally {
      setPreviewing(false);
    }
  };

  const handleGenerate = async () => {
    if (!canGenerate) return;
    setSubmitting(true);
    try {
      const response = await postContent("/api/admin/proposals");
      const data = await response.json();
      if (data.success) {
        toast.success("Proposal generated");
        router.push(`/clients/${clientId}`);
      } else {
        toast.error(data.message || "Failed to generate proposal");
        if (Array.isArray(data.issues)) {
          for (const issue of data.issues.slice(0, 3)) {
            toast.error(`${issue.path}: ${issue.message}`);
          }
        }
      }
    } catch (error: unknown) {
      console.error("Error generating proposal:", error);
      toast.error("Something went wrong", {
        description: "No proposal was created. It is safe to try again.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  /* ---- loading / failure ------------------------------------------------ */
  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-5 w-48" />
        <div className="grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  if (!client) {
    return (
      <EmptyState
        icon={AlertTriangle}
        title="Client not found"
        body={
          loadError ??
          "This client record could not be loaded, so there is nothing to quote. It may have been deleted, or the link may point at another environment."
        }
        action={
          <Button asChild variant="outline">
            <Link href="/clients">Back to clients</Link>
          </Button>
        }
      />
    );
  }

  const clientLabel = client.company || client.name || client.phone;
  const subtotal = content ? investmentTotal(content.investmentItems) : 0;
  const reduction = content
    ? discountAmount(content.investmentItems, content.discount)
    : 0;
  const total = content
    ? netTotal(content.investmentItems, content.discount)
    : 0;
  const percentTotal = content
    ? paymentPercentTotal(content.paymentSchedule)
    : 0;
  const percentOk = Math.abs(percentTotal - 100) < 0.001;
  const weeks = content ? timelineWeeks(content.timelinePhases) : 0;
  // Phase durations stay hand-editable, but the server refuses a deck past the
  // published ceiling. Say so here rather than letting the operator find out
  // from a 400 after writing the whole document.
  const overCeiling = weeks > MAX_DELIVERY_WEEKS;
  const deckLocked = !content;

  // The estimator's own three figures, converted with the same rule the seed
  // uses so a preset can never disagree with the number the deck opened on.
  const toSeedCurrency = (egp: number) =>
    currency === "USD" ? egpToUsd(egp) : Math.round(egp / 500) * 500;
  const pricePresets: PricePreset[] = estimate
    ? [
        { label: "Min", amount: toSeedCurrency(estimate.minPrice) },
        {
          label: "Mid",
          amount: toSeedCurrency((estimate.minPrice + estimate.maxPrice) / 2),
        },
        { label: "Max", amount: toSeedCurrency(estimate.maxPrice) },
      ]
    : [];

  // Stated rather than blocked: quoting outside the estimator is a normal
  // commercial decision, and a silent divergence is the thing to avoid.
  const outsideRange =
    estimate && subtotal > 0
      ? subtotal < toSeedCurrency(estimate.minPrice)
        ? "below"
        : subtotal > toSeedCurrency(estimate.maxPrice)
          ? "above"
          : null
      : null;

  const railEntries: {
    id: RailId;
    shortSlide: string;
    label: string;
    issues: number;
    disabled: boolean;
  }[] = [
    {
      id: "setup",
      shortSlide: "◇",
      label: "Scope",
      issues: 0,
      disabled: false,
    },
    ...PROPOSAL_GROUPS.map((group) => ({
      id: group.id as RailId,
      shortSlide: group.slide,
      label: group.label,
      issues: issueCounts[group.id],
      disabled: deckLocked,
    })),
    {
      id: "preview" as RailId,
      shortSlide: "▣",
      label: "Preview",
      issues: 0,
      disabled: deckLocked,
    },
  ];

  return (
    <div className="space-y-4 pb-24">
      <PageHeader
        crumbs={[
          { label: "Clients", href: "/clients" },
          { label: clientLabel, href: `/clients/${clientId}` },
          { label: "New proposal" },
        ]}
        title="New proposal"
        description="Price the work from the same table the public estimator uses, then edit every word the deck will say before it is generated."
        meta={
          content ? (
            <>
              <MetaItem label={reduction > 0 ? "Client pays" : "Total"}>
                {formatCurrency(total, content.meta.currency)}
              </MetaItem>
              {reduction > 0 && (
                <MetaItem label={content.discount.label.trim() || "Discount"}>
                  <span className="text-danger">
                    −{formatCurrency(reduction, content.meta.currency)}
                  </span>
                </MetaItem>
              )}
              <MetaItem label="Timeline">
                <span className={overCeiling ? "text-danger" : undefined}>
                  {weeks} weeks
                </span>
                {overCeiling && (
                  <span className="ms-2 text-muted-foreground">
                    over the {MAX_DELIVERY_WEEKS}-week ceiling
                  </span>
                )}
              </MetaItem>
              <MetaItem label="Split">
                <span className={percentOk ? "text-success" : "text-danger"}>
                  {formatPercent(percentTotal)}%
                </span>
              </MetaItem>
            </>
          ) : null
        }
      />

      {/* On a phone the vertical rail would be 700px of navigation above the
          first field, so it becomes a horizontal strip instead — the same map,
          one thumb-reachable row (§33: redesign density, do not shrink it). */}
      <nav aria-label="Proposal sections" className="lg:hidden">
        <div className="-mx-3 overflow-x-auto px-3 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <ul className="flex min-w-max items-stretch gap-1.5">
            {railEntries.map((entry) => (
              <li key={entry.id}>
                <button
                  type="button"
                  onClick={() => setRail(entry.id)}
                  disabled={entry.disabled}
                  aria-current={rail === entry.id ? "step" : undefined}
                  className={cn(
                    segmentClass({
                      selected: rail === entry.id,
                      disabled: entry.disabled,
                    }),
                    "whitespace-nowrap",
                  )}
                >
                  <span className="font-mono text-micro text-subtle-foreground">
                    {entry.shortSlide}
                  </span>
                  {entry.label}
                  {entry.issues > 0 && (
                    <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-danger/12 px-1 font-mono text-micro text-danger">
                      {entry.issues}
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </nav>

      <div className="grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
        {/* ---- rail: the deck, in order ---------------------------------- */}
        <nav
          aria-label="Proposal sections"
          className="hidden lg:sticky lg:top-4 lg:block lg:self-start"
        >
          <Panel flush>
            <ul className="rows">
              <RailItem
                active={rail === "setup"}
                onClick={() => setRail("setup")}
                slide={<SlidersHorizontal className="size-3.5" />}
                label="Scope & price"
                blurb="Estimator, price, discount"
                state={estimate ? "done" : "todo"}
              />
            </ul>

            <p className="telemetry border-y border-border bg-surface px-3 py-1.5 text-subtle-foreground">
              The deck
            </p>

            <ul className="rows">
              {PROPOSAL_GROUPS.map((group) => (
                <RailItem
                  key={group.id}
                  active={rail === group.id}
                  disabled={deckLocked}
                  onClick={() => setRail(group.id)}
                  slide={
                    <span className="font-mono text-micro">{group.slide}</span>
                  }
                  label={group.label}
                  blurb={group.blurb}
                  issues={issueCounts[group.id]}
                  state={
                    deckLocked
                      ? "locked"
                      : issueCounts[group.id]
                        ? "error"
                        : "done"
                  }
                />
              ))}
            </ul>

            <p className="telemetry border-y border-border bg-surface px-3 py-1.5 text-subtle-foreground">
              Check
            </p>

            <ul className="rows">
              <RailItem
                active={rail === "preview"}
                disabled={deckLocked}
                onClick={() => setRail("preview")}
                slide={<Images className="size-3.5" />}
                label="Preview"
                blurb="Render the real slides"
                state={previewSlides ? "done" : "todo"}
              />
            </ul>
          </Panel>
        </nav>

        {/* ---- pane ------------------------------------------------------- */}
        <div className="min-w-0 space-y-3">
          {rail === "setup" && (
            <>
              <Panel
                title="What are we building?"
                description="These five inputs drive the estimator. Changing any of them re-seeds the deck below."
              >
                <div className="space-y-4">
                  <SegmentedControl
                    label="Project type"
                    options={PROJECT_TYPES}
                    value={projectType}
                    onChange={setProjectType}
                    columns={2}
                  />
                  <SegmentedControl
                    label="Complexity"
                    options={COMPLEXITIES}
                    value={complexity}
                    onChange={setComplexity}
                  />
                  <SegmentedControl
                    label="Timeline urgency"
                    options={TIMELINES}
                    value={timeline}
                    onChange={setTimeline}
                  />

                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="space-y-1.5">
                      <span className="block text-meta font-medium text-muted-foreground">
                        Brand readiness
                      </span>
                      <Select
                        value={brandIdentity ?? undefined}
                        onValueChange={(v) =>
                          setBrandIdentity(v as BrandIdentity)
                        }
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
                    </label>
                    <label className="space-y-1.5">
                      <span className="block text-meta font-medium text-muted-foreground">
                        Content readiness
                      </span>
                      <Select
                        value={contentReadiness ?? undefined}
                        onValueChange={(v) =>
                          setContentReadiness(v as ContentReadiness)
                        }
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Optional" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="provide">
                            Client provides
                          </SelectItem>
                          <SelectItem value="need-help">Needs help</SelectItem>
                          <SelectItem value="unsure">Unsure</SelectItem>
                        </SelectContent>
                      </Select>
                    </label>
                  </div>
                </div>
              </Panel>

              {estimate ? (
                <>
                  <Panel
                    title="Estimator range"
                    description="What the public site would have quoted for these inputs"
                  >
                    <div className="flex flex-wrap items-baseline gap-x-6 gap-y-2">
                      <span className="font-sans text-[length:var(--text-metric)] font-medium leading-none tracking-[-0.02em] tabular-nums">
                        {formatCurrency(estimate.minPrice, "EGP")}
                        <span className="mx-2 text-subtle-foreground">–</span>
                        {formatCurrency(estimate.maxPrice, "EGP")}
                      </span>
                      <span className="font-mono text-meta tabular-nums text-muted-foreground">
                        {estimate.minWeeks}–{estimate.maxWeeks} weeks
                      </span>
                    </div>
                    <p className="mt-3 max-w-prose border-t border-border pt-3 text-base text-muted-foreground">
                      A proposal commits to{" "}
                      <span className="text-foreground">one</span> number, not a
                      range. The deck is seeded with the midpoint — every figure
                      in it is editable before you generate.
                    </p>
                  </Panel>

                  {content && (
                    <Panel
                      title="Price & discount"
                      description="The estimator suggests; you decide. Nothing here is clamped to the range above."
                    >
                      <PriceControl
                        content={content}
                        onChange={(next) => {
                          setContent(next);
                          setPreviewSlides(null);
                        }}
                        issues={validation.issues}
                        presets={pricePresets}
                      />
                      {outsideRange && (
                        <p className="mt-3 flex items-start gap-1.5 border-t border-border pt-3 text-meta text-muted-foreground">
                          <SlidersHorizontal
                            className="mt-0.5 size-3 shrink-0"
                            aria-hidden
                          />
                          <span>
                            The subtotal is {outsideRange} the estimator range.
                            That is allowed — the range is a reference, not a
                            rule.
                          </span>
                        </p>
                      )}
                    </Panel>
                  )}

                  <Panel
                    title="Pipeline metadata"
                    description="Recorded against the proposal record, not printed in the deck"
                  >
                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className="space-y-1.5">
                        <span className="block text-meta font-medium text-muted-foreground">
                          Colour world
                        </span>
                        <Select
                          value={accentName ?? undefined}
                          onValueChange={setAccentName}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.values(INTENT_ACCENTS).map((accent) => (
                              <SelectItem
                                key={accent.accentName}
                                value={accent.accentName}
                              >
                                {accent.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <span className="block text-meta text-subtle-foreground">
                          Pipeline metadata only — the deck’s accent is the one
                          brand colour.
                        </span>
                      </label>
                      <label className="space-y-1.5">
                        <span className="block text-meta font-medium text-muted-foreground">
                          Seed currency
                        </span>
                        <Select
                          value={currency}
                          onValueChange={(v) => setCurrency(v as "EGP" | "USD")}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="EGP">EGP</SelectItem>
                            <SelectItem value="USD">USD</SelectItem>
                          </SelectContent>
                        </Select>
                        <span className="block text-meta text-subtle-foreground">
                          Re-seeds the deck. The document reads the currency in
                          the content itself.
                        </span>
                      </label>
                    </div>
                    <div className="mt-4 border-t border-border pt-3">
                      <Button
                        variant="brand"
                        size="sm"
                        onClick={() => setRail("cover")}
                      >
                        Edit the deck
                      </Button>
                    </div>
                  </Panel>
                </>
              ) : (
                <Panel title="Nothing to price yet">
                  <p className="max-w-prose text-base text-muted-foreground">
                    Pick a project type, a complexity and a timeline. The
                    estimator produces a range the moment all three are set, and
                    the deck is seeded from its midpoint.
                  </p>
                </Panel>
              )}
            </>
          )}

          {rail !== "setup" && rail !== "preview" && content && (
            <ProposalContentEditor
              content={content}
              onChange={(next) => {
                setContent(next);
                setPreviewSlides(null);
              }}
              issues={validation.issues}
              activeGroup={rail}
            />
          )}

          {orphanIssues.length > 0 && (
            <Panel
              title="Issues with no field"
              description="These block generation"
            >
              <ul className="space-y-1">
                {orphanIssues.map((issue, i) => (
                  <li key={i} className="text-base">
                    <span className="font-mono text-micro text-foreground">
                      {issue.path}
                    </span>
                    <span className="text-muted-foreground">
                      {" "}
                      — {issue.message}
                    </span>
                  </li>
                ))}
              </ul>
            </Panel>
          )}

          {rail === "preview" && (
            <Panel
              title="Preview"
              description="The real generated slides, rendered from exactly what is in the form"
              action={
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!validation.ok || previewing}
                  onClick={handlePreview}
                >
                  {previewing && <Loader2 className="size-3.5 animate-spin" />}
                  {previewSlides ? "Re-render" : "Render slides"}
                </Button>
              }
            >
              {previewing ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="aspect-video w-full" />
                  ))}
                </div>
              ) : previewSlides ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  {previewSlides.map((src, i) => (
                    <figure key={i} className="space-y-1">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={src}
                        alt={`Slide ${i + 1}`}
                        className="w-full rounded-md border border-border"
                      />
                      <figcaption className="telemetry text-subtle-foreground">
                        Slide {String(i + 1).padStart(2, "0")}
                      </figcaption>
                    </figure>
                  ))}
                </div>
              ) : (
                <p className="max-w-prose text-base text-muted-foreground">
                  {validation.ok
                    ? "Nothing rendered yet. This runs the real generator, so what you see here is what the client receives."
                    : "Fix the outstanding issues first — the preview runs the same generator as the final document and will not render an invalid deck."}
                </p>
              )}
            </Panel>
          )}
        </div>
      </div>

      {/* ---- action bar: state and the two things you can do ------------- */}
      {content && (
        <div className="sticky bottom-3 z-20 lg:bottom-4">
          <div className="plane flex flex-wrap items-center gap-x-4 gap-y-2 px-3 py-2 shadow-[var(--elev-2)]">
            {validation.ok ? (
              <span className="inline-flex items-center gap-1.5 text-base text-success">
                <Check className="size-3.5" aria-hidden />
                Ready to generate
              </span>
            ) : (
              <button
                type="button"
                onClick={() => {
                  const firstBroken = PROPOSAL_GROUPS.find(
                    (g) => issueCounts[g.id] > 0,
                  );
                  if (firstBroken) setRail(firstBroken.id);
                }}
                className="inline-flex items-center gap-1.5 rounded-sm text-base text-danger hover:underline"
              >
                <AlertTriangle className="size-3.5" aria-hidden />
                {validation.issues.length} issue
                {validation.issues.length === 1 ? "" : "s"} to fix
              </button>
            )}

            <span className="hidden font-mono text-micro tabular-nums text-subtle-foreground sm:inline">
              {reduction > 0 && (
                <>
                  <span className="line-through">
                    {formatCurrency(subtotal, content.meta.currency)}
                  </span>{" "}
                </>
              )}
              {formatCurrency(total, content.meta.currency)} ·{" "}
              <span className={overCeiling ? "text-danger" : undefined}>
                {weeks}W
              </span>{" "}
              ·{" "}
              <span className={percentOk ? undefined : "text-danger"}>
                {formatPercent(percentTotal)}%
              </span>
            </span>

            <div className="ms-auto flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={!validation.ok || previewing}
                aria-busy={previewing}
                onClick={handlePreview}
              >
                {previewing ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Images className="size-3.5" />
                )}
                {previewing ? "Rendering…" : "Preview"}
              </Button>
              <Button
                variant="brand"
                size="sm"
                disabled={!canGenerate || submitting}
                aria-busy={submitting}
                onClick={handleGenerate}
              >
                {submitting ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Send className="size-3.5" />
                )}
                {submitting ? "Generating…" : "Generate proposal"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function RailItem({
  active,
  disabled,
  onClick,
  slide,
  label,
  blurb,
  issues = 0,
  state,
}: {
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
  slide: React.ReactNode;
  label: string;
  blurb: string;
  issues?: number;
  state: "todo" | "done" | "error" | "locked";
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        aria-current={active ? "step" : undefined}
        className={cn(
          "relative flex w-full items-start gap-2 px-3 py-2 text-start",
          "transition-colors duration-[var(--dur-state)]",
          active ? "bg-brand-soft" : "hover:bg-surface/70",
          disabled && "cursor-not-allowed opacity-40 hover:bg-transparent",
        )}
      >
        {active && (
          <span
            className="absolute inset-y-1 start-0 w-0.5 rounded-e-full bg-foreground"
            aria-hidden
          />
        )}
        <span className="mt-0.5 flex w-5 shrink-0 justify-center text-subtle-foreground">
          {slide}
        </span>
        <span className="min-w-0 flex-1">
          <span
            className={cn("block truncate text-base", active && "font-medium")}
          >
            {label}
          </span>
          <span className="block truncate text-meta text-subtle-foreground">
            {blurb}
          </span>
        </span>
        {state === "error" && issues > 0 && (
          <span className="mt-0.5 inline-flex h-4 min-w-4 shrink-0 items-center justify-center rounded-full bg-danger/12 px-1 font-mono text-micro font-medium tabular-nums text-danger">
            {issues}
          </span>
        )}
        {state === "done" && (
          <Check
            className="mt-0.5 size-3 shrink-0 text-success"
            aria-label="complete"
          />
        )}
      </button>
    </li>
  );
}
