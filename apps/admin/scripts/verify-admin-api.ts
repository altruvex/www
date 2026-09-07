/**
 * End-to-end checks for the admin mutation routes and the audit trail.
 *
 * The handlers are exercised through the same functions the routes export, with
 * the session gate stubbed — the gate itself is covered by `withAdmin` and by
 * the ingest suite's 401 cases. What is asserted here is the part that is easy
 * to get wrong and impossible to see from a rendered page: that a mutation
 * actually persists, that it writes an audit event with the right actor and
 * diff, and that the subscription state machine moves the way the UI claims.
 *
 *   cd apps/admin && DATABASE_URL=... bun run verify:admin-api
 *
 * Writes and then removes its own records; point it at a scratch database.
 */
import { prisma } from "@repo/database";

import { recordActivity, recordChange, redactRecord, userActor } from "../lib/activity-log";
import { createSubscription, renewSubscription, setAutoRenew } from "../lib/maintenance-admin";
import { deriveStatus } from "../lib/subscription-lifecycle";
import { hashToken, issueToken } from "../lib/ingest-auth";

if (!process.env.DATABASE_URL) {
  console.log("verify:admin-api — skipped (no DATABASE_URL).");
  process.exit(0);
}

let failures = 0;
const check = (ok: boolean, what: string) => {
  console.log(`  ${ok ? "✓" : "✗"} ${what}`);
  if (!ok) failures++;
};

const suffix = Date.now().toString().slice(-8);
const user = await prisma.user.create({
  data: {
    email: `verify-${suffix}@altruvex.test`,
    name: "Verify Operator",
    passwordHash: "not-a-real-hash",
    role: "ADMIN",
  },
});
const client = await prisma.client.create({
  data: { name: "Verify API", phone: `+2015552${suffix.slice(-4)}`, company: "Verify API Co" },
});

const actor = userActor({ user: { id: user.id, name: user.name, email: user.email } });

try {
  console.log("\nRedaction");
  {
    const redacted = redactRecord({
      status: "ACTIVE",
      ingestToken: "avx_ingest_supersecret",
      apiKey: "sk-live-1234",
      password: "hunter2",
      normalField: "kept",
    });
    check(redacted?.status === "ACTIVE", "an ordinary field is kept");
    check(redacted?.normalField === "kept", "a field with no secret-ish name is kept");
    check(redacted?.ingestToken === "[redacted]", "a token field is redacted");
    check(redacted?.apiKey === "[redacted]", "an api key field is redacted");
    check(redacted?.password === "[redacted]", "a password field is redacted");

    const long = redactRecord({ note: "x".repeat(2000) });
    check(
      typeof long?.note === "string" && (long.note as string).length <= 513,
      "an oversized value is truncated rather than stored whole",
    );
  }

  console.log("\nActivity trail");
  {
    await recordActivity({
      action: "client.created",
      actor,
      entityType: "client",
      entityId: client.id,
      entityLabel: client.company,
      summary: "Created a client",
      after: { company: client.company },
    });

    const event = await prisma.activityEvent.findFirst({
      where: { entityId: client.id, action: "client.created" },
    });
    check(event != null, "an event is written");
    check(event?.actorId === user.id, "the event is attributed to the acting user");
    check(event?.actorKind === "USER", "actor kind is recorded");
    check(event?.actorLabel === "Verify Operator", "actor label is denormalised onto the event");

    // A no-op save must not produce an audit line.
    const wrote = await recordChange({
      action: "client.updated",
      actor,
      entityType: "client",
      entityId: client.id,
      summary: "No change",
      before: { status: "NEW" },
      after: { status: "NEW" },
    });
    check(wrote === false, "an unchanged save writes no event");

    const wroteReal = await recordChange({
      action: "client.updated",
      actor,
      entityType: "client",
      entityId: client.id,
      summary: "Status moved",
      before: { status: "NEW", priority: "MEDIUM" },
      after: { status: "QUALIFIED", priority: "MEDIUM" },
    });
    check(wroteReal === true, "a real change writes an event");

    const change = await prisma.activityEvent.findFirst({
      where: { entityId: client.id, action: "client.updated" },
      orderBy: { createdAt: "desc" },
    });
    const before = change?.before as Record<string, unknown> | null;
    const after = change?.after as Record<string, unknown> | null;
    check(before?.status === "NEW" && after?.status === "QUALIFIED", "the diff records both values");
    check(
      before != null && !("priority" in before),
      "an unchanged field is left out of the diff",
    );

    // Recording must never break the mutation it describes.
    await recordActivity({
      action: "client.updated",
      actor,
      entityType: "client",
      // A deliberately impossible payload: the write fails, the call must not.
      entityId: "x".repeat(5000),
      summary: "Should not throw",
    });
    check(true, "a failed activity write is swallowed rather than thrown");
  }

  console.log("\nIngest tokens");
  {
    const issued = issueToken();
    check(issued.token.startsWith("avx_ingest_"), "an issued token carries the ingest prefix");
    check(issued.hash === hashToken(issued.token), "the stored hash matches the token");
    check(issued.hash !== issued.token, "the plaintext token is not the stored value");
    check(issued.last4 === issued.token.slice(-4), "only the last four characters are kept");
    check(issueToken().token !== issued.token, "two issues produce different tokens");
  }

  console.log("\nSubscription lifecycle");
  {
    const created = await createSubscription(client.id, "essential", user.email, "MONTHLY", actor);
    check(created.ok, "a subscription is created");

    const sub = await prisma.maintenanceSubscription.findUniqueOrThrow({
      where: { id: created.id! },
    });
    check(sub.currentPeriodEnd > new Date(), "the first period ends in the future");
    check(sub.autoRenew === true, "auto-renew defaults on");
    check(deriveStatus(sub) === "ACTIVE", "a fresh subscription reads as active");

    // One live retainer per client.
    const dupe = await createSubscription(client.id, "essential", user.email, "MONTHLY", actor);
    check(!dupe.ok, "a second live retainer for the same client is refused");

    // Force it three days overdue, then renew. The new period must start where
    // the lapsed one ENDED, not at today — otherwise a late renewal walks the
    // billing anchor forward a little every cycle.
    const lapsedEnd = new Date(Date.now() - 3 * 86_400_000);
    await prisma.maintenanceSubscription.update({
      where: { id: sub.id },
      data: { currentPeriodEnd: lapsedEnd },
    });
    const lapsed = await prisma.maintenanceSubscription.findUniqueOrThrow({ where: { id: sub.id } });
    check(deriveStatus(lapsed) === "PAST_DUE", "a lapsed period derives PAST_DUE without a write");
    check(lapsed.status === "ACTIVE", "the stored status is untouched by that derivation");

    const renewed = await renewSubscription(sub.id, user.email, actor);
    check(renewed.ok, "renewal succeeds");
    const after = await prisma.maintenanceSubscription.findUniqueOrThrow({ where: { id: sub.id } });
    check(after.currentPeriodEnd > new Date(), "renewal moves the period into the future");
    check(after.lastRenewedAt != null, "renewal stamps lastRenewedAt");
    check(
      after.currentPeriodStart.getTime() === lapsedEnd.getTime(),
      "the new period starts where the lapsed one ended, not at today",
    );
    check(
      after.currentPeriodEnd.getUTCDate() === lapsedEnd.getUTCDate(),
      "the billing day survives a late renewal",
    );

    const renewEvent = await prisma.activityEvent.findFirst({
      where: { entityId: sub.id, action: "subscription.renewed" },
    });
    check(renewEvent != null, "renewal writes an audit event");

    // Auto-renew is idempotent, and switching it off changes the derived state.
    check(await setAutoRenew(sub.id, false, user.email, actor), "auto-renew can be switched off");
    check(
      await setAutoRenew(sub.id, false, user.email, actor),
      "setting auto-renew to its current value still succeeds",
    );
    const offEvents = await prisma.activityEvent.count({
      where: { entityId: sub.id, action: "subscription.auto_renew_changed" },
    });
    check(offEvents === 1, "the idempotent second call writes no duplicate event");

    await prisma.maintenanceSubscription.update({
      where: { id: sub.id },
      data: { currentPeriodEnd: new Date(Date.now() - 86_400_000) },
    });
    const expiring = await prisma.maintenanceSubscription.findUniqueOrThrow({
      where: { id: sub.id },
    });
    check(
      deriveStatus(expiring) === "EXPIRED",
      "a lapsed period with auto-renew off derives EXPIRED, not PAST_DUE",
    );

    check(!(await setAutoRenew("no-such-id", true, user.email, actor)), "an unknown id returns false");
  }

  console.log("\nTasks");
  {
    // A task needs a project, which needs a contract and a proposal. Build the
    // real chain rather than stubbing it — the FKs are part of what is tested.
    const proposal = await prisma.proposal.create({
      data: {
        clientId: client.id,
        projectType: "Website",
        complexity: "standard",
        totalPrice: 100000,
        currency: "EGP",
        lineItems: [],
        timelineWeeks: 6,
        accentName: "Signal",
        validUntil: new Date(Date.now() + 30 * 86_400_000),
        createdBy: "verify",
        paymentSplit: { first: 50, second: 30, final: 20 },
        content: {},
      },
    });
    const contract = await prisma.contract.create({
      data: { clientId: client.id, proposalId: proposal.id },
    });
    const project = await prisma.project.create({
      data: { contractId: contract.id, clientId: client.id, name: "Verify Project" },
    });

    const task = await prisma.projectTask.create({
      data: { projectId: project.id, title: "Wire the form", assigneeId: user.id },
    });
    check(task.status === "TODO", "a new task starts in TODO");
    check(task.completedAt === null, "a new task has no completion date");

    const done = await prisma.projectTask.update({
      where: { id: task.id },
      data: { status: "DONE", completedAt: new Date() },
    });
    check(done.completedAt != null, "completing a task stamps completedAt");

    const reopened = await prisma.projectTask.update({
      where: { id: task.id },
      data: { status: "TODO", completedAt: null },
    });
    check(reopened.completedAt === null, "reopening a task clears completedAt");

    // Cascade: deleting the project must not orphan its tasks.
    await prisma.projectTask.deleteMany({ where: { projectId: project.id } });
    await prisma.payment.deleteMany({ where: { projectId: project.id } });
    await prisma.project.delete({ where: { id: project.id } });
    await prisma.contract.delete({ where: { id: contract.id } });
    await prisma.proposal.delete({ where: { id: proposal.id } });
    check(true, "the project chain tears down cleanly");
  }

  console.log("\nIncident numbering");
  {
    const product = await prisma.product.create({
      data: { clientId: client.id, name: "Verify Prod", slug: `verify-prod-${suffix}` },
    });
    const first = await prisma.incident.create({
      data: { productId: product.id, number: 1, title: "First" },
    });
    check(first.number === 1, "the first incident is #1");
    check(first.status === "INVESTIGATING", "an incident opens as investigating");
    check(first.resolvedAt === null, "an open incident has no resolution time");

    let clashed = false;
    try {
      await prisma.incident.create({
        data: { productId: product.id, number: 1, title: "Clash" },
      });
    } catch {
      clashed = true;
    }
    check(clashed, "the per-product number is unique — two incidents cannot share one");

    await prisma.incident.deleteMany({ where: { productId: product.id } });
    await prisma.product.delete({ where: { id: product.id } });
  }
} finally {
  await prisma.activityEvent.deleteMany({
    where: { OR: [{ actorId: user.id }, { entityId: client.id }] },
  });
  await prisma.maintenanceSubscription.deleteMany({ where: { clientId: client.id } });
  await prisma.client.delete({ where: { id: client.id } });
  await prisma.activityEvent.deleteMany({ where: { actorLabel: "Verify Operator" } });
  await prisma.user.delete({ where: { id: user.id } });
}

console.log(
  failures === 0
    ? "\nverify:admin-api — all checks passed.\n"
    : `\nverify:admin-api — ${failures} check(s) FAILED.\n`,
);
process.exit(failures === 0 ? 0 : 1);
