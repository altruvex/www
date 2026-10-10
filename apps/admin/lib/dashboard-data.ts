import { prisma, type Prisma } from "@repo/database";
import { SPELLINGS } from "@/lib/entity-spellings";
import { overdueCutoff } from "@/lib/payment-overdue";
import type { DerivedStage, Tone } from "@/lib/status";
import { PROJECT_CURRENCY_SELECT } from "@/lib/project-currency";

const DAY = 86_400_000;

export { PIPELINE_STAGES } from "@/lib/status";
export type { DerivedStage, PipelineStage } from "@/lib/status";

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
export const LIVE_MEETING_STATUSES = [
  "PENDING",
  "APPROVED",
  "RESCHEDULED",
] as const;

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
  projects: { status: string }[];
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

/** Proposal states that are still waiting on the client's answer. */
const LIVE_PROPOSAL_STATUSES = ["SENT", "DELIVERED", "READ", "VIEWED"];

/**
 * The decision owed when a deal's documents have stopped moving on their own:
 * a declined or expired contract, or a rejected, expired or accepted proposal
 * with no contract out. Such a deal sits in the Negotiation (PROPOSAL_READ)
 * slot until a person revises, sends or closes it. Contracts are only ever
 * generated from an accepted proposal, so a live proposal newer than a dead
 * contract is a revision and outranks it.
 */
function documentBlocker(client: StageInput): string | null {
  const latestContract = latestIssuedContract(client);
  const latestProposal = client.proposals.find((p) => p.status !== "DRAFT");
  if (latestContract?.status === "SENT" || latestContract?.status === "SIGNED")
    return null;
  if (latestProposal && LIVE_PROPOSAL_STATUSES.includes(latestProposal.status))
    return null;
  if (latestContract?.status === "DECLINED")
    return "Contract declined — revise the proposal or close as lost";
  if (latestContract?.status === "EXPIRED")
    return "Contract expired — send a new one or close as lost";
  if (latestProposal?.status === "REJECTED")
    return "Proposal rejected — revise it or close as lost";
  if (latestProposal?.status === "EXPIRED")
    return "Proposal expired — reissue it or close as lost";
  if (latestProposal?.status === "ACCEPTED")
    return client.contracts.some((c) => c.status === "DRAFT")
      ? "Proposal accepted — send the contract"
      : "Proposal accepted — generate the contract";
  return null;
}

/**
 * The newest contract that left the building. A newer DRAFT never hides one
 * already sent; callers must select every contract (no `take`), newest first.
 */
function latestIssuedContract(
  client: StageInput,
): StageInput["contracts"][number] | undefined {
  return client.contracts.find((c) => c.status !== "DRAFT");
}

/** True when the client counts as won: a signed contract, WON, or a live project. */
function isSigned(client: StageInput): boolean {
  return (
    client.status === "WON" ||
    client.contracts.some((c) => c.status === "SIGNED") ||
    client.projects.some((p) => p.status !== "CANCELLED")
  );
}

/**
 * Precedence (docs/sales-os.md R1): signed > SPAM > hand-set LOST/NURTURE >
 * contract out > a document waiting on our decision (Negotiation) > proposal
 * read/sent > call > hand-set status. Closing a deal is a person's decision,
 * so open documents never overrule LOST or NURTURE. CALL_BOOKED and
 * CALL_COMPLETED are derived from Meeting rows and never stored.
 * PROPOSAL_READ is shown as "Negotiation": the client has opened the proposal
 * and not answered, or a document needs our next move (see stageBlocker).
 */
export function deriveClientStage(
  client: StageInput,
  now = new Date(),
): DerivedStage {
  if (isSigned(client)) return "SIGNED";
  if (client.status === "SPAM") return "SPAM";
  if (client.status === "LOST") return "LOST";
  if (client.status === "NURTURE") return "NURTURE";

  const latestContract = latestIssuedContract(client);
  const latestProposal = client.proposals.find((p) => p.status !== "DRAFT");
  if (latestContract?.status === "SENT") return "CONTRACT_SENT";
  if (documentBlocker(client)) return "PROPOSAL_READ";
  if (
    latestProposal &&
    (latestProposal.readAt ||
      latestProposal.status === "READ" ||
      latestProposal.status === "VIEWED")
  )
    return "PROPOSAL_READ";
  if (latestProposal) return "PROPOSAL_SENT";

  const call = callState(client.meetings, now);
  if (call === "BOOKED") return "CALL_BOOKED";
  if (call === "COMPLETED") return "CALL_COMPLETED";
  if (client.status === "QUALIFIED") return "QUALIFIED";
  if (client.status === "QUALIFYING") return "QUALIFYING";
  if (client.status === "CONTACTED") return "CONTACTED";
  if (client.status === "VIEWED") return "VIEWED";
  return "NEW";
}

/**
 * Why a deal sits in Negotiation when no reply is what it is waiting for:
 * the decision owed on a dead or accepted document. Null for every other
 * stage, including a closed or won deal.
 */
export function stageBlocker(
  client: StageInput,
  now = new Date(),
): string | null {
  return deriveClientStage(client, now) === "PROPOSAL_READ"
    ? documentBlocker(client)
    : null;
}

export const UNCONTACTED_STAGES = [
  "NEW",
  "VIEWED",
] as const satisfies readonly DerivedStage[];
/** Clients whose derived stage is NEW or VIEWED — mirrors deriveClientStage. */
export function uncontactedWhere(now = new Date()): Prisma.ClientWhereInput {
  return {
    status: { in: [...UNCONTACTED_STAGES] },
    proposals: {
      none: { OR: [{ status: { not: "DRAFT" } }, { readAt: { not: null } }] },
    },
    contracts: { none: { status: { not: "DRAFT" } } },
    projects: { none: { status: { not: "CANCELLED" } } },
    meetings: {
      none: {
        OR: [
          { status: "COMPLETED" },
          {
            status: { in: [...LIVE_MEETING_STATUSES] },
            scheduledDate: { gte: startOfToday(now) },
          },
        ],
      },
    },
  };
}

export function isUncontacted(stage: string): boolean {
  return (UNCONTACTED_STAGES as readonly string[]).includes(stage);
}

const FINANCE_ENTITY_TYPES = [
  "payment",
  "subscription",
  "client_service",
].flatMap((kind) => SPELLINGS[kind] ?? [kind]);
const ADMIN_ENTITY_TYPES = ["user", "settings"].flatMap(
  (kind) => SPELLINGS[kind] ?? [kind],
);

const OPEN_TASK = ["TODO", "IN_PROGRESS", "BLOCKED"] as const;

export async function getDashboardData({
  finance,
  audit,
}: {
  finance: boolean;
  audit: boolean;
}) {
  const hidden: Prisma.ActivityEventWhereInput[] = [];
  if (!finance) {
    hidden.push(
      { entityType: { in: FINANCE_ENTITY_TYPES } },
      { action: { startsWith: "pricing." } },
    );
  }
  if (!audit) {
    hidden.push(
      { entityType: { in: ADMIN_ENTITY_TYPES } },
      { action: { startsWith: "auth." } },
    );
  }
  const activityWhere: Prisma.ActivityEventWhereInput = hidden.length
    ? { NOT: hidden }
    : {};

  const now = new Date();
  const in7Days = new Date(now.getTime() + 7 * DAY);
  const in30Days = new Date(now.getTime() + 30 * DAY);

  const [
    paymentsOverdue,
    activeProjectsByPhase,
    upcomingLaunches,
    tasksDue,
    tasksDueCount,
    recentEvents,
  ] = await Promise.all([
    finance
      ? prisma.payment.findMany({
          where: {
            status: { in: ["PENDING", "OVERDUE"] },
            dueDate: { lt: overdueCutoff(now) },
          },
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
      where: {
        status: "ACTIVE",
        actualLaunchDate: null,
        targetLaunchDate: { lte: in30Days },
      },
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
    prisma.deployment.count({
      where: { status: { in: [...DEPLOY_IN_FLIGHT] } },
    }),
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
          select: {
            id: true,
            number: true,
            status: true,
            finishedAt: true,
            createdAt: true,
          },
        },
        incidents: {
          where: { status: { not: "RESOLVED" } },
          select: { severity: true },
        },
        builds: {
          where: {
            status: "FAILED",
            environment: "PRODUCTION",
            createdAt: { gte: dayAgo },
          },
          select: { id: true },
          take: 1,
        },
      },
    }),
    prisma.product.count({ where: { status: { in: [...RUNNING_PRODUCT] } } }),
    prisma.build.count({
      where: { status: "FAILED", createdAt: { gte: dayAgo } },
    }),
    prisma.incident.count({ where: { status: { not: "RESOLVED" } } }),
  ]);

  const health = products.map((product) => {
    const last = product.deployments[0] ?? null;
    const worst = product.incidents.map((i) => i.severity).sort()[0] as
      | "SEV1"
      | "SEV2"
      | "SEV3"
      | "SEV4"
      | undefined;
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

export type ProductHealth =
  | "ok"
  | "deploying"
  | "degraded"
  | "down"
  | "unknown";
