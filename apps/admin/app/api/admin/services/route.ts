import { z } from "zod";

import { prisma, type Prisma } from "@repo/database";

import { recordActivity, recordChange } from "@/lib/activity-log";
import { clientLabel, listServices, SERVICE_INCLUDE, toServiceRow } from "@/lib/client-services";
import { canSeeFinance, type Role } from "@/lib/nav";
import { lookupDomain } from "@/lib/rdap";
import {
  CLIENT_SERVICE_KINDS,
  firstExpiry,
  isOneTime,
  KIND_LABEL,
  nextExpiry,
  renewRefusal,
  termBilling,
  type TermBilling,
} from "@/lib/service-lifecycle";
import { badRequest, conflict, HttpError, notFound, ok, readJson, withAdmin } from "@/lib/with-admin";
import { PROJECT_CURRENCY_SELECT, projectCurrency } from "@/lib/project-currency";

export const dynamic = "force-dynamic";

const money = z.number().int().min(0).max(100_000_000);
const optionalText = (max: number) =>
  z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? null : value),
    z.string().trim().max(max).nullish(),
  );

const fieldsSchema = z.object({
  kind: z.enum(CLIENT_SERVICE_KINDS),
  name: z.string().trim().min(1, "Name the service").max(200),
  provider: optionalText(120),
  reference: optionalText(200),
  currency: z.string().trim().toUpperCase().length(3),
  price: money.min(1, "Set what the client pays per term"),
  cost: money.nullish(),
  termMonths: z.number().int().min(1).max(120).nullable(),
  firstTermIncluded: z.boolean(),
  autoRenew: z.boolean(),
  projectId: z.string().min(1).nullish(),
  productId: z.string().min(1).nullish(),
  notes: optionalText(2000),
});

const createSchema = fieldsSchema.extend({
  clientId: z.string().min(1),
  startedAt: z.coerce.date().nullish(),
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
  z.object({ action: z.literal("set-expiry"), id: z.string().min(1), expiresAt: z.coerce.date() }),
  z.object({ action: z.literal("sync-registry"), id: z.string().min(1) }),
  z.object({ action: z.literal("cancel"), id: z.string().min(1) }),
  z.object({ action: z.literal("reactivate"), id: z.string().min(1) }),
]);

const iso = (value: Date | null | undefined) => value?.toISOString().slice(0, 10) ?? null;

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

function rowFor(row: ReturnType<typeof toServiceRow>, role: Role | undefined) {
  return canSeeFinance(role) ? row : { ...row, price: null, cost: null };
}

function assertMoneyWritable(role: Role | undefined, fields: { price?: unknown; cost?: unknown; currency?: unknown }, creating: boolean) {
  if (canSeeFinance(role)) return;
  const touched = creating
    ? fields.cost != null
    : fields.price !== undefined || fields.cost !== undefined || fields.currency !== undefined;
  if (touched) {
    throw new HttpError(
      403,
      creating
        ? "Only a finance role can record our cost. Leave it blank and finance will fill it in."
        : "Only a finance role can change what the client pays, our cost or the currency.",
    );
  }
}

export const GET = withAdmin(async (request, { role }) => {
  const params = request.nextUrl.searchParams;
  const where: Prisma.ClientServiceWhereInput = {};
  const clientId = params.get("clientId");
  const projectId = params.get("projectId");
  if (clientId) where.clientId = clientId;
  if (projectId) where.projectId = projectId;
  return ok({ services: (await listServices(where)).map((row) => rowFor(row, role)) });
}, { can: ["view", "project"] });

export const POST = withAdmin(async (request, { actor, session, role }) => {
  const body = await readJson(request, createSchema);
  assertMoneyWritable(role, body, true);

  const client = await prisma.client.findUnique({
    where: { id: body.clientId },
    select: { id: true, name: true, company: true },
  });
  if (!client) throw notFound("That client no longer exists.");
  await assertOwnership(body.clientId, body.projectId, body.productId);

  const startedAt = body.startedAt ?? null;
  const oneTime = isOneTime(body);
  if (oneTime && body.expiresAt) throw badRequest("A one-time service has no expiry date.");
  const expiresAt =
    body.termMonths === null
      ? null
      : (body.expiresAt ?? (startedAt ? firstExpiry(startedAt, body.termMonths) : null));
  if (startedAt && expiresAt && expiresAt.getTime() <= startedAt.getTime()) {
    throw badRequest("The expiry date must be after the start date.");
  }
  const running = oneTime ? startedAt !== null : expiresAt !== null;

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
      firstTermIncluded: oneTime ? false : body.firstTermIncluded,
      autoRenew: oneTime ? false : body.autoRenew,
      notes: body.notes,
      status: running ? "ACTIVE" : "PENDING",
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
    summary: oneTime
      ? `Added one-time ${KIND_LABEL[service.kind].toLowerCase()} ${service.name}${running ? "" : " (not bought yet)"}`
      : `Added ${KIND_LABEL[service.kind].toLowerCase()} ${service.name}${expiresAt ? `, expiring ${iso(expiresAt)}` : " (not registered yet)"}`,
    after: {
      kind: service.kind,
      price: service.price,
      currency: service.currency,
      termMonths: service.termMonths,
      oneTime,
      status: service.status,
      expiresAt: iso(service.expiresAt),
    },
    metadata: { clientId: service.clientId, projectId: service.projectId },
  });

  return ok({ service: rowFor(toServiceRow(service), role) });
}, { can: ["create", "project"] });

export const PATCH = withAdmin(async (request, { actor, role }) => {
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
  let term: { event: "activate" | "renew"; start: Date } | null = null;
  let registry: { registrar: string | null } | null = null;

  switch (body.action) {
    case "update": {
      const fields = body.fields;
      assertMoneyWritable(role, fields, false);
      await assertOwnership(current.clientId, fields.projectId, fields.productId);
      const { projectId, productId, ...scalar } = fields;
      const nextTerm = fields.termMonths === undefined ? current.termMonths : fields.termMonths;
      const termChanged = fields.termMonths !== undefined && fields.termMonths !== current.termMonths;
      data = {
        ...scalar,
        ...(nextTerm === null
          ? { firstTermIncluded: false, autoRenew: false, expiresAt: null }
          : termChanged && isOneTime(current) && current.status === "ACTIVE" && current.startedAt
            ? { expiresAt: firstExpiry(current.startedAt, nextTerm) }
            : {}),
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
      if (current.termMonths === null) {
        if (body.expiresAt) throw badRequest("A one-time service has no expiry date.");
        data = { status: "ACTIVE", startedAt: body.startedAt, expiresAt: null, cancelledAt: null };
        term = { event: "activate", start: body.startedAt };
        event = {
          action: "service.activated",
          summary: `Bought ${current.name} — one-time, no renewal`,
        };
        break;
      }
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
      const refused = renewRefusal(current);
      if (refused) throw conflict(refused);
      const termMonths = current.termMonths as number;
      const lastExpiry = current.expiresAt as Date;
      const expiresAt = nextExpiry({ expiresAt: lastExpiry, termMonths });
      data = { expiresAt, lastRenewedAt: new Date() };
      const anchoredToOld = expiresAt.getTime() === firstExpiry(lastExpiry, termMonths).getTime();
      term = { event: "renew", start: anchoredToOld ? lastExpiry : new Date() };
      event = {
        action: "service.renewed",
        summary: `Renewed ${current.name} until ${iso(expiresAt)}`,
      };
      break;
    }
    case "sync-registry": {
      if (current.kind !== "DOMAIN") throw badRequest("Only a domain has a registry to read.");
      if (isOneTime(current)) throw conflict("A one-time service has no expiry to read.");
      if (current.status === "PENDING") {
        throw conflict("Mark it registered first — the registry date belongs to a registered domain.");
      }
      const lookup = await lookupDomain(current.name);
      if (!lookup.ok) throw conflict(lookup.reason);
      data = {
        expiresAt: lookup.expiresAt,
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
      if (isOneTime(current)) throw conflict("A one-time service has no expiry date.");
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
      const wasRunning = isOneTime(current) ? Boolean(current.startedAt) : Boolean(current.expiresAt);
      data = { status: wasRunning ? "ACTIVE" : "PENDING", cancelledAt: null };
      event = { action: "service.reactivated", summary: `Reactivated ${current.name}` };
      break;
    }
  }

  let billing: TermBilling | null = null;
  let paymentId: string | null = null;
  if (term) {
    const project = current.projectId
      ? await prisma.project.findUnique({
          where: { id: current.projectId },
          select: { ...PROJECT_CURRENCY_SELECT },
        })
      : null;
    billing = termBilling({
      event: term.event,
      price: current.price,
      currency: current.currency,
      firstTermIncluded: current.firstTermIncluded,
      projectId: current.projectId,
      projectCurrency: project ? projectCurrency(project) : null,
      termStart: term.start,
    });
  }

  const updated = await prisma.$transaction(async (tx) => {
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
    oneTime: isOneTime(row),
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
    service: rowFor(toServiceRow(updated), role),
    billing: billing
      ? billing.bill
        ? canSeeFinance(role)
          ? { opened: true, amount: billing.amount, currency: current.currency }
          : { opened: true }
        : { opened: false, reason: billing.reason }
      : null,
  });
}, { can: ["edit", "project"] });
