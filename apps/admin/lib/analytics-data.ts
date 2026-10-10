import { prisma, Prisma } from "@repo/database";
import { STAGE_MEETINGS_SELECT, deriveClientStage } from "@/lib/dashboard-data";
import { ALL_STAGES, LOST_REASON_VALUES, PIPELINE_STAGES } from "@/lib/status";
import { scaleByCurrency, sumByCurrency } from "@/lib/format";
import { paymentCurrency } from "@/lib/payment-source";
import { PROJECT_CURRENCY_SELECT } from "@/lib/project-currency";

const MONTHS = 12;

/** The windows the sales section can be read over: days back, or every record. */
export const ANALYTICS_PERIODS = [30, 90, 365, "all"] as const;
export type AnalyticsPeriod = (typeof ANALYTICS_PERIODS)[number];
export const DEFAULT_PERIOD: AnalyticsPeriod = 90;

export function parsePeriod(value: string | string[] | undefined): AnalyticsPeriod {
  const raw = Array.isArray(value) ? value[0] : value;
  if (raw === "all") return "all";
  const n = Number(raw);
  return (ANALYTICS_PERIODS as readonly (number | string)[]).includes(n)
    ? (n as AnalyticsPeriod)
    : DEFAULT_PERIOD;
}

/** Fewer answered deals than this and an average cycle is noise, not a metric. */
const MIN_CYCLE_SAMPLE = 3;

type OpportunityProposal = {
  clientId: string;
  status: string;
  projectType: string;
  currency: string;
  totalPrice: number;
  createdAt: Date;
  sentAt: Date | null;
  respondedAt: Date | null;
  contract: { signedAt: Date | null } | null;
};

/**
 * One commercial opportunity per client (R6): the proposal that is the deal.
 * Drafts are not quoted. Among a client's sent versions an accepted one is the
 * deal; otherwise the latest version stands. Earlier versions are superseded,
 * never counted as separate quotes.
 */
function opportunities(rows: OpportunityProposal[]): OpportunityProposal[] {
  const byClient = new Map<string, OpportunityProposal>();
  for (const row of rows) {
    if (row.status === "DRAFT") continue;
    const cur = byClient.get(row.clientId);
    if (!cur) {
      byClient.set(row.clientId, row);
      continue;
    }
    const rowWon = row.status === "ACCEPTED";
    const curWon = cur.status === "ACCEPTED";
    if (rowWon !== curWon ? rowWon : row.createdAt > cur.createdAt) {
      byClient.set(row.clientId, row);
    }
  }
  return [...byClient.values()];
}

/**
 * Upper bound on the lead cohort loaded to derive stages. The period already
 * bounds it; this stops a flood of spam from turning one page view into an
 * unbounded read. When it is hit the page says so instead of showing a
 * partial count as the whole.
 */
const COHORT_CAP = 2000;

/**
 * Meetings read per cohort client, newest first. The stage only asks whether a
 * call is booked ahead or one was completed; a lead with more meetings than
 * this is not a real case, and the cap keeps the cohort read bounded.
 */
const COHORT_MEETINGS = 10;

function monthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** "YYYY-MM" back to the first day of that month, read the way `monthKey` reads it. */
function monthStart(key: string) {
  const [year, month] = key.split("-").map(Number);
  return new Date(year, month - 1, 1);
}

function lastMonths(count: number) {
  const now = new Date();
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (count - 1 - i), 1);
    return { key: monthKey(d), label: d.toLocaleDateString("en-US", { month: "short" }) };
  });
}

/** Derived stages that count as qualified (and beyond). */
const QUALIFIED_STAGES: readonly string[] = PIPELINE_STAGES.slice(
  PIPELINE_STAGES.indexOf("QUALIFIED"),
);
const TOP_LANDING_PAGES = 8;
const DIRECT = "direct / unknown";
const NOT_RECORDED = "not recorded";
const NO_REASON = "NOT_RECORDED";

/** How a lead first reached us: the earlier of its form submission and estimator run. */
const FIRST_TOUCH = {
  FORM: "Contact form",
  ESTIMATOR: "Estimator",
  NONE: "No site touch",
} as const;

type AttributionStats = { leads: number; qualified: number; won: number };

function rankAttribution(map: Map<string, AttributionStats>) {
  return [...map.entries()]
    .map(([key, stats]) => ({ key, ...stats }))
    .sort((a, b) => b.leads - a.leads || b.won - a.won || a.key.localeCompare(b.key));
}

type Touch = { utmSource: string | null; landingPath: string | null; at: Date };

/** The first touch: whichever of the two site records came first. */
function firstTouch(
  submission: Touch | null,
  estimate: Touch | null,
): { channel: string; touch: Touch | null } {
  if (submission && (!estimate || submission.at <= estimate.at))
    return { channel: FIRST_TOUCH.FORM, touch: submission };
  if (estimate) return { channel: FIRST_TOUCH.ESTIMATOR, touch: estimate };
  return { channel: FIRST_TOUCH.NONE, touch: null };
}

/**
 * Everything the analytics page shows. Counts and sums only — no names,
 * phones or notes leave this function. The sales section reads the leads
 * created in the last `period` days (a cohort) and the proposals created in
 * the same window (one opportunity per client); the monthly charts always span twelve months; client,
 * delivery and website totals are all time.
 */
export async function getAnalytics(period: AnalyticsPeriod = DEFAULT_PERIOD) {
  const now = new Date();
  const yearAgo = new Date(now.getFullYear(), now.getMonth() - (MONTHS - 1), 1);
  // "All time" has no lower bound; the range shown starts at the earliest record.
  const since = period === "all" ? null : new Date(now.getTime() - period * 86_400_000);
  const createdFilter = since ? { createdAt: { gte: since } } : {};
  const signedWhere = { status: "SIGNED" as const };

  const [
    cohortRows,
    proposalRows,
    earliest,
    contracts,
    leadDates,
    launchedProjects,
    projectTotal,
    projectActive,
    payments,
    submissionCount,
    estimateCount,
    estimateConverted,
    clientTotal,
    wonClientCount,
    repeatGroups,
    wonClientProposals,
  ] = await Promise.all([
    prisma.client.findMany({
      where: createdFilter,
      orderBy: { createdAt: "desc" },
      take: COHORT_CAP + 1,
      select: {
        source: true,
        status: true,
        lostReason: true,
        proposals: {
          select: { status: true, readAt: true, totalPrice: true, currency: true },
          orderBy: { createdAt: "desc" },
        },
        projects: { where: { status: { not: "CANCELLED" } }, select: { status: true }, take: 1 },
        // Every contract, newest first: deriveClientStage needs them all.
        contracts: { select: { status: true }, orderBy: { createdAt: "desc" } },
        meetings: { ...STAGE_MEETINGS_SELECT.meetings, take: COHORT_MEETINGS },
        contactSubmission: {
          select: { utmSource: true, landingPath: true, submittedAt: true },
        },
        transparencyLead: {
          select: { utmSource: true, landingPath: true, createdAt: true },
        },
      },
    }),
    // Every proposal version in the window; reduced to one opportunity per
    // client below. Proposal volume is low, so no cap is needed.
    prisma.proposal.findMany({
      where: createdFilter,
      orderBy: { createdAt: "desc" },
      select: {
        clientId: true,
        status: true,
        projectType: true,
        currency: true,
        totalPrice: true,
        createdAt: true,
        sentAt: true,
        respondedAt: true,
        contract: { select: { signedAt: true } },
      },
    }),
    prisma.client.aggregate({ _min: { createdAt: true } }),
    prisma.contract.findMany({
      where: { signedAt: { gte: yearAgo } },
      select: {
        signedAt: true,
        proposal: { select: { totalPrice: true, currency: true } },
      },
    }),
    // Leads per month, counted in the database: at most twelve rows, never one
    // per lead, and no client fields. Months are the stored (UTC) timestamps'.
    prisma.$queryRaw<{ month: string; count: bigint }[]>(Prisma.sql`
      SELECT to_char(date_trunc('month', "createdAt"), 'YYYY-MM') AS month, COUNT(*) AS count
      FROM "clients"
      WHERE "createdAt" >= ${yearAgo}
      GROUP BY 1
    `),
    prisma.project.findMany({
      where: { actualLaunchDate: { not: null } },
      select: { origin: true, createdAt: true, targetLaunchDate: true, actualLaunchDate: true },
    }),
    prisma.project.count(),
    prisma.project.count({ where: { status: "ACTIVE" } }),
    prisma.payment.findMany({
      where: { status: "PAID", paidAt: { gte: yearAgo } },
      select: {
        amount: true,
        paidAt: true,
        project: { select: { ...PROJECT_CURRENCY_SELECT } },
      },
    }),
    prisma.contactSubmission.count(),
    prisma.transparencyLead.count(),
    prisma.transparencyLead.count({ where: { convertedAt: { not: null } } }),
    prisma.client.count(),
    prisma.client.count({ where: { contracts: { some: signedWhere } } }),
    prisma.contract.groupBy({
      by: ["clientId"],
      where: signedWhere,
      _count: { _all: true },
      having: { clientId: { _count: { gt: 1 } } },
    }),
    // Accepted versions of won clients; reduced to the latest per client below.
    prisma.proposal.findMany({
      where: { status: "ACCEPTED", client: { contracts: { some: signedWhere } } },
      orderBy: { createdAt: "desc" },
      select: { clientId: true, currency: true, totalPrice: true },
    }),
  ]);

  const truncated = cohortRows.length > COHORT_CAP;
  const cohort = truncated ? cohortRows.slice(0, COHORT_CAP) : cohortRows;
  const months = lastMonths(MONTHS);

  const bucket = (rows: { at: Date | null; amount: number; currency?: string }[]) => {
    const map = new Map(months.map((m) => [m.key, {} as Record<string, number>]));
    for (const row of rows) {
      if (!row.at) continue;
      const key = monthKey(row.at);
      const slot = map.get(key);
      if (!slot) continue;
      const currency = row.currency ?? "";
      slot[currency] = (slot[currency] ?? 0) + row.amount;
    }
    return months.map((m) => {
      const byCurrency = map.get(m.key) ?? {};
      return {
        ...m,
        byCurrency,
        value: Object.values(byCurrency).reduce((a, b) => Math.max(a, b), 0),
        currency:
          Object.entries(byCurrency).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "",
        mixed: Object.keys(byCurrency).length > 1,
      };
    });
  };

  const signedByMonth = bucket(
    contracts.map((c) => ({
      at: c.signedAt,
      amount: c.proposal.totalPrice,
      currency: c.proposal.currency,
    })),
  );
  const cashByMonth = bucket(
    payments.map((p) => ({
      at: p.paidAt,
      amount: p.amount,
      currency: paymentCurrency(p),
    })),
  );
  const leadsByMonth = bucket(
    leadDates.map((row) => ({ at: monthStart(row.month), amount: Number(row.count) })),
  );

  // One pass over the cohort: stage, source, first touch, lost reason.
  const stageCounts = new Map<string, number>(ALL_STAGES.map((s) => [s, 0]));
  const lostCounts = new Map<string, number>();
  const sourceStats = new Map<
    string,
    { leads: number; won: number; value: Record<string, number> }
  >();
  const utmStats = new Map<string, AttributionStats>();
  const landingStats = new Map<string, AttributionStats>();
  const channelStats = new Map<string, AttributionStats>();
  let qualified = 0;
  for (const client of cohort) {
    const stage = deriveClientStage(client, now);
    stageCounts.set(stage, (stageCounts.get(stage) ?? 0) + 1);
    if (stage === "LOST") {
      const reason = client.lostReason ?? NO_REASON;
      lostCounts.set(reason, (lostCounts.get(reason) ?? 0) + 1);
    }
    const isQualified = QUALIFIED_STAGES.includes(stage);
    if (isQualified) qualified += 1;
    // The same "won" the stage count uses: a signed contract, WON, or a live project.
    const won = stage === "SIGNED";

    const source = sourceStats.get(client.source) ?? { leads: 0, won: 0, value: {} };
    source.leads += 1;
    if (won) {
      source.won += 1;
      for (const p of client.proposals.filter((x) => x.status === "ACCEPTED")) {
        source.value[p.currency] = (source.value[p.currency] ?? 0) + p.totalPrice;
      }
    }
    sourceStats.set(client.source, source);

    const sub = client.contactSubmission;
    const est = client.transparencyLead;
    const { channel, touch } = firstTouch(
      sub && { utmSource: sub.utmSource, landingPath: sub.landingPath, at: sub.submittedAt },
      est && { utmSource: est.utmSource, landingPath: est.landingPath, at: est.createdAt },
    );
    const utm = touch?.utmSource?.trim() || DIRECT;
    const landing = touch?.landingPath?.trim() || NOT_RECORDED;
    for (const [map, key] of [
      [utmStats, utm],
      [landingStats, landing],
      [channelStats, channel],
    ] as const) {
      const entry = map.get(key) ?? { leads: 0, qualified: 0, won: 0 };
      entry.leads += 1;
      if (isQualified) entry.qualified += 1;
      if (won) entry.won += 1;
      map.set(key, entry);
    }
  }

  // R6: one opportunity per client, no probability weighting anywhere.
  const deals = opportunities(proposalRows);
  const wonDeals = deals.filter((d) => d.status === "ACCEPTED");

  const typeStats = new Map<string, { quoted: number; won: number }>();
  for (const deal of deals) {
    const entry = typeStats.get(deal.projectType) ?? { quoted: 0, won: 0 };
    entry.quoted += 1;
    if (deal.status === "ACCEPTED") entry.won += 1;
    typeStats.set(deal.projectType, entry);
  }

  // Sales cycle runs from the proposal going out to its contract being signed:
  // both are recorded evidence on every signed deal. A won deal without a signed
  // contract yet has no end date, so it is left out of the sample, never guessed.
  const cycles = wonDeals
    .filter((d) => d.sentAt && d.contract?.signedAt)
    .map((d) => (d.contract!.signedAt!.getTime() - d.sentAt!.getTime()) / 86_400_000)
    .filter((days) => days >= 0);
  const avgCycle =
    cycles.length >= MIN_CYCLE_SAMPLE
      ? Math.round(cycles.reduce((a, b) => a + b, 0) / cycles.length)
      : null;

  const proposalsSent = deals.length;
  const accepted = wonDeals.length;
  const wonValueByCurrency = sumByCurrency(
    wonDeals.map((d) => ({ amount: d.totalPrice, currency: d.currency })),
  );

  const datedLaunches = launchedProjects.filter((p) => p.targetLaunchDate);
  const onTime = datedLaunches.filter((p) => p.actualLaunchDate! <= p.targetLaunchDate!);
  // A project has no start date of its own: createdAt is the start only for a
  // contract-opened project. A recorded one is entered after the fact, so its
  // span is not a duration; a non-positive span is a data error, not a project.
  const durations = launchedProjects
    .filter((p) => p.origin !== "RECORDED")
    .map((p) => (p.actualLaunchDate!.getTime() - p.createdAt.getTime()) / 604_800_000)
    .filter((weeks) => weeks > 0);
  const avgDuration = durations.length
    ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
    : null;

  // R6 again: a re-quoted client is one opportunity, so their value is the latest
  // accepted version (rows arrive newest first), not the sum of every version.
  const latestAccepted = new Map<string, { currency: string; totalPrice: number }>();
  for (const p of wonClientProposals) {
    if (!latestAccepted.has(p.clientId)) latestAccepted.set(p.clientId, p);
  }
  const wonClientValue = sumByCurrency(
    [...latestAccepted.values()].map((p) => ({ amount: p.totalPrice, currency: p.currency })),
  );

  const lostTotal = [...lostCounts.values()].reduce((a, b) => a + b, 0);

  return {
    period,
    rangeStart: since ?? earliest._min.createdAt,
    rangeEnd: now,
    truncated,
    months,
    signedByMonth,
    cashByMonth,
    leadsByMonth,
    sales: {
      leads: cohort.length,
      qualified,
      proposalsSent,
      accepted,
      rejected: deals.filter((d) => d.status === "REJECTED").length,
      winRate: proposalsSent ? Math.round((accepted / proposalsSent) * 100) : 0,
      avgDealByCurrency: scaleByCurrency(wonValueByCurrency, (currency) => {
        const n = wonDeals.filter((d) => d.currency === currency).length;
        return n ? 1 / n : 0;
      }),
      avgCycle,
      cycleSample: cycles.length,
      cycleOf: accepted,
      cycleMin: MIN_CYCLE_SAMPLE,
      wonValueByCurrency,
    },
    // Where this period's leads stand now — counts per derived stage, no odds.
    stages: ALL_STAGES.map((stage) => ({ stage, count: stageCounts.get(stage) ?? 0 })),
    lostReasons: {
      total: lostTotal,
      rows: [...LOST_REASON_VALUES, NO_REASON]
        .map((reason) => ({ reason, count: lostCounts.get(reason) ?? 0 }))
        .filter((r) => r.count > 0)
        .sort((a, b) => b.count - a.count),
    },
    sources: [...sourceStats.entries()]
      .map(([source, stats]) => ({ source, ...stats }))
      .sort((a, b) => b.leads - a.leads),
    firstTouch: rankAttribution(channelStats),
    utmSources: rankAttribution(utmStats),
    landingPages: rankAttribution(landingStats).slice(0, TOP_LANDING_PAGES),
    projectTypes: [...typeStats.entries()]
      .map(([type, stats]) => ({ type, ...stats }))
      .sort((a, b) => b.quoted - a.quoted),
    delivery: {
      total: projectTotal,
      launched: launchedProjects.length,
      onTimePct: datedLaunches.length
        ? Math.round((onTime.length / datedLaunches.length) * 100)
        : 0,
      late: datedLaunches.length - onTime.length,
      undated: launchedProjects.length - datedLaunches.length,
      avgDurationWeeks: avgDuration,
      durationSample: durations.length,
      active: projectActive,
    },
    clientsMetrics: {
      total: clientTotal,
      won: wonClientCount,
      repeat: repeatGroups.length,
      avgValueByCurrency: scaleByCurrency(wonClientValue, () =>
        wonClientCount ? 1 / wonClientCount : 0,
      ),
      valueBasis: latestAccepted.size,
    },
    website: {
      submissions: submissionCount,
      estimates: estimateCount,
      estimatesConverted: estimateConverted,
    },
  };
}

export const NO_LOST_REASON = NO_REASON;
