import { prisma } from "@repo/database";
import { createHmac } from "node:crypto";
import { POST as ingestBuild } from "../app/api/ingest/builds/route";
import { POST as ingestDeployment } from "../app/api/ingest/deployments/route";
import { POST as githubWebhook } from "../app/api/ingest/github/route";
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

    const second = await post(ingestBuild, issued.token, {
      externalId: "run-2",
      status: "FAILED",
      failureReason: "Type error in checkout",
    });
    const secondJson = (await second.json()) as { build: { number: number } };
    check(secondJson.build.number === 2, "the next build is #2");

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

  console.log("\nGitHub webhook");
  {
    const secret = `verify-github-secret-${suffix}`;
    const repo = `altruvex-verify/site-${suffix}`;
    await prisma.product.update({
      where: { id: product.id },
      data: { repositoryUrl: `https://github.com/${repo}.git` },
    });

    const ghPost = (event: string, payload: unknown, signWith?: string) => {
      const raw = JSON.stringify(payload);
      const headers: Record<string, string> = {
        "content-type": "application/json",
        "x-github-event": event,
        "x-github-delivery": `verify-${Date.now()}`,
      };
      if (signWith) {
        headers["x-hub-signature-256"] =
          `sha256=${createHmac("sha256", signWith).update(raw, "utf8").digest("hex")}`;
      }
      return githubWebhook(
        new Request("https://admin.local/api/ingest/github", {
          method: "POST",
          headers,
          body: raw,
        }),
      );
    };

    const repository = { full_name: repo, default_branch: "main" };
    const workflowRun = (
      id: number,
      status: string,
      conclusion: string | null,
      branch = "main",
    ) => ({
      action: status === "completed" ? "completed" : "requested",
      repository,
      sender: { login: "ali" },
      workflow_run: {
        id,
        name: "Deploy",
        head_branch: branch,
        head_sha: "9f2c1ab",
        status,
        conclusion,
        run_started_at: new Date(Date.now() - 60_000).toISOString(),
        updated_at: new Date().toISOString(),
        actor: { login: "ali" },
        head_commit: { message: "Fix the checkout currency field\n\nlonger body" },
      },
    });

    delete process.env.GITHUB_WEBHOOK_SECRET;
    const unconfigured = await ghPost("ping", { zen: "hi", repository }, secret);
    check(
      unconfigured.status === 503,
      "with no secret configured the receiver refuses rather than accepting unsigned writes",
    );

    process.env.GITHUB_WEBHOOK_SECRET = secret;

    const unsigned = await ghPost("workflow_run", workflowRun(5001, "completed", "success"));
    check(unsigned.status === 401, "an unsigned delivery is refused");

    const wrongSignature = await ghPost(
      "workflow_run",
      workflowRun(5001, "completed", "success"),
      "not-the-secret",
    );
    check(wrongSignature.status === 401, "a delivery signed with the wrong secret is refused");

    const ping = await ghPost("ping", { zen: "hi", repository }, secret);
    check(ping.status === 200, "a signed ping is acknowledged");

    const unknownRepo = await ghPost(
      "workflow_run",
      { ...workflowRun(5001, "completed", "success"), repository: { full_name: `nobody/none-${suffix}`, default_branch: "main" } },
      secret,
    );
    check(unknownRepo.status === 404, "an event for a repository no product names is refused");

    const failed = await ghPost("workflow_run", workflowRun(5001, "completed", "failure"), secret);
    check(failed.status === 200, "a signed workflow_run is accepted");
    const failedRow = await prisma.build.findUnique({
      where: {
        productId_externalId: { productId: product.id, externalId: "gh-run-5001" },
      },
    });
    check(failedRow?.status === "FAILED", "a failed conclusion is recorded as a failed build");
    check(
      failedRow?.environment === "PRODUCTION",
      "a run on the default branch is a production build",
    );
    check(
      failedRow?.commitMessage === "Fix the checkout currency field",
      "only the commit subject is stored, not the whole message body",
    );
    check(
      (failedRow?.failureReason ?? "").includes("failure"),
      "the failure reason quotes GitHub's conclusion rather than inventing a cause",
    );

    const rerun = await ghPost("workflow_run", workflowRun(5001, "completed", "success"), secret);
    check(rerun.status === 200, "a re-run of the same workflow run is accepted");
    const rerunRow = await prisma.build.findUnique({
      where: {
        productId_externalId: { productId: product.id, externalId: "gh-run-5001" },
      },
    });
    check(rerunRow?.id === failedRow?.id, "a re-run updates the same build rather than adding one");
    check(rerunRow?.status === "SUCCEEDED", "the re-run's conclusion replaced the old one");
    check(
      rerunRow?.failureReason === null,
      "a build retried into success stops showing why it failed before",
    );

    await ghPost("workflow_run", workflowRun(5002, "completed", "success", "feature/x"), secret);
    const previewRow = await prisma.build.findUnique({
      where: {
        productId_externalId: { productId: product.id, externalId: "gh-run-5002" },
      },
    });
    check(
      previewRow?.environment === "PREVIEW",
      "a run on a non-default branch is not filed as production",
    );

    await ghPost("workflow_run", workflowRun(5003, "completed", "cancelled"), secret);
    const cancelledRow = await prisma.build.findUnique({
      where: {
        productId_externalId: { productId: product.id, externalId: "gh-run-5003" },
      },
    });
    check(
      cancelledRow?.status === "CANCELLED",
      "a cancelled run is not reported as a failure nobody caused",
    );

    const deploymentEvent = (state: string, environment: string, url?: string) => ({
      action: "created",
      repository,
      sender: { login: "ali" },
      deployment: {
        id: 7001,
        sha: "9f2c1ab",
        ref: "main",
        environment,
        creator: { login: "ali" },
        created_at: new Date(Date.now() - 30_000).toISOString(),
      },
      deployment_status: {
        state,
        description: state === "failure" ? "Build step exited 1" : "Deployment finished",
        environment,
        environment_url: url ?? null,
        updated_at: new Date().toISOString(),
        creator: { login: "ali" },
      },
    });

    const deployed = await ghPost(
      "deployment_status",
      deploymentEvent("success", "Production", "https://verify-site.example.com"),
      secret,
    );
    check(deployed.status === 200, "a signed deployment_status is accepted");
    const deploymentRow = await prisma.deployment.findUnique({
      where: {
        productId_externalId: { productId: product.id, externalId: "gh-deployment-7001" },
      },
    });
    check(deploymentRow?.status === "SUCCEEDED", "the deployment was recorded");
    check(
      deploymentRow?.environment === "PRODUCTION",
      "GitHub's free-text environment name maps onto ours",
    );
    const afterDeploy = await prisma.product.findUnique({ where: { id: product.id } });
    check(
      afterDeploy?.productionUrl === "https://verify-site.example.com",
      "a successful production deployment moves the product's recorded live URL",
    );

    const beforeInactive = await prisma.deployment.count({ where: { productId: product.id } });
    const inactive = await ghPost(
      "deployment_status",
      deploymentEvent("inactive", "Production"),
      secret,
    );
    const afterInactive = await prisma.deployment.count({ where: { productId: product.id } });
    check(inactive.status === 200, "a state we do not act on is acknowledged, not rejected");
    check(
      afterInactive === beforeInactive,
      "an inactive status writes nothing — being superseded is not a rollback",
    );

    const ignoredEvent = await ghPost("push", { repository }, secret);
    check(
      ignoredEvent.status === 200,
      "an event we do not read is acknowledged so GitHub's delivery log stays green",
    );

    // Two products naming one repository: the receiver must refuse rather than
    // file one product's history under another.
    await prisma.product.update({
      where: { id: otherProduct.id },
      data: { repositoryUrl: `git@github.com:${repo}.git` },
    });
    const ambiguous = await ghPost(
      "workflow_run",
      workflowRun(5004, "completed", "success"),
      secret,
    );
    check(ambiguous.status === 409, "a repository claimed by two products is refused, not guessed");
    await prisma.product.update({
      where: { id: otherProduct.id },
      data: { repositoryUrl: null },
    });

    const ghEvents = await prisma.activityEvent.findMany({
      where: { metadata: { path: ["productSlug"], equals: product.slug }, actorLabel: { startsWith: "GitHub · " } },
    });
    check(
      ghEvents.length > 0,
      "GitHub-written events are attributed to GitHub, not to the CI token",
    );

    delete process.env.GITHUB_WEBHOOK_SECRET;
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
