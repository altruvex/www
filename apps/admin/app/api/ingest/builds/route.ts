import { NextResponse } from "next/server";
import { z } from "zod";

import { environmentSchema, readIngestJson, withIngestToken } from "@/lib/ingest";
import { announceBuild, writeBuild } from "@/lib/ingest-writers";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
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
