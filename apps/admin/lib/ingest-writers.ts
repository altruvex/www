import { prisma, type Build, type Deployment, type Product } from "@repo/database";

import type { Actor } from "@/lib/activity-log";
import { ingestActor, nextNumber, recordActivity } from "@/lib/ingest";

/**
 * The only writers of build and deployment rows (§7).
 *
 * Two callers reach them: the token-authenticated `/api/ingest/*` endpoints a
 * pipeline posts to by hand, and the GitHub webhook receiver, which is the same
 * evidence arriving in GitHub's vocabulary instead of ours. Both must produce
 * an identical row, so the upsert, the numbering, the coalescing rules and the
 * product-status side effect live here once rather than being reimplemented per
 * transport — two copies of this logic would drift within a release, and the
 * screens that read these tables would start disagreeing about what shipped.
 */

export type BuildStatusInput = "QUEUED" | "RUNNING" | "SUCCEEDED" | "FAILED" | "CANCELLED";
export type DeploymentStatusInput =
  | "PENDING"
  | "IN_PROGRESS"
  | "SUCCEEDED"
  | "FAILED"
  | "ROLLED_BACK";
export type EnvironmentInput = "PRODUCTION" | "STAGING" | "PREVIEW";

export const BUILD_TERMINAL = new Set<BuildStatusInput>(["SUCCEEDED", "FAILED", "CANCELLED"]);
export const DEPLOYMENT_TERMINAL = new Set<DeploymentStatusInput>([
  "SUCCEEDED",
  "FAILED",
  "ROLLED_BACK",
]);

export interface BuildInput {
  externalId?: string;
  status: BuildStatusInput;
  environment: EnvironmentInput;
  commitSha?: string;
  commitMessage?: string;
  branch?: string;
  triggeredBy?: string;
  startedAt?: Date;
  finishedAt?: Date;
  durationMs?: number;
  failureReason?: string;
}

export interface DeploymentInput {
  externalId?: string;
  status: DeploymentStatusInput;
  environment: EnvironmentInput;
  version?: string;
  commitSha?: string;
  url?: string;
  triggeredBy?: string;
  buildExternalId?: string;
  startedAt?: Date;
  finishedAt?: Date;
  failureReason?: string;
  rollbackOfNumber?: number;
}

/**
 * Prisma's default interactive-transaction timeout is five seconds, measured
 * from the moment the transaction opens.
 *
 * That is generous for three local round trips and not generous at all for
 * three trips to a serverless Postgres that suspends when idle: the first query
 * after a suspension pays the wake-up, and the whole budget is gone before any
 * real work happens. The row lock these transactions hold is on one product for
 * the length of one insert, so a longer ceiling costs nothing and removes a
 * failure that only ever appears on the first build after a quiet hour.
 */
const TRANSACTION_OPTIONS = { timeout: 20_000, maxWait: 15_000 } as const;

export async function writeBuild(product: Product, body: BuildInput): Promise<Build> {
  return prisma.$transaction(async (tx) => {
    // `externalId` is the idempotency key. Without one every post is a new
    // build, which is the correct reading of "the caller gave us nothing to
    // match on" — better than guessing by commit SHA and merging two genuinely
    // separate runs of the same commit.
    const existing = body.externalId
      ? await tx.build.findUnique({
          where: {
            productId_externalId: { productId: product.id, externalId: body.externalId },
          },
        })
      : null;

    const finishedAt =
      body.finishedAt ??
      (BUILD_TERMINAL.has(body.status) ? (existing?.finishedAt ?? new Date()) : null);

    if (existing) {
      return tx.build.update({
        where: { id: existing.id },
        data: {
          status: body.status,
          environment: body.environment,
          // Coalesce rather than overwrite: a later post that omits a field is
          // reporting progress, not clearing what an earlier post established.
          commitSha: body.commitSha ?? existing.commitSha,
          commitMessage: body.commitMessage ?? existing.commitMessage,
          branch: body.branch ?? existing.branch,
          triggeredBy: body.triggeredBy ?? existing.triggeredBy,
          startedAt: body.startedAt ?? existing.startedAt,
          finishedAt,
          durationMs:
            body.durationMs ??
            (finishedAt && existing.startedAt
              ? finishedAt.getTime() - existing.startedAt.getTime()
              : existing.durationMs),
          // Cleared on a non-failing status: a build that was retried into
          // success must not keep displaying the reason it failed before.
          failureReason:
            body.status === "FAILED" ? (body.failureReason ?? existing.failureReason) : null,
        },
      });
    }

    const startedAt = body.startedAt ?? new Date();
    return tx.build.create({
      data: {
        productId: product.id,
        number: await nextNumber(tx, "builds", product.id),
        externalId: body.externalId ?? null,
        status: body.status,
        environment: body.environment,
        commitSha: body.commitSha ?? null,
        commitMessage: body.commitMessage ?? null,
        branch: body.branch ?? null,
        triggeredBy: body.triggeredBy ?? null,
        startedAt,
        finishedAt,
        durationMs:
          body.durationMs ?? (finishedAt ? finishedAt.getTime() - startedAt.getTime() : null),
        failureReason: body.status === "FAILED" ? (body.failureReason ?? null) : null,
      },
    });
  }, TRANSACTION_OPTIONS);
}

/**
 * Only terminal transitions are worth an activity line — a build posting
 * RUNNING every ten seconds would otherwise drown the feed.
 */
export async function announceBuild(
  product: Product,
  build: Build,
  status: BuildStatusInput,
  actor: Actor = ingestActor(product),
): Promise<void> {
  if (!BUILD_TERMINAL.has(status)) return;
  await recordActivity({
    action: `build.${status.toLowerCase()}`,
    actor,
    entityType: "build",
    entityId: build.id,
    entityLabel: `${product.name} build #${build.number}`,
    summary:
      status === "SUCCEEDED"
        ? `Build #${build.number} succeeded on ${build.branch ?? "an unnamed branch"}`
        : `Build #${build.number} ${status.toLowerCase()}${build.failureReason ? `: ${build.failureReason}` : ""}`,
    metadata: {
      productSlug: product.slug,
      environment: build.environment,
      commitSha: build.commitSha,
    },
  });
}

export async function writeDeployment(
  product: Product,
  body: DeploymentInput,
): Promise<Deployment> {
  return prisma.$transaction(async (tx) => {
    const build = body.buildExternalId
      ? await tx.build.findUnique({
          where: {
            productId_externalId: {
              productId: product.id,
              externalId: body.buildExternalId,
            },
          },
          select: { id: true },
        })
      : null;

    const existing = body.externalId
      ? await tx.deployment.findUnique({
          where: {
            productId_externalId: { productId: product.id, externalId: body.externalId },
          },
        })
      : null;

    const finishedAt =
      body.finishedAt ??
      (DEPLOYMENT_TERMINAL.has(body.status) ? (existing?.finishedAt ?? new Date()) : null);

    const common = {
      status: body.status,
      environment: body.environment,
      version: body.version ?? existing?.version ?? null,
      commitSha: body.commitSha ?? existing?.commitSha ?? null,
      url: body.url ?? existing?.url ?? null,
      triggeredBy: body.triggeredBy ?? existing?.triggeredBy ?? null,
      buildId: build?.id ?? existing?.buildId ?? null,
      startedAt: body.startedAt ?? existing?.startedAt ?? new Date(),
      finishedAt,
      failureReason: body.status === "FAILED" ? (body.failureReason ?? null) : null,
    };

    const row = existing
      ? await tx.deployment.update({ where: { id: existing.id }, data: common })
      : await tx.deployment.create({
          data: {
            ...common,
            productId: product.id,
            number: await nextNumber(tx, "deployments", product.id),
            externalId: body.externalId ?? null,
          },
        });

    // A rollback names the deployment it replaced, so the superseded row can
    // show what undid it rather than just going quiet.
    if (body.rollbackOfNumber != null) {
      const superseded = await tx.deployment.findUnique({
        where: {
          productId_number: { productId: product.id, number: body.rollbackOfNumber },
        },
        select: { id: true },
      });
      if (superseded && superseded.id !== row.id) {
        await tx.deployment.update({
          where: { id: superseded.id },
          data: { rolledBackById: row.id, status: "ROLLED_BACK" },
        });
      }
    }

    // A live production deployment is the only trustworthy evidence of what a
    // product's URL and status actually are.
    if (body.status === "SUCCEEDED" && body.environment === "PRODUCTION") {
      await tx.product.update({
        where: { id: product.id },
        data: {
          productionUrl: body.url ?? product.productionUrl,
          status: product.status === "LIVE" ? product.status : "LIVE",
        },
      });
    } else if (body.status === "SUCCEEDED" && body.environment === "STAGING" && body.url) {
      await tx.product.update({
        where: { id: product.id },
        data: { stagingUrl: body.url },
      });
    }

    return row;
  }, TRANSACTION_OPTIONS);
}

export async function announceDeployment(
  product: Product,
  deployment: Deployment,
  status: DeploymentStatusInput,
  actor: Actor = ingestActor(product),
): Promise<void> {
  if (!DEPLOYMENT_TERMINAL.has(status)) return;
  await recordActivity({
    action: `deployment.${status.toLowerCase()}`,
    actor,
    entityType: "deployment",
    entityId: deployment.id,
    entityLabel: `${product.name} deployment #${deployment.number}`,
    summary:
      status === "SUCCEEDED"
        ? `Deployed ${product.name} #${deployment.number} to ${deployment.environment.toLowerCase()}`
        : `Deployment #${deployment.number} to ${deployment.environment.toLowerCase()} ${status === "ROLLED_BACK" ? "was rolled back" : "failed"}${deployment.failureReason ? `: ${deployment.failureReason}` : ""}`,
    metadata: {
      productSlug: product.slug,
      environment: deployment.environment,
      version: deployment.version,
      commitSha: deployment.commitSha,
    },
  });
}
