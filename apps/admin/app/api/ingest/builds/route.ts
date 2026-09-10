import { NextResponse } from "next/server";
import { z } from "zod";

import { environmentSchema, readIngestJson, withIngestToken } from "@/lib/ingest";
import { announceBuild, writeBuild } from "@/lib/ingest-writers";

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
 *
 * The row itself is written by `lib/ingest-writers.ts`, shared with the GitHub
 * webhook receiver so both transports produce an identical build.
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

export const POST = withIngestToken(async (request, { product }) => {
  const body = await readIngestJson(request, bodySchema);

  const build = await writeBuild(product, body);
  await announceBuild(product, build, body.status);

  return NextResponse.json({
    success: true,
    build: { id: build.id, number: build.number, status: build.status },
  });
});
