import "server-only";

import { prisma, type Prisma } from "@repo/database";

import {
  deriveClientStage,
  LIVE_MEETING_STATUSES,
  stageBlocker,
  uncontactedWhere,
} from "@/lib/dashboard-data";
import { scoreBand, scoreLead, type ScoreBand } from "@/lib/lead-score";
import { startOfBusinessDay } from "@/lib/payment-overdue";
import { isDueByWorkingDay, isOverdueByWorkingDay } from "@/lib/working-days";
import { SCORE_SUBMISSION_SELECT, scoreInputFor } from "@/lib/precall";
import {
  MEETING_OUTCOME_GRACE_HOURS,
  blockers,
  daysSinceActivity,
  health,
  isOverdue,
  meetingStartAt,
  nextAction,
  priority,
  proposalReadiness,
  replySla,
  type HealthState,
  type NextAction,
  type Priority,
  type ReplySlaState,
  type SalesSignals,
} from "@/lib/sales-intel";

/**
 * The bridge between the database and lib/sales-intel.ts: one Prisma select,
 * the per-client message/follow-up times it cannot express, the reading of a
 * row into SalesSignals, and the bounded work-queue loader. Every surface that
 * shows a priority, next action or health (the /leads queue now; the client
 * page, the pipeline and home next) reads through here so they cannot drift.
 */

const DAY = 86_400_000;
const HOUR = 3_600_000;

/** Stored statuses a person set before any contact was recorded. */
const NOT_CONTACTED = new Set(["NEW", "VIEWED"]);

export const SALES_SIGNALS_SELECT = {
  id: true,
  name: true,
  company: true,
  phone: true,
  email: true,
  industry: true,
  source: true,
  status: true,
  priority: true,
  createdAt: true,
  updatedAt: true,
  ownerId: true,
  owner: { select: { name: true, email: true } },
  nextActionAt: true,
  nextActionNote: true,
  lostReason: true,
  lostNote: true,
  nurtureReason: true,
  contactSubmission: {
    select: { ...SCORE_SUBMISSION_SELECT, utmSource: true, firstContactedAt: true },
  },
  transparencyLead: {
    select: {
      priceMin: true,
      priceMax: true,
      projectType: true,
      timeline: true,
      situation: true,
      nextStep: true,
      utmSource: true,
    },
  },
  proposals: {
    // The latest proposal that went out; a draft is not part of the deal yet
    // (drafts are counted below, so "send the draft" can still be offered).
    where: { status: { not: "DRAFT" } },
    select: {
      id: true,
      status: true,
      sentAt: true,
      readAt: true,
      respondedAt: true,
      totalPrice: true,
      currency: true,
      validUntil: true,
    },
    orderBy: { createdAt: "desc" },
    take: 1,
  },
  contracts: {
    // Every contract, newest first: deriveClientStage reads the newest issued
    // one and asks whether any draft exists, so a take would hide either.
    select: { id: true, status: true, signedAt: true },
    orderBy: { createdAt: "desc" },
  },
  projects: { where: { status: { not: "CANCELLED" } }, select: { status: true }, take: 1 },
  meetings: {
    where: { status: { in: [...LIVE_MEETING_STATUSES, "COMPLETED" as const] } },
    orderBy: { scheduledDate: "desc" },
    // The newest ten carry every live call; older ones only ever mattered as
    // "a call happened", which the newest completed one already says.
    take: 10,
    select: {
      status: true,
      scheduledDate: true,
      scheduledTime: true,
      outcome: true,
      outcomeAt: true,
      completedAt: true,
      createdAt: true,
      preCallBriefAt: true,
    },
  },
  _count: { select: { proposals: { where: { status: "DRAFT" } } } },
} satisfies Prisma.ClientSelect;

export type SalesClient = Prisma.ClientGetPayload<{ select: typeof SALES_SIGNALS_SELECT }>;

/**
 * What a select cannot say per client: the newest message each way and the
 * newest follow-up recorded by hand (a WhatsApp follow-up sent from the
 * operator's phone exists only as its `lead.follow_up_sent` event).
 */
export interface ActivityTimes {
  lastInboundAt: Date | null;
  lastOutboundAt: Date | null;
  inboundCount: number;
  messageCount: number;
}

const NO_TIMES: ActivityTimes = {
  lastInboundAt: null,
  lastOutboundAt: null,
  inboundCount: 0,
  messageCount: 0,
};

const newest = (...dates: (Date | null | undefined)[]): Date | null =>
  dates.reduce<Date | null>((best, d) => (d && (!best || d > best) ? d : best), null);

/** Three grouped queries for any number of clients — never one per row. */
export async function loadActivityTimes(ids: string[]): Promise<Map<string, ActivityTimes>> {
  const out = new Map<string, ActivityTimes>();
  if (ids.length === 0) return out;
  const [whatsapp, email, followUps] = await Promise.all([
    prisma.whatsAppMessage.groupBy({
      by: ["clientId", "direction"],
      where: { clientId: { in: ids }, status: { not: "FAILED" } },
      _count: { _all: true },
      _max: { createdAt: true },
    }),
    prisma.emailMessage.groupBy({
      by: ["clientId"],
      where: { clientId: { in: ids }, status: { not: "FAILED" } },
      _count: { _all: true },
      _max: { createdAt: true },
    }),
    prisma.activityEvent.groupBy({
      by: ["entityId"],
      where: { entityType: "client", entityId: { in: ids }, action: "lead.follow_up_sent" },
      _max: { createdAt: true },
    }),
  ]);
  const get = (id: string) => {
    let t = out.get(id);
    if (!t) out.set(id, (t = { ...NO_TIMES }));
    return t;
  };
  for (const row of whatsapp) {
    const t = get(row.clientId);
    t.messageCount += row._count._all;
    if (row.direction === "INBOUND") {
      t.inboundCount += row._count._all;
      t.lastInboundAt = newest(t.lastInboundAt, row._max.createdAt);
    } else t.lastOutboundAt = newest(t.lastOutboundAt, row._max.createdAt);
  }
  for (const row of email) {
    const t = get(row.clientId);
    t.messageCount += row._count._all;
    t.lastOutboundAt = newest(t.lastOutboundAt, row._max.createdAt);
  }
  for (const row of followUps) {
    const t = get(row.entityId);
    t.lastOutboundAt = newest(t.lastOutboundAt, row._max.createdAt);
  }
  return out;
}

/**
 * When a call starts, built in BUSINESS_TIME_ZONE (lib/sales-intel.ts
 * meetingStartAt) so a UTC server reads Cairo wall-clock times correctly.
 */
export const meetingStart = meetingStartAt;

/** The next live call still ahead, else the latest one on record. */
function keyMeeting(client: SalesClient, now: Date) {
  const timed = client.meetings.map((m) => ({ ...m, at: meetingStart(m) }));
  const ahead = timed
    .filter(
      (m) =>
        (LIVE_MEETING_STATUSES as readonly string[]).includes(m.status) &&
        now.getTime() < m.at.getTime() + MEETING_OUTCOME_GRACE_HOURS * HOUR,
    )
    .sort((a, b) => a.at.getTime() - b.at.getTime());
  if (ahead[0]) return ahead[0];
  return timed.sort((a, b) => b.at.getTime() - a.at.getTime())[0] ?? null;
}

/** The existing lead score (the one number, R5) and its band. */
function scoreOf(
  client: SalesClient,
  times: ActivityTimes = NO_TIMES,
): { score: number; reasons: string[]; band: ScoreBand } {
  const { score, reasons } = scoreLead(
    scoreInputFor({ ...client, inboundMessages: times.inboundCount }),
  );
  return { score, reasons, band: scoreBand(score, client.contactSubmission?.budget ?? null) };
}

/** The newest meaningful event either way; null when nothing happened since creation. */
function lastMeaningfulActivity(
  client: SalesClient,
  times: ActivityTimes = NO_TIMES,
  now: Date = new Date(),
): Date | null {
  const p = client.proposals[0];
  const calls = client.meetings.flatMap((m) => {
    const start = meetingStart(m);
    // A booking is activity; the call itself only once its time has come.
    return [m.createdAt, m.completedAt, m.outcomeAt, start <= now && m.status === "COMPLETED" ? start : null];
  });
  return newest(
    times.lastInboundAt,
    times.lastOutboundAt,
    client.contactSubmission?.firstContactedAt,
    p?.sentAt,
    p?.readAt,
    p?.respondedAt,
    ...client.contracts.map((c) => c.signedAt),
    ...calls,
  );
}

export function toSalesSignals(
  client: SalesClient,
  now: Date,
  viewerId: string | null,
  times: ActivityTimes = NO_TIMES,
): SalesSignals {
  const sub = client.contactSubmission;
  const lead = client.transparencyLead;
  const p = client.proposals[0] ?? null;
  // The newest issued contract, matching deriveClientStage: a newer draft
  // never hides one that went out.
  const c = client.contracts.find((x) => x.status !== "DRAFT") ?? null;
  const m = keyMeeting(client, now);
  const { score, band } = scoreOf(client, times);
  return {
    stage: deriveClientStage(client, now),
    status: client.status,
    source: client.source,
    score,
    band,
    createdAt: client.createdAt,
    lastOutboundAt: times.lastOutboundAt,
    contacted:
      !NOT_CONTACTED.has(client.status) ||
      client.meetings.length > 0 ||
      Boolean(sub?.firstContactedAt),
    lastMeaningfulActivityAt: lastMeaningfulActivity(client, times, now),
    ownerId: client.ownerId,
    viewerId,
    nextActionAt: client.nextActionAt,
    nextActionNote: client.nextActionNote,
    proposal: p
      ? {
          status: p.status,
          sentAt: p.sentAt,
          readAt: p.readAt,
          total: p.totalPrice,
          expiresAt: p.validUntil,
        }
      : client._count.proposals > 0
        ? { status: "DRAFT", sentAt: null, readAt: null }
        : null,
    // Contract has no sentAt column; the engine falls back to the last activity.
    contract: c ? { status: c.status, sentAt: null } : null,
    meeting: m ? { status: m.status, scheduledAt: m.at, outcome: m.outcome } : null,
    estimate: lead ? { min: lead.priceMin, max: lead.priceMax } : null,
    timeline: sub?.projectTimeline ?? lead?.timeline ?? null,
    hasBudget: Boolean(sub?.budget),
    hasScope:
      Boolean(sub?.serviceInterest) ||
      Boolean(lead?.projectType) ||
      client.meetings.some((x) => x.preCallBriefAt),
    decisionRole: sub?.decisionRole ?? null,
    stageBlocker: stageBlocker(client, now),
  };
}

/** Every engine output for one lead, computed once. */
export interface SalesReading {
  priority: { level: Priority; why: string[] };
  next: NextAction;
  health: { state: HealthState; why: string[] };
  replySla: { state: ReplySlaState; dueAt: Date | null };
  blockers: string[];
  readiness: { ready: boolean; missing: string[] };
  daysSinceActivity: number;
  /**
   * The hand-set follow-up date (Client.nextActionAt) is before today by the
   * business day — the engine's own test. Screens show this flag instead of
   * comparing the date with the clock during render.
   */
  followUpOverdue: boolean;
}

export function readSignals(s: SalesSignals, now: Date): SalesReading {
  return {
    priority: priority(s, now),
    next: nextAction(s, now),
    health: health(s, now),
    replySla: replySla(s, now),
    blockers: blockers(s, now),
    readiness: proposalReadiness(s),
    daysSinceActivity: daysSinceActivity(s, now),
    followUpOverdue: isOverdue(s.nextActionAt, now),
  };
}

// ── the work queue ────────────────────────────────────────────────────────

export const SALES_GROUPS = [
  { id: "due", label: "Due today" },
  { id: "overdue", label: "Overdue" },
  { id: "hot", label: "New high-intent" },
  { id: "calls", label: "Calls" },
  { id: "proposals", label: "Proposals" },
  { id: "stalled", label: "Stalled" },
  { id: "unassigned", label: "Unassigned" },
  { id: "mine", label: "Mine" },
  { id: "won", label: "Recently won" },
] as const;
export type SalesGroup = (typeof SALES_GROUPS)[number]["id"];

export function isSalesGroup(value: string | null | undefined): value is SalesGroup {
  return SALES_GROUPS.some((g) => g.id === value);
}

/** Recently won = signed (or a project opened) within this many days. */
const RECENTLY_WON_DAYS = 30;

export interface SalesQueueRow {
  client: SalesClient;
  signals: SalesSignals;
  reading: SalesReading;
  score: { score: number; reasons: string[]; band: ScoreBand };
  times: ActivityTimes;
}

/**
 * followUpClosedReason in SQL (lib/lead-follow-up.ts): spam and signed are
 * closed. The queue also leaves out LOST and a NURTURE lead whose review date
 * has not arrived (docs/sales-os.md R3).
 */
function notClosedWhere(): Prisma.ClientWhereInput {
  return {
    status: { notIn: ["SPAM", "WON"] },
    projects: { none: { status: { not: "CANCELLED" } } },
    contracts: { none: { status: "SIGNED" } },
  };
}

export function openWorkWhere(now: Date = new Date()): Prisma.ClientWhereInput {
  const endOfToday = new Date(startOfBusinessDay(now).getTime() + DAY);
  return {
    AND: [
      notClosedWhere(),
      { status: { not: "LOST" } },
      {
        OR: [
          { status: { not: "NURTURE" } },
          { nextActionAt: null },
          { nextActionAt: { lt: endOfToday } },
        ],
      },
    ],
  };
}

/** Parked lists outside the working queue, each its own filter. */
function parkedWhere(status: "NURTURE" | "LOST"): Prisma.ClientWhereInput {
  return { AND: [notClosedWhere(), { status }] };
}

function recentlyWonWhere(now: Date = new Date()): Prisma.ClientWhereInput {
  const since = new Date(now.getTime() - RECENTLY_WON_DAYS * DAY);
  return {
    status: { not: "SPAM" },
    OR: [
      { contracts: { some: { status: "SIGNED", signedAt: { gte: since } } } },
      { projects: { some: { status: { not: "CANCELLED" }, createdAt: { gte: since } } } },
    ],
  };
}

/** The engine's working-day rule (lib/working-days.ts): a Friday or Saturday date waits for Sunday. */
function dueBucket(next: NextAction, now: Date): "overdue" | "today" | null {
  if (next.kind === "NONE" || !next.due) return null;
  if (isOverdueByWorkingDay(next.due, now)) return "overdue";
  if (isDueByWorkingDay(next.due, now)) return "today";
  return null;
}

/** Group membership for an open (not won) row. */
export function inSalesGroup(row: SalesQueueRow, group: SalesGroup, now: Date): boolean {
  const { signals: s, reading: r } = row;
  switch (group) {
    case "due":
      return dueBucket(r.next, now) === "today";
    case "overdue":
      return dueBucket(r.next, now) === "overdue";
    case "hot":
      return (s.stage === "NEW" || s.stage === "VIEWED") && s.band === "High intent";
    case "calls":
      return (
        s.stage === "CALL_BOOKED" || r.next.kind === "RECORD_OUTCOME" || r.next.kind === "PREPARE_CALL"
      );
    case "proposals":
      return (
        s.stage === "PROPOSAL_SENT" ||
        s.stage === "PROPOSAL_READ" ||
        s.stage === "CONTRACT_SENT" ||
        r.next.kind === "SEND_PROPOSAL" ||
        r.next.kind === "WRITE_PROPOSAL" ||
        r.next.kind === "GENERATE_CONTRACT"
      );
    case "stalled":
      return r.health.state === "STALLED";
    case "unassigned":
      return !s.ownerId;
    case "mine":
      return Boolean(s.viewerId) && s.ownerId === s.viewerId;
    case "won":
      return s.stage === "SIGNED";
  }
}

const PRIORITY_RANK: Record<Priority, number> = { HIGH: 0, MEDIUM: 1, LOW: 2 };

/** Engine priority, then the earliest due, then the newest lead. */
function compareQueueRows(a: SalesQueueRow, b: SalesQueueRow): number {
  const p = PRIORITY_RANK[a.reading.priority.level] - PRIORITY_RANK[b.reading.priority.level];
  if (p) return p;
  const ad = a.reading.next.due?.getTime() ?? Infinity;
  const bd = b.reading.next.due?.getTime() ?? Infinity;
  if (ad !== bd) return ad < bd ? -1 : 1;
  return b.client.createdAt.getTime() - a.client.createdAt.getTime();
}

/** Loads, reads and orders the clients matching `where`, at most `take` of them. */
async function loadSalesRows({
  where,
  now = new Date(),
  viewerId,
  take,
  orderBy = [{ nextActionAt: { sort: "asc", nulls: "last" } }, { createdAt: "desc" }],
}: {
  where: Prisma.ClientWhereInput;
  now?: Date;
  viewerId: string | null;
  take: number;
  orderBy?: Prisma.ClientOrderByWithRelationInput[];
}): Promise<SalesQueueRow[]> {
  const clients = await prisma.client.findMany({
    where,
    select: SALES_SIGNALS_SELECT,
    orderBy,
    take,
  });
  return readRows(clients, now, viewerId);
}

async function readRows(
  clients: SalesClient[],
  now: Date,
  viewerId: string | null,
): Promise<SalesQueueRow[]> {
  const times = await loadActivityTimes(clients.map((c) => c.id));
  return clients
    .map((client) => {
      const t = times.get(client.id) ?? NO_TIMES;
      const signals = toSalesSignals(client, now, viewerId, t);
      return {
        client,
        signals,
        reading: readSignals(signals, now),
        score: scoreOf(client, t),
        times: t,
      };
    })
    .sort(compareQueueRows);
}

/**
 * Work owed now that carries no follow-up date, so a nextActionAt ordering
 * would sort it last: a first reply owed, a call outcome owed, a contract owed
 * after an accepted proposal, a rejected/expired/declined document to decide
 * on. A superset is fine — the engine decides; this only orders the load.
 */
function owedWithoutDateWhere(now: Date): Prisma.ClientWhereInput {
  const endOfToday = new Date(startOfBusinessDay(now).getTime() + DAY);
  const noLiveContract: Prisma.ClientWhereInput = {
    contracts: { none: { status: { in: ["SENT", "SIGNED"] } } },
  };
  return {
    nextActionAt: null,
    OR: [
      uncontactedWhere(now),
      {
        meetings: {
          some: {
            status: { in: [...LIVE_MEETING_STATUSES, "COMPLETED"] },
            outcome: null,
            scheduledDate: { lt: endOfToday },
          },
        },
      },
      { AND: [{ proposals: { some: { status: "ACCEPTED" } } }, noLiveContract] },
      { AND: [{ proposals: { some: { status: { in: ["REJECTED", "EXPIRED"] } } } }, noLiveContract] },
      { contracts: { some: { status: { in: ["DECLINED", "EXPIRED"] } } } },
    ],
  };
}

/**
 * The bounded work-queue load: at most `take` rows of `where`. Owed work with
 * no date is loaded first (oldest first), then the rest by follow-up date
 * (earliest first, undated last) and newest lead — so above the cap it is the
 * calm, far-dated and newest-undated rows that fall out, never the owed ones.
 * Two bounded queries, deterministic (id breaks every tie).
 */
export async function loadWorkRows({
  where,
  now = new Date(),
  viewerId,
  take,
}: {
  where: Prisma.ClientWhereInput;
  now?: Date;
  viewerId: string | null;
  take: number;
}): Promise<SalesQueueRow[]> {
  const owed = await prisma.client.findMany({
    where: { AND: [where, owedWithoutDateWhere(now)] },
    select: SALES_SIGNALS_SELECT,
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    take,
  });
  const rest =
    owed.length < take
      ? await prisma.client.findMany({
          where: { AND: [where, { id: { notIn: owed.map((c) => c.id) } }] },
          select: SALES_SIGNALS_SELECT,
          orderBy: [
            { nextActionAt: { sort: "asc", nulls: "last" } },
            { createdAt: "desc" },
            { id: "asc" },
          ],
          take: take - owed.length,
        })
      : [];
  return readRows([...owed, ...rest], now, viewerId);
}

export interface SalesQueue {
  rows: SalesQueueRow[];
  /** Rows matching the scope before the cap (the M in "showing N of M"). */
  total: number;
  /** How many rows were loaded to read groups from (≤ take). */
  loaded: number;
  capped: boolean;
  /** Per-group counts over the loaded rows; `won` is an exact count. */
  counts: Record<SalesGroup, number>;
}

/**
 * The owner filter, one rule for every surface (Ali's ruling, 2026-10-09):
 * "mine" = leads the viewer owns ONLY; "unassigned" = leads nobody owns; any
 * other value is a user id. The owner is the opportunity owner, Client.ownerId.
 * "mine" without a viewer matches nothing rather than falling back to everyone.
 */
export function ownerWhere(owner: string, viewerId: string | null): Prisma.ClientWhereInput {
  if (owner === "unassigned") return { ownerId: null };
  if (owner === "mine") return viewerId ? { ownerId: viewerId } : { id: { in: [] } };
  return { ownerId: owner };
}

/**
 * The /leads work queue. One bounded load of the scope (open work by default,
 * or a parked list), read by the engine; group counts and the selected group
 * come from that one load. "Recently won" is a separate bounded query because
 * won deals are outside open work by definition.
 */
export async function loadSalesQueue({
  group,
  owner,
  viewerId,
  take = 200,
  now = new Date(),
  scope = "open",
  where,
}: {
  group?: SalesGroup | null;
  /** Owner filter — see `ownerWhere`. Absent = everyone's (All). */
  owner?: string | null;
  viewerId: string | null;
  take?: number;
  now?: Date;
  scope?: "open" | "NURTURE" | "LOST";
  /** Extra narrowing (source, …), ANDed onto the scope. */
  where?: Prisma.ClientWhereInput;
}): Promise<SalesQueue> {
  const extra: Prisma.ClientWhereInput[] = [
    ...(where ? [where] : []),
    ...(owner ? [ownerWhere(owner, viewerId)] : []),
  ];
  const scopeWhere: Prisma.ClientWhereInput = {
    AND: [scope === "open" ? openWorkWhere(now) : parkedWhere(scope), ...extra],
  };
  const wonWhere: Prisma.ClientWhereInput = { AND: [recentlyWonWhere(now), ...extra] };

  const [rows, total, wonTotal, wonRows] = await Promise.all([
    loadWorkRows({ where: scopeWhere, now, viewerId, take }),
    prisma.client.count({ where: scopeWhere }),
    prisma.client.count({ where: wonWhere }),
    group === "won"
      ? loadSalesRows({ where: wonWhere, now, viewerId, take, orderBy: [{ updatedAt: "desc" }] })
      : Promise.resolve(null),
  ]);

  const counts = Object.fromEntries(
    SALES_GROUPS.map((g) => [
      g.id,
      g.id === "won" ? wonTotal : rows.filter((r) => inSalesGroup(r, g.id, now)).length,
    ]),
  ) as Record<SalesGroup, number>;

  if (group === "won" && wonRows) {
    return { rows: wonRows, total: wonTotal, loaded: wonRows.length, capped: wonTotal > wonRows.length, counts };
  }
  return {
    rows: group ? rows.filter((r) => inSalesGroup(r, group, now)) : rows,
    total,
    loaded: rows.length,
    capped: total > rows.length,
    counts,
  };
}

/** One client read the same way, for a surface showing a single lead. */
export async function loadSalesRow(
  id: string,
  viewerId: string | null,
  now: Date = new Date(),
): Promise<SalesQueueRow | null> {
  const rows = await loadSalesRows({ where: { id }, now, viewerId, take: 1 });
  return rows[0] ?? null;
}
