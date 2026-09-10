import { prisma } from "@repo/database";
import { DELETABLES } from "../lib/deletable";

if (!process.env.DATABASE_URL) {
  console.log("verify:delete — skipped (no DATABASE_URL).");
  process.exit(0);
}

let failures = 0;
const check = (ok: boolean, what: string) => {
  console.log(`  ${ok ? "✓" : "✗"} ${what}`);
  if (!ok) failures++;
};

/** One existing id per entity, so `plan()` can be run against real shapes. */
const SAMPLE: Record<string, () => Promise<string | null>> = {
  client: async () =>
    (await prisma.client.findFirst({ select: { id: true } }))?.id ?? null,
  submission: async () =>
    (await prisma.contactSubmission.findFirst({ select: { id: true } }))?.id ??
    null,
  transparencyLead: async () =>
    (await prisma.transparencyLead.findFirst({ select: { id: true } }))?.id ??
    null,
  proposal: async () =>
    (await prisma.proposal.findFirst({ select: { id: true } }))?.id ?? null,
  contract: async () =>
    (await prisma.contract.findFirst({ select: { id: true } }))?.id ?? null,
  project: async () =>
    (await prisma.project.findFirst({ select: { id: true } }))?.id ?? null,
  payment: async () =>
    (await prisma.payment.findFirst({ select: { id: true } }))?.id ?? null,
  meeting: async () =>
    (await prisma.meeting.findFirst({ select: { id: true } }))?.id ?? null,
  task: async () =>
    (await prisma.projectTask.findFirst({ select: { id: true } }))?.id ?? null,
  product: async () =>
    (await prisma.product.findFirst({ select: { id: true } }))?.id ?? null,
  build: async () =>
    (await prisma.build.findFirst({ select: { id: true } }))?.id ?? null,
  deployment: async () =>
    (await prisma.deployment.findFirst({ select: { id: true } }))?.id ?? null,
  log: async () =>
    (await prisma.logEntry.findFirst({ select: { id: true } }))?.id ?? null,
  incident: async () =>
    (await prisma.incident.findFirst({ select: { id: true } }))?.id ?? null,
  maintenanceSubscription: async () =>
    (await prisma.maintenanceSubscription.findFirst({ select: { id: true } }))
      ?.id ?? null,
  maintenanceRequest: async () =>
    (await prisma.maintenanceRequest.findFirst({ select: { id: true } }))?.id ??
    null,
  note: async () =>
    (await prisma.contactNote.findFirst({ select: { id: true } }))?.id ?? null,
  notification: async () =>
    (await prisma.notification.findFirst({ select: { id: true } }))?.id ?? null,
  user: async () =>
    (await prisma.user.findFirst({ select: { id: true } }))?.id ?? null,
};

async function readOnlyPass() {
  console.log("\nplan() against existing rows");

  for (const entity of Object.keys(DELETABLES)) {
    const sample = SAMPLE[entity];
    if (!sample) {
      check(false, `${entity} — no sample query registered in this script`);
      continue;
    }
    const id = await sample();
    if (!id) {
      console.log(`  · ${entity} — no rows to sample`);
      continue;
    }
    try {
      const plan = await DELETABLES[entity]!.plan(id);
      const ok =
        plan !== null &&
        typeof plan.label === "string" &&
        Array.isArray(plan.impact);
      const detail = plan
        ? `${plan.label.slice(0, 40)}${plan.impact.length ? ` · takes ${plan.impact.map((i) => `${i.count} ${i.label.toLowerCase()}`).join(", ")}` : ""}${plan.block ? ` · BLOCKED (${plan.block.hard ? "hard" : "soft"})` : ""}`
        : "returned null for an id that exists";
      check(ok, `${entity} — ${detail}`);
    } catch (error) {
      check(
        false,
        `${entity} — ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  // A missing row must read as "already gone", not throw.
  const gone = await DELETABLES.client!.plan(
    "00000000-0000-4000-8000-000000000000",
  );
  check(
    gone === null,
    "plan() on an unknown id returns null rather than throwing",
  );
}

async function cascadePass() {
  console.log("\ncascade (fixtures)");
  const stamp = `verify-delete-${Date.now()}`;

  const client = await prisma.client.create({
    data: {
      name: stamp,
      phone: `+2000${Date.now() % 100000000}`,
      source: "MANUAL",
    },
    select: { id: true },
  });
  const proposal = await prisma.proposal.create({
    data: {
      clientId: client.id,
      projectType: "website",
      complexity: "standard",
      totalPrice: 1,
      lineItems: [],
      timelineWeeks: 1,
      accentName: "test",
      validUntil: new Date(Date.now() + 86_400_000),
      createdBy: stamp,
    },
    select: { id: true },
  });
  const contract = await prisma.contract.create({
    data: {
      proposalId: proposal.id,
      clientId: client.id,
      status: "SIGNED",
      signedAt: new Date(),
    },
    select: { id: true },
  });
  const project = await prisma.project.create({
    data: { contractId: contract.id, clientId: client.id, name: stamp },
    select: { id: true },
  });
  await prisma.payment.create({
    data: { projectId: project.id, milestone: "DEPOSIT_50", amount: 1 },
  });
  await prisma.projectTask.create({
    data: { projectId: project.id, title: stamp },
  });

  const plan = await DELETABLES.client!.plan(client.id);
  check(plan !== null, "the fixture client has a plan");
  const count = (label: string) =>
    plan?.impact.find((i) => i.label === label)?.count ?? 0;
  check(
    count("Proposals") === 1,
    `plan counts 1 proposal (saw ${count("Proposals")})`,
  );
  check(
    count("Contracts") === 1,
    `plan counts 1 contract (saw ${count("Contracts")})`,
  );
  check(
    count("Projects") === 1,
    `plan counts 1 project (saw ${count("Projects")})`,
  );
  check(
    count("Payments") === 1,
    `plan counts 1 payment (saw ${count("Payments")})`,
  );
  check(
    count("Delivery tasks") === 1,
    `plan counts 1 task (saw ${count("Delivery tasks")})`,
  );
  check(
    plan?.block != null && plan.block.hard === false,
    "a signed contract makes the client a soft block, not a hard one",
  );

  const contractPlan = await DELETABLES.contract!.plan(contract.id);
  check(
    contractPlan?.block != null,
    "a signed contract blocks its own deletion",
  );

  await DELETABLES.client!.remove(client.id);

  check(
    (await prisma.client.count({ where: { id: client.id } })) === 0,
    "client is gone",
  );
  check(
    (await prisma.proposal.count({ where: { clientId: client.id } })) === 0,
    "proposal is gone",
  );
  check(
    (await prisma.contract.count({ where: { clientId: client.id } })) === 0,
    "contract is gone",
  );
  check(
    (await prisma.project.count({ where: { id: project.id } })) === 0,
    "project is gone",
  );
  check(
    (await prisma.payment.count({ where: { projectId: project.id } })) === 0,
    "payments are gone",
  );
  check(
    (await prisma.projectTask.count({ where: { projectId: project.id } })) ===
      0,
    "tasks are gone",
  );
}

async function main() {
  await readOnlyPass();
  if (process.env.DELETE_FIXTURES === "1") await cascadePass();
  else
    console.log(
      "\ncascade (fixtures) — skipped (set DELETE_FIXTURES=1 to run)",
    );

  console.log(
    failures === 0
      ? "\nverify:delete — all checks passed"
      : `\nverify:delete — ${failures} failed`,
  );
  await prisma.$disconnect();
  process.exit(failures === 0 ? 0 : 1);
}

void main();
