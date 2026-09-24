import "server-only";

import { prisma, type ClientService, type Prisma } from "@repo/database";

import { systemActor } from "@/lib/activity-log";
import { notifySlack } from "@/lib/slack";
import {
  crossedThreshold,
  daysUntilExpiry,
  expiryPhrase,
  KIND_LABEL,
  remindedThisCycle,
  renewalAlertKey,
  SERVICE_SOON_DAYS,
  serviceState,
  type ServiceState,
} from "@/lib/service-lifecycle";
import type { ProposalService } from "@/lib/proposal-schema";
import { DAY_MS } from "@/lib/subscription-lifecycle";

/**
 * The server side of client services: the shape screens receive, the rows a
 * signed proposal opens, and the renewal sweep.
 */

export const SERVICE_INCLUDE = {
  client: { select: { id: true, name: true, company: true, email: true, phone: true } },
  project: { select: { id: true, name: true } },
  product: { select: { id: true, name: true } },
} satisfies Prisma.ClientServiceInclude;

type ServiceWithRelations = Prisma.ClientServiceGetPayload<{
  include: typeof SERVICE_INCLUDE;
}>;

/**
 * What a client component receives. Dates travel as ISO strings and the state
 * is derived once, here, so a list and its badge counts cannot disagree.
 *
 * `cost` is included: every consumer is an admin screen. It must not be added
 * to anything the client portal serialises.
 */
export interface ServiceRow {
  id: string;
  clientId: string;
  clientLabel: string;
  /** For the renewal reminder — admin screens only, like everything here. */
  clientEmail: string | null;
  clientPhone: string;
  projectId: string | null;
  projectName: string | null;
  productId: string | null;
  productName: string | null;
  proposalId: string | null;
  kind: ClientService["kind"];
  name: string;
  provider: string | null;
  reference: string | null;
  status: ClientService["status"];
  state: ServiceState;
  currency: string;
  price: number;
  cost: number | null;
  termMonths: number;
  firstTermIncluded: boolean;
  autoRenew: boolean;
  startedAt: string | null;
  expiresAt: string | null;
  lastRenewedAt: string | null;
  daysUntilExpiry: number | null;
  /** The client has been told about the renewal coming up now. */
  reminded: boolean;
  reminderSentAt: string | null;
  notes: string | null;
}

export function clientLabel(client: { name: string | null; company: string | null }): string {
  return client.company || client.name || "Unnamed client";
}

export function toServiceRow(service: ServiceWithRelations, now: Date = new Date()): ServiceRow {
  return {
    id: service.id,
    clientId: service.clientId,
    clientLabel: clientLabel(service.client),
    clientEmail: service.client.email,
    clientPhone: service.client.phone,
    projectId: service.projectId,
    projectName: service.project?.name ?? null,
    productId: service.productId,
    productName: service.product?.name ?? null,
    proposalId: service.proposalId,
    kind: service.kind,
    name: service.name,
    provider: service.provider,
    reference: service.reference,
    status: service.status,
    state: serviceState(service, now),
    currency: service.currency,
    price: service.price,
    cost: service.cost,
    termMonths: service.termMonths,
    firstTermIncluded: service.firstTermIncluded,
    autoRenew: service.autoRenew,
    startedAt: service.startedAt?.toISOString() ?? null,
    expiresAt: service.expiresAt?.toISOString() ?? null,
    lastRenewedAt: service.lastRenewedAt?.toISOString() ?? null,
    daysUntilExpiry: service.expiresAt ? daysUntilExpiry(service.expiresAt, now) : null,
    reminded: remindedThisCycle(service),
    reminderSentAt: service.reminderSentAt?.toISOString() ?? null,
    notes: service.notes,
  };
}

/** Soonest expiry first; undated (pending) after dated; cancelled last. */
export function sortServices(rows: ServiceRow[]): ServiceRow[] {
  const rank = (row: ServiceRow) => (row.status === "CANCELLED" ? 2 : row.expiresAt ? 0 : 1);
  return [...rows].sort((a, b) => {
    const byRank = rank(a) - rank(b);
    if (byRank !== 0) return byRank;
    if (a.expiresAt && b.expiresAt) return a.expiresAt.localeCompare(b.expiresAt);
    return a.name.localeCompare(b.name);
  });
}

export async function listServices(
  where: Prisma.ClientServiceWhereInput = {},
  now: Date = new Date(),
): Promise<ServiceRow[]> {
  const services = await prisma.clientService.findMany({
    where,
    include: SERVICE_INCLUDE,
  });
  return sortServices(services.map((service) => toServiceRow(service, now)));
}

/**
 * The rows a signed proposal opens.
 *
 * PENDING, with no dates: signing is the agreement to register a domain, not
 * the registration. The real expiry is whatever the registrar says on the day
 * it is bought, and inventing one here would raise alerts against a date that
 * never existed.
 */
export function servicesFromProposal(input: {
  services: ProposalService[];
  clientId: string;
  projectId: string;
  proposalId: string;
  currency: string;
  createdBy: string;
}): Prisma.ClientServiceCreateManyInput[] {
  return input.services.map((service) => ({
    clientId: input.clientId,
    projectId: input.projectId,
    proposalId: input.proposalId,
    kind: service.kind,
    name: service.name,
    provider: service.provider?.trim() || null,
    status: "PENDING",
    currency: input.currency,
    price: service.price,
    termMonths: service.termMonths,
    firstTermIncluded: service.firstTermIncluded,
    createdBy: input.createdBy,
  }));
}

/* -------------------------------------------------------------------------- */
/* Renewal sweep                                                              */
/* -------------------------------------------------------------------------- */

export interface SweepResult {
  checked: number;
  /** Services that crossed a threshold nobody had been told about yet. */
  alerted: number;
  notifications: number;
}

/**
 * Writes the renewal alerts the calendar says are due.
 *
 * Idempotent by construction: every notification carries
 * `renewalAlertKey(service, expiry, threshold)` and the (userId, dedupeKey)
 * unique index refuses a second copy, so running this every minute, from a
 * cron and from the button on /services at the same time, still writes each
 * alert once. Slack is only told when at least one row was actually new —
 * which is the same "once" for the channel.
 *
 * The derived screens (action centre, sidebar badge, /services) never depend
 * on this having run. This is the record and the push, not the source of truth.
 */
export async function sweepServiceRenewals(now: Date = new Date()): Promise<SweepResult> {
  const horizon = new Date(now.getTime() + SERVICE_SOON_DAYS * DAY_MS);

  const [services, admins] = await Promise.all([
    prisma.clientService.findMany({
      where: { status: "ACTIVE", expiresAt: { not: null, lte: horizon } },
      include: SERVICE_INCLUDE,
    }),
    prisma.user.findMany({
      where: { role: { in: ["ADMIN", "SUPERADMIN"] } },
      select: { id: true },
    }),
  ]);

  let alerted = 0;
  let notifications = 0;

  for (const service of services) {
    const threshold = crossedThreshold(service, now);
    if (threshold === null || !service.expiresAt) continue;

    const key = renewalAlertKey(service.id, service.expiresAt, threshold);
    const who = clientLabel(service.client);
    const phrase = expiryPhrase(service.expiresAt, now);
    const title = `${KIND_LABEL[service.kind]} ${phrase} · ${who}`;
    const message = `${service.name}${service.provider ? ` (${service.provider})` : ""} — renew and invoice ${service.price.toLocaleString("en-US")} ${service.currency}${service.autoRenew ? ". The provider auto-renews it, the client still owes the term." : "."}`;

    const { count } = await prisma.notification.createMany({
      data: admins.map((admin) => ({
        type: "RENEWAL_DUE" as const,
        title,
        message,
        userId: admin.id,
        entityType: "ClientService",
        entityId: service.id,
        dedupeKey: key,
      })),
      skipDuplicates: true,
    });

    if (count === 0) continue;
    alerted += 1;
    notifications += count;

    await notifySlack({
      action: "service.renewal_due",
      actor: systemActor("Renewal check"),
      entityType: "client_service",
      entityId: service.id,
      entityLabel: `${service.name} · ${who}`,
      summary: `${KIND_LABEL[service.kind]} ${phrase} — ${service.price.toLocaleString("en-US")} ${service.currency} per term`,
    });
  }

  return { checked: services.length, alerted, notifications };
}
