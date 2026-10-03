import { prisma } from "@repo/database";
import { normalizeEntityType } from "@/lib/entity-links";
import { sumByCurrency } from "@/lib/format";
import { overdueCutoff } from "@/lib/payment-overdue";
import type { Tone } from "@/lib/status";

const DAY = 86_400_000;

/** Proposal-shaped rows into the shared per-currency bucket. */
function sumProposals(items: { totalPrice: number; currency: string }[]) {
  return sumByCurrency(items.map((i) => ({ amount: i.totalPrice, currency: i.currency })));
}

/**
 * The derived pipeline stage.
 *
 * A client's stage is NOT a column — it is the furthest-along artifact that
 * exists for them. A signed contract beats a sent contract beats a read
 * proposal beats whatever the status field says. Deriving it means the board
 * cannot disagree with the records, which is the failure mode of every CRM
 * that stores stage as an editable enum next to the documents that contradict it.
 */
export const PIPELINE_STAGES = [
  "NEW",
  "VIEWED",
  "CONTACTED",
  "QUALIFIED",
  "PROPOSAL_SENT",
  "PROPOSAL_READ",
  "CONTRACT_SENT",
  "SIGNED",
] as const;

export type PipelineStage = (typeof PIPELINE_STAGES)[number];
export type DerivedStage = PipelineStage | "LOST" | "SPAM";

/** Probability weight per stage, used for weighted pipeline value (§5). */
export const STAGE_PROBABILITY: Record<PipelineStage, number> = {
  NEW: 0.05,
  VIEWED: 0.08,
  CONTACTED: 0.15,
  QUALIFIED: 0.3,
  PROPOSAL_SENT: 0.45,
  PROPOSAL_READ: 0.6,
  CONTRACT_SENT: 0.8,
  SIGNED: 1,
};

export const STAGE_TONE: Record<DerivedStage, Tone> = {
  NEW: "info",
  VIEWED: "neutral",
  CONTACTED: "progress",
  QUALIFIED: "progress",
  PROPOSAL_SENT: "warning",
  PROPOSAL_READ: "warning",
  CONTRACT_SENT: "warning",
  SIGNED: "success",
  LOST: "danger",
  SPAM: "neutral",
};

export interface StageInput {
  status: string;
  proposals: { status: string; readAt: Date | null }[];
  contracts: { status: string }[];
}

export function deriveClientStage(client: StageInput): DerivedStage {
  const latestContract = client.contracts[0];
  const latestProposal = client.proposals[0];

  if (latestContract?.status === "SIGNED") return "SIGNED";
  if (latestContract && latestContract.status !== "DRAFT") return "CONTRACT_SENT";
  if (latestProposal?.readAt) return "PROPOSAL_READ";
  if (latestProposal && latestProposal.status !== "DRAFT") return "PROPOSAL_SENT";
  if (client.status === "LOST") return "LOST";
  if (client.status === "SPAM") return "SPAM";
  if (client.status === "WON") return "SIGNED";
  if (client.status === "QUALIFIED") return "QUALIFIED";
  if (client.status === "CONTACTED") return "CONTACTED";
  if (client.status === "VIEWED") return "VIEWED";
  return "NEW";
}

/** Audit entity kinds that carry money; hidden from roles that cannot see finance. */
const FINANCE_ENTITIES = new Set(["payment", "subscription", "client_service"]);

const OPEN_TASK = ["TODO", "IN_PROGRESS", "BLOCKED"] as const;

export async function getDashboardData({ finance }: { finance: boolean }) {
  const now = new Date();
  const in7Days = new Date(now.getTime() + 7 * DAY);
  const in30Days = new Date(now.getTime() + 30 * DAY);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  const [
    openProposals,
    signedThisMonth,
    signedPrevMonth,
    paymentsOverdue,
    acceptedProposals,
    clientsForFunnel,
    activeProjectsByPhase,
    upcomingLaunches,
    newLeads,
    contractsAwaitingSignature,
    tasksDue,
    tasksDueCount,
    recentEvents,
  ] = await Promise.all([
    prisma.proposal.findMany({
      where: { status: { notIn: ["REJECTED", "EXPIRED"] }, contract: null },
      select: { totalPrice: true, currency: true },
    }),
    prisma.contract.findMany({
      where: { status: "SIGNED", signedAt: { gte: startOfMonth } },
      select: { proposal: { select: { totalPrice: true, currency: true } } },
    }),
    prisma.contract.findMany({
      where: { status: "SIGNED", signedAt: { gte: startOfPrevMonth, lt: startOfMonth } },
      select: { proposal: { select: { totalPrice: true, currency: true } } },
    }),
    prisma.payment.findMany({
      where: { status: { in: ["PENDING", "OVERDUE"] }, dueDate: { lt: overdueCutoff(now) } },
      select: {
        id: true,
        amount: true,
        dueDate: true,
        milestone: true,
        project: {
          select: {
            id: true,
            name: true,
            contract: { select: { proposal: { select: { currency: true } } } },
          },
        },
        subscription: { select: { planId: true } },
      },
      orderBy: { dueDate: "asc" },
    }),
    // Accepted proposals with both timestamps: the sales-cycle length.
    prisma.proposal.findMany({
      where: { status: "ACCEPTED", sentAt: { not: null }, respondedAt: { not: null } },
      select: { sentAt: true, respondedAt: true },
    }),
    prisma.client.findMany({
      select: {
        id: true,
        name: true,
        company: true,
        status: true,
        createdAt: true,
        proposals: {
          select: { status: true, readAt: true, totalPrice: true, currency: true },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
        contracts: { select: { status: true }, orderBy: { createdAt: "desc" }, take: 1 },
      },
    }),
    prisma.project.groupBy({
      by: ["phase"],
      where: { status: "ACTIVE" },
      _count: { _all: true },
    }),
    // Active projects not yet launched: the launch list, late ones included.
    prisma.project.findMany({
      where: { status: "ACTIVE", actualLaunchDate: null, targetLaunchDate: { lte: in30Days } },
      orderBy: { targetLaunchDate: "asc" },
      select: { id: true, name: true, targetLaunchDate: true },
    }),
    // Same definition as the sidebar's Leads badge, so the tile and the
    // badge never show two different numbers for one queue.
    prisma.client.count({ where: { status: { in: ["NEW", "VIEWED"] } } }),
    prisma.contract.count({ where: { status: "SENT" } }),
    // Open tasks due within a week, overdue ones included — the late ones are
    // the reason to look.
    prisma.projectTask.findMany({
      where: { status: { in: [...OPEN_TASK] }, dueDate: { lte: in7Days } },
      orderBy: { dueDate: "asc" },
      take: 6,
      select: {
        id: true,
        title: true,
        status: true,
        dueDate: true,
        project: { select: { id: true, name: true } },
      },
    }),
    prisma.projectTask.count({
      where: { status: { in: [...OPEN_TASK] }, dueDate: { lte: in7Days } },
    }),
    // --- the persisted audit trail --------------------------------------
    // Over-fetched so that dropping finance rows for a non-finance role still
    // leaves a full feed.
    prisma.activityEvent.findMany({
      orderBy: { createdAt: "desc" },
      take: finance ? 12 : 30,
      select: {
        id: true,
        action: true,
        actorLabel: true,
        entityType: true,
        entityId: true,
        entityLabel: true,
        summary: true,
        createdAt: true,
      },
    }),
  ]);

  /* ---- funnel + weighted pipeline ------------------------------------- */
  const stageCounts: Record<string, number> = {};
  for (const stage of PIPELINE_STAGES) stageCounts[stage] = 0;
  stageCounts.LOST = 0;
  stageCounts.SPAM = 0;

  // Kept per currency — see lib/format.ts sumByCurrency for why.
  const weighted: Record<string, number> = {};
  const openValue: Record<string, number> = {};
  for (const client of clientsForFunnel) {
    const stage = deriveClientStage(client);
    stageCounts[stage] = (stageCounts[stage] ?? 0) + 1;
    const latest = client.proposals[0];
    if (!latest) continue;
    if (stage !== "LOST" && stage !== "SPAM" && stage !== "SIGNED") {
      const currency = latest.currency;
      openValue[currency] = (openValue[currency] ?? 0) + latest.totalPrice;
      weighted[currency] =
        (weighted[currency] ?? 0) +
        Math.round(latest.totalPrice * (STAGE_PROBABILITY[stage as PipelineStage] ?? 0));
    }
  }

  /* ---- conversion + cycle --------------------------------------------- */
  const won = stageCounts.SIGNED ?? 0;
  const lost = stageCounts.LOST ?? 0;
  const decided = won + lost;
  const winRate = decided ? Math.round((won / decided) * 100) : 0;

  const cycles = acceptedProposals.map((p) => (p.respondedAt!.getTime() - p.sentAt!.getTime()) / DAY);
  const avgCycleDays = cycles.length
    ? Math.round(cycles.reduce((a, b) => a + b, 0) / cycles.length)
    : null;

  const activity = (
    finance
      ? recentEvents
      : recentEvents.filter((e) => !FINANCE_ENTITIES.has(normalizeEntityType(e.entityType) ?? ""))
  ).slice(0, 12);

  /**
   * Month-over-month delta, but ONLY when both months are in one and the same
   * currency. A percentage change computed across EGP and USD compares nothing.
   */
  const singleCurrencyTotal = (
    rows: { proposal: { totalPrice: number; currency: string } }[],
  ): { total: number; currency: string } | null => {
    if (rows.length === 0) return { total: 0, currency: "" };
    const currencies = new Set(rows.map((r) => r.proposal.currency));
    if (currencies.size > 1) return null;
    return {
      total: rows.reduce((sum, r) => sum + r.proposal.totalPrice, 0),
      currency: [...currencies][0],
    };
  };

  return {
    openProposals: {
      count: openProposals.length,
      byCurrency: sumProposals(openProposals),
    },
    signedThisMonth: {
      count: signedThisMonth.length,
      byCurrency: sumProposals(signedThisMonth.map((c) => c.proposal)),
      deltaPct: (() => {
        const prev = singleCurrencyTotal(signedPrevMonth);
        const cur = singleCurrencyTotal(signedThisMonth);
        if (!prev || !cur || !prev.total) return null;
        if (prev.currency && cur.currency && prev.currency !== cur.currency) return null;
        return Math.round(((cur.total - prev.total) / prev.total) * 100);
      })(),
    },
    paymentsOverdue,
    pipeline: {
      stages: PIPELINE_STAGES.map((stage) => ({ stage, count: stageCounts[stage] ?? 0 })),
      lost,
      spam: stageCounts.SPAM ?? 0,
      total: clientsForFunnel.length,
      openValueByCurrency: openValue,
      weightedValueByCurrency: weighted,
      winRate,
      avgCycleDays,
    },
    activeProjectsByPhase: activeProjectsByPhase
      .map((row) => ({ phase: row.phase, count: row._count._all }))
      .filter((row) => row.count > 0),
    upcomingLaunches: upcomingLaunches.slice(0, 5),
    upcomingLaunchCount: upcomingLaunches.length,
    newLeads,
    contractsAwaitingSignature,
    tasksDue,
    tasksDueCount,
    activity,
  };
}

/**
 * Today → engineering: what is broken or changed in the running estate.
 * Read-only, and separate from getDashboardData so the page can skip it
 * cheaply for an estate with no products.
 */
export async function getTodayEngineering(now: Date = new Date()) {
  const dayAgo = new Date(now.getTime() - DAY);

  const [products, incidentsBySeverity, lastProductionDeploys, failedBuilds, failedBuildCount] =
    await Promise.all([
      prisma.product.count(),
      prisma.incident.groupBy({
        by: ["severity"],
        where: { status: { not: "RESOLVED" } },
        _count: { _all: true },
      }),
      // One row per product: its newest successful PRODUCTION deploy — what the
      // client's visitors are running, not a preview of a branch.
      prisma.deployment.findMany({
        where: { environment: "PRODUCTION", status: "SUCCEEDED" },
        orderBy: [{ finishedAt: { sort: "desc", nulls: "last" } }, { createdAt: "desc" }],
        distinct: ["productId"],
        take: 6,
        select: {
          id: true,
          number: true,
          version: true,
          finishedAt: true,
          createdAt: true,
          product: { select: { id: true, name: true } },
        },
      }),
      prisma.build.findMany({
        where: { status: "FAILED", createdAt: { gte: dayAgo } },
        orderBy: { createdAt: "desc" },
        take: 4,
        select: {
          id: true,
          number: true,
          branch: true,
          createdAt: true,
          product: { select: { id: true, name: true } },
        },
      }),
      prisma.build.count({ where: { status: "FAILED", createdAt: { gte: dayAgo } } }),
    ]);

  const severity = { SEV1: 0, SEV2: 0, SEV3: 0, SEV4: 0 } as Record<string, number>;
  for (const row of incidentsBySeverity) severity[row.severity] = row._count._all;

  return {
    isEmpty: products === 0,
    openIncidents: Object.values(severity).reduce((a, b) => a + b, 0),
    incidentsBySeverity: severity,
    lastProductionDeploys,
    failedBuilds,
    failedBuildCount,
  };
}
