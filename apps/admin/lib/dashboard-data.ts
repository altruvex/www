import { prisma, type Prisma } from "@repo/database";
import { SPELLINGS } from "@/components/os/entity-audit";
import { sumByCurrency } from "@/lib/format";
import { overdueCutoff } from "@/lib/payment-overdue";
import type { Tone } from "@/lib/status";
import { PROJECT_CURRENCY_SELECT } from "@/lib/project-currency";

const DAY = 86_400_000;

function sumProposals(items: { totalPrice: number; currency: string }[]) {
  return sumByCurrency(items.map((i) => ({ amount: i.totalPrice, currency: i.currency })));
}

export const PIPELINE_STAGES = [
  "NEW",
  "VIEWED",
  "CONTACTED",
  "QUALIFYING",
  "QUALIFIED",
  "CALL_BOOKED",
  "CALL_COMPLETED",
  "PROPOSAL_SENT",
  "PROPOSAL_READ",
  "CONTRACT_SENT",
  "SIGNED",
] as const;

export type PipelineStage = (typeof PIPELINE_STAGES)[number];
export type DerivedStage = PipelineStage | "NURTURE" | "LOST" | "SPAM";

export const STAGE_PROBABILITY: Record<PipelineStage, number> = {
  NEW: 0.05,
  VIEWED: 0.08,
  CONTACTED: 0.15,
  QUALIFYING: 0.2,
  QUALIFIED: 0.3,
  CALL_BOOKED: 0.35,
  CALL_COMPLETED: 0.4,
  PROPOSAL_SENT: 0.45,
  PROPOSAL_READ: 0.6,
  CONTRACT_SENT: 0.8,
  SIGNED: 1,
};

export const STAGE_TONE: Record<DerivedStage, Tone> = {
  NEW: "info",
  VIEWED: "neutral",
  CONTACTED: "progress",
  QUALIFYING: "progress",
  QUALIFIED: "progress",
  CALL_BOOKED: "progress",
  CALL_COMPLETED: "progress",
  PROPOSAL_SENT: "warning",
  PROPOSAL_READ: "warning",
  CONTRACT_SENT: "warning",
  SIGNED: "success",
  NURTURE: "neutral",
  LOST: "danger",
  SPAM: "neutral",
};

/** Meeting states that still lead to a call. */
export const LIVE_MEETING_STATUSES = ["PENDING", "APPROVED", "RESCHEDULED"] as const;

/**
 * The meetings a stage needs: live or completed ones, newest first. Spread
 * into every client select that feeds deriveClientStage.
 */
export const STAGE_MEETINGS_SELECT = {
  meetings: {
    where: { status: { in: [...LIVE_MEETING_STATUSES, "COMPLETED" as const] } },
    orderBy: { scheduledDate: "desc" },
    select: { status: true, scheduledDate: true },
  },
} satisfies Prisma.ClientSelect;

export interface StageInput {
  status: string;
  proposals: { status: string; readAt: Date | null }[];
  contracts: { status: string }[];
  projects: unknown[];
  meetings: { status: string; scheduledDate: Date }[];
}

function startOfToday(now: Date): Date {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

/**
 * What the meeting rows say about a call: one still ahead (a live meeting dated
 * today or later) wins over one that already happened.
 */
export function callState(
  meetings: { status: string; scheduledDate: Date }[],
  now = new Date(),
): "BOOKED" | "COMPLETED" | null {
  const today = startOfToday(now);
  if (
    meetings.some(
      (m) =>
        (LIVE_MEETING_STATUSES as readonly string[]).includes(m.status) &&
        m.scheduledDate >= today,
    )
  )
    return "BOOKED";
  if (meetings.some((m) => m.status === "COMPLETED")) return "COMPLETED";
  return null;
}

/**
 * Precedence: contract > proposal > call > hand-set status. CALL_BOOKED and
 * CALL_COMPLETED are derived from Meeting rows and never stored. PROPOSAL_READ
 * is shown as "Negotiation": the client has opened it and not answered.
 */
export function deriveClientStage(client: StageInput, now = new Date()): DerivedStage {
  const latestContract = client.contracts[0];
  const latestProposal = client.proposals[0];

  if (latestContract?.status === "SIGNED") return "SIGNED";
  if (latestContract && latestContract.status !== "DRAFT") return "CONTRACT_SENT";
  if (
    latestProposal &&
    (latestProposal.readAt || latestProposal.status === "READ" || latestProposal.status === "VIEWED")
  )
    return "PROPOSAL_READ";
  if (latestProposal && latestProposal.status !== "DRAFT") return "PROPOSAL_SENT";
  if (client.status === "SPAM") return "SPAM";
  if (client.status === "WON" || client.projects.length > 0) return "SIGNED";
  if (client.status !== "LOST" && client.status !== "NURTURE") {
    const call = callState(client.meetings, now);
    if (call === "BOOKED") return "CALL_BOOKED";
    if (call === "COMPLETED") return "CALL_COMPLETED";
  }
  if (client.status === "LOST") return "LOST";
  if (client.status === "NURTURE") return "NURTURE";
  if (client.status === "QUALIFIED") return "QUALIFIED";
  if (client.status === "QUALIFYING") return "QUALIFYING";
  if (client.status === "CONTACTED") return "CONTACTED";
  if (client.status === "VIEWED") return "VIEWED";
  return "NEW";
}

export const UNCONTACTED_STAGES = ["NEW", "VIEWED"] as const satisfies readonly DerivedStage[];
/** Clients whose derived stage is NEW or VIEWED — mirrors deriveClientStage. */
export function uncontactedWhere(now = new Date()): Prisma.ClientWhereInput {
  return {
    status: { in: [...UNCONTACTED_STAGES] },
    proposals: { none: { OR: [{ status: { not: "DRAFT" } }, { readAt: { not: null } }] } },
    contracts: { none: { status: { not: "DRAFT" } } },
    projects: { none: {} },
    meetings: {
      none: {
        OR: [
          { status: "COMPLETED" },
          { status: { in: [...LIVE_MEETING_STATUSES] }, scheduledDate: { gte: startOfToday(now) } },
        ],
      },
    },
  };
}

export function isUncontacted(stage: string): boolean {
  return (UNCONTACTED_STAGES as readonly string[]).includes(stage);
}

const FINANCE_ENTITY_TYPES = ["payment", "subscription", "client_service"].flatMap(
  (kind) => SPELLINGS[kind] ?? [kind],
);
const ADMIN_ENTITY_TYPES = ["user", "settings"].flatMap((kind) => SPELLINGS[kind] ?? [kind]);

const OPEN_TASK = ["TODO", "IN_PROGRESS", "BLOCKED"] as const;

export async function getDashboardData({ finance, audit }: { finance: boolean; audit: boolean }) {
  const hidden: Prisma.ActivityEventWhereInput[] = [];
  if (!finance) {
    hidden.push({ entityType: { in: FINANCE_ENTITY_TYPES } }, { action: { startsWith: "pricing." } });
  }
  if (!audit) {
    hidden.push({ entityType: { in: ADMIN_ENTITY_TYPES } }, { action: { startsWith: "auth." } });
  }
  const activityWhere: Prisma.ActivityEventWhereInput = hidden.length ? { NOT: hidden } : {};

  const now = new Date();
  const in7Days = new Date(now.getTime() + 7 * DAY);
  const in30Days = new Date(now.getTime() + 30 * DAY);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    openProposals,
    signedThisMonth,
    paymentsOverdue,
    activeProjectsByPhase,
    upcomingLaunches,
    tasksDue,
    tasksDueCount,
    recentEvents,
  ] = await Promise.all([
    prisma.proposal.findMany({
      where: { status: { in: ["SENT", "DELIVERED", "READ", "VIEWED"] } },
      select: { totalPrice: true, currency: true },
    }),
    prisma.contract.findMany({
      where: { status: "SIGNED", signedAt: { gte: startOfMonth } },
      select: { proposal: { select: { totalPrice: true, currency: true } } },
    }),
    finance
      ? prisma.payment.findMany({
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
                ...PROJECT_CURRENCY_SELECT,
              },
            },
            subscription: { select: { planId: true } },
          },
          orderBy: { dueDate: "asc" },
        })
      : Promise.resolve([]),
    prisma.project.groupBy({
      by: ["phase"],
      where: { status: "ACTIVE" },
      _count: { _all: true },
    }),
    prisma.project.findMany({
      where: { status: "ACTIVE", actualLaunchDate: null, targetLaunchDate: { lte: in30Days } },
      orderBy: { targetLaunchDate: "asc" },
      select: { id: true, name: true, targetLaunchDate: true },
    }),
    prisma.projectTask.findMany({
      where: { status: { in: [...OPEN_TASK] }, dueDate: { lte: in7Days } },
      orderBy: { dueDate: "asc" },
      take: 5,
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
    prisma.activityEvent.findMany({
      where: activityWhere,
      orderBy: { createdAt: "desc" },
      take: 12,
      select: {
        id: true,
        action: true,
        actorKind: true,
        actorLabel: true,
        entityType: true,
        entityId: true,
        entityLabel: true,
        summary: true,
        before: true,
        after: true,
        metadata: true,
        createdAt: true,
      },
    }),
  ]);

  return {
    openProposals: {
      count: openProposals.length,
      byCurrency: sumProposals(openProposals),
    },
    signedThisMonth: {
      count: signedThisMonth.length,
      byCurrency: sumProposals(signedThisMonth.map((c) => c.proposal)),
    },
    paymentsOverdue,
    activeProjectsByPhase: activeProjectsByPhase
      .map((row) => ({ phase: row.phase, count: row._count._all }))
      .filter((row) => row.count > 0),
    upcomingLaunches: upcomingLaunches.slice(0, 4),
    upcomingLaunchCount: upcomingLaunches.length,
    tasksDue,
    tasksDueCount,
    activity: recentEvents,
  };
}

const BUILD_IN_FLIGHT = ["QUEUED", "RUNNING"] as const;
const DEPLOY_IN_FLIGHT = ["PENDING", "IN_PROGRESS"] as const;
const RUNNING_PRODUCT = ["LIVE", "MAINTENANCE"] as const;

export async function getNowEngineering(now: Date = new Date()) {
  const dayAgo = new Date(now.getTime() - DAY);

  const [
    productCount,
    builds,
    buildCount,
    deploys,
    deployCount,
    products,
    runningProductCount,
    failedBuildCount,
    openIncidentCount,
  ] = await Promise.all([
    prisma.product.count(),
    prisma.build.findMany({
      where: { status: { in: [...BUILD_IN_FLIGHT] } },
      orderBy: { createdAt: "desc" },
      take: 4,
      select: {
        id: true,
        number: true,
        branch: true,
        status: true,
        environment: true,
        startedAt: true,
        createdAt: true,
        product: { select: { id: true, name: true } },
      },
    }),
    prisma.build.count({ where: { status: { in: [...BUILD_IN_FLIGHT] } } }),
    prisma.deployment.findMany({
      where: { status: { in: [...DEPLOY_IN_FLIGHT] } },
      orderBy: { createdAt: "desc" },
      take: 4,
      select: {
        id: true,
        number: true,
        version: true,
        status: true,
        environment: true,
        startedAt: true,
        createdAt: true,
        product: { select: { id: true, name: true } },
      },
    }),
    prisma.deployment.count({ where: { status: { in: [...DEPLOY_IN_FLIGHT] } } }),
    prisma.product.findMany({
      where: { status: { in: [...RUNNING_PRODUCT] } },
      orderBy: { name: "asc" },
      take: 8,
      select: {
        id: true,
        name: true,
        deployments: {
          where: { environment: "PRODUCTION" },
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { id: true, number: true, status: true, finishedAt: true, createdAt: true },
        },
        incidents: {
          where: { status: { not: "RESOLVED" } },
          select: { severity: true },
        },
        builds: {
          where: { status: "FAILED", environment: "PRODUCTION", createdAt: { gte: dayAgo } },
          select: { id: true },
          take: 1,
        },
      },
    }),
    prisma.product.count({ where: { status: { in: [...RUNNING_PRODUCT] } } }),
    prisma.build.count({ where: { status: "FAILED", createdAt: { gte: dayAgo } } }),
    prisma.incident.count({ where: { status: { not: "RESOLVED" } } }),
  ]);

  const health = products.map((product) => {
    const last = product.deployments[0] ?? null;
    const worst = product.incidents
      .map((i) => i.severity)
      .sort()[0] as "SEV1" | "SEV2" | "SEV3" | "SEV4" | undefined;
    const state: ProductHealth =
      worst === "SEV1" || worst === "SEV2" || last?.status === "FAILED"
        ? "down"
        : worst || last?.status === "ROLLED_BACK" || product.builds.length > 0
          ? "degraded"
          : !last
            ? "unknown"
            : last.status === "PENDING" || last.status === "IN_PROGRESS"
              ? "deploying"
              : "ok";
    return {
      id: product.id,
      name: product.name,
      state,
      openIncidents: product.incidents.length,
      worstSeverity: worst ?? null,
      lastDeploy: last,
      failedBuild24h: product.builds.length > 0,
    };
  });

  return {
    isEmpty: productCount === 0,
    running: { builds, buildCount, deploys, deployCount },
    health,
    runningProductCount,
    failedBuildCount,
    openIncidentCount,
  };
}

export type ProductHealth = "ok" | "deploying" | "degraded" | "down" | "unknown";
