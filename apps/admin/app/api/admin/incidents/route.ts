import { recordActivity, recordChange } from "@/lib/activity-log";
import { badRequest, notFound, ok, readJson, withAdmin } from "@/lib/with-admin";
import { prisma } from "@repo/database";
import { z } from "zod";


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
  update: z.string().max(5000).optional(),
  deploymentId: z.string().min(1).nullable().optional(),
});

const ownerName = (owner: { name: string | null; email: string } | null | undefined) =>
  owner ? owner.name || owner.email : "Unowned";

const deploymentName = (
  deployment: { number: number; environment: string } | null | undefined,
) => (deployment ? `#${deployment.number} ${deployment.environment.toLowerCase()}` : "None");

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
}, { can: ["create", "incident"] });

export const PATCH = withAdmin(async (request, { actor }) => {
  const { id, update, ...patch } = await readJson(request, patchSchema);

  const existing = await prisma.incident.findUnique({
    where: { id },
    include: {
      product: { select: { id: true, name: true } },
      owner: { select: { id: true, name: true, email: true } },
      deployment: { select: { id: true, number: true, environment: true } },
    },
  });
  if (!existing) throw notFound("That incident no longer exists.");

  const statusChanged = Boolean(patch.status && patch.status !== existing.status);
  const reopening = statusChanged && existing.status === "RESOLVED";
  const label = `${existing.product.name} #${existing.number}`;

  if (patch.status === "RESOLVED" && existing.status !== "RESOLVED") {
    const explanation = patch.resolution?.trim() || update?.trim();
    if (!explanation) {
      throw badRequest("Say what fixed it before resolving — an unexplained incident teaches nothing.");
    }
  }

  let nextOwner = existing.owner;
  if (patch.ownerId !== undefined && patch.ownerId !== existing.ownerId) {
    nextOwner = patch.ownerId
      ? await prisma.user.findUnique({
          where: { id: patch.ownerId },
          select: { id: true, name: true, email: true },
        })
      : null;
    if (patch.ownerId && !nextOwner) throw notFound("That team member no longer exists.");
  }
  let nextDeployment = existing.deployment;
  if (patch.deploymentId !== undefined && patch.deploymentId !== existing.deploymentId) {
    if (patch.deploymentId) {
      const found = await prisma.deployment.findUnique({
        where: { id: patch.deploymentId },
        select: { id: true, number: true, environment: true, productId: true },
      });
      if (!found) throw notFound("That deployment no longer exists.");
      if (found.productId !== existing.productId) {
        throw badRequest("That deployment belongs to a different product.");
      }
      nextDeployment = found;
    } else {
      nextDeployment = null;
    }
  }

  const note = update?.trim() || patch.resolution?.trim() || "";
  const fieldsChanged =
    (patch.severity !== undefined && patch.severity !== existing.severity) ||
    (patch.ownerId !== undefined && patch.ownerId !== existing.ownerId) ||
    (patch.deploymentId !== undefined && patch.deploymentId !== existing.deploymentId) ||
    (patch.resolution !== undefined && (patch.resolution?.trim() || null) !== existing.resolution);

  if (!statusChanged && !fieldsChanged && !note) {
    return ok({ incident: existing, changed: false });
  }

  const incident = await prisma.$transaction(async (tx) => {
    const updated = await tx.incident.update({
      where: { id },
      data: {
        ...(patch.severity !== undefined ? { severity: patch.severity } : {}),
        ...(patch.ownerId !== undefined ? { ownerId: patch.ownerId } : {}),
        ...(patch.deploymentId !== undefined ? { deploymentId: patch.deploymentId } : {}),
        ...(patch.resolution !== undefined
          ? { resolution: patch.resolution?.trim() || null }
          : {}),
        ...(patch.status === "RESOLVED" &&
        existing.status !== "RESOLVED" &&
        patch.resolution === undefined &&
        update?.trim()
          ? { resolution: update.trim() }
          : {}),
        ...(patch.status ? { status: patch.status } : {}),
        ...(patch.status === "RESOLVED"
          ? { resolvedAt: existing.resolvedAt ?? new Date() }
          : patch.status
            ? { resolvedAt: null }
            : {}),
        ...(reopening && patch.resolution === undefined ? { resolution: null } : {}),
        ...(patch.status && patch.status !== "INVESTIGATING" && !existing.acknowledgedAt
          ? { acknowledgedAt: new Date() }
          : {}),
      },
    });

    if (note || statusChanged) {
      await tx.incidentUpdate.create({
        data: {
          incidentId: id,
          status: statusChanged ? (patch.status ?? null) : null,
          body:
            note ||
            (reopening
              ? `Reopened — moved back to ${patch.status?.toLowerCase()}.`
              : `Status moved to ${patch.status?.toLowerCase()}.`),
          authorLabel: actor.label,
          authorId: actor.kind === "USER" ? (actor.id ?? null) : null,
        },
      });
    }

    return updated;
  });

  if (statusChanged && patch.status) {
    await recordActivity({
      action:
        patch.status === "RESOLVED"
          ? "incident.resolved"
          : reopening
            ? "incident.reopened"
            : "incident.updated",
      actor,
      entityType: "incident",
      entityId: id,
      entityLabel: label,
      summary:
        patch.status === "RESOLVED"
          ? `Resolved ${existing.severity} on ${existing.product.name}: ${existing.title}`
          : reopening
            ? `Reopened ${existing.title} as ${patch.status.toLowerCase()}`
            : `${existing.title} moved to ${patch.status.toLowerCase()}`,
      before: { status: existing.status },
      after: { status: patch.status },
      metadata: { productId: existing.product.id },
    });
  }

  await recordChange({
    action: "incident.changed",
    actor,
    entityType: "incident",
    entityId: id,
    entityLabel: label,
    summary: `Updated ${label}: ${existing.title}`,
    before: {
      severity: existing.severity,
      owner: ownerName(existing.owner),
      deployment: deploymentName(existing.deployment),
      resolution: existing.resolution,
    },
    after: {
      severity: incident.severity,
      owner: ownerName(nextOwner),
      deployment: deploymentName(nextDeployment),
      resolution: incident.resolution,
    },
    metadata: {
      productId: existing.product.id,
      ownerId: incident.ownerId,
      deploymentId: incident.deploymentId,
    },
  });

  return ok({ incident, changed: true });
}, { can: ["edit", "incident"] });
