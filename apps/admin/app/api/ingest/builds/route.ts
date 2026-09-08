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
 * Build telemetry from CI (§7).
 *
 *   POST /api/ingest/builds
 *   Authorization: Bearer avx_ingest_…
 *   { "externalId": "run-8412", "status": "RUNNING", "branch": "main", … }
 *
 * Upserts on `externalId` so a pipeline can post the same build repeatedly as
 * it progresses (QUEUED → RUNNING → SUCCEEDED) without creating three rows.
 * A pipeline that posts no `externalId` gets a new build each time, which is
 * the correct reading of "this is a different build".
 */

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  /** The CI system's own id for the run. The idempotency key. */
  externalId: z.string().min(1).max(200).optional(),
  status: z.enum(["QUEUED", "RUNNING", "SUCCEEDED", "FAILED", "CANCELLED"]),
  environment: environmentSchema,
  commitSha: z.string().max(100).optional(),
  commitMessage: z.string().max(500).optional(),
  branch: z.string().max(200).optional(),
  triggeredBy: z.string().max(200).optional(),
  startedAt: z.coerce.date().optional(),
  finishedAt: z.coerce.date().optional(),
  durationMs: z.number().int().nonnegative().max(86_400_000).optional(),
  failureReason: z.string().max(1000).optional(),
});

const TERMINAL = new Set(["SUCCEEDED", "FAILED", "CANCELLED"]);

export const POST = withIngestToken(async (request, { product }) => {
  const body = await readIngestJson(request, bodySchema);

  const build = await prisma.$transaction(async (tx) => {
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
      (TERMINAL.has(body.status) ? (existing?.finishedAt ?? new Date()) : null);

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
          failureReason: body.status === "FAILED" ? (body.failureReason ?? existing.failureReason) : null,
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
  });

  // Only terminal transitions are worth an activity line — a build posting
  // RUNNING every ten seconds would otherwise drown the feed.
  if (TERMINAL.has(body.status)) {
    await recordActivity({
      action: `build.${body.status.toLowerCase()}`,
      actor: ingestActor(product),
      entityType: "build",
      entityId: build.id,
      entityLabel: `${product.name} build #${build.number}`,
      summary:
        body.status === "SUCCEEDED"
          ? `Build #${build.number} succeeded on ${build.branch ?? "an unnamed branch"}`
          : `Build #${build.number} ${body.status.toLowerCase()}${build.failureReason ? `: ${build.failureReason}` : ""}`,
      metadata: {
        productSlug: product.slug,
        environment: build.environment,
        commitSha: build.commitSha,
      },
    });
  }

  return NextResponse.json({
    success: true,
    build: { id: build.id, number: build.number, status: build.status },
  });
});
