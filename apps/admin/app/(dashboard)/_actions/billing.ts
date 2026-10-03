"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@repo/database";
import { authorize } from "@/lib/authorize";
import { recordActivity, recordChange, userActor } from "@/lib/activity-log";
import { issueInvoiceNumber } from "@/lib/invoice-number";
import { isPaymentMethod, paymentSourceLabel } from "@/lib/payment-source";
import { statusOf } from "@/lib/status";

/**
 * Billing mutations: recording money that arrived, opening an ad-hoc charge,
 * and issuing an invoice number. Each one authorises, validates, writes, and
 * audits at the site of the write; a refusal is a `{ ok: false, message }`
 * the dialog can show, never a thrown error.
 *
 * What is NOT here, on purpose: refunds, partial payments and card payments.
 * The system has no payment provider, so a button for any of them would be a
 * no-op dressed as a feature — the Billing screen says "Integration required"
 * instead.
 */

type Result<T extends object = object> = ({ ok: true } & T) | { ok: false; message: string };

const MAX_REFERENCE = 120;
const BILLING_PATHS = ["/payments", "/invoices", "/"] as const;

async function permitted(action: "create" | "edit") {
  try {
    return await authorize(action, "payment");
  } catch {
    return null;
  }
}

function revalidateBilling(extra: string[] = []) {
  for (const path of [...BILLING_PATHS, ...extra]) revalidatePath(path);
}

/** "Deposit · 50% · Acme website" — the words an audit row names a payment by. */
function paymentLabel(payment: {
  milestone: string;
  project: { name: string } | null;
  subscription: { planId: string } | null;
  service: { name: string } | null;
}): string {
  return `${statusOf("paymentMilestone", payment.milestone).label} · ${paymentSourceLabel(payment)}`;
}

/** A YYYY-MM-DD day as the instant that day began, or null when malformed. */
function parseDay(value: string | null | undefined): Date | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const parsed = new Date(`${value}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

const PAYMENT_SOURCE_SELECT = {
  project: { select: { name: true } },
  subscription: { select: { planId: true } },
  service: { select: { name: true } },
} as const;

export interface RecordPaymentInput {
  /** YYYY-MM-DD; today when omitted. */
  paidOn?: string | null;
  method: string;
  reference?: string | null;
}

/**
 * Marks a payment PAID with how and when the money arrived. A row already
 * PAID is refused rather than silently re-dated: the date money arrived is
 * evidence, and correcting it is a deliberate act, not a second click.
 */
export async function recordPayment(paymentId: string, input: RecordPaymentInput): Promise<Result> {
  const session = await permitted("edit");
  if (!session) return { ok: false, message: "Your role cannot record payments." };

  if (!isPaymentMethod(input.method)) return { ok: false, message: "Choose how the money arrived." };
  const paidAt = input.paidOn ? parseDay(input.paidOn) : new Date();
  if (!paidAt) return { ok: false, message: "The payment date is not a valid day." };
  if (paidAt.getTime() > Date.now()) return { ok: false, message: "A payment cannot be recorded for a future day." };
  const reference = input.reference?.trim().slice(0, MAX_REFERENCE) || null;

  const before = await prisma.payment.findUnique({
    where: { id: paymentId },
    select: { status: true, paidAt: true, method: true, reference: true, milestone: true, ...PAYMENT_SOURCE_SELECT },
  });
  if (!before) return { ok: false, message: "Payment not found." };
  if (before.status === "PAID") {
    return { ok: false, message: "This payment is already recorded as paid. Set it back to pending first if the record is wrong." };
  }
  if (before.status === "WAIVED") {
    return { ok: false, message: "This payment was waived. Set it back to pending before recording money against it." };
  }

  const after = { status: "PAID" as const, paidAt, method: input.method, reference: reference ?? before.reference };
  await prisma.payment.update({ where: { id: paymentId }, data: after });
  await recordChange({
    action: "payment.recorded",
    actor: userActor(session),
    entityType: "payment",
    entityId: paymentId,
    entityLabel: paymentLabel(before),
    summary: `Recorded payment by ${input.method.replace("_", " ")}`,
    before: { status: before.status, paidAt: before.paidAt, method: before.method, reference: before.reference },
    after,
  });
  revalidateBilling();
  return { ok: true };
}

export interface NewChargeInput {
  /** Exactly one of the two: the project or the retainer the charge bills. */
  projectId?: string | null;
  subscriptionId?: string | null;
  /** Whole currency units, typed by the operator. */
  amount: number;
  /** YYYY-MM-DD. */
  dueOn: string;
  /** What the charge is for; stored as the payment's reference. */
  description: string;
}

/**
 * Opens a one-off PENDING charge against a project or a retainer. The amount
 * is operator data — a figure agreed with the client — not a published price,
 * which is why it is typed here and not resolved from the pricing schema.
 */
export async function createCharge(input: NewChargeInput): Promise<Result<{ paymentId: string }>> {
  const session = await permitted("create");
  if (!session) return { ok: false, message: "Your role cannot open charges." };

  if (!Number.isInteger(input.amount) || input.amount <= 0) {
    return { ok: false, message: "Enter the amount as a whole number above zero." };
  }
  const dueDate = parseDay(input.dueOn);
  if (!dueDate) return { ok: false, message: "Pick the day the charge is due." };
  const description = input.description.trim();
  if (!description) return { ok: false, message: "Say what the charge is for." };
  if (description.length > MAX_REFERENCE) {
    return { ok: false, message: `Keep the description to ${MAX_REFERENCE} characters.` };
  }
  if (Boolean(input.projectId) === Boolean(input.subscriptionId)) {
    return { ok: false, message: "Pick either a project or a retainer to bill." };
  }

  let sourceLabel: string;
  if (input.projectId) {
    const project = await prisma.project.findUnique({
      where: { id: input.projectId },
      select: { name: true, client: { select: { company: true, name: true } } },
    });
    if (!project) return { ok: false, message: "That project no longer exists." };
    sourceLabel = project.name;
  } else {
    const subscription = await prisma.maintenanceSubscription.findUnique({
      where: { id: input.subscriptionId! },
      select: { planId: true },
    });
    if (!subscription) return { ok: false, message: "That retainer no longer exists." };
    sourceLabel = paymentSourceLabel({ project: null, subscription });
  }

  const payment = await prisma.payment.create({
    data: {
      projectId: input.projectId || null,
      subscriptionId: input.subscriptionId || null,
      milestone: "OTHER",
      amount: input.amount,
      status: "PENDING",
      dueDate,
      reference: description,
    },
    select: { id: true },
  });
  await recordActivity({
    action: "payment.created",
    actor: userActor(session),
    entityType: "payment",
    entityId: payment.id,
    entityLabel: `${description} · ${sourceLabel}`,
    summary: `Opened a charge of ${input.amount} for ${sourceLabel}`,
    after: { amount: input.amount, dueDate, reference: description, milestone: "OTHER" },
  });
  revalidateBilling(input.projectId ? [`/projects/${input.projectId}`] : []);
  return { ok: true, paymentId: payment.id };
}

/**
 * Issues the invoice for a payment: assigns the next number from the company
 * sequence, once. Re-issuing returns the number already held and writes
 * nothing — including no audit row, since nothing changed.
 */
export async function issueInvoice(paymentId: string): Promise<Result<{ invoiceNumber: string }>> {
  const session = await permitted("edit");
  if (!session) return { ok: false, message: "Your role cannot issue invoices." };

  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    select: { status: true, milestone: true, ...PAYMENT_SOURCE_SELECT },
  });
  if (!payment) return { ok: false, message: "Payment not found." };
  if (payment.status === "WAIVED") {
    return { ok: false, message: "A waived payment is not invoiced — nothing is owed on it." };
  }

  const issued = await issueInvoiceNumber(paymentId);
  if (!issued.ok) return issued;
  if (!issued.alreadyIssued) {
    await recordActivity({
      action: "payment.invoice_issued",
      actor: userActor(session),
      entityType: "payment",
      entityId: paymentId,
      entityLabel: paymentLabel(payment),
      summary: `Issued invoice ${issued.invoiceNumber}`,
      after: { invoiceNumber: issued.invoiceNumber, invoicedAt: issued.invoicedAt },
    });
    revalidateBilling();
  }
  return { ok: true, invoiceNumber: issued.invoiceNumber };
}
