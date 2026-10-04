import { prisma, type Build, type Deployment, type Product, type ProductStatus } from "@repo/database";

import type { Actor } from "@/lib/activity-log";
import { ingestActor, nextNumber, recordActivity } from "@/lib/ingest";

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

const PRE_LAUNCH_STATUSES = new Set<ProductStatus>(["PLANNED", "IN_DEVELOPMENT"]);

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

const TRANSACTION_OPTIONS = { timeout: 20_000, maxWait: 15_000 } as const;

export async function writeBuild(product: Product, body: BuildInput): Promise<Build> {
  return prisma.$transaction(async (tx) => {
    const existing = body.externalId
      ? await tx.build.findUnique({
          where: {
            productId_externalId: { productId: product.id, externalId: body.externalId },
          },
        })
      : null;

    const finishedAt =
      body.finishedAt ??
      (BUILD_TERMINAL.has(body.status)
        ? (existing?.finishedAt ?? new Date())
        :
          (existing && BUILD_TERMINAL.has(existing.status as BuildStatusInput)
            ? existing.finishedAt
            : null));

    if (existing) {
      const settled = BUILD_TERMINAL.has(existing.status as BuildStatusInput);
      const regressing = settled && !BUILD_TERMINAL.has(body.status);

      return tx.build.update({
        where: { id: existing.id },
        data: {
          status: regressing ? existing.status : body.status,
          environment: body.environment,
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

    const settled = existing
      ? DEPLOYMENT_TERMINAL.has(existing.status as DeploymentStatusInput)
      : false;
    const regressing = settled && !DEPLOYMENT_TERMINAL.has(body.status);

    const finishedAt =
      body.finishedAt ??
      (DEPLOYMENT_TERMINAL.has(body.status)
        ? (existing?.finishedAt ?? new Date())
        : settled
          ? existing?.finishedAt
          : null);

    const common = {
      status: regressing ? (existing!.status as DeploymentStatusInput) : body.status,
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

    if (body.status === "SUCCEEDED" && body.environment === "PRODUCTION") {
      await tx.product.update({
        where: { id: product.id },
        data: {
          productionUrl: body.url ?? product.productionUrl,
          ...(PRE_LAUNCH_STATUSES.has(product.status) ? { status: "LIVE" as const } : {}),
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
