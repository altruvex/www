import { z } from "zod";

import { prisma } from "@repo/database";

import { recordActivity } from "@/lib/activity-log";
import { badRequest, notFound, ok, readJson, withAdmin } from "@/lib/with-admin";

/**
 * Incidents (§8).
 *
 * Unlike builds and deployments, an incident IS created by a human: it is a
 * judgement that something is wrong, and no CI system makes that call. What it
 * links to — a deployment, the logs around it — is real data from ingest, so an
 * incident is a human annotation over machine evidence rather than a free-
 * floating note.
 *
 * Status and the update timeline move together: every status change writes an
 * `IncidentUpdate`, so the timeline can never disagree with the header.
 */

export const dynamic = "force-dynamic";

const STATUSES = ["INVESTIGATING", "IDENTIFIED", "MONITORING", "RESOLVED"] as const;
const SEVERITIES = ["SEV1", "SEV2", "SEV3", "SEV4"] as const;

const createSchema = z.object({
  productId: z.string().min(1),
  title: z.string().min(1).max(300),
  detail: z.string().max(5000).nullable().optional(),
  severity: z.enum(SEVERITIES).default("SEV3"),
  deploymentId: z.string().min(1).nullable().optional(),
  ownerId: z.string().min(1).nullable().optional(),
  detectedAt: z.coerce.date().optional(),
});

const patchSchema = z.object({
  id: z.string().min(1),
  status: z.enum(STATUSES).optional(),
  severity: z.enum(SEVERITIES).optional(),
  ownerId: z.string().min(1).nullable().optional(),
  resolution: z.string().max(5000).nullable().optional(),
  /** Timeline note. Required when resolving, so a fix is never unexplained. */
  update: z.string().max(5000).optional(),
});

export const GET = withAdmin(async (request) => {
  const status = request.nextUrl.searchParams.get("status");
  const incidents = await prisma.incident.findMany({
    where: status === "open" ? { status: { not: "RESOLVED" } } : undefined,
    orderBy: [{ resolvedAt: { sort: "asc", nulls: "first" } }, { detectedAt: "desc" }],
    include: {
      product: {
        select: {
          id: true,
          name: true,
          slug: true,
          client: { select: { id: true, name: true, company: true } },
        },
      },
      owner: { select: { id: true, name: true, email: true } },
      deployment: { select: { id: true, number: true, environment: true } },
      updates: { orderBy: { createdAt: "desc" } },
    },
  });
  return ok({ incidents });
});

export const POST = withAdmin(async (request, { actor }) => {
  const body = await readJson(request, createSchema);

  const product = await prisma.product.findUnique({
    where: { id: body.productId },
    select: { id: true, name: true },
  });
  if (!product) throw notFound("That product no longer exists.");

  if (body.deploymentId) {
    const deployment = await prisma.deployment.findUnique({
      where: { id: body.deploymentId },
      select: { productId: true },
    });
    if (!deployment) throw notFound("That deployment no longer exists.");
    if (deployment.productId !== body.productId) {
      throw badRequest("That deployment belongs to a different product.");
    }
  }

  const incident = await prisma.$transaction(async (tx) => {
    // Same row-lock pattern as ingest numbering: two operators filing at once
    // must not both claim incident #4.
    await tx.$queryRawUnsafe(`SELECT id FROM products WHERE id = $1 FOR UPDATE`, product.id);
    const rows = await tx.$queryRawUnsafe<{ max: number | null }[]>(
      `SELECT MAX("number") AS max FROM "incidents" WHERE "productId" = $1`,
      product.id,
    );
    const number = (rows[0]?.max ?? 0) + 1;

    const created = await tx.incident.create({
      data: {
        productId: body.productId,
        number,
        title: body.title,
        detail: body.detail ?? null,
        severity: body.severity,
        deploymentId: body.deploymentId ?? null,
        ownerId: body.ownerId ?? null,
        detectedAt: body.detectedAt ?? new Date(),
      },
    });

    await tx.incidentUpdate.create({
      data: {
        incidentId: created.id,
        status: "INVESTIGATING",
        body: body.detail?.trim() || "Incident opened.",
        authorLabel: actor.label,
        authorId: actor.kind === "USER" ? (actor.id ?? null) : null,
      },
    });

    return created;
  });

  await recordActivity({
    action: "incident.opened",
    actor,
    entityType: "incident",
    entityId: incident.id,
    entityLabel: `${product.name} #${incident.number}`,
    summary: `${incident.severity} opened on ${product.name}: ${incident.title}`,
    after: { severity: incident.severity, status: incident.status },
    metadata: { productId: product.id },
  });

  return ok({ incident });
});

export const PATCH = withAdmin(async (request, { actor }) => {
  const { id, update, ...patch } = await readJson(request, patchSchema);

  const existing = await prisma.incident.findUnique({
    where: { id },
    include: { product: { select: { id: true, name: true } } },
  });
  if (!existing) throw notFound("That incident no longer exists.");

  // Resolving without saying what was wrong produces an incident history nobody
  // can learn from, so the note is required rather than encouraged.
  if (patch.status === "RESOLVED" && existing.status !== "RESOLVED") {
    const explanation = patch.resolution?.trim() || update?.trim();
    if (!explanation) {
      throw badRequest("Say what fixed it before resolving — an unexplained incident teaches nothing.");
    }
  }

  const incident = await prisma.$transaction(async (tx) => {
    const updated = await tx.incident.update({
      where: { id },
      data: {
        ...patch,
        ...(patch.status === "RESOLVED"
          ? { resolvedAt: existing.resolvedAt ?? new Date() }
          : patch.status
            ? { resolvedAt: null }
            : {}),
        // First move off INVESTIGATING is the acknowledgement.
        ...(patch.status && patch.status !== "INVESTIGATING" && !existing.acknowledgedAt
          ? { acknowledgedAt: new Date() }
          : {}),
      },
    });

    const body = update?.trim() || patch.resolution?.trim();
    if (body || (patch.status && patch.status !== existing.status)) {
      await tx.incidentUpdate.create({
        data: {
          incidentId: id,
          status: patch.status ?? null,
          body: body || `Status moved to ${patch.status?.toLowerCase()}.`,
          authorLabel: actor.label,
          authorId: actor.kind === "USER" ? (actor.id ?? null) : null,
        },
      });
    }

    return updated;
  });

  if (patch.status && patch.status !== existing.status) {
    await recordActivity({
      action: patch.status === "RESOLVED" ? "incident.resolved" : "incident.updated",
      actor,
      entityType: "incident",
      entityId: id,
      entityLabel: `${existing.product.name} #${existing.number}`,
      summary:
        patch.status === "RESOLVED"
          ? `Resolved ${existing.severity} on ${existing.product.name}: ${existing.title}`
          : `${existing.title} moved to ${patch.status.toLowerCase()}`,
      before: { status: existing.status },
      after: { status: patch.status },
      metadata: { productId: existing.product.id },
    });
  }

  return ok({ incident });
});
