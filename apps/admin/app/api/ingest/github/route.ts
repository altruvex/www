import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma, type Product } from "@repo/database";

import { integrationActor } from "@/lib/activity-log";
import { claimDelivery } from "@/lib/webhook-delivery";
import {
  GITHUB_DELIVERY_HEADER,
  GITHUB_EVENT_HEADER,
  GITHUB_SIGNATURE_HEADER,
  buildFromWorkflowRun,
  deploymentFromStatusEvent,
  deploymentStatusSchema,
  githubRepoSlug,
  isAcknowledgeOnlyEvent,
  isGithubAppDelivery,
  verifyGithubSignature,
  workflowRunSchema,
} from "@/lib/github";
import {
  announceBuild,
  announceDeployment,
  writeBuild,
  writeDeployment,
} from "@/lib/ingest-writers";

export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 1_000_000;

const ok = (body: Record<string, unknown>) => NextResponse.json({ success: true, ...body });

async function productForRepository(
  fullName: string,
): Promise<{ product: Product | null; ambiguous: boolean }> {
  const wanted = fullName.toLowerCase();
  const candidates = await prisma.product.findMany({
    where: { repositoryUrl: { not: null } },
  });
  const matches = candidates.filter((p) => githubRepoSlug(p.repositoryUrl) === wanted);
  if (matches.length > 1) return { product: null, ambiguous: true };
  return { product: matches[0] ?? null, ambiguous: false };
}

export async function POST(request: Request) {
  const secret = process.env.GITHUB_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json(
      { success: false, message: "GITHUB_WEBHOOK_SECRET is not configured on this instance." },
      { status: 503 },
    );
  }

  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES) {
    return NextResponse.json({ success: false, message: "Payload too large." }, { status: 413 });
  }

  if (!verifyGithubSignature(raw, request.headers.get(GITHUB_SIGNATURE_HEADER), secret)) {
    return NextResponse.json({ success: false, message: "Invalid signature." }, { status: 401 });
  }

  const event = request.headers.get(GITHUB_EVENT_HEADER) ?? "";
  const delivery = request.headers.get(GITHUB_DELIVERY_HEADER) ?? undefined;

  if (event === "ping") {
    return ok({ message: "Altruvex OS is listening." });
  }
  if (isAcknowledgeOnlyEvent(event)) {
    return ok({ delivery, ignored: true, reason: `event ${event}` });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(raw);
  } catch {
    return NextResponse.json({ success: false, message: "Body must be valid JSON." }, { status: 400 });
  }

  if (!(await claimDelivery("github", delivery))) {
    return ok({ delivery, ignored: true, reason: "delivery already processed" });
  }

  let response: NextResponse;
  try {
    response = await handleEvent(event, payload, delivery);
  } catch (error) {
    if (error instanceof z.ZodError) {
      response = NextResponse.json(
        { success: false, message: "Unexpected payload shape.", issues: error.issues },
        { status: 400 },
      );
    } else {
      console.error(`GitHub webhook failed (event ${event}, delivery ${delivery})`, error);
      response = NextResponse.json(
        { success: false, message: "Webhook handling failed. The error has been logged." },
        { status: 500 },
      );
    }
  }

  if (!response.ok) await releaseDelivery(delivery);
  return response;
}

async function releaseDelivery(delivery: string | undefined) {
  if (!delivery) return;
  try {
    await prisma.webhookDelivery.deleteMany({ where: { provider: "github", deliveryId: delivery } });
  } catch (error) {
    console.error(`Could not release GitHub delivery ${delivery}`, error);
  }
}

async function handleEvent(
  event: string,
  payload: unknown,
  delivery: string | undefined,
): Promise<NextResponse> {
  if (event === "workflow_run") {
    const body = workflowRunSchema.parse(payload);
    const { product, ambiguous } = await productForRepository(body.repository.full_name);
    if (ambiguous) return ambiguousResponse(body.repository.full_name);
    if (!product) return await unmatchedResponse(body.repository.full_name, payload, delivery);

    const input = buildFromWorkflowRun(body);
    const build = await writeBuild(product, input);
    await announceBuild(product, build, input.status, actorFor(body.repository.full_name));

    return ok({
      delivery,
      product: product.slug,
      build: { id: build.id, number: build.number, status: build.status },
    });
  }

  if (event === "deployment_status") {
    const body = deploymentStatusSchema.parse(payload);
    const { product, ambiguous } = await productForRepository(body.repository.full_name);
    if (ambiguous) return ambiguousResponse(body.repository.full_name);
    if (!product) return await unmatchedResponse(body.repository.full_name, payload, delivery);

    const input = deploymentFromStatusEvent(body);
    if (!input) {
      return ok({ delivery, ignored: true, reason: `state ${body.deployment_status.state}` });
    }

    const deployment = await writeDeployment(product, input);
    await announceDeployment(product, deployment, input.status, actorFor(body.repository.full_name));

    return ok({
      delivery,
      product: product.slug,
      deployment: {
        id: deployment.id,
        number: deployment.number,
        status: deployment.status,
      },
    });
  }

  return ok({ delivery, ignored: true, reason: `event ${event || "unnamed"}` });
}

const actorFor = (fullName: string) => integrationActor(`GitHub · ${fullName}`);

async function unmatchedResponse(
  fullName: string,
  payload: unknown,
  delivery: string | undefined,
): Promise<NextResponse> {
  if (isGithubAppDelivery(payload)) {
    await releaseDelivery(delivery);
    return ok({ delivery, ignored: true, reason: `${fullName} is not linked to a product` });
  }
  return NextResponse.json(
    {
      success: false,
      message: `No product has ${fullName} as its repository. Set the repository URL on the product in Altruvex OS.`,
    },
    { status: 404 },
  );
}

function ambiguousResponse(fullName: string) {
  return NextResponse.json(
    {
      success: false,
      message: `More than one product names ${fullName} as its repository, so this event cannot be attributed. Use per-product ingest tokens for a repository that builds several products.`,
    },
    { status: 409 },
  );
}
