import { prisma } from "@repo/database";
import { buildActivity } from "@/lib/activity";
import { sumByCurrency } from "@/lib/format";
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

export async function getDashboardData() {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const in14Days = new Date(now.getTime() + 14 * DAY);

  const [
    openProposals,
    signedThisMonth,
    signedPrevMonth,
    paymentsDueSoon,
    paymentsOverdue,
    paymentsPaidThisMonth,
    proposalsEverSent,
    clientsForFunnel,
    transparencyLeads,
    utmGroups,
    activeProjectsByPhase,
    projects,
    recentProposals,
    recentContracts,
    recentMessages,
    recentClients,
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
      where: { status: "PENDING", dueDate: { gte: now, lte: in14Days } },
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
      },
      orderBy: { dueDate: "asc" },
    }),
    prisma.payment.findMany({
      where: { status: { in: ["PENDING", "OVERDUE"] }, dueDate: { lt: now } },
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
      },
      orderBy: { dueDate: "asc" },
    }),
    prisma.payment.findMany({
      where: { status: "PAID", paidAt: { gte: startOfMonth } },
      select: {
        amount: true,
        project: { select: { contract: { select: { proposal: { select: { currency: true } } } } } },
      },
    }),
    prisma.proposal.findMany({
      where: { status: { not: "DRAFT" } },
      select: { deliveredAt: true, readAt: true, sentAt: true, respondedAt: true, status: true },
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
    prisma.transparencyLead.findMany({ select: { convertedAt: true } }),
    prisma.contactSubmission.groupBy({ by: ["utmSource"], _count: { _all: true } }),
    prisma.project.groupBy({
      by: ["phase"],
      where: { status: "ACTIVE" },
      _count: { _all: true },
    }),
    prisma.project.findMany({
      select: {
        id: true,
        name: true,
        status: true,
        phase: true,
        stagingUrl: true,
        targetLaunchDate: true,
        actualLaunchDate: true,
        createdAt: true,
      },
    }),
    // --- the recent-activity feed ---------------------------------------
    prisma.proposal.findMany({
      orderBy: { updatedAt: "desc" },
      take: 12,
      select: {
        id: true,
        createdAt: true,
        sentAt: true,
        deliveredAt: true,
        readAt: true,
        respondedAt: true,
        status: true,
        totalPrice: true,
        currency: true,
        validUntil: true,
      },
    }),
    prisma.contract.findMany({
      orderBy: { updatedAt: "desc" },
      take: 8,
      select: {
        id: true,
        createdAt: true,
        status: true,
        signedAt: true,
        signedByName: true,
        onboardingMessageSentAt: true,
      },
    }),
    prisma.whatsAppMessage.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        id: true,
        direction: true,
        body: true,
        createdAt: true,
        status: true,
        templateName: true,
      },
    }),
    prisma.client.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      select: { id: true, name: true, company: true, source: true, createdAt: true },
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

  const sentCount = proposalsEverSent.length;
  const deliveredCount = proposalsEverSent.filter((p) => p.deliveredAt).length;
  const readCount = proposalsEverSent.filter((p) => p.readAt).length;
  const respondedCount = proposalsEverSent.filter((p) => p.respondedAt).length;

  const cycles = proposalsEverSent
    .filter((p) => p.sentAt && p.respondedAt && p.status === "ACCEPTED")
    .map((p) => (p.respondedAt!.getTime() - p.sentAt!.getTime()) / DAY);
  const avgCycleDays = cycles.length
    ? Math.round(cycles.reduce((a, b) => a + b, 0) / cycles.length)
    : null;

  /* ---- project health -------------------------------------------------
     Health is derived, not stored: a project is At risk when its target
     launch has passed with no staging URL, Blocked when it is ON_HOLD. */
  const health = { healthy: 0, atRisk: 0, blocked: 0, completed: 0 };
  const atRiskProjects: typeof projects = [];
  for (const p of projects) {
    if (p.status === "COMPLETED") health.completed++;
    else if (p.status === "ON_HOLD") health.blocked++;
    else if (
      p.status === "ACTIVE" &&
      p.targetLaunchDate &&
      p.targetLaunchDate < now &&
      !p.actualLaunchDate
    ) {
      health.atRisk++;
      atRiskProjects.push(p);
    } else if (p.status === "ACTIVE") health.healthy++;
  }

  const convertedLeads = transparencyLeads.filter((l) => l.convertedAt).length;

  const activity = buildActivity({
    proposals: recentProposals,
    contracts: recentContracts,
    messages: recentMessages,
  }).slice(0, 12);

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
    cashCollectedThisMonth: sumByCurrency(
      paymentsPaidThisMonth.map((p) => ({
        amount: p.amount,
        currency: p.project.contract.proposal.currency,
      })),
    ),
    paymentsDueSoon,
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
    proposalRates: {
      sent: sentCount,
      delivered: deliveredCount,
      read: readCount,
      responded: respondedCount,
      deliveredPct: sentCount ? Math.round((deliveredCount / sentCount) * 100) : 0,
      readPct: sentCount ? Math.round((readCount / sentCount) * 100) : 0,
      respondedPct: sentCount ? Math.round((respondedCount / sentCount) * 100) : 0,
    },
    transparency: {
      total: transparencyLeads.length,
      converted: convertedLeads,
      convertedPct: transparencyLeads.length
        ? Math.round((convertedLeads / transparencyLeads.length) * 100)
        : 0,
    },
    utmSources: utmGroups
      .map((g) => ({ source: g.utmSource ?? "(direct / none)", count: g._count._all }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6),
    activeProjectsByPhase,
    projectHealth: health,
    atRiskProjects,
    recentClients,
    activity,
  };
}

export type DashboardData = Awaited<ReturnType<typeof getDashboardData>>;
