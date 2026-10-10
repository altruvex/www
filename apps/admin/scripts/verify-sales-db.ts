/**
 * verify:sales-db — the Sales OS read path against a real database.
 *
 * Seeds one client per sales scenario (every record prefixed so cleanup is
 * exact), then reads them back through the real loader (lib/sales-signals.ts
 * loadSalesRow / loadSalesQueue), the real engine (lib/sales-intel.ts, via the
 * loader) and the real action centre (lib/action-center.ts). Asserts the
 * derived stage, the /leads group membership, the next action, health and
 * priority, and that closed leads never reach open work or an owed call.
 *
 * Needs DATABASE_URL pointing at a scratch database; refuses a non-local host
 * unless VERIFY_ALLOW_REMOTE=1. Writes, then always removes, its own records.
 */
import { linkClientToLead, prisma } from "@repo/database";
import { LEAD_SCORE_THRESHOLDS } from "@repo/pricing-schema";

if (!process.env.DATABASE_URL) {
  console.log("verify:sales-db — skipped (no DATABASE_URL).");
  process.exit(0);
}
{
  const host = new URL(process.env.DATABASE_URL).hostname;
  if (!["localhost", "127.0.0.1", "::1", "[::1]"].includes(host) && process.env.VERIFY_ALLOW_REMOTE !== "1") {
    console.log(`verify:sales-db — refused: ${host} is not a local scratch database (set VERIFY_ALLOW_REMOTE=1 to override).`);
    process.exit(1);
  }
}

// lib/sales-signals.ts (and what it imports) starts with `import "server-only"`,
// a marker Next resolves through its own alias; it is not installed for Bun.
// A virtual empty module stands in for it, so the libs load unedited.
// The app's tsconfig carries no Bun types, so the one API used is typed here.
type VirtualModules = { module(specifier: string, load: () => { exports: object; loader: "object" }): void };
const { Bun } = globalThis as unknown as {
  Bun: { plugin(p: { name: string; setup(build: VirtualModules): void }): void };
};
Bun.plugin({
  name: "server-only (empty outside Next)",
  setup(build) {
    build.module("server-only", () => ({ exports: {}, loader: "object" }));
  },
});

const { loadSalesQueue, loadSalesRow, SALES_GROUPS } = await import("../lib/sales-signals");
type SalesGroup = (typeof SALES_GROUPS)[number]["id"];
const { deriveClientStage } = await import("../lib/dashboard-data");
const { getActionCentre, scopeActions } = await import("../lib/action-center");
const { addCalendarDaysKey, lastWorkingDayKey, startOfBusinessDayKey, todayWorkingKey } = await import("../lib/working-days");

let failures = 0;
const check = (ok: boolean, what: string) => {
  console.log(`  ${ok ? "✓" : "✗"} ${what}`);
  if (!ok) failures++;
};

const HOUR = 3_600_000;
const DAY = 86_400_000;
const now = new Date();
const ago = (ms: number) => new Date(now.getTime() - ms);
const ahead = (ms: number) => new Date(now.getTime() + ms);

const suffix = Date.now().toString().slice(-8);
const PREFIX = `verify-sales-${suffix}`;
const scope = { name: { startsWith: PREFIX } };

const user = await prisma.user.create({
  data: { email: `${PREFIX}@altruvex.test`, name: "Verify Sales", role: "ADMIN" },
});

let phoneSeq = 0;
/** Seeded clients carry a phone; the phone-less path is checked on its own in [8]. */
const nextPhone = () => `+2015553${suffix.slice(-4)}${String(phoneSeq++).padStart(2, "0")}`;

const ids: Record<string, string> = {};
const meetingIds: Record<string, string> = {};

type ClientInput = Parameters<typeof prisma.client.create>[0]["data"];
async function seedClient(key: string, data: Omit<ClientInput, "name" | "phone">) {
  const c = await prisma.client.create({
    data: { name: `${PREFIX} ${key}`, phone: nextPhone(), ...data } as ClientInput,
  });
  ids[key] = c.id;
  return c.id;
}

async function seedMeeting(
  key: string,
  clientId: string,
  data: {
    status: "APPROVED" | "COMPLETED";
    scheduledDate: Date;
    outcome?: "PROPOSAL_REQUIRED" | null;
    outcomeAt?: Date | null;
    completedAt?: Date | null;
    createdAt?: Date;
  },
) {
  const m = await prisma.meeting.create({
    data: { title: `${PREFIX} ${key} call`, scheduledTime: "10:00", clientId, ...data },
  });
  meetingIds[key] = m.id;
}

async function seedProposal(
  clientId: string,
  data: { status: "SENT" | "ACCEPTED"; sentAt: Date; validUntil?: Date },
) {
  return prisma.proposal.create({
    data: {
      clientId,
      projectType: "website",
      complexity: "standard",
      // A quoted figure is needed; the schema's threshold keeps prices out of this file.
      totalPrice: LEAD_SCORE_THRESHOLDS.medium,
      lineItems: [],
      timelineWeeks: 6,
      accentName: "blue",
      createdBy: PREFIX,
      validUntil: data.validUntil ?? ahead(30 * DAY),
      status: data.status,
      sentAt: data.sentAt,
    },
  });
}

try {
  // ── seed ────────────────────────────────────────────────────────────────
  // 1 new website lead, an hour old: the first reply is owed within the promise.
  await seedClient("s1-new", {
    status: "NEW",
    source: "WEBSITE_CONTACT_FORM",
    ownerId: user.id,
    createdAt: ago(HOUR),
  });
  // 2 qualified, no call.
  await seedClient("s2-qualified", { status: "QUALIFIED", ownerId: user.id, createdAt: ago(HOUR) });
  // 3 a call booked three days out.
  const s3 = await seedClient("s3-booked", { status: "QUALIFIED", ownerId: user.id, createdAt: ago(HOUR) });
  await seedMeeting("s3", s3, { status: "APPROVED", scheduledDate: ahead(3 * DAY) });
  // 4 call completed with outcome PROPOSAL_REQUIRED, everything a proposal needs on file.
  const sub = await prisma.contactSubmission.create({
    data: {
      name: `${PREFIX} s4 submission`,
      phone: nextPhone(),
      message: "verify",
      budget: "X2_TO_5X",
      projectTimeline: "SOON",
      serviceInterest: "WEB_DEVELOPMENT",
      decisionRole: "DECIDES",
    },
  });
  const s4 = await seedClient("s4-called", {
    status: "QUALIFIED",
    ownerId: user.id,
    createdAt: ago(4 * DAY),
    contactSubmissionId: sub.id,
  });
  await seedMeeting("s4", s4, {
    status: "COMPLETED",
    scheduledDate: ago(3 * DAY),
    completedAt: ago(3 * DAY),
    outcome: "PROPOSAL_REQUIRED",
    outcomeAt: ago(HOUR),
  });
  // 5 proposal sent an hour ago.
  const s5 = await seedClient("s5-proposal", { status: "CONTACTED", ownerId: user.id, createdAt: ago(5 * DAY) });
  await seedProposal(s5, { status: "SENT", sentAt: ago(HOUR) });
  // 6 won: accepted proposal + signed contract (and a stale agreed call, for the action centre).
  const s6 = await seedClient("s6-won", { status: "QUALIFIED", ownerId: user.id, createdAt: ago(10 * DAY) });
  const p6 = await seedProposal(s6, { status: "ACCEPTED", sentAt: ago(5 * DAY) });
  await prisma.contract.create({
    data: { proposalId: p6.id, clientId: s6, status: "SIGNED", signedAt: ago(DAY) },
  });
  await seedMeeting("s6", s6, { status: "APPROVED", scheduledDate: ago(2 * DAY) });
  // 7 lost with a reason (and a stale agreed call).
  const s7 = await seedClient("s7-lost", {
    status: "LOST",
    lostReason: "BUDGET",
    ownerId: user.id,
    createdAt: ago(10 * DAY),
  });
  await seedMeeting("s7", s7, { status: "APPROVED", scheduledDate: ago(2 * DAY) });
  // 8 nurture with a reason and a review date two weeks out.
  await seedClient("s8-nurture", {
    status: "NURTURE",
    nurtureReason: "TIMING",
    nextActionAt: ahead(14 * DAY),
    ownerId: user.id,
    createdAt: ago(10 * DAY),
  });
  // 8b nurture whose review date has passed: back in open work. Five days
  // back is overdue on every weekday under the Friday–Saturday working week.
  await seedClient("s8b-nurture-due", {
    status: "NURTURE",
    nurtureReason: "TIMING",
    nextActionAt: ago(5 * DAY),
    ownerId: user.id,
    createdAt: ago(10 * DAY),
  });
  // 9 spam (and a stale agreed call).
  const s9 = await seedClient("s9-spam", { status: "SPAM", ownerId: user.id, createdAt: ago(HOUR) });
  await seedMeeting("s9", s9, { status: "APPROVED", scheduledDate: ago(2 * DAY) });
  // 10 / 11 contacted, unowned vs owned.
  await seedClient("s10-unowned", { status: "CONTACTED", createdAt: ago(HOUR) });
  await seedClient("s11-owned", { status: "CONTACTED", ownerId: user.id, createdAt: ago(HOUR) });
  // 12 high value (estimate at the large threshold), a month without activity.
  const lead = await prisma.transparencyLead.create({
    data: {
      reference: `${PREFIX}-s12`,
      phone: nextPhone(),
      projectType: "website",
      complexity: "standard",
      timeline: "standard",
      priceMin: LEAD_SCORE_THRESHOLDS.large,
      priceMax: LEAD_SCORE_THRESHOLDS.large,
      weeksMin: 4,
      weeksMax: 8,
    },
  });
  await seedClient("s12-hv-stale", {
    status: "CONTACTED",
    ownerId: user.id,
    createdAt: ago(30 * DAY),
    transparencyLeadId: lead.id,
  });
  // 13 an old COMPLETED call with no outcome, then a proposal sent 12 days ago.
  const s13 = await seedClient("s13-old-call-proposal", {
    status: "CONTACTED",
    ownerId: user.id,
    createdAt: ago(25 * DAY),
  });
  await seedMeeting("s13", s13, {
    status: "COMPLETED",
    scheduledDate: ago(20 * DAY),
    completedAt: ago(20 * DAY),
    createdAt: ago(21 * DAY),
  });
  await seedProposal(s13, { status: "SENT", sentAt: ago(16 * DAY) });
  // 14 an agreed call two working days ago, no outcome, no proposal: the outcome
  // is owed. Counted in working days, so a run on a Friday or Saturday sees the
  // same overdue call as one on a Tuesday.
  const s14 = await seedClient("s14-outcome-owed", { status: "QUALIFIED", ownerId: user.id, createdAt: ago(5 * DAY) });
  let s14Day = todayWorkingKey(now);
  for (let back = 2; back > 0; back -= 1) s14Day = lastWorkingDayKey(addCalendarDaysKey(s14Day, -1));
  const s14Call = new Date(startOfBusinessDayKey(s14Day).getTime() + 10 * HOUR);
  await seedMeeting("s14", s14, { status: "APPROVED", scheduledDate: s14Call });
  // 15 two SENT versions of one proposal, both unopened for days; the older
  // one expires soon. One opportunity (R6): one chase row, no expiry row.
  const s15 = await seedClient("s15-two-versions", { status: "CONTACTED", ownerId: user.id, createdAt: ago(20 * DAY) });
  const p15old = await seedProposal(s15, { status: "SENT", sentAt: ago(16 * DAY), validUntil: ahead(2 * DAY) });
  await new Promise((r) => setTimeout(r, 5)); // createdAt orders the versions
  const p15new = await seedProposal(s15, { status: "SENT", sentAt: ago(15 * DAY) });
  // 16 lost, with a contract still out for signature: closed, so never chased.
  const s16 = await seedClient("s16-lost-contract", {
    status: "LOST",
    lostReason: "BUDGET",
    ownerId: user.id,
    createdAt: ago(20 * DAY),
  });
  const p16 = await seedProposal(s16, { status: "ACCEPTED", sentAt: ago(10 * DAY) });
  const c16 = await prisma.contract.create({ data: { proposalId: p16.id, clientId: s16, status: "SENT" } });

  // ── one lead at a time (loadSalesRow → engine) ─────────────────────────────
  console.log(`\nSales OS against ${new URL(process.env.DATABASE_URL).pathname.slice(1)}\n` + "=".repeat(64));
  console.log("\n[1] Each scenario read through loadSalesRow");

  const expected: Record<
    string,
    { stage: string; next: string; priority: string; health: string }
  > = {
    "s1-new": { stage: "NEW", next: "REPLY", priority: "MEDIUM", health: "HEALTHY" },
    "s2-qualified": { stage: "QUALIFIED", next: "BOOK_CALL", priority: "LOW", health: "HEALTHY" },
    "s3-booked": { stage: "CALL_BOOKED", next: "PREPARE_CALL", priority: "MEDIUM", health: "HEALTHY" },
    "s4-called": { stage: "CALL_COMPLETED", next: "WRITE_PROPOSAL", priority: "MEDIUM", health: "HEALTHY" },
    "s5-proposal": { stage: "PROPOSAL_SENT", next: "WAIT", priority: "MEDIUM", health: "HEALTHY" },
    "s6-won": { stage: "SIGNED", next: "NONE", priority: "LOW", health: "CLOSED" },
    "s7-lost": { stage: "LOST", next: "NONE", priority: "LOW", health: "CLOSED" },
    "s8-nurture": { stage: "NURTURE", next: "WAIT", priority: "LOW", health: "HEALTHY" },
    "s8b-nurture-due": { stage: "NURTURE", next: "REVIEW_NURTURE", priority: "MEDIUM", health: "NEEDS_ATTENTION" },
    "s9-spam": { stage: "SPAM", next: "NONE", priority: "LOW", health: "CLOSED" },
    "s10-unowned": { stage: "CONTACTED", next: "QUALIFY", priority: "MEDIUM", health: "NEEDS_ATTENTION" },
    "s11-owned": { stage: "CONTACTED", next: "QUALIFY", priority: "LOW", health: "HEALTHY" },
    "s12-hv-stale": { stage: "CONTACTED", next: "QUALIFY", priority: "HIGH", health: "STALLED" },
    "s13-old-call-proposal": { stage: "PROPOSAL_SENT", next: "CHASE_PROPOSAL", priority: "MEDIUM", health: "STALLED" },
    "s14-outcome-owed": { stage: "QUALIFIED", next: "RECORD_OUTCOME", priority: "MEDIUM", health: "NEEDS_ATTENTION" },
  };

  for (const [key, want] of Object.entries(expected)) {
    const row = await loadSalesRow(ids[key]!, user.id, now);
    if (!row) {
      check(false, `${key}: loadSalesRow found the client`);
      continue;
    }
    const derived = deriveClientStage(row.client, now);
    const got = {
      stage: derived,
      next: row.reading.next.kind,
      priority: row.reading.priority.level,
      health: row.reading.health.state,
    };
    const ok =
      got.stage === want.stage &&
      row.signals.stage === derived &&
      got.next === want.next &&
      got.priority === want.priority &&
      got.health === want.health;
    check(
      ok,
      `${key}: ${got.stage} · ${got.next} · ${got.priority} · ${got.health}` +
        (ok ? "" : `  (want ${want.stage} · ${want.next} · ${want.priority} · ${want.health}; signals.stage ${row.signals.stage})`),
    );
  }

  console.log("\n[2] Specific rulings");
  {
    const s12row = (await loadSalesRow(ids["s12-hv-stale"]!, user.id, now))!;
    check(
      s12row.reading.priority.why.some((w) => w.includes("going quiet")),
      `high-value stale lead is HIGH because it is going quiet (${s12row.reading.priority.why[0]})`,
    );
    const s13row = (await loadSalesRow(ids["s13-old-call-proposal"]!, user.id, now))!;
    check(
      !s13row.reading.blockers.some((b) => b.includes("no recorded outcome")),
      "an old completed call with no outcome is not owed once a proposal went out",
    );
    const s14row = (await loadSalesRow(ids["s14-outcome-owed"]!, user.id, now))!;
    check(
      s14row.reading.blockers.some((b) => b.includes("no recorded outcome")),
      "a past call with no outcome and no proposal names the outcome as a blocker",
    );
    const s4row = (await loadSalesRow(ids["s4-called"]!, user.id, now))!;
    check(s4row.reading.readiness.ready, `the called lead is proposal-ready (missing: ${s4row.reading.readiness.missing.join(", ") || "none"})`);
    const s1row = (await loadSalesRow(ids["s1-new"]!, user.id, now))!;
    check(s1row.reading.replySla.state === "WITHIN", `a new website lead is within the reply promise (${s1row.reading.replySla.state})`);
    const s11other = (await loadSalesRow(ids["s11-owned"]!, null, now))!;
    check(
      !s11other.reading.priority.why.includes("Assigned to you"),
      "ownership is read against the viewer: no 'Assigned to you' for another viewer",
    );
    check((await loadSalesRow("00000000-0000-0000-0000-000000000000", null, now)) === null, "an unknown id reads as null");
  }

  // ── the /leads queue (loadSalesQueue) ─────────────────────────────────────
  console.log("\n[3] Open work and parked lists");
  const keyOf = Object.fromEntries(Object.entries(ids).map(([k, v]) => [v, k]));
  const keysOf = (rows: { client: { id: string } }[]) =>
    new Set(rows.map((r) => keyOf[r.client.id]).filter((k): k is string => Boolean(k)));
  const sameSet = (a: Set<string>, b: string[]) => a.size === b.length && b.every((k) => a.has(k));
  const fmt = (s: Set<string>) => [...s].sort().join(", ") || "none";

  const open = await loadSalesQueue({ viewerId: user.id, now, where: scope });
  const openKeys = keysOf(open.rows);
  const wantOpen = [
    "s1-new",
    "s2-qualified",
    "s3-booked",
    "s4-called",
    "s5-proposal",
    "s8b-nurture-due",
    "s10-unowned",
    "s11-owned",
    "s12-hv-stale",
    "s13-old-call-proposal",
    "s14-outcome-owed",
    "s15-two-versions",
  ];
  check(sameSet(openKeys, wantOpen), `open work holds exactly the live leads (${fmt(openKeys)})`);
  for (const closed of ["s6-won", "s7-lost", "s8-nurture", "s9-spam", "s16-lost-contract"])
    check(!openKeys.has(closed), `${closed} is not in open work`);
  check(open.total === wantOpen.length && !open.capped, `the total counts the same scope (${open.total})`);

  const lost = keysOf((await loadSalesQueue({ viewerId: user.id, now, where: scope, scope: "LOST" })).rows);
  check(sameSet(lost, ["s7-lost", "s16-lost-contract"]), `the LOST list holds the lost leads only (${fmt(lost)})`);
  const nurture = keysOf((await loadSalesQueue({ viewerId: user.id, now, where: scope, scope: "NURTURE" })).rows);
  check(
    sameSet(nurture, ["s8-nurture", "s8b-nurture-due"]),
    `the NURTURE list holds both nurture leads (${fmt(nurture)})`,
  );

  console.log("\n[4] Group membership");
  const groupKeys = {} as Record<SalesGroup, Set<string>>;
  for (const g of SALES_GROUPS) {
    const q = await loadSalesQueue({ group: g.id, viewerId: user.id, now, where: scope });
    groupKeys[g.id] = keysOf(q.rows);
    if (g.id !== "won")
      check(q.counts[g.id] === q.rows.length, `${g.id}: the count matches the rows shown (${q.rows.length})`);
  }
  // Groups whose membership does not depend on the hour the script runs.
  const wantGroups: Record<string, SalesGroup[]> = {
    "s1-new": ["mine"],
    "s2-qualified": ["mine"],
    "s3-booked": ["calls", "mine"],
    "s4-called": ["proposals", "mine"],
    "s5-proposal": ["proposals", "mine"],
    "s8b-nurture-due": ["mine", "overdue"],
    "s10-unowned": ["unassigned"],
    "s11-owned": ["mine"],
    "s12-hv-stale": ["stalled", "mine"],
    "s13-old-call-proposal": ["proposals", "stalled", "mine", "overdue"],
    "s14-outcome-owed": ["calls", "mine", "overdue"],
  };
  for (const [key, want] of Object.entries(wantGroups)) {
    const got = SALES_GROUPS.map((g) => g.id).filter(
      // s1's reply is due later today or tomorrow depending on the hour: skip "due" for it.
      (g) => groupKeys[g].has(key) && !(key === "s1-new" && g === "due"),
    );
    const ok = got.length === want.length && want.every((g) => got.includes(g));
    check(ok, `${key} → ${got.join(", ") || "no group"}${ok ? "" : `  (want ${want.join(", ")})`}`);
  }
  check(sameSet(groupKeys.won, ["s6-won"]), `recently won holds the signed client only (${fmt(groupKeys.won)})`);
  for (const closed of ["s6-won", "s7-lost", "s8-nurture", "s9-spam"]) {
    const inOpenGroup = SALES_GROUPS.filter((g) => g.id !== "won" && groupKeys[g.id].has(closed));
    check(inOpenGroup.length === 0, `${closed} is in no open-work group`);
  }

  console.log("\n[5] Owner filter (Mine = the viewer's own only; Unassigned is separate)");
  const byOwner = async (owner?: string, viewerId: string | null = user.id) =>
    keysOf((await loadSalesQueue({ viewerId, now, where: scope, owner })).rows);
  const owned = await byOwner(user.id);
  check(owned.has("s11-owned") && !owned.has("s10-unowned"), "filtering by owner keeps owned leads and drops unowned ones");
  const mine = await byOwner("mine");
  check(mine.has("s11-owned") && !mine.has("s10-unowned"), "Mine holds the viewer's leads and excludes unowned ones");
  check((await byOwner("mine", "someone-else")).size === 0, "another viewer's Mine holds none of them");
  check((await byOwner("mine", null)).size === 0, "Mine with no viewer matches nothing, never everyone");
  const unassigned = await byOwner("unassigned");
  check(sameSet(unassigned, ["s10-unowned"]), `Unassigned holds only the unowned lead (${fmt(unassigned)})`);
  const all = await byOwner(undefined);
  check(all.has("s10-unowned") && all.has("s11-owned"), "All holds owned and unowned leads");

  // ── the action centre ────────────────────────────────────────────────────
  console.log("\n[6] Action centre: calls owed an outcome");
  const items = await getActionCentre();
  const itemIds = new Set(items.map((i) => i.id));
  check(itemIds.has(`call-${meetingIds.s14}`), "an open lead's past agreed call is raised as owed");
  check(!itemIds.has(`sales-${ids["s14-outcome-owed"]}`), "and is raised once, not again as a sales row");
  check(!itemIds.has(`call-${meetingIds.s6}`), "a won client's past call is not owed");
  check(!itemIds.has(`call-${meetingIds.s9}`), "a spam client's past call is not owed");
  check(!itemIds.has(`call-${meetingIds.s7}`), "a lost client's past call is not owed");
  check(!itemIds.has(`call-${meetingIds.s3}`), "a call still ahead is not owed");
  for (const closed of ["s6-won", "s7-lost", "s8-nurture", "s9-spam"])
    check(!itemIds.has(`sales-${ids[closed]}`), `${closed} raises no sales item`);

  console.log("\n[6b] Action centre: documents go through the engine");
  const touches = (needle: string) => items.filter((i) => i.id.includes(needle) || i.href.includes(needle));
  const s15rows = items.filter((i) => i.id === `sales-${ids["s15-two-versions"]}` || i.href.includes(p15old.id) || i.href.includes(p15new.id));
  check(
    s15rows.length === 1 && s15rows[0].href === `/proposals/${p15new.id}#engagement`,
    `two SENT versions → one chase row on the latest version (${s15rows.map((i) => i.href).join(", ")})`,
  );
  check(touches(p15old.id).length === 0, "the superseded version raises no expiry or chase row");
  check(
    touches(ids["s16-lost-contract"]).length === 0 && touches(c16.id).length === 0,
    "a lost client with a SENT contract raises no row",
  );
  check(!items.some((i) => i.kind === "contract" && /Sent \d+d ago/.test(i.detail)), "no invented contract-sent age");

  console.log("\n[7] Action centre: whose work");
  const mineItems = scopeActions(items, "mine", user.id);
  const unassignedItems = scopeActions(items, "unassigned", user.id);
  check(!mineItems.some((i) => i.ownerId === null), "Mine never holds an unowned item");
  check(mineItems.every((i) => i.ownerId === undefined || i.ownerId === user.id), "Mine = the viewer's items plus team duties");
  check(mineItems.some((i) => i.id === `call-${meetingIds.s14}`), "the viewer's owed call is in their Mine");
  check(!scopeActions(items, "mine", "someone-else").some((i) => i.ownerId === user.id), "and not in another viewer's Mine");
  check(unassignedItems.every((i) => i.ownerId === null), "Unassigned holds only unowned items");
  check(
    scopeActions(items, "all", user.id).length === items.length,
    "All holds every item, owned and unowned",
  );

  console.log("\n[8] A lead with no phone (email-only estimate)");
  const emailOnly = `${PREFIX}-nophone@altruvex.test`;
  const noPhoneLead = await prisma.transparencyLead.create({
    data: {
      reference: `${PREFIX}-s17`,
      phone: null,
      email: emailOnly,
      projectType: "website",
      complexity: "standard",
      timeline: "standard",
      priceMin: 1,
      priceMax: 1,
      weeksMin: 4,
      weeksMax: 8,
    },
  });
  const linked = await linkClientToLead({
    phone: null,
    name: `${PREFIX} s17-no-phone`,
    email: emailOnly,
    source: "TRANSPARENCY_ESTIMATOR",
    transparencyLeadId: noPhoneLead.id,
  });
  if (linked) ids["s17-no-phone"] = linked.id;
  check(linked !== null && linked.phone === null, "an email-only estimate becomes a client with no phone");
  const again = await linkClientToLead({
    phone: "",
    email: emailOnly.toUpperCase(),
    source: "TRANSPARENCY_ESTIMATOR",
  });
  check(again?.id === linked?.id, "a second email-only request matches the same client, case-insensitively");
  check(
    (await linkClientToLead({ phone: null, email: null, source: "TRANSPARENCY_ESTIMATOR" })) === null,
    "a request with neither phone nor email makes no client",
  );
  const noPhoneRow = linked ? await loadSalesRow(linked.id, user.id, now) : null;
  check(noPhoneRow !== null, "the phone-less client loads as a sales row");
} finally {
  const clientIds = Object.values(ids);
  await prisma.meeting.deleteMany({ where: { OR: [{ clientId: { in: clientIds } }, { title: { startsWith: PREFIX } }] } });
  await prisma.contract.deleteMany({ where: { clientId: { in: clientIds } } });
  await prisma.proposal.deleteMany({ where: { clientId: { in: clientIds } } });
  await prisma.client.deleteMany({ where: { OR: [{ id: { in: clientIds } }, scope] } });
  await prisma.contactSubmission.deleteMany({ where: { name: { startsWith: PREFIX } } });
  await prisma.transparencyLead.deleteMany({ where: { reference: { startsWith: PREFIX } } });
  await prisma.user.deleteMany({ where: { email: `${PREFIX}@altruvex.test` } });
  const left = await prisma.client.count({ where: scope });
  if (left) console.log(`  ✗ cleanup left ${left} client(s) behind`);
  await prisma.$disconnect();
}

console.log("\n" + "=".repeat(64));
console.log(failures === 0 ? "All sales-db checks passed.\n" : `${failures} failed.\n`);
process.exit(failures === 0 ? 0 : 1);
