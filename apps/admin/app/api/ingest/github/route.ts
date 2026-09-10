import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma, type Product } from "@repo/database";

import { integrationActor } from "@/lib/activity-log";
import {
  GITHUB_DELIVERY_HEADER,
  GITHUB_EVENT_HEADER,
  GITHUB_SIGNATURE_HEADER,
  buildFromWorkflowRun,
  deploymentFromStatusEvent,
  deploymentStatusSchema,
  githubRepoSlug,
  verifyGithubSignature,
  workflowRunSchema,
} from "@/lib/github";
import {
  announceBuild,
  announceDeployment,
  writeBuild,
  writeDeployment,
} from "@/lib/ingest-writers";

/**
 * GitHub webhook receiver (§7, §26).
 *
 *   POST /api/ingest/github
 *   X-GitHub-Event: workflow_run | deployment_status | ping
 *   X-Hub-Signature-256: sha256=…
 *
 * The same evidence the token endpoints accept, arriving on its own instead of
 * being posted by a step somebody remembered to add to a workflow file. It
 * writes through `lib/ingest-writers.ts`, so a build that arrived this way is
 * indistinguishable from one a pipeline posted — as it should be, since it
 * describes the same run.
 *
 * Authenticity is GitHub's HMAC over the raw body, not a session and not an
 * ingest token: a webhook cannot hold either. The product is resolved from the
 * repository the event names, matched against `Product.repositoryUrl`, so
 * connecting a repository is a field an operator already fills in rather than a
 * second secret to manage.
 *
 * Setup: Settings → Webhooks → Add webhook, content type `application/json`,
 * secret `GITHUB_WEBHOOK_SECRET`, events "Workflow runs" and "Deployment
 * statuses".
 */

export const dynamic = "force-dynamic";

/** GitHub allows 25MB. Nothing this receiver reads is anywhere near that. */
const MAX_BODY_BYTES = 1_000_000;

const ok = (body: Record<string, unknown>) => NextResponse.json({ success: true, ...body });

/**
 * Resolves the product a repository belongs to.
 *
 * Refuses to guess when two products name the same repository — a monorepo that
 * builds several products has no per-repository answer to "which product did
 * this run build", and attributing it to whichever row came back first would
 * put one product's history on another's page. Those products should use the
 * per-product ingest tokens, where the pipeline states which product it means.
 */
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
    // Said plainly rather than returned as a generic 401: a silent rejection
    // here reads in GitHub's delivery log as "the endpoint hates us", and the
    // fix — set one environment variable — is the thing worth saying.
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

  let payload: unknown;
  try {
    payload = JSON.parse(raw);
  } catch {
    return NextResponse.json({ success: false, message: "Body must be valid JSON." }, { status: 400 });
  }

  try {
    if (event === "workflow_run") {
      const body = workflowRunSchema.parse(payload);
      const { product, ambiguous } = await productForRepository(body.repository.full_name);
      if (ambiguous) return ambiguousResponse(body.repository.full_name);
      if (!product) return unmatchedResponse(body.repository.full_name);

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
      if (!product) return unmatchedResponse(body.repository.full_name);

      const input = deploymentFromStatusEvent(body);
      if (!input) {
        // `inactive` and GitHub's other non-terminal states describe bookkeeping
        // on GitHub's side, not something that happened to the site.
        return ok({ delivery, ignored: true, reason: `state ${body.deployment_status.state}` });
      }

      const deployment = await writeDeployment(product, input);
      await announceDeployment(
        product,
        deployment,
        input.status,
        actorFor(body.repository.full_name),
      );

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
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, message: "Unexpected payload shape.", issues: error.issues },
        { status: 400 },
      );
    }
    console.error(`GitHub webhook failed (event ${event}, delivery ${delivery})`, error);
    return NextResponse.json(
      { success: false, message: "Webhook handling failed. The error has been logged." },
      { status: 500 },
    );
  }

  // Subscribing to more events than we read is harmless and common; saying so
  // keeps GitHub's delivery log green rather than filling it with red 4xx rows
  // for events nobody asked us to act on.
  return ok({ delivery, ignored: true, reason: `event ${event || "unnamed"}` });
}

const actorFor = (fullName: string) => integrationActor(`GitHub · ${fullName}`);

function unmatchedResponse(fullName: string) {
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
