import { recordActivity, recordChange } from "@/lib/activity-log";
import { httpUrl } from "@/lib/http-url";
import { issueToken } from "@/lib/ingest-auth";
import {
  badRequest,
  conflict,
  notFound,
  ok,
  readJson,
  withAdmin,
} from "@/lib/with-admin";
import { prisma } from "@repo/database";
import { z } from "zod";

export const dynamic = "force-dynamic";

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const createSchema = z.object({
  clientId: z.string().min(1),
  projectId: z.string().min(1).nullable().optional(),
  name: z.string().min(1).max(200),
  slug: z
    .string()
    .min(2)
    .max(80)
    .regex(SLUG, "Use lowercase words separated by hyphens."),
  kind: z
    .enum([
      "WEBSITE",
      "WEB_APP",
      "API",
      "ECOMMERCE",
      "LANDING_PAGE",
      "INTERNAL_TOOL",
    ])
    .default("WEBSITE"),
  status: z
    .enum(["PLANNED", "IN_DEVELOPMENT", "LIVE", "MAINTENANCE", "SUNSET"])
    .default("PLANNED"),
  productionUrl: httpUrl.nullable().optional(),
  stagingUrl: httpUrl.nullable().optional(),
  repositoryUrl: httpUrl.nullable().optional(),
  framework: z.string().max(100).nullable().optional(),
  hostingProvider: z.string().max(100).nullable().optional(),
  existingSite: z.boolean().optional(),
});

const FIELD_LABEL: Record<string, string> = {
  name: "name",
  projectId: "project",
  kind: "type",
  status: "status",
  productionUrl: "production URL",
  stagingUrl: "staging URL",
  repositoryUrl: "repository",
  framework: "framework",
  hostingProvider: "hosting",
  existingSite: "existing site",
};

const patchSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("update"),
    id: z.string().min(1),
    // .partial() keeps .default(): a patch that omits kind/status would reset them
    // (a LIVE product linked to a project went back to PLANNED). Unwrap the defaults.
    patch: createSchema
      .extend({ kind: createSchema.shape.kind.unwrap(), status: createSchema.shape.status.unwrap() })
      .partial()
      .omit({ clientId: true, slug: true }),
  }),
  z.object({
    action: z.literal("rotate-token"),
    id: z.string().min(1),
  }),
  z.object({
    action: z.literal("revoke-token"),
    id: z.string().min(1),
  }),
]);

export const GET = withAdmin(async () => {
  const products = await prisma.product.findMany({
    orderBy: { updatedAt: "desc" },
    omit: { ingestTokenHash: true },
    include: {
      client: { select: { id: true, name: true, company: true } },
      project: { select: { id: true, name: true } },
    },
  });
  return ok({ products });
}, { can: ["view", "project"] });

export const POST = withAdmin(async (request, { actor }) => {
  const body = await readJson(request, createSchema);

  const client = await prisma.client.findUnique({
    where: { id: body.clientId },
    select: { id: true, name: true, company: true },
  });
  if (!client) throw notFound("That client no longer exists.");

  const taken = await prisma.product.findUnique({ where: { slug: body.slug } });
  if (taken)
    throw conflict(
      "That slug is already in use. Slugs identify a product to CI.",
    );

  if (body.projectId) {
    const project = await prisma.project.findUnique({
      where: { id: body.projectId },
      select: { clientId: true },
    });
    if (!project) throw notFound("That project no longer exists.");
    if (project.clientId !== body.clientId) {
      throw badRequest("That project belongs to a different client.");
    }
  }

  const product = await prisma.product.create({
    data: {
      clientId: body.clientId,
      projectId: body.projectId ?? null,
      name: body.name,
      slug: body.slug,
      kind: body.kind,
      status: body.status,
      productionUrl: body.productionUrl ?? null,
      stagingUrl: body.stagingUrl ?? null,
      repositoryUrl: body.repositoryUrl ?? null,
      framework: body.framework ?? null,
      hostingProvider: body.hostingProvider ?? null,
      existingSite: body.existingSite ?? false,
    },
  });

  await recordActivity({
    action: "product.created",
    actor,
    entityType: "product",
    entityId: product.id,
    entityLabel: product.name,
    summary: `Added ${product.name} for ${client.company || client.name || "a client"}`,
    after: { slug: product.slug, kind: product.kind, status: product.status },
  });

  return ok({ product });
}, { can: ["create", "project"] });

export const PATCH = withAdmin(async (request, { actor }) => {
  const body = await readJson(request, patchSchema);

  const existing = await prisma.product.findUnique({ where: { id: body.id } });
  if (!existing) throw notFound("That product no longer exists.");

  if (body.action === "rotate-token") {
    const issued = issueToken();
    await prisma.product.update({
      where: { id: existing.id },
      data: {
        ingestTokenHash: issued.hash,
        ingestTokenLast4: issued.last4,
        ingestTokenIssuedAt: new Date(),
      },
    });

    await recordActivity({
      action: "product.token_rotated",
      actor,
      entityType: "product",
      entityId: existing.id,
      entityLabel: existing.name,
      summary: `Issued a new ingest token for ${existing.name}${existing.ingestTokenHash ? " — the previous one stopped working" : ""}`,
    });
    return ok({ token: issued.token, last4: issued.last4 });
  }

  if (body.action === "revoke-token") {
    if (!existing.ingestTokenHash)
      throw badRequest("This product has no ingest token.");
    await prisma.product.update({
      where: { id: existing.id },
      data: {
        ingestTokenHash: null,
        ingestTokenLast4: null,
        ingestTokenIssuedAt: null,
      },
    });
    await recordActivity({
      action: "product.token_revoked",
      actor,
      entityType: "product",
      entityId: existing.id,
      entityLabel: existing.name,
      summary: `Revoked the ingest token for ${existing.name} — CI can no longer report against it`,
    });
    return ok({});
  }

  const patch = body.patch;
  if (patch.projectId) {
    const project = await prisma.project.findUnique({
      where: { id: patch.projectId },
      select: { clientId: true },
    });
    if (!project) throw notFound("That project no longer exists.");
    if (project.clientId !== existing.clientId) {
      throw badRequest("That project belongs to a different client.");
    }
  }

  const updated = await prisma.product.update({
    where: { id: existing.id },
    data: patch,
    omit: { ingestTokenHash: true },
  });

  const changed = Object.keys(patch).filter(
    (k) =>
      existing[k as keyof typeof existing] !== patch[k as keyof typeof patch],
  );
  await recordChange({
    action: "product.updated",
    actor,
    entityType: "product",
    entityId: existing.id,
    entityLabel: updated.name,
    summary: changed.length
      ? `Updated ${updated.name}: ${changed.map((k) => FIELD_LABEL[k] ?? k).join(", ")}`
      : `Updated ${updated.name}`,
    before: Object.fromEntries(
      Object.keys(patch).map((k) => [k, existing[k as keyof typeof existing]]),
    ),
    after: patch as Record<string, unknown>,
  });
  return ok({ product: updated });
}, { can: ["edit", "project"] });
