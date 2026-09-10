"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  AlertTriangle,
  Check,
  ChevronLeft,
  ChevronRight,
  History,
  Images,
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
import { LoadingIcon } from "@repo/ui";
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

const DRAFT_VERSION = 2;
const draftKey = (clientId: string) =>
  `altruvex.proposal-draft.v${DRAFT_VERSION}.${clientId}`;

interface ProposalSource {
  id: string;
  createdAt: string;
  projectType: string;
  complexity: string;
  currency: string;
  totalPrice: number;
  status: string;
  content: ProposalContent;
}

interface ProposalDraft {
  savedAt: string;
  estimateSignature: string | null;
  projectType: ProjectType | null;
  complexity: Complexity | null;
  timeline: Timeline | null;
  brandIdentity: BrandIdentity | null;
  contentReadiness: ContentReadiness | null;
  currency: "EGP" | "USD";
  accentName: string | null;
  content: ProposalContent;
}

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatSavedAt(iso: string): string {
  const when = new Date(iso);
  if (Number.isNaN(when.getTime())) return "an unknown time";
  const today = new Date();
  const sameDay =
    when.getFullYear() === today.getFullYear() &&
    when.getMonth() === today.getMonth() &&
    when.getDate() === today.getDate();
  return sameDay
    ? when.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
    : when.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
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
  // An edit used to throw the rendered slides away, which left the operator
  // with nothing to look at exactly when they had just changed something.
  // The render is kept and marked out of date instead — a stale picture of
  // the deck beats a blank panel, as long as it never claims to be current.
  const [previewStale, setPreviewStale] = React.useState(false);
  const [previewStartedAt, setPreviewStartedAt] = React.useState<number | null>(
    null,
  );
  const [rail, setRail] = React.useState<RailId>("setup");
  // A tick meaning "the schema is happy" is not the same claim as "you have
  // read this". The rail used to show both as one green check, so nine
  // never-opened sections looked finished. Visited is tracked separately.
  const [visited, setVisited] = React.useState<Set<RailId>>(
    () => new Set<RailId>(["setup"]),
  );
  const goTo = React.useCallback((id: RailId) => {
    setRail(id);
    setVisited((prev) => (prev.has(id) ? prev : new Set(prev).add(id)));
  }, []);

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

  const [content, setContent] = React.useState<ProposalContent | null>(null);

  const [draftSavedAt, setDraftSavedAt] = React.useState<string | null>(null);
  const [draftPending, setDraftPending] = React.useState(false);
  const [offeredDraft, setOfferedDraft] = React.useState<ProposalDraft | null>(
    null,
  );
  const [storageBlocked, setStorageBlocked] = React.useState(false);
  const draftChecked = React.useRef(false);

  // Every past proposal that still carries its content document. A deck is
  // mostly the same sentences every time; the part that changes is the client
  // and the numbers. Copying one is faster than re-seeding and re-editing it.
  const [sources, setSources] = React.useState<ProposalSource[] | null>(null);
  const [sourcesOpen, setSourcesOpen] = React.useState(false);

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

  const estimateSignature =
    estimate && projectType && client
      ? `${projectType}-${estimate.minPrice}-${estimate.maxPrice}-${estimate.minWeeks}-${estimate.maxWeeks}-${currency}`
      : null;
  const [syncedSignature, setSyncedSignature] = React.useState<string | null>(
    null,
  );

  const clientIdentity = React.useMemo(
    () =>
      client
        ? {
            clientName: client.name
              ? `${client.name}${client.company ? ` – ${client.company}` : ""}`
              : client.company || client.phone,
            clientCompany: client.company || client.name || "Client",
          }
        : null,
    [client],
  );

  const buildSeed = React.useCallback((): ProposalContent | null => {
    if (!estimate || !projectType || !client || !clientIdentity) return null;
    const midPrice =
      Math.round((estimate.minPrice + estimate.maxPrice) / 2 / 500) * 500;
    const midWeeks = Math.round((estimate.minWeeks + estimate.maxWeeks) / 2);
    const priceInCurrency = currency === "USD" ? egpToUsd(midPrice) : midPrice;
    return buildDefaultProposalContent({
      ...clientIdentity,
      industry: client.industry,
      projectType,
      currency,
      totalPrice: priceInCurrency,
      timelineWeeks: midWeeks,
    });
  }, [estimate, projectType, client, clientIdentity, currency]);

  // Seeding only ever happens into an EMPTY deck now. It used to fire on any
  // estimator change, which meant toggling complexity after writing nine
  // sections replaced all of them with a fresh midpoint and no warning — the
  // old comment claimed hand edits were never silently overwritten, and that
  // was the one case where they were. A changed estimate is now offered, not
  // applied: `seedOutOfDate` puts a re-seed button on the screen instead.
  if (
    estimate &&
    projectType &&
    client &&
    !content &&
    estimateSignature !== syncedSignature
  ) {
    setSyncedSignature(estimateSignature);
    const seeded = buildSeed();
    if (seeded) {
      setContent(seeded);
      setPreviewSlides(null);
      setPreviewStale(false);
    }
  }

  const seedOutOfDate = Boolean(
    estimate && content && estimateSignature !== syncedSignature,
  );

  const reseedFromEstimator = () => {
    const seeded = buildSeed();
    if (!seeded) return;
    setSyncedSignature(estimateSignature);
    setContent(seeded);
    setPreviewSlides(null);
    setPreviewStale(false);
    toast.success("Deck re-seeded", {
      description: "Every section is back to the estimator's starting text.",
    });
  };

  React.useEffect(() => {
    if (draftChecked.current) return;
    draftChecked.current = true;
    try {
      const raw = window.localStorage.getItem(draftKey(clientId));
      if (!raw) return;
      const parsed = JSON.parse(raw) as ProposalDraft;
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (parsed?.content && parsed?.savedAt) setOfferedDraft(parsed);
    } catch {
      setStorageBlocked(true);
    }
  }, [clientId]);

  React.useEffect(() => {
    if (!content) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDraftPending(true);
    const timer = setTimeout(() => {
      try {
        const draft: ProposalDraft = {
          savedAt: new Date().toISOString(),
          estimateSignature,
          projectType,
          complexity,
          timeline,
          brandIdentity,
          contentReadiness,
          currency,
          accentName,
          content,
        };
        window.localStorage.setItem(draftKey(clientId), JSON.stringify(draft));
        setDraftSavedAt(draft.savedAt);
        setStorageBlocked(false);
      } catch {
        setDraftSavedAt(null);
        setStorageBlocked(true);
      }
      setDraftPending(false);
    }, 700);
    return () => clearTimeout(timer);
  }, [
    content,
    clientId,
    estimateSignature,
    projectType,
    complexity,
    timeline,
    brandIdentity,
    contentReadiness,
    currency,
    accentName,
  ]);

  const loadSources = async () => {
    setSourcesOpen(true);
    if (sources) return;
    try {
      const response = await fetch("/api/admin/proposals");
      const data = await response.json();
      if (!data.success) {
        toast.error(data.message || "Could not load past proposals");
        setSources([]);
        return;
      }
      setSources(
        (data.proposals as ProposalSource[])
          .filter((proposal) => proposal.content)
          .slice(0, 25),
      );
    } catch (error: unknown) {
      console.error("Error fetching past proposals:", error);
      toast.error("Could not load past proposals");
      setSources([]);
    }
  };

  const copyFrom = (source: ProposalSource) => {
    if (!clientIdentity) return;
    const today = new Date().toISOString().slice(0, 10);
    // The client and the date are the only two things a copy must not keep.
    // Everything else — scope, phases, terms, wording — is the reason to copy.
    setContent({
      ...source.content,
      meta: {
        ...source.content.meta,
        ...clientIdentity,
        proposalDate: today,
      },
    });
    setCurrency(source.content.meta.currency === "USD" ? "USD" : "EGP");
    if (!projectType) setProjectType(source.projectType as ProjectType);
    if (!complexity) setComplexity(source.complexity as Complexity);
    setPreviewSlides(null);
    setPreviewStale(false);
    setSourcesOpen(false);
    goTo("cover");
    toast.success("Copied", {
      description:
        "Client name and proposal date were replaced. Check the price and the scope before you send it.",
    });
  };

  const clearDraft = React.useCallback(() => {
    try {
      window.localStorage.removeItem(draftKey(clientId));
    } catch {
      // Ignored
    }
    setDraftSavedAt(null);
    setOfferedDraft(null);
  }, [clientId]);

  const restoreDraft = (draft: ProposalDraft) => {
    setProjectType(draft.projectType);
    setComplexity(draft.complexity);
    setTimeline(draft.timeline);
    setBrandIdentity(draft.brandIdentity);
    setContentReadiness(draft.contentReadiness);
    setCurrency(draft.currency);
    if (draft.accentName) setAccentName(draft.accentName);
    setSyncedSignature(draft.estimateSignature);
    setContent(draft.content);
    setPreviewSlides(null);
    setPreviewStale(false);
    setOfferedDraft(null);
    setDraftSavedAt(draft.savedAt);
    setRail(PROPOSAL_GROUPS[0]?.id || "setup");
    toast.success("Draft restored", {
      description: "It was held in this browser — nothing had been sent to the server.",
    });
  };

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

  const orphanIssues = React.useMemo(
    () => unassignedIssues(validation.issues),
    [validation.issues],
  );

  const canGenerate = Boolean(
    projectType && complexity && accentName && content && validation.ok,
  );

  const postContent = async (url: string, extra?: Record<string, unknown>) =>
    fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clientId,
        projectType,
        complexity,
        accentName,
        content,
        ...extra,
      }),
    });

  /**
   * Render the deck, or one slide of it.
   *
   * Three things this must not do, all of which it used to. It must not
   * return silently when the deck is invalid — a button that does nothing is
   * indistinguishable from a broken one, so an invalid deck sends the
   * operator to the first section that is actually wrong. It must not blank
   * the slides it already has, because a render takes seconds and an empty
   * panel for those seconds reads as failure. And it must not navigate: the
   * section-level render is meant to leave you exactly where you were.
   */
  const handlePreview = async (options: { slide?: number; navigate?: boolean } = {}) => {
    if (!content) return;
    if (!validation.ok) {
      const firstBroken = PROPOSAL_GROUPS.find((g) => issueCounts[g.id] > 0);
      toast.error("The deck has issues the generator will refuse", {
        description: firstBroken
          ? `Start with ${firstBroken.label}.`
          : "Fix the outstanding issues first.",
      });
      if (firstBroken) goTo(firstBroken.id);
      return;
    }

    setPreviewing(true);
    setPreviewStartedAt(Date.now());
    if (options.navigate) goTo("preview");
    try {
      const response = await postContent(
        "/api/admin/proposals/preview",
        options.slide ? { slide: options.slide } : undefined,
      );
      const data = await response.json();
      if (data.success) {
        if (options.slide) {
          // A single-slide render replaces just that frame, so the rest of
          // the deck on screen keeps whatever age it already had.
          setPreviewSlides((prev) => {
            const next = prev ? [...prev] : [];
            next[options.slide! - 1] = data.slides[0];
            return next;
          });
        } else {
          setPreviewSlides(data.slides);
          setPreviewStale(false);
        }
      } else {
        toast.error(data.message || "Preview failed", {
          description: data.detail,
        });
      }
    } catch (error: unknown) {
      console.error("Error rendering preview:", error);
      toast.error("Preview failed", {
        description: "Nothing was saved — the deck was only being rendered.",
      });
    } finally {
      setPreviewing(false);
      setPreviewStartedAt(null);
    }
  };

  const handleGenerate = async () => {
    if (!canGenerate) return;
    setSubmitting(true);
    try {
      const response = await postContent("/api/admin/proposals");
      const data = await response.json();
      if (data.success) {
        clearDraft();
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
  const overCeiling = weeks > MAX_DELIVERY_WEEKS;
  const deckLocked = !content;
  // "Reviewed" means opened AND clean. Neither half alone is the truth.
  const reviewed = deckLocked
    ? 0
    : PROPOSAL_GROUPS.filter(
        (group) => visited.has(group.id) && issueCounts[group.id] === 0,
      ).length;

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

      {offeredDraft && (
        <div className="plane flex flex-wrap items-center gap-x-4 gap-y-2 border-brand/30 bg-brand-soft px-3 py-2">
          <History className="size-3.5 shrink-0 text-brand" aria-hidden />
          <p className="min-w-0 flex-1 text-base">
            An unfinished proposal for this client was left in this browser at{" "}
            <span className="font-mono text-micro tabular-nums">
              {formatSavedAt(offeredDraft.savedAt)}
            </span>
            .{" "}
            <span className="text-muted-foreground">
              Restoring replaces everything on this screen. It was never sent to
              the server.
            </span>
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="brand"
              size="sm"
              onClick={() => restoreDraft(offeredDraft)}
            >
              Restore draft
            </Button>
            <Button variant="outline" size="sm" onClick={clearDraft}>
              Discard
            </Button>
          </div>
        </div>
      )}

      <nav aria-label="Proposal sections" className="lg:hidden">
        <div className="-mx-3 overflow-x-auto px-3 pb-1 scrollbar-none [&::-webkit-scrollbar]:hidden">
          <ul className="flex min-w-max items-stretch gap-1.5">
            {railEntries.map((entry) => (
              <li key={entry.id}>
                <button
                  type="button"
                  onClick={() => goTo(entry.id)}
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
        <nav
          aria-label="Proposal sections"
          className="hidden lg:sticky lg:top-4 lg:block lg:self-start"
        >
          <Panel flush>
            <ul className="rows">
              <RailItem
                active={rail === "setup"}
                onClick={() => goTo("setup")}
                slide={<SlidersHorizontal className="size-3.5" />}
                label="Scope & price"
                blurb="Estimator, price, discount"
                state={estimate ? "done" : "todo"}
              />
            </ul>

            <div className="border-y border-border bg-surface px-3 py-1.5">
              <div className="flex items-baseline justify-between gap-2">
                <p className="telemetry text-subtle-foreground">The deck</p>
                <p className="font-mono text-micro tabular-nums text-subtle-foreground">
                  {reviewed}/{PROPOSAL_GROUPS.length}
                </p>
              </div>
              <div
                className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-border"
                role="img"
                aria-label={`${reviewed} of ${PROPOSAL_GROUPS.length} sections opened and free of issues`}
              >
                <span
                  style={{
                    width: `${(reviewed / PROPOSAL_GROUPS.length) * 100}%`,
                  }}
                  className="block h-full bg-brand transition-[width] duration-[var(--dur-state)]"
                />
              </div>
            </div>

            <ul className="rows">
              {PROPOSAL_GROUPS.map((group) => (
                <RailItem
                  key={group.id}
                  active={rail === group.id}
                  disabled={deckLocked}
                  onClick={() => goTo(group.id)}
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
                        : visited.has(group.id)
                          ? "done"
                          : "todo"
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
                onClick={() => goTo("preview")}
                slide={<Images className="size-3.5" />}
                label="Preview"
                blurb="Render the real slides"
                state={previewSlides ? "done" : "todo"}
              />
            </ul>
          </Panel>
        </nav>

        <div className="min-w-0 space-y-3">
          {rail === "setup" && (
            <>
              <Panel
                title="Start from a past proposal"
                description="A deck is mostly the same sentences every time. Copy one, then change what is actually different."
                action={
                  <Button variant="outline" size="sm" onClick={loadSources}>
                    {sourcesOpen ? "Refresh list" : "Browse past proposals"}
                  </Button>
                }
              >
                {!sourcesOpen ? (
                  <p className="max-w-prose text-base text-muted-foreground">
                    Copying keeps the scope, the phases and the terms, and
                    replaces the client name and the date. The price comes
                    across too — check it against the estimator below.
                  </p>
                ) : sources === null ? (
                  <div className="space-y-1.5">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <Skeleton key={i} className="h-10 w-full" />
                    ))}
                  </div>
                ) : sources.length === 0 ? (
                  <p className="max-w-prose text-base text-muted-foreground">
                    No past proposal carries a content document yet. Decks
                    generated from here will show up in this list.
                  </p>
                ) : (
                  <ul className="rows -mx-3 -mb-3">
                    {sources.map((source) => (
                      <li key={source.id}>
                        <button
                          type="button"
                          onClick={() => copyFrom(source)}
                          className="flex w-full items-center gap-3 px-3 py-2 text-start transition-colors duration-[var(--dur-state)] hover:bg-surface/70"
                        >
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-base">
                              {source.content.meta.clientCompany}
                              <span className="ms-2 text-muted-foreground">
                                {source.content.meta.projectLabel}
                              </span>
                            </span>
                            <span className="block truncate text-meta text-subtle-foreground">
                              {source.projectType} · {source.complexity} ·{" "}
                              {formatSavedAt(source.createdAt)} ·{" "}
                              {source.status.toLowerCase()}
                            </span>
                          </span>
                          <span className="shrink-0 font-mono text-micro tabular-nums text-muted-foreground">
                            {formatCurrency(
                              source.totalPrice,
                              source.currency,
                            )}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </Panel>

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
                  {seedOutOfDate && (
                    <div className="plane flex flex-wrap items-center gap-x-4 gap-y-2 border-warning/30 bg-warning/[0.06] px-3 py-2">
                      <AlertTriangle
                        className="size-3.5 shrink-0 text-warning"
                        aria-hidden
                      />
                      <p className="min-w-0 flex-1 text-base">
                        This deck was not produced by these estimator inputs.{" "}
                        <span className="text-muted-foreground">
                          It was copied, restored, or written before the inputs
                          changed — and it was kept rather than overwritten.
                          Re-seeding replaces every section with fresh starting
                          text.
                        </span>
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={reseedFromEstimator}
                      >
                        Re-seed the deck
                      </Button>
                    </div>
                  )}

                  <Panel
                    title="Estimator range"
                    description="What the public site would have quoted for these inputs"
                  >
                    <div className="flex flex-wrap items-baseline gap-x-6 gap-y-2">
                      <span className="font-sans text-(length:--text-metric) font-medium leading-none tracking-[-0.02em] tabular-nums">
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
                          setPreviewStale(true);
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
                        onClick={() =>
                          setRail(PROPOSAL_GROUPS[0]?.id || "setup")
                        }
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
            <>
              <ProposalContentEditor
                content={content}
                onChange={(next) => {
                  setContent(next);
                  setPreviewStale(true);
                }}
                issues={validation.issues}
                activeGroup={rail}
              />

              <SlideEcho
                slide={PROPOSAL_GROUPS.find((g) => g.id === rail)?.slide}
                slides={previewSlides}
                stale={previewStale}
                busy={previewing}
                startedAt={previewStartedAt}
                canRender={validation.ok}
                onRender={(slide) => handlePreview({ slide })}
              />

              <SectionPager
                entries={railEntries}
                current={rail}
                onNavigate={goTo}
              />
            </>
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
                  disabled={previewing}
                  onClick={() => handlePreview()}
                >
                  {previewing && <LoadingIcon size="sm" />}
                  {previewSlides ? "Re-render" : "Render slides"}
                </Button>
              }
            >
              {previewing && !previewSlides ? (
                <div className="space-y-3">
                  <RenderProgress startedAt={previewStartedAt} />
                  <div className="grid gap-3 sm:grid-cols-2">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <Skeleton key={i} className="aspect-video w-full" />
                    ))}
                  </div>
                </div>
              ) : previewSlides ? (
                <div className="space-y-3">
                  {previewing && <RenderProgress startedAt={previewStartedAt} />}
                  {!previewing && previewStale && (
                    <p className="rounded-md border border-border bg-surface px-2.5 py-2 text-base text-muted-foreground">
                      Rendered before your last edit. This is the deck as it
                      was — re-render to see the deck as it is.
                    </p>
                  )}
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

      {content && (
        <div className="sticky bottom-3 z-20 lg:bottom-4">
          <div className="plane flex flex-wrap items-center gap-x-4 gap-y-2 px-3 py-2 shadow-(--elev-2)">
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
                  if (firstBroken) goTo(firstBroken.id);
                }}
                className="inline-flex items-center gap-1.5 rounded-sm text-base text-danger hover:underline"
              >
                <AlertTriangle className="size-3.5" aria-hidden />
                {validation.issues.length} issue
                {validation.issues.length === 1 ? "" : "s"} to fix
              </button>
            )}
            <span
              className="hidden items-center gap-1.5 text-meta text-subtle-foreground md:inline-flex"
              title="Held in this browser only. A proposal exists on the server once it is generated."
            >
              <History className="size-3" aria-hidden />
              {draftPending
                ? "Keeping a local draft…"
                : storageBlocked
                  ? "Local storage blocked — draft not stored"
                  : draftSavedAt
                    ? `Draft in this browser · ${formatSavedAt(draftSavedAt)}`
                    : "Draft not stored"}
            </span>

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
                disabled={previewing}
                aria-busy={previewing}
                onClick={() => handlePreview({ navigate: true })}
              >
                {previewing ? (
                  <LoadingIcon size="sm" />
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
                  <LoadingIcon size="sm" />
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

/**
 * How long the render has been going, in plain seconds.
 *
 * A spinner says "working"; it does not say "for how long", and a
 * LibreOffice render is slow enough that the difference matters. Past the
 * point where the wait stops looking normal, it says so rather than spinning
 * indefinitely and letting the operator guess.
 */
function RenderProgress({ startedAt }: { startedAt: number | null }) {
  const [now, setNow] = React.useState(() => Date.now());

  React.useEffect(() => {
    if (!startedAt) return;
    const timer = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(timer);
  }, [startedAt]);

  const seconds = startedAt ? Math.floor((now - startedAt) / 1000) : 0;
  const slow = seconds >= 20;

  return (
    <div
      role="status"
      aria-live="polite"
      className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md border border-border bg-surface px-2.5 py-2"
    >
      <LoadingIcon size="sm" className="text-brand" />
      <span className="text-base">
        Rendering the real deck
        <span className="ms-1.5 font-mono text-micro tabular-nums text-subtle-foreground">
          {seconds}s
        </span>
      </span>
      <span className="min-w-0 flex-1 text-meta text-muted-foreground">
        {slow
          ? "Longer than usual. Another render may be holding the converter — it will time out rather than hang."
          : "LibreOffice converts the file, then each slide is rasterised. A few seconds is normal."}
      </span>
    </div>
  );
}

function SlideEcho({
  slide,
  slides,
  stale,
  busy,
  startedAt,
  canRender,
  onRender,
}: {
  slide?: string;
  slides: string[] | null;
  stale: boolean;
  busy: boolean;
  startedAt: number | null;
  canRender: boolean;
  onRender: (slide: number) => void;
}) {
  const index = slide && /^\d+$/.test(slide) ? Number(slide) - 1 : -1;
  const src = index >= 0 && slides ? slides[index] : undefined;
  if (index < 0) return null;

  return (
    <section className="plane overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-border px-3 py-2">
        <div className="min-w-0">
          <h3 className="text-md font-semibold">Slide {slide}, as rendered</h3>
          <p className="mt-0.5 text-meta text-muted-foreground">
            {src
              ? stale
                ? "Rendered before your last edit — the real generator, one revision behind."
                : "Current. This is the file the client receives."
              : canRender
                ? "Not rendered yet. Rendering this one slide is faster than the whole deck."
                : "The generator refuses a deck with outstanding issues — rendering will point you at the first one."}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          disabled={busy}
          aria-busy={busy}
          onClick={() => onRender(index + 1)}
        >
          {busy ? (
            <LoadingIcon size="sm" />
          ) : (
            <Images className="size-3.5" />
          )}
          {src ? "Re-render this slide" : "Render this slide"}
        </Button>
      </div>
      {(src || busy) && (
        <div className="space-y-3 p-3">
          {busy && <RenderProgress startedAt={startedAt} />}
          {src ? (
            <div className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={src}
                alt={`Slide ${slide} as last rendered`}
                className={cn(
                  "w-full rounded-md border border-border transition-opacity duration-[var(--dur-state)]",
                  (stale || busy) && "opacity-50",
                )}
              />
            </div>
          ) : (
            <Skeleton className="aspect-video w-full" />
          )}
        </div>
      )}
    </section>
  );
}

function SectionPager({
  entries,
  current,
  onNavigate,
}: {
  entries: { id: RailId; label: string; disabled: boolean }[];
  current: RailId;
  onNavigate: (id: RailId) => void;
}) {
  const open = entries.filter((entry) => !entry.disabled);
  const index = open.findIndex((entry) => entry.id === current);
  const previous = index > 0 ? open[index - 1] : null;
  const next = index >= 0 && index < open.length - 1 ? open[index + 1] : null;

  return (
    <nav
      aria-label="Move through the deck"
      className="flex items-center justify-between gap-2"
    >
      {previous ? (
        <Button
          variant="outline"
          size="sm"
          onClick={() => onNavigate(previous.id)}
        >
          <ChevronLeft className="size-3.5" />
          <span className="truncate">{previous.label}</span>
        </Button>
      ) : (
        <span />
      )}
      {next && (
        <Button variant="outline" size="sm" onClick={() => onNavigate(next.id)}>
          <span className="truncate">{next.label}</span>
          <ChevronRight className="size-3.5" />
        </Button>
      )}
    </nav>
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
          "transition-colors duration-(--dur-state)",
          active ? "bg-brand-soft" : "hover:bg-surface/70",
          disabled && "cursor-not-allowed opacity-40 hover:bg-transparent",
        )}
      >
        {active && (
          <span
            className="absolute inset-y-1 inset-s-0 w-0.5 rounded-e-full bg-foreground"
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
            aria-label="opened, no issues"
          />
        )}
        {state === "todo" && (
          <span
            className="mt-1.5 size-1.5 shrink-0 rounded-full bg-border-mid"
            aria-label="not opened yet"
          />
        )}
      </button>
    </li>
  );
}