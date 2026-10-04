import { NextResponse } from "next/server";
import { z } from "zod";

import { environmentSchema, readIngestJson, withIngestToken } from "@/lib/ingest";
import { announceDeployment, writeDeployment } from "@/lib/ingest-writers";
import { httpUrl } from "@/lib/http-url";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  externalId: z.string().min(1).max(200).optional(),
  status: z.enum(["PENDING", "IN_PROGRESS", "SUCCEEDED", "FAILED", "ROLLED_BACK"]),
  environment: environmentSchema,
  version: z.string().max(100).optional(),
  commitSha: z.string().max(100).optional(),
  url: httpUrl.optional(),
  triggeredBy: z.string().max(200).optional(),
  buildExternalId: z.string().max(200).optional(),
  startedAt: z.coerce.date().optional(),
  finishedAt: z.coerce.date().optional(),
  failureReason: z.string().max(1000).optional(),
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
