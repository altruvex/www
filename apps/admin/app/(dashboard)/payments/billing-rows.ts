import "server-only";
import { format } from "date-fns";
import { prisma } from "@repo/database";
import { isPaymentDueSoon, isPaymentOverdue } from "@/lib/payment-overdue";
import { deriveStatus, REVENUE_BEARING } from "@/lib/subscription-lifecycle";
import {
  paymentCurrency,
  paymentSourceEntity,
  paymentSourceLabel,
  retainerLabel,
  RETAINER_CURRENCY,
} from "@/lib/payment-source";
import type { PaymentRow } from "./payments-table";
import { PROJECT_CURRENCY_SELECT, projectCurrency } from "@/lib/project-currency";

export const BILLING_STATUS_FILTERS = [
  "overdue",
  "due",
  "pending",
  "paid",
  "waived",
] as const;
export type BillingStatusFilter = (typeof BILLING_STATUS_FILTERS)[number];

export const BILLING_STATUS_LABEL: Record<BillingStatusFilter, string> = {
  overdue: "Overdue",
  due: "Due soon",
  pending: "Pending",
  paid: "Paid",
  waived: "Waived",
};

export function parseStatusFilter(
  value: string | undefined,
): BillingStatusFilter | null {
  const lower = value?.toLowerCase();
  return (BILLING_STATUS_FILTERS as readonly string[]).includes(lower ?? "")
    ? (lower as BillingStatusFilter)
    : null;
}

export interface BillingRow extends PaymentRow {
  dueSoon: boolean;
  invoicedAt: string | null;
  createdAt: string;
  client: {
    id: string;
    name: string | null;
    company: string | null;
    email: string | null;
    billingEmail: string | null;
    address: string | null;
    taxId: string | null;
    country: string | null;
  } | null;
}

const CLIENT_SELECT = {
  select: {
    id: true,
    name: true,
    company: true,
    email: true,
    billingEmail: true,
    address: true,
    taxId: true,
    country: true,
  },
} as const;

export function clientDisplayName(
  client: { name: string | null; company: string | null } | null,
): string {
  if (!client) return "Retainer (deleted)";
  return client.company || client.name || "Unnamed client";
}

async function previousPaidDays(
  paymentIds: string[],
): Promise<Map<string, string>> {
  const days = new Map<string, string>();
  if (paymentIds.length === 0) return days;
  const events = await prisma.activityEvent.findMany({
    where: {
      entityType: "payment",
      entityId: { in: paymentIds },
      action: "payment.status_changed",
      after: { path: ["status"], equals: "PENDING" },
    },
    orderBy: { createdAt: "desc" },
    select: { entityId: true, before: true },
  });
  for (const event of events) {
    if (days.has(event.entityId)) continue;
    const before = event.before as { paidAt?: unknown } | null;
    if (typeof before?.paidAt !== "string") continue;
    const paidAt = new Date(before.paidAt);
    if (!Number.isNaN(paidAt.getTime()))
      days.set(event.entityId, format(paidAt, "yyyy-MM-dd"));
  }
  return days;
}

export async function loadBillingRows(now = new Date()): Promise<BillingRow[]> {
  const payments = await prisma.payment.findMany({
    include: {
      project: {
        select: {
          id: true,
          name: true,
          client: CLIENT_SELECT,
          ...PROJECT_CURRENCY_SELECT,
        },
      },
      subscription: {
        select: { id: true, planId: true, client: CLIENT_SELECT },
      },
      service: {
        select: { id: true, name: true, currency: true, client: CLIENT_SELECT },
      },
    },
    orderBy: [{ status: "asc" }, { dueDate: "asc" }],
  });
  const previousPaid = await previousPaidDays(
    payments.filter((p) => p.status === "PENDING").map((p) => p.id),
  );

  return payments.map((p) => {
    const client =
      p.service?.client ?? p.project?.client ?? p.subscription?.client ?? null;
    const source = paymentSourceEntity(p);
    const currency = p.service
      ? p.service.currency
      : p.project
        ? paymentCurrency(p)
        : RETAINER_CURRENCY;
    return {
      id: p.id,
      sourceType: source?.type ?? null,
      sourceId: source?.id ?? null,
      sourceName: paymentSourceLabel(p),
      clientId: client?.id ?? null,
      clientName: clientDisplayName(client),
      client,
      milestone: p.milestone,
      amount: p.amount,
      currency,
      status: isPaymentOverdue(p, now) ? "OVERDUE" : p.status,
      dueSoon: isPaymentDueSoon(p, now),
      dueDate: p.dueDate?.toISOString() ?? null,
      paidAt: p.paidAt?.toISOString() ?? null,
      method: p.method,
      reference: p.reference,
      invoiceNumber: p.invoiceNumber,
      previousPaidOn: previousPaid.get(p.id) ?? null,
      invoicedAt: p.invoicedAt?.toISOString() ?? null,
      createdAt: p.createdAt.toISOString(),
    };
  });
}

export function matchesStatus(
  row: BillingRow,
  filter: BillingStatusFilter,
): boolean {
  switch (filter) {
    case "overdue":
      return row.status === "OVERDUE";
    case "due":
      return row.dueSoon;
    case "pending":
      return row.status === "PENDING";
    case "paid":
      return row.status === "PAID";
    case "waived":
      return row.status === "WAIVED";
  }
}

export async function loadChargeTargets(now = new Date()) {
  const [projects, subscriptions] = await Promise.all([
    prisma.project.findMany({
      where: { status: { in: ["ACTIVE", "ON_HOLD"] } },
      select: {
        id: true,
        name: true,
        clientId: true,
        client: { select: { name: true, company: true } },
        ...PROJECT_CURRENCY_SELECT,
      },
      orderBy: { name: "asc" },
    }),
    prisma.maintenanceSubscription.findMany({
      select: {
        id: true,
        planId: true,
        status: true,
        currentPeriodEnd: true,
        autoRenew: true,
        trialEndsAt: true,
        cancelledAt: true,
        clientId: true,
        client: { select: { name: true, company: true } },
      },
    }),
  ]);
  return [
    ...projects.map((p) => ({
      value: `project:${p.id}`,
      label: `${p.name} · ${clientDisplayName(p.client)}`,
      currency: projectCurrency(p),
      clientId: p.clientId,
    })),
    ...subscriptions
      .filter((s) => REVENUE_BEARING.has(deriveStatus(s, now)))
      .map((s) => ({
        value: `retainer:${s.id}`,
        label: `${retainerLabel(s)} · ${clientDisplayName(s.client)}`,
        currency: RETAINER_CURRENCY,
        clientId: s.clientId,
      })),
  ];
}
