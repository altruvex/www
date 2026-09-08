import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@repo/database";

import {
  environmentSchema,
  MAX_LOG_BATCH,
  MAX_LOG_MESSAGE_LENGTH,
  readIngestJson,
  withIngestToken,
} from "@/lib/ingest";

/**
 * Log ingest (§7).
 *
 *   POST /api/ingest/logs
 *   Authorization: Bearer avx_ingest_…
 *   { "entries": [ { "level": "ERROR", "message": "…", "requestId": "…" } ] }
 *
 * Batched, because a per-line request would cost one round trip and one row
 * lock per log line. Capped at MAX_LOG_BATCH so a runaway job fails loudly at
 * the edge instead of quietly filling the table.
 *
 * No activity event is written here: logs are already the record, and one
 * activity line per log line would make the audit feed useless.
 */

export const dynamic = "force-dynamic";

const entrySchema = z.object({
  level: z.enum(["DEBUG", "INFO", "WARN", "ERROR", "FATAL"]).default("INFO"),
  message: z.string().min(1).max(MAX_LOG_MESSAGE_LENGTH),
  source: z.string().max(100).optional(),
  requestId: z.string().max(200).optional(),
  /** Source time. Falls back to arrival time, which reorders a trace — send it. */
  timestamp: z.coerce.date().optional(),
  environment: environmentSchema,
  /** Optional links, resolved by the CI system's own ids. */
  buildExternalId: z.string().max(200).optional(),
  deploymentExternalId: z.string().max(200).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

const bodySchema = z.object({
  entries: z.array(entrySchema).min(1).max(MAX_LOG_BATCH),
});

export const POST = withIngestToken(async (request, { product }) => {
  const { entries } = await readIngestJson(request, bodySchema);

  // Resolve the (usually one or two) distinct build/deployment references once
  // rather than per line.
  const buildIds = [...new Set(entries.map((e) => e.buildExternalId).filter(Boolean))] as string[];
  const deploymentIds = [
    ...new Set(entries.map((e) => e.deploymentExternalId).filter(Boolean)),
  ] as string[];

  const [builds, deployments] = await Promise.all([
    buildIds.length
      ? prisma.build.findMany({
          where: { productId: product.id, externalId: { in: buildIds } },
          select: { id: true, externalId: true },
        })
      : Promise.resolve([]),
    deploymentIds.length
      ? prisma.deployment.findMany({
          where: { productId: product.id, externalId: { in: deploymentIds } },
          select: { id: true, externalId: true },
        })
      : Promise.resolve([]),
  ]);

  const buildByExternal = new Map(builds.map((b) => [b.externalId, b.id]));
  const deploymentByExternal = new Map(deployments.map((d) => [d.externalId, d.id]));

  const now = new Date();
  const created = await prisma.logEntry.createMany({
    data: entries.map((entry) => ({
      productId: product.id,
      environment: entry.environment,
      level: entry.level,
      message: entry.message,
      source: entry.source ?? null,
      requestId: entry.requestId ?? null,
      timestamp: entry.timestamp ?? now,
      buildId: entry.buildExternalId
        ? (buildByExternal.get(entry.buildExternalId) ?? null)
        : null,
      deploymentId: entry.deploymentExternalId
        ? (deploymentByExternal.get(entry.deploymentExternalId) ?? null)
        : null,
      metadata: (entry.metadata ?? undefined) as never,
    })),
  });

  return NextResponse.json({ success: true, ingested: created.count });
});
