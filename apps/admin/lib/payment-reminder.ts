import "server-only";

import { headers } from "next/headers";

import { prisma } from "@repo/database";

import { paymentReminderDraft, type EmailDraft } from "@/lib/email-templates";
import { money } from "@/lib/format";
import { isPaymentOverdue } from "@/lib/payment-overdue";
import { paymentCurrency, paymentSourceLabel } from "@/lib/payment-source";
import { PROJECT_CURRENCY_SELECT } from "@/lib/project-currency";
import { emailTransport } from "@/lib/email";
import { canSeeFinance, type Role } from "@/lib/nav";
import { formatDocDate } from "@/lib/proposal-schema";
import { publicBaseUrlFromHeaders } from "@/lib/public-url";
import { can } from "@/lib/rbac";
import { statusOf } from "@/lib/status";

const CLIENT_SELECT = {
  select: { id: true, name: true, company: true, email: true, billingEmail: true, phone: true },
} as const;

export interface PaymentReminderTarget {
  paymentId: string;
  unpaid: boolean;
  overdue: boolean;
  label: string;
  amountLabel: string;
  dueDate: string | null;
  invoiceNumber: string | null;
  client: {
    id: string;
    name: string | null;
    company: string | null;
    email: string | null;
    phone: string;
  } | null;
  link: string | null;
  draft: EmailDraft;
}

export async function loadPaymentReminder(
  paymentId: string,
  baseUrl: string,
  now: Date = new Date(),
): Promise<PaymentReminderTarget | null> {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: {
      project: { select: { id: true, name: true, portalToken: true, client: CLIENT_SELECT, ...PROJECT_CURRENCY_SELECT } },
      subscription: { select: { planId: true, client: CLIENT_SELECT } },
      service: { select: { name: true, currency: true, client: CLIENT_SELECT } },
    },
  });
  if (!payment) return null;

  const raw = payment.service?.client ?? payment.project?.client ?? payment.subscription?.client ?? null;
  const client = raw
    ? {
        id: raw.id,
        name: raw.name,
        company: raw.company,
        email: raw.billingEmail?.trim() || raw.email,
        phone: raw.phone,
      }
    : null;
  const currency = payment.service ? payment.service.currency : paymentCurrency(payment);
  const unpaid = payment.status === "PENDING" || payment.status === "OVERDUE";
  const overdue = payment.status === "OVERDUE" || (payment.status === "PENDING" && isPaymentOverdue(payment, now));
  const label = `${statusOf("paymentMilestone", payment.milestone).label} · ${paymentSourceLabel(payment)}`;
  const amountLabel = money(payment.amount, currency);
  const link = payment.project ? `${baseUrl.replace(/\/$/, "")}/portal/${payment.project.portalToken}` : null;

  return {
    paymentId: payment.id,
    unpaid,
    overdue,
    label,
    amountLabel,
    dueDate: payment.dueDate?.toISOString() ?? null,
    invoiceNumber: payment.invoiceNumber,
    client,
    link,
    draft: paymentReminderDraft({
      clientName: client?.name || client?.company || null,
      what: label,
      amount: amountLabel,
      due: payment.dueDate ? formatDocDate(payment.dueDate) : null,
      overdue,
      invoiceNumber: payment.invoiceNumber,
      link,
    }),
  };
}

export async function loadInspectorReminder(
  payment: { id: string; status: string },
  role: Role | undefined,
): Promise<{ target: PaymentReminderTarget; emailConfigured: boolean } | null> {
  if (payment.status !== "PENDING" && payment.status !== "OVERDUE") return null;
  if (!can(role, "send", "message") || !canSeeFinance(role)) return null;
  const target = await loadPaymentReminder(payment.id, publicBaseUrlFromHeaders(await headers()));
  if (!target?.unpaid || !target.client) return null;
  return { target, emailConfigured: emailTransport() !== "none" };
}
