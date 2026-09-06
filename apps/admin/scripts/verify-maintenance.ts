/**
 * End-to-end maintenance checks against a real database.
 *
 * The client portal and the admin screen compute allowance usage from the same
 * cycle logic and the same resolved plan. If they ever disagree, a client is
 * told one thing and billed another — so the agreement is asserted here rather
 * than assumed from the fact that both call the same helper.
 *
 * Needs a database. Skips cleanly without one, so it can sit in a pipeline that
 * does not always have Postgres:
 *
 *   cd apps/admin && DATABASE_URL=... bun run verify:maintenance
 *
 * It writes and then removes its own records; point it at a scratch database.
 */
import { prisma } from "@repo/database";
import {
  createSubscription,
  listSubscriptions,
  setRequestBilling,
  setRequestStatus,
  setSubscriptionStatus,
} from "../lib/maintenance-admin";
import { loadPortal, submitRequest } from "../lib/client-portal";

if (!process.env.DATABASE_URL) {
  console.log("verify:maintenance — skipped (no DATABASE_URL).");
  process.exit(0);
}

let failures = 0;
const check = (ok: boolean, what: string) => {
  console.log(`  ${ok ? "✓" : "✗"} ${what}`);
  if (!ok) failures++;
};

const phone = `+2015550${Date.now().toString().slice(-5)}`;
const client = await prisma.client.create({
  data: { name: "Verify", phone, company: "Verify Co" },
});

try {
  console.log("\nMaintenance, end to end\n" + "=".repeat(64));

  console.log("\n[1] Retainers");
  check((await createSubscription(client.id, "essential", "verify")).ok, "a retainer can be started");
  check(
    !(await createSubscription(client.id, "professional", "verify")).ok,
    "a second live retainer for the same client is refused",
  );

  const subs = await listSubscriptions();
  const sub = subs.find((s) => s.clientId === client.id)!;
  check(
    sub.planName === "Essential" && sub.requestsPerCycle === 2,
    `plan and cap resolve from the pricing schema (${sub.planName}, cap ${sub.requestsPerCycle})`,
  );

  console.log("\n[2] The cap, from both sides");
  for (const title of ["Hero image", "Footer text", "A whole new page"]) {
    await submitRequest(sub.portalToken, title, null);
  }
  let admin = (await listSubscriptions()).find((s) => s.clientId === client.id)!;
  let portal = await loadPortal(sub.portalToken);
  check(admin.requestsUsed === 2 && admin.requests.length === 3, "a third request does not count against a cap of 2");
  check(portal!.requestsUsed === admin.requestsUsed, "admin and the client portal report the same usage");

  console.log("\n[3] Status transitions");
  const target = admin.requests[admin.requests.length - 1]!;
  await setRequestStatus(target.id, "COMPLETED", "verify");
  admin = (await listSubscriptions()).find((s) => s.clientId === client.id)!;
  check(admin.requests.find((r) => r.id === target.id)!.completedAt !== null, "completing stamps a completion date");
  await setRequestStatus(target.id, "IN_PROGRESS", "verify");
  admin = (await listSubscriptions()).find((s) => s.clientId === client.id)!;
  check(admin.requests.find((r) => r.id === target.id)!.completedAt === null, "reopening clears it again");

  console.log("\n[4] Reclassifying what a client is billed for");
  await setRequestBilling(target.id, false, "verify");
  admin = (await listSubscriptions()).find((s) => s.clientId === client.id)!;
  portal = await loadPortal(sub.portalToken);
  check(admin.requestsUsed === 1, "marking a request as overage returns its allowance");
  check(portal!.requestsRemaining === 1, "the client sees that immediately");

  const log = await prisma.pricingChangeLog.findMany({
    where: { entityType: { startsWith: "maintenance" }, changedBy: "verify" },
  });
  check(log.length >= 3, `status and billing changes are recorded (${log.length} entries)`);
  check(log.every((l) => l.changedBy === "verify"), "each entry records who made the change");

  console.log("\n[5] Cancellation");
  await setSubscriptionStatus(sub.id, "CANCELLED", "verify");
  check((await loadPortal(sub.portalToken)) === null, "a cancelled retainer revokes its portal link");
  check(!(await submitRequest(sub.portalToken, "after cancellation", null)).ok, "and refuses new requests");
} finally {
  // Cascades remove the subscription and its requests with the client.
  await prisma.pricingChangeLog.deleteMany({ where: { changedBy: "verify" } });
  await prisma.client.delete({ where: { id: client.id } }).catch(() => {});
  await prisma.$disconnect();
}

console.log("\n" + "=".repeat(64));
console.log(failures === 0 ? "All maintenance checks passed.\n" : `${failures} failed.\n`);
process.exit(failures === 0 ? 0 : 1);
