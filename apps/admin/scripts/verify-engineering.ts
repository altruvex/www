/**
 * End-to-end checks for the engineering-operations pipeline.
 *
 * Calls the real `/api/ingest/*` route handlers with real Requests against a
 * real database, because "the deployment page renders" is not evidence that a
 * deployment can be recorded (§18). Asserts the things that are easy to get
 * quietly wrong: per-product numbering under contention, idempotent re-posts,
 * token scoping, and the product-status write that a successful production
 * deploy performs.
 *
 *   cd apps/admin && DATABASE_URL=... bun run verify:engineering
 *
 * Writes and then removes its own records; point it at a scratch database.
 */
import { prisma } from "@repo/database";

import { POST as ingestBuild } from "../app/api/ingest/builds/route";
import { POST as ingestDeployment } from "../app/api/ingest/deployments/route";
import { POST as ingestLogs } from "../app/api/ingest/logs/route";
import { issueToken } from "../lib/ingest-auth";

if (!process.env.DATABASE_URL) {
  console.log("verify:engineering — skipped (no DATABASE_URL).");
  process.exit(0);
}

let failures = 0;
const check = (ok: boolean, what: string) => {
  console.log(`  ${ok ? "✓" : "✗"} ${what}`);
  if (!ok) failures++;
};

const suffix = Date.now().toString().slice(-8);
const post = (handler: (r: Request) => Promise<Response>, token: string, body: unknown) =>
  handler(
    new Request("https://admin.local/api/ingest", {
      method: "POST",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify(body),
    }),
  );

const client = await prisma.client.create({
  data: { name: "Verify Eng", phone: `+2015551${suffix.slice(-4)}`, company: "Verify Eng Co" },
});

const issued = issueToken();
const product = await prisma.product.create({
  data: {
    clientId: client.id,
    name: "Verify Site",
    slug: `verify-site-${suffix}`,
    kind: "WEBSITE",
    status: "PLANNED",
    ingestTokenHash: issued.hash,
    ingestTokenLast4: issued.last4,
    ingestTokenIssuedAt: new Date(),
  },
});

// A second product, to prove a token cannot write across the boundary.
const otherIssued = issueToken();
const otherProduct = await prisma.product.create({
  data: {
    clientId: client.id,
    name: "Other Site",
    slug: `other-site-${suffix}`,
    ingestTokenHash: otherIssued.hash,
    ingestTokenLast4: otherIssued.last4,
  },
});

try {
  console.log("\nAuthentication");
  {
    const noToken = await ingestBuild(
      new Request("https://admin.local/api/ingest/builds", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: "SUCCEEDED" }),
      }),
    );
    check(noToken.status === 401, "a request with no token is refused");

    const badToken = await post(ingestBuild, "avx_ingest_totally-made-up", { status: "SUCCEEDED" });
    check(badToken.status === 401, "an unknown token is refused");

    const nonPrefixed = await post(ingestBuild, "some-other-secret", { status: "SUCCEEDED" });
    check(nonPrefixed.status === 401, "a token without the ingest prefix is refused");
  }

  console.log("\nBuild ingest");
  {
    const res = await post(ingestBuild, issued.token, {
      externalId: "run-1",
      status: "RUNNING",
      branch: "main",
      commitSha: "abc123",
      commitMessage: "Initial",
      triggeredBy: "github-actions",
    });
    const json = (await res.json()) as { build: { id: string; number: number } };
    check(res.status === 200, "a running build is accepted");
    check(json.build.number === 1, "the first build for a product is #1");

    // Same externalId again: must update, not duplicate.
    const done = await post(ingestBuild, issued.token, {
      externalId: "run-1",
      status: "SUCCEEDED",
    });
    const doneJson = (await done.json()) as { build: { id: string; number: number } };
    check(doneJson.build.id === json.build.id, "re-posting the same externalId updates one row");
    check(doneJson.build.number === 1, "the build number is not reallocated on update");

    const count = await prisma.build.count({ where: { productId: product.id } });
    check(count === 1, "no duplicate build row was created");

    const stored = await prisma.build.findUnique({ where: { id: json.build.id } });
    check(stored?.status === "SUCCEEDED", "the status transition was persisted");
    check(stored?.branch === "main", "a field omitted from the later post is preserved");
    check(stored?.finishedAt != null, "a terminal status stamps finishedAt");
    check((stored?.durationMs ?? 0) >= 0, "duration is computed from start and finish");

    // A second build gets the next number.
    const second = await post(ingestBuild, issued.token, {
      externalId: "run-2",
      status: "FAILED",
      failureReason: "Type error in checkout",
    });
    const secondJson = (await second.json()) as { build: { number: number } };
    check(secondJson.build.number === 2, "the next build is #2");

    // Numbering is per product, not global.
    const otherFirst = await post(ingestBuild, otherIssued.token, {
      externalId: "run-1",
      status: "SUCCEEDED",
    });
    const otherJson = (await otherFirst.json()) as { build: { number: number } };
    check(otherJson.build.number === 1, "numbering restarts per product");

    const leaked = await prisma.build.count({ where: { productId: otherProduct.id } });
    check(leaked === 1, "a token only writes to its own product");
  }

  console.log("\nDeployment ingest");
  {
    const res = await post(ingestDeployment, issued.token, {
      externalId: "dpl-1",
      status: "SUCCEEDED",
      environment: "PRODUCTION",
      version: "1.0.0",
      url: "https://verify.example.com",
      buildExternalId: "run-1",
      triggeredBy: "github-actions",
    });
    const json = (await res.json()) as { deployment: { id: string; number: number } };
    check(res.status === 200, "a deployment is accepted");
    check(json.deployment.number === 1, "the first deployment is #1");

    const stored = await prisma.deployment.findUnique({
      where: { id: json.deployment.id },
      include: { build: true },
    });
    check(stored?.build?.externalId === "run-1", "the deployment is linked to its build");

    const refreshed = await prisma.product.findUnique({ where: { id: product.id } });
    check(
      refreshed?.productionUrl === "https://verify.example.com",
      "a successful production deploy records the live URL",
    );
    check(refreshed?.status === "LIVE", "a successful production deploy marks the product LIVE");

    // Rollback: the superseded deployment must show what undid it.
    const rollback = await post(ingestDeployment, issued.token, {
      externalId: "dpl-2",
      status: "SUCCEEDED",
      environment: "PRODUCTION",
      version: "0.9.0",
      rollbackOfNumber: 1,
    });
    const rollbackJson = (await rollback.json()) as { deployment: { id: string } };
    const superseded = await prisma.deployment.findUnique({ where: { id: json.deployment.id } });
    check(superseded?.status === "ROLLED_BACK", "the superseded deployment is marked rolled back");
    check(
      superseded?.rolledBackById === rollbackJson.deployment.id,
      "the superseded deployment points at the one that replaced it",
    );

    // Staging must not touch the production URL.
    await post(ingestDeployment, issued.token, {
      externalId: "dpl-3",
      status: "SUCCEEDED",
      environment: "STAGING",
      url: "https://staging.example.com",
    });
    const afterStaging = await prisma.product.findUnique({ where: { id: product.id } });
    check(
      afterStaging?.productionUrl === "https://verify.example.com",
      "a staging deploy leaves the production URL alone",
    );
    check(
      afterStaging?.stagingUrl === "https://staging.example.com",
      "a staging deploy records the staging URL",
    );
  }

  console.log("\nLog ingest");
  {
    const res = await post(ingestLogs, issued.token, {
      entries: [
        { level: "INFO", message: "Boot", source: "web", requestId: "req-1" },
        {
          level: "ERROR",
          message: "Checkout failed",
          source: "web",
          requestId: "req-1",
          deploymentExternalId: "dpl-1",
          metadata: { orderId: "A-1" },
        },
      ],
    });
    const json = (await res.json()) as { ingested: number };
    check(res.status === 200 && json.ingested === 2, "a batch of log lines is accepted");

    const errors = await prisma.logEntry.findMany({
      where: { productId: product.id, level: "ERROR" },
      include: { deployment: true },
    });
    check(errors.length === 1, "the error line is queryable by level");
    check(errors[0]?.deployment?.externalId === "dpl-1", "a log line resolves its deployment link");

    const byRequest = await prisma.logEntry.count({
      where: { productId: product.id, requestId: "req-1" },
    });
    check(byRequest === 2, "a whole trace is retrievable by request id");

    const tooMany = await post(ingestLogs, issued.token, {
      entries: Array.from({ length: 501 }, () => ({ level: "INFO", message: "x" })),
    });
    check(tooMany.status === 400, "a batch over the cap is refused rather than truncated");
  }

  console.log("\nActivity trail");
  {
    const events = await prisma.activityEvent.findMany({
      where: { metadata: { path: ["productSlug"], equals: product.slug } },
      orderBy: { createdAt: "asc" },
    });
    const actions = events.map((e) => e.action);
    check(actions.includes("build.succeeded"), "a succeeded build writes an activity event");
    check(actions.includes("build.failed"), "a failed build writes an activity event");
    check(
      actions.includes("deployment.succeeded"),
      "a deployment writes an activity event",
    );
    check(
      !actions.includes("build.running"),
      "a non-terminal build status writes no event (the feed is not a heartbeat)",
    );
    check(
      events.every((e) => e.actorKind === "INTEGRATION"),
      "CI-written events are attributed to an integration, not a user",
    );
    check(
      events.every((e) => !JSON.stringify(e.metadata ?? {}).includes(issued.token)),
      "no ingest token leaked into an activity payload",
    );
  }
} finally {
  // Cascades clear builds, deployments, logs and incidents.
  await prisma.activityEvent.deleteMany({
    where: { entityType: { in: ["build", "deployment", "product", "incident"] } },
  });
  await prisma.product.deleteMany({ where: { clientId: client.id } });
  await prisma.client.delete({ where: { id: client.id } });
}

console.log(
  failures === 0
    ? "\nverify:engineering — all checks passed.\n"
    : `\nverify:engineering — ${failures} check(s) FAILED.\n`,
);
process.exit(failures === 0 ? 0 : 1);
