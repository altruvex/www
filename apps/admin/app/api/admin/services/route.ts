import { z } from "zod";

import { prisma, type Prisma } from "@repo/database";

import { recordActivity, recordChange } from "@/lib/activity-log";
import { clientLabel, listServices, SERVICE_INCLUDE, toServiceRow } from "@/lib/client-services";
import { lookupDomain } from "@/lib/rdap";
import {
  CLIENT_SERVICE_KINDS,
  firstExpiry,
  KIND_LABEL,
  nextExpiry,
  termBilling,
  type TermBilling,
} from "@/lib/service-lifecycle";
import { badRequest, conflict, notFound, ok, readJson, withAdmin } from "@/lib/with-admin";

/**
 * Client services (domains, hosting, business email…) and their renewals.
 *
 * Every mutation writes its audit event here, at the mutation site. There is no
 * DELETE on this route: ending a service is CANCELLED, which keeps the record
 * that it once existed and what it cost. A row that should never have existed
 * goes through `deleteRecords`, which snapshots it into the audit trail first.
 */

export const dynamic = "force-dynamic";

const money = z.number().int().min(0).max(100_000_000);
/** Blank normalises to null; absent stays absent, so an edit leaves it alone. */
const optionalText = (max: number) =>
  z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? null : value),
    z.string().trim().max(max).nullish(),
  );

// No `.default()` in here: this shape is also used `.partial()` for edits, and
// a default inside a partial would quietly reset a field the edit never sent.
const fieldsSchema = z.object({
  kind: z.enum(CLIENT_SERVICE_KINDS),
  name: z.string().trim().min(1, "Name the service").max(200),
  provider: optionalText(120),
  reference: optionalText(200),
  currency: z.string().trim().toUpperCase().length(3),
  price: money.min(1, "Set what the client pays per term"),
  cost: money.nullish(),
  termMonths: z.number().int().min(1).max(120),
  firstTermIncluded: z.boolean(),
  autoRenew: z.boolean(),
  projectId: z.string().min(1).nullish(),
  productId: z.string().min(1).nullish(),
  notes: optionalText(2000),
});

const createSchema = fieldsSchema.extend({
  clientId: z.string().min(1),
  /** Present = it is already registered and running. Absent = PENDING. */
  startedAt: z.coerce.date().nullish(),
  /** The provider's own date, when known. Otherwise start + term. */
  expiresAt: z.coerce.date().nullish(),
});

const patchSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("update"), id: z.string().min(1), fields: fieldsSchema.partial() }),
  z.object({
    action: z.literal("activate"),
    id: z.string().min(1),
    startedAt: z.coerce.date(),
    expiresAt: z.coerce.date().nullish(),
  }),
  z.object({ action: z.literal("renew"), id: z.string().min(1) }),
  /** Correct the date to what the provider actually says. */
  z.object({ action: z.literal("set-expiry"), id: z.string().min(1), expiresAt: z.coerce.date() }),
  /** Read a domain's expiry from its registry (RDAP) and store it. */
  z.object({ action: z.literal("sync-registry"), id: z.string().min(1) }),
  z.object({ action: z.literal("cancel"), id: z.string().min(1) }),
  z.object({ action: z.literal("reactivate"), id: z.string().min(1) }),
]);

const iso = (value: Date | null | undefined) => value?.toISOString().slice(0, 10) ?? null;

/** A project or product offered for a client must belong to that client. */
async function assertOwnership(clientId: string, projectId?: string | null, productId?: string | null) {
  const [project, product] = await Promise.all([
    projectId
      ? prisma.project.findUnique({ where: { id: projectId }, select: { clientId: true } })
      : null,
    productId
      ? prisma.product.findUnique({ where: { id: productId }, select: { clientId: true } })
      : null,
  ]);
  if (projectId && project?.clientId !== clientId) {
    throw badRequest("That project belongs to a different client.");
  }
  if (productId && product?.clientId !== clientId) {
    throw badRequest("That product belongs to a different client.");
  }
}

export const GET = withAdmin(async (request) => {
  const params = request.nextUrl.searchParams;
  const where: Prisma.ClientServiceWhereInput = {};
  const clientId = params.get("clientId");
  const projectId = params.get("projectId");
  if (clientId) where.clientId = clientId;
  if (projectId) where.projectId = projectId;
  return ok({ services: await listServices(where) });
});

export const POST = withAdmin(async (request, { actor, session }) => {
  const body = await readJson(request, createSchema);

  const client = await prisma.client.findUnique({
    where: { id: body.clientId },
    select: { id: true, name: true, company: true },
  });
  if (!client) throw notFound("That client no longer exists.");
  await assertOwnership(body.clientId, body.projectId, body.productId);

  const startedAt = body.startedAt ?? null;
  const expiresAt =
    body.expiresAt ?? (startedAt ? firstExpiry(startedAt, body.termMonths) : null);
  if (startedAt && expiresAt && expiresAt.getTime() <= startedAt.getTime()) {
    throw badRequest("The expiry date must be after the start date.");
  }

  const service = await prisma.clientService.create({
    data: {
      clientId: body.clientId,
      projectId: body.projectId ?? null,
      productId: body.productId ?? null,
      kind: body.kind,
      name: body.name,
      provider: body.provider,
      reference: body.reference,
      currency: body.currency,
      price: body.price,
      cost: body.cost ?? null,
      termMonths: body.termMonths,
      firstTermIncluded: body.firstTermIncluded,
      autoRenew: body.autoRenew,
      notes: body.notes,
      status: expiresAt ? "ACTIVE" : "PENDING",
      startedAt,
      expiresAt,
      createdBy: session.user.email ?? session.user.id ?? null,
    },
    include: SERVICE_INCLUDE,
  });

  await recordActivity({
    action: "service.created",
    actor,
    entityType: "client_service",
    entityId: service.id,
    entityLabel: `${service.name} · ${clientLabel(client)}`,
    summary: `Added ${KIND_LABEL[service.kind].toLowerCase()} ${service.name}${expiresAt ? `, expiring ${iso(expiresAt)}` : " (not registered yet)"}`,
    after: {
      kind: service.kind,
      price: service.price,
      currency: service.currency,
      termMonths: service.termMonths,
      status: service.status,
      expiresAt: iso(service.expiresAt),
    },
    metadata: { clientId: service.clientId, projectId: service.projectId },
  });

  return ok({ service: toServiceRow(service) });
});

export const PATCH = withAdmin(async (request, { actor }) => {
  const body = await readJson(request, patchSchema);

  const current = await prisma.clientService.findUnique({
    where: { id: body.id },
    include: SERVICE_INCLUDE,
  });
  if (!current) throw notFound("That service no longer exists.");

  const label = `${current.name} · ${clientLabel(current.client)}`;
  const base = {
    actor,
    entityType: "client_service",
    entityId: current.id,
    entityLabel: label,
    metadata: { clientId: current.clientId, projectId: current.projectId },
  };

  let data: Prisma.ClientServiceUpdateInput;
  let event: { action: string; summary: string } | null = null;
  /** Set for the two actions that start a term — see `termBilling`. */
  let term: { event: "activate" | "renew"; start: Date } | null = null;
  let registry: { registrar: string | null } | null = null;

  switch (body.action) {
    case "update": {
      const fields = body.fields;
      await assertOwnership(current.clientId, fields.projectId, fields.productId);
      const { projectId, productId, ...scalar } = fields;
      data = {
        ...scalar,
        ...(projectId !== undefined
          ? { project: projectId ? { connect: { id: projectId } } : { disconnect: true } }
          : {}),
        ...(productId !== undefined
          ? { product: productId ? { connect: { id: productId } } : { disconnect: true } }
          : {}),
      };
      break;
    }
    case "activate": {
      if (current.status === "ACTIVE") throw conflict("This service is already active.");
      const expiresAt = body.expiresAt ?? firstExpiry(body.startedAt, current.termMonths);
      if (expiresAt.getTime() <= body.startedAt.getTime()) {
        throw badRequest("The expiry date must be after the start date.");
      }
      data = { status: "ACTIVE", startedAt: body.startedAt, expiresAt, cancelledAt: null };
      term = { event: "activate", start: body.startedAt };
      event = {
        action: "service.activated",
        summary: `Registered ${current.name} — expires ${iso(expiresAt)}`,
      };
      break;
    }
    case "renew": {
      if (current.status !== "ACTIVE" || !current.expiresAt) {
        throw conflict("Only an active service with an expiry date can be renewed.");
      }
      const expiresAt = nextExpiry(current);
      data = { expiresAt, lastRenewedAt: new Date() };
      // The term being bought starts where the last one ended — unless the
      // renewal re-anchored to today because that end is too far behind.
      const anchoredToOld =
        expiresAt.getTime() === firstExpiry(current.expiresAt, current.termMonths).getTime();
      term = { event: "renew", start: anchoredToOld ? current.expiresAt : new Date() };
      event = {
        action: "service.renewed",
        summary: `Renewed ${current.name} until ${iso(expiresAt)}`,
      };
      break;
    }
    case "sync-registry": {
      if (current.kind !== "DOMAIN") throw badRequest("Only a domain has a registry to read.");
      if (current.status === "PENDING") {
        throw conflict("Mark it registered first — the registry date belongs to a registered domain.");
      }
      const lookup = await lookupDomain(current.name);
      if (!lookup.ok) throw conflict(lookup.reason);
      data = {
        expiresAt: lookup.expiresAt,
        // Only fill a blank provider: an operator's own label wins.
        ...(current.provider ? {} : { provider: lookup.registrar }),
      };
      registry = { registrar: lookup.registrar };
      event = {
        action: "service.expiry_synced",
        summary: `Read ${current.name}'s expiry from the registry: ${iso(lookup.expiresAt)}`,
      };
      break;
    }
    case "set-expiry": {
      if (current.status === "PENDING") {
        throw conflict("Register the service first — a pending service has no expiry date.");
      }
      data = { expiresAt: body.expiresAt };
      event = {
        action: "service.expiry_corrected",
        summary: `Corrected ${current.name}'s expiry from ${iso(current.expiresAt) ?? "none"} to ${iso(body.expiresAt)}`,
      };
      break;
    }
    case "cancel": {
      if (current.status === "CANCELLED") throw conflict("This service is already cancelled.");
      data = { status: "CANCELLED", cancelledAt: new Date() };
      event = { action: "service.cancelled", summary: `Cancelled ${current.name}` };
      break;
    }
    case "reactivate": {
      if (current.status !== "CANCELLED") throw conflict("Only a cancelled service can be reactivated.");
      // Back to where the dates say it was: running if it has one, pending if
      // it was cancelled before it was ever registered.
      data = { status: current.expiresAt ? "ACTIVE" : "PENDING", cancelledAt: null };
      event = { action: "service.reactivated", summary: `Reactivated ${current.name}` };
      break;
    }
  }

  // A term that starts opens its payment in the same transaction as the date
  // moving, so a renewal can never read as done with nothing to collect.
  let billing: TermBilling | null = null;
  let paymentId: string | null = null;
  if (term) {
    const project = current.projectId
      ? await prisma.project.findUnique({
          where: { id: current.projectId },
          select: { contract: { select: { proposal: { select: { currency: true } } } } },
        })
      : null;
    billing = termBilling({
      event: term.event,
      price: current.price,
      currency: current.currency,
      firstTermIncluded: current.firstTermIncluded,
      projectId: current.projectId,
      projectCurrency: project?.contract.proposal.currency ?? null,
      termStart: term.start,
    });
  }

  const updated = await prisma.$transaction(async (tx) => {
    // Renewal is guarded on the expiry it was read with. Two clicks, or two
    // operators, would otherwise each add a year and each open a payment.
    if (body.action === "renew") {
      const moved = await tx.clientService.updateMany({
        where: { id: current.id, expiresAt: current.expiresAt },
        data: data as Prisma.ClientServiceUpdateManyMutationInput,
      });
      if (moved.count === 0) {
        throw conflict("This service was already renewed — refresh to see its new date.");
      }
    } else {
      await tx.clientService.update({ where: { id: current.id }, data });
    }
    if (billing?.bill && current.projectId) {
      const payment = await tx.payment.create({
        data: {
          projectId: current.projectId,
          serviceId: current.id,
          milestone: "SERVICE_RENEWAL",
          amount: billing.amount,
          status: "PENDING",
          dueDate: billing.dueDate,
          reference: current.name.slice(0, 120),
        },
      });
      paymentId = payment.id;
    }
    return tx.clientService.findUniqueOrThrow({ where: { id: current.id }, include: SERVICE_INCLUDE });
  });

  const snapshot = (row: typeof current) => ({
    kind: row.kind,
    name: row.name,
    provider: row.provider,
    reference: row.reference,
    currency: row.currency,
    price: row.price,
    cost: row.cost,
    termMonths: row.termMonths,
    firstTermIncluded: row.firstTermIncluded,
    autoRenew: row.autoRenew,
    status: row.status,
    projectId: row.projectId,
    productId: row.productId,
    startedAt: iso(row.startedAt),
    expiresAt: iso(row.expiresAt),
    notes: row.notes,
  });

  if (event) {
    await recordChange({
      ...base,
      ...event,
      metadata: {
        ...base.metadata,
        ...(billing ? { invoiced: billing.bill, paymentId, billingNote: billing.bill ? null : billing.reason } : {}),
        ...(registry ? { source: "rdap", registrar: registry.registrar } : {}),
      },
      before: snapshot(current),
      after: snapshot(updated),
    });
  } else {
    await recordChange({
      ...base,
      action: "service.updated",
      summary: `Edited ${current.name}`,
      before: snapshot(current),
      after: snapshot(updated),
    });
  }

  return ok({
    service: toServiceRow(updated),
    billing: billing
      ? billing.bill
        ? { opened: true, amount: billing.amount, currency: current.currency }
        : { opened: false, reason: billing.reason }
      : null,
  });
});
