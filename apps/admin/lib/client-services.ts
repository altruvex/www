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
import { DAY_MS } from "@/lib/subscription-lifecycle";

export const SERVICE_INCLUDE = {
  client: { select: { id: true, name: true, company: true, email: true, phone: true } },
  project: { select: { id: true, name: true } },
  product: { select: { id: true, name: true } },
} satisfies Prisma.ClientServiceInclude;

type ServiceWithRelations = Prisma.ClientServiceGetPayload<{
  include: typeof SERVICE_INCLUDE;
}>;

export interface ServiceRow {
  id: string;
  clientId: string;
  clientLabel: string;
  clientEmail: string | null;
  clientPhone: string | null;
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
  termMonths: number | null;
  firstTermIncluded: boolean;
  autoRenew: boolean;
  startedAt: string | null;
  expiresAt: string | null;
  lastRenewedAt: string | null;
  daysUntilExpiry: number | null;
  reminded: boolean;
  reminderSentAt: string | null;
  notes: string | null;
}

export type ServiceScreenRow = Omit<ServiceRow, "price" | "cost"> & {
  price: number | null;
  cost: number | null;
};

export function redactMoney(row: ServiceRow): ServiceScreenRow {
  return { ...row, price: null, cost: null };
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

export interface SweepResult {
  checked: number;
  alerted: number;
  notifications: number;
}

export async function sweepServiceRenewals(now: Date = new Date()): Promise<SweepResult> {
  const horizon = new Date(now.getTime() + SERVICE_SOON_DAYS * DAY_MS);

  const [services, admins] = await Promise.all([
    prisma.clientService.findMany({
      where: { status: "ACTIVE", termMonths: { not: null }, expiresAt: { not: null, lte: horizon } },
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
