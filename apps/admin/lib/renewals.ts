import "server-only";
import { prisma, type Prisma } from "@repo/database";

import { listServices, type ServiceRow } from "@/lib/client-services";
import { listSubscriptions, type AdminSubscription } from "@/lib/maintenance-admin";
import { KIND_LABEL, SERVICE_SOON_DAYS, needsAttention } from "@/lib/service-lifecycle";
import {
  DAY_MS,
  needsRenewalAttention,
  RENEWAL_SOON_DAYS,
} from "@/lib/subscription-lifecycle";

export async function countRenewalsNeedingAttention(now: Date = new Date()): Promise<number> {
  const [services, retainers] = await Promise.all([
    prisma.clientService.count({
      where: {
        status: "ACTIVE",
        termMonths: { not: null },
        expiresAt: { lte: new Date(now.getTime() + SERVICE_SOON_DAYS * DAY_MS) },
      },
    }),
    prisma.maintenanceSubscription.findMany({
      where: {
        status: { notIn: ["CANCELLED", "PAUSED", "SUSPENDED"] },
        currentPeriodEnd: { lte: new Date(now.getTime() + RENEWAL_SOON_DAYS * DAY_MS) },
      },
      select: {
        status: true,
        currentPeriodEnd: true,
        autoRenew: true,
        trialEndsAt: true,
        cancelledAt: true,
      },
    }),
  ]);
  return services + retainers.filter((sub) => needsRenewalAttention(sub, now)).length;
}

export interface RenewalRow {
  readonly key: string;
  readonly kind: "retainer" | "service";
  readonly id: string;
  readonly entityType: "subscription" | "client_service";
  readonly clientId: string;
  readonly clientLabel: string;
  readonly what: string;
  readonly detail: string | null;
  readonly amount: number | null;
  readonly currency: string;
  readonly dueAt: string | null;
  readonly daysUntil: number | null;
  readonly urgency: {
    readonly registry: "renewalUrgency" | "subscriptionStatus" | "clientServiceState";
    readonly value: string;
  };
  readonly rank: 0 | 1 | 2;
  readonly needsAttention: boolean;
  readonly autoRenew: boolean;
  readonly blocked: string | null;
  readonly billingNote: string;
}

function retainerRow(sub: AdminSubscription): RenewalRow {
  const effective = sub.effectiveStatus;
  const lapsed = effective === "EXPIRED" || effective === "PAST_DUE" || effective === "GRACE";
  const attention = lapsed || ["overdue", "due-soon", "ending"].includes(sub.renewalUrgency);
  const blocked =
    sub.status === "CANCELLED"
      ? "Cancelled — start a new retainer instead"
      : sub.quoteOnly && sub.quotedMonthlyPrice === null
        ? "Quoted plan with no quote set — set the monthly price on the retainer first"
        : null;
  return {
    key: `retainer:${sub.id}`,
    kind: "retainer",
    id: sub.id,
    entityType: "subscription",
    clientId: sub.clientId,
    clientLabel: sub.clientName,
    what: `${sub.planName} · ${sub.billingIntervalLabel.toLowerCase()}`,
    detail: sub.currentPeriodPayment
      ? `This period's invoice is ${sub.currentPeriodPayment.status.toLowerCase()}`
      : "No invoice opened for this period",
    amount: sub.invoiceAmount,
    currency: sub.currency,
    dueAt: sub.renewsAt,
    daysUntil: sub.daysUntilRenewal,
    urgency: lapsed && effective === "EXPIRED"
      ? { registry: "subscriptionStatus", value: effective }
      : { registry: "renewalUrgency", value: sub.renewalUrgency },
    rank: lapsed || sub.renewalUrgency === "overdue" ? 0 : attention ? 1 : 2,
    needsAttention: attention,
    autoRenew: sub.autoRenew,
    blocked,
    billingNote:
      sub.invoiceAmount !== null
        ? `Opens the next period and a pending payment of ${sub.currency} ${sub.invoiceAmount} for it.`
        : "Opens the next period; no amount can be invoiced until a quote is set.",
  };
}

function serviceRow(service: ServiceRow): RenewalRow {
  const attention = needsAttention(service.state);
  return {
    key: `service:${service.id}`,
    kind: "service",
    id: service.id,
    entityType: "client_service",
    clientId: service.clientId,
    clientLabel: service.clientLabel,
    what: `${KIND_LABEL[service.kind]} · ${service.name}`,
    detail: service.projectName
      ? `Billed on ${service.projectName}`
      : "Not linked to a project — no payment is opened on renewal",
    amount: service.price,
    currency: service.currency,
    dueAt: service.expiresAt,
    daysUntil: service.daysUntilExpiry,
    urgency: { registry: "clientServiceState", value: service.state },
    rank: service.state === "expired" || service.state === "urgent" ? 0 : attention ? 1 : 2,
    needsAttention: attention,
    autoRenew: service.autoRenew,
    blocked:
      service.status === "CANCELLED"
        ? "Cancelled"
        : service.termMonths === null
          ? "Bought once — nothing to renew"
          : service.state === "pending"
            ? "Not registered yet — activate it from the services screen"
            : null,
    billingNote:
      service.termMonths === null
        ? "A one-time service is billed once at purchase and never renews."
        : service.projectId
          ? `Extends the term by ${service.termMonths} month${service.termMonths === 1 ? "" : "s"} and opens a pending payment of ${service.currency} ${service.price} on ${service.projectName ?? "the project"}.`
          : `Extends the term by ${service.termMonths} month${service.termMonths === 1 ? "" : "s"}. No payment is opened: the service is not on a project's schedule, so record it on the payments screen when invoiced.`,
  };
}

export async function listRenewals(
  options: { clientId?: string } = {},
  now: Date = new Date(),
): Promise<RenewalRow[]> {
  const where: Prisma.ClientServiceWhereInput = {
    status: { not: "CANCELLED" },
    termMonths: { not: null },
    expiresAt: { not: null },
    ...(options.clientId ? { clientId: options.clientId } : {}),
  };
  const [subscriptions, services] = await Promise.all([listSubscriptions(now), listServices(where, now)]);

  const rows = [
    ...subscriptions
      .filter((sub) => sub.status !== "CANCELLED")
      .filter((sub) => !options.clientId || sub.clientId === options.clientId)
      .map(retainerRow),
    ...services.map(serviceRow),
  ];
  return rows.sort((a, b) => {
    if (a.rank !== b.rank) return a.rank - b.rank;
    return (a.daysUntil ?? Number.MAX_SAFE_INTEGER) - (b.daysUntil ?? Number.MAX_SAFE_INTEGER);
  });
}
