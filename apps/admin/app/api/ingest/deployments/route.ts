import { NextResponse } from "next/server";
import { z } from "zod";

import { environmentSchema, readIngestJson, withIngestToken } from "@/lib/ingest";
import { announceDeployment, writeDeployment } from "@/lib/ingest-writers";

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
 *
 * The row itself is written by `lib/ingest-writers.ts`, shared with the GitHub
 * webhook receiver so both transports produce an identical deployment.
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

export const POST = withIngestToken(async (request, { product }) => {
  const body = await readIngestJson(request, bodySchema);

  const deployment = await writeDeployment(product, body);
  await announceDeployment(product, deployment, body.status);

  return NextResponse.json({
    success: true,
    deployment: {
      id: deployment.id,
      number: deployment.number,
      status: deployment.status,
    },
  });
});
