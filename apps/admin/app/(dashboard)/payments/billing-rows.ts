import "server-only";
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

/**
 * One loader for every Billing tab, so Payments, Outstanding and Invoices
 * never disagree about a row's client, currency or effective status.
 *
 * Currency is the one thing a payment cannot say for itself: a project
 * payment reads it from its contract's proposal, a service term from the
 * service, a retainer from the plan's published currency. Status is stored
 * PENDING and reads OVERDUE here once the due day has passed — the table is
 * where the derivation happens, so nothing has to write OVERDUE back.
 */

export const BILLING_STATUS_FILTERS = ["overdue", "due", "pending", "paid", "waived"] as const;
export type BillingStatusFilter = (typeof BILLING_STATUS_FILTERS)[number];

export const BILLING_STATUS_LABEL: Record<BillingStatusFilter, string> = {
  overdue: "Overdue",
  due: "Due soon",
  pending: "Pending",
  paid: "Paid",
  waived: "Waived",
};

/** `?status=` is read case-insensitively; the Today page links "PAID" and "overdue" alike. */
export function parseStatusFilter(value: string | undefined): BillingStatusFilter | null {
  const lower = value?.toLowerCase();
  return (BILLING_STATUS_FILTERS as readonly string[]).includes(lower ?? "")
    ? (lower as BillingStatusFilter)
    : null;
}

export interface BillingRow extends PaymentRow {
  /** True while the row is unpaid and inside the chasing window. */
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

export function clientDisplayName(client: { name: string | null; company: string | null } | null): string {
  if (!client) return "Retainer (deleted)";
  return client.company || client.name || "Unnamed client";
}

export async function loadBillingRows(now = new Date()): Promise<BillingRow[]> {
  const payments = await prisma.payment.findMany({
    include: {
      project: {
        select: {
          id: true,
          name: true,
          client: CLIENT_SELECT,
          contract: { select: { proposal: { select: { currency: true } } } },
        },
      },
      subscription: { select: { id: true, planId: true, client: CLIENT_SELECT } },
      service: { select: { id: true, name: true, currency: true, client: CLIENT_SELECT } },
    },
    orderBy: [{ status: "asc" }, { dueDate: "asc" }],
  });

  return payments.map((p) => {
    const client = p.service?.client ?? p.project?.client ?? p.subscription?.client ?? null;
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
      invoicedAt: p.invoicedAt?.toISOString() ?? null,
      createdAt: p.createdAt.toISOString(),
    };
  });
}

export function matchesStatus(row: BillingRow, filter: BillingStatusFilter): boolean {
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

/** The project and retainer a new charge can bill: the ones still running. */
export async function loadChargeTargets(now = new Date()) {
  const [projects, subscriptions] = await Promise.all([
    prisma.project.findMany({
      where: { status: { in: ["ACTIVE", "ON_HOLD"] } },
      select: {
        id: true,
        name: true,
        client: { select: { name: true, company: true } },
        contract: { select: { proposal: { select: { currency: true } } } },
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
        client: { select: { name: true, company: true } },
      },
    }),
  ]);
  return [
    ...projects.map((p) => ({
      value: `project:${p.id}`,
      label: `${p.name} · ${clientDisplayName(p.client)}`,
      currency: p.contract.proposal.currency,
    })),
    ...subscriptions
      .filter((s) => REVENUE_BEARING.has(deriveStatus(s, now)))
      .map((s) => ({
        value: `retainer:${s.id}`,
        label: `${retainerLabel(s)} · ${clientDisplayName(s.client)}`,
        currency: RETAINER_CURRENCY,
      })),
  ];
}
