import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@repo/database";

import {
  environmentSchema,
  ingestActor,
  nextNumber,
  readIngestJson,
  recordActivity,
  withIngestToken,
} from "@/lib/ingest";

/**
 * Deployment telemetry from CI (§7).
 *
 *   POST /api/ingest/deployments
 *   Authorization: Bearer avx_ingest_…
 *   { "externalId": "dpl_91", "status": "SUCCEEDED", "environment": "PRODUCTION", … }
 *
 * A successful production deployment also moves the product's recorded live URL
 * and status, because the alternative is a Products screen that says PLANNED
 * about something that has been serving traffic for a month.
 */

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  externalId: z.string().min(1).max(200).optional(),
  status: z.enum(["PENDING", "IN_PROGRESS", "SUCCEEDED", "FAILED", "ROLLED_BACK"]),
  environment: environmentSchema,
  version: z.string().max(100).optional(),
  commitSha: z.string().max(100).optional(),
  url: z.string().url().max(500).optional(),
  triggeredBy: z.string().max(200).optional(),
  /** Ties the deployment to the build that produced it, by the build's externalId. */
  buildExternalId: z.string().max(200).optional(),
  startedAt: z.coerce.date().optional(),
  finishedAt: z.coerce.date().optional(),
  failureReason: z.string().max(1000).optional(),
  /** The deployment this one rolls back, by its number. */
  rollbackOfNumber: z.number().int().positive().optional(),
});

const TERMINAL = new Set(["SUCCEEDED", "FAILED", "ROLLED_BACK"]);

export const POST = withIngestToken(async (request, { product }) => {
  const body = await readIngestJson(request, bodySchema);

  const deployment = await prisma.$transaction(async (tx) => {
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
      (TERMINAL.has(body.status) ? (existing?.finishedAt ?? new Date()) : null);

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
  });

  if (TERMINAL.has(body.status)) {
    await recordActivity({
      action: `deployment.${body.status.toLowerCase()}`,
      actor: ingestActor(product),
      entityType: "deployment",
      entityId: deployment.id,
      entityLabel: `${product.name} deployment #${deployment.number}`,
      summary:
        body.status === "SUCCEEDED"
          ? `Deployed ${product.name} #${deployment.number} to ${deployment.environment.toLowerCase()}`
          : `Deployment #${deployment.number} to ${deployment.environment.toLowerCase()} ${body.status === "ROLLED_BACK" ? "was rolled back" : "failed"}${deployment.failureReason ? `: ${deployment.failureReason}` : ""}`,
      metadata: {
        productSlug: product.slug,
        environment: deployment.environment,
        version: deployment.version,
        commitSha: deployment.commitSha,
      },
    });
  }

  return NextResponse.json({
    success: true,
    deployment: {
      id: deployment.id,
      number: deployment.number,
      status: deployment.status,
    },
  });
});
