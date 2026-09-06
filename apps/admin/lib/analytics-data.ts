import { prisma } from "@repo/database";
import { deriveClientStage } from "@/lib/dashboard-data";
import { scaleByCurrency, sumByCurrency } from "@/lib/format";

const MONTHS = 12;

function monthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function lastMonths(count: number) {
  const now = new Date();
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (count - 1 - i), 1);
    return { key: monthKey(d), label: d.toLocaleDateString("en-US", { month: "short" }) };
  });
}

/**
 * §23 — analytics that answer decisions, not analytics that decorate.
 *
 * Every metric here maps to something a person would DO: chase a source that
 * converts, shorten a cycle that is dragging, stop quoting a project type that
 * never closes. Anything that would only ever be looked at is left out.
 */
export async function getAnalytics() {
  const now = new Date();
  const yearAgo = new Date(now.getFullYear(), now.getMonth() - (MONTHS - 1), 1);

  const [clients, proposals, contracts, projects, payments, submissions, estimates] =
    await Promise.all([
      prisma.client.findMany({
        select: {
          id: true,
          source: true,
          status: true,
          createdAt: true,
          proposals: {
            select: {
              status: true,
              totalPrice: true,
              currency: true,
              createdAt: true,
              readAt: true,
            },
            orderBy: { createdAt: "desc" },
          },
          contracts: {
            select: { status: true, signedAt: true },
            orderBy: { createdAt: "desc" },
          },
        },
      }),
      prisma.proposal.findMany({
        select: {
          id: true,
          status: true,
          totalPrice: true,
          currency: true,
          projectType: true,
          createdAt: true,
          sentAt: true,
          respondedAt: true,
        },
      }),
      prisma.contract.findMany({
        where: { signedAt: { not: null } },
        select: {
          signedAt: true,
          proposal: { select: { totalPrice: true, currency: true } },
        },
      }),
      prisma.project.findMany({
        select: {
          id: true,
          status: true,
          createdAt: true,
          targetLaunchDate: true,
          actualLaunchDate: true,
        },
      }),
      prisma.payment.findMany({
        where: { status: "PAID", paidAt: { gte: yearAgo } },
        select: {
          amount: true,
          paidAt: true,
          project: {
            select: { contract: { select: { proposal: { select: { currency: true } } } } },
          },
        },
      }),
      prisma.contactSubmission.findMany({
        select: { utmSource: true, submittedAt: true, status: true },
      }),
      prisma.transparencyLead.findMany({ select: { convertedAt: true, projectType: true } }),
    ]);

  const months = lastMonths(MONTHS);

  /**
   * Bucket by month, keeping currencies apart. `currency` is omitted for pure
   * counts (new clients per month), where there is nothing to keep apart.
   */
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
        // The chart plots ONE measure on ONE axis. Where several currencies are
        // in play the dominant one is charted and the rest are named in the
        // caption — never silently added together.
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
      currency: p.project.contract.proposal.currency,
    })),
  );
  const leadsByMonth = bucket(clients.map((c) => ({ at: c.createdAt, amount: 1 })));

  /* ---- source performance: not just volume, but what closes -------------- */
  const sourceStats = new Map<
    string,
    { leads: number; won: number; value: Record<string, number> }
  >();
  for (const client of clients) {
    const entry = sourceStats.get(client.source) ?? { leads: 0, won: 0, value: {} };
    entry.leads += 1;
    const signed = client.contracts.some((c) => c.status === "SIGNED");
    if (signed) {
      entry.won += 1;
      for (const p of client.proposals.filter((x) => x.status === "ACCEPTED")) {
        entry.value[p.currency] = (entry.value[p.currency] ?? 0) + p.totalPrice;
      }
    }
    sourceStats.set(client.source, entry);
  }

  /* ---- project type performance ----------------------------------------- */
  const typeStats = new Map<
    string,
    { quoted: number; won: number; value: Record<string, number> }
  >();
  for (const proposal of proposals) {
    const entry = typeStats.get(proposal.projectType) ?? { quoted: 0, won: 0, value: {} };
    entry.quoted += 1;
    if (proposal.status === "ACCEPTED") {
      entry.won += 1;
      entry.value[proposal.currency] =
        (entry.value[proposal.currency] ?? 0) + proposal.totalPrice;
    }
    typeStats.set(proposal.projectType, entry);
  }

  /* ---- cycle length ------------------------------------------------------ */
  const cycles = proposals
    .filter((p) => p.sentAt && p.respondedAt && p.status === "ACCEPTED")
    .map((p) => (p.respondedAt!.getTime() - p.sentAt!.getTime()) / 86_400_000);
  const avgCycle = cycles.length
    ? Math.round(cycles.reduce((a, b) => a + b, 0) / cycles.length)
    : null;

  const sentProposals = proposals.filter((p) => p.status !== "DRAFT");
  const acceptedProposals = proposals.filter((p) => p.status === "ACCEPTED");
  const rejectedProposals = proposals.filter((p) => p.status === "REJECTED");

  /* ---- delivery ---------------------------------------------------------- */
  const launched = projects.filter((p) => p.actualLaunchDate);
  // Only projects that HAD a target can be on or off it. Counting a project
  // with no date as "late" makes the percentage a measure of data entry.
  const datedLaunches = launched.filter((p) => p.targetLaunchDate);
  const onTime = datedLaunches.filter((p) => p.actualLaunchDate! <= p.targetLaunchDate!);
  const durations = launched
    .filter((p) => p.actualLaunchDate)
    .map((p) => (p.actualLaunchDate!.getTime() - p.createdAt.getTime()) / 604_800_000);
  const avgDuration = durations.length
    ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
    : null;

  /* ---- clients ----------------------------------------------------------- */
  const repeatClients = clients.filter(
    (c) => c.contracts.filter((x) => x.status === "SIGNED").length > 1,
  ).length;
  const wonClients = clients.filter((c) => c.contracts.some((x) => x.status === "SIGNED"));
  const wonClientValue = sumByCurrency(
    wonClients.flatMap((c) =>
      c.proposals
        .filter((p) => p.status === "ACCEPTED")
        .map((p) => ({ amount: p.totalPrice, currency: p.currency })),
    ),
  );

  return {
    months,
    signedByMonth,
    cashByMonth,
    leadsByMonth,
    sales: {
      leads: clients.length,
      // Derived stage, not the raw status column — everywhere else in the app a
      // client's position is the furthest-along artifact they have.
      qualified: clients.filter((c) =>
        ["QUALIFIED", "PROPOSAL_SENT", "PROPOSAL_READ", "CONTRACT_SENT", "SIGNED"].includes(
          deriveClientStage(c),
        ),
      ).length,
      proposalsSent: sentProposals.length,
      accepted: acceptedProposals.length,
      rejected: rejectedProposals.length,
      winRate: sentProposals.length
        ? Math.round((acceptedProposals.length / sentProposals.length) * 100)
        : 0,
      // Per currency throughout: an average that mixes EGP and USD is nonsense.
      avgDealByCurrency: scaleByCurrency(
        sumByCurrency(
          acceptedProposals.map((p) => ({ amount: p.totalPrice, currency: p.currency })),
        ),
        (currency) => {
          const n = acceptedProposals.filter((p) => p.currency === currency).length;
          return n ? 1 / n : 0;
        },
      ),
      avgCycle,
      wonValueByCurrency: sumByCurrency(
        acceptedProposals.map((p) => ({ amount: p.totalPrice, currency: p.currency })),
      ),
    },
    sources: [...sourceStats.entries()]
      .map(([source, stats]) => ({ source, ...stats }))
      .sort((a, b) => b.leads - a.leads),
    projectTypes: [...typeStats.entries()]
      .map(([type, stats]) => ({ type, ...stats }))
      .sort((a, b) => b.quoted - a.quoted),
    delivery: {
      total: projects.length,
      launched: launched.length,
      onTimePct: datedLaunches.length
        ? Math.round((onTime.length / datedLaunches.length) * 100)
        : 0,
      late: datedLaunches.length - onTime.length,
      undated: launched.length - datedLaunches.length,
      avgDurationWeeks: avgDuration,
      active: projects.filter((p) => p.status === "ACTIVE").length,
    },
    clientsMetrics: {
      total: clients.length,
      won: wonClients.length,
      repeat: repeatClients,
      avgValueByCurrency: scaleByCurrency(wonClientValue, () =>
        wonClients.length ? 1 / wonClients.length : 0,
      ),
    },
    website: {
      submissions: submissions.length,
      estimates: estimates.length,
      estimatesConverted: estimates.filter((e) => e.convertedAt).length,
    },
  };
}

export type Analytics = Awaited<ReturnType<typeof getAnalytics>>;
