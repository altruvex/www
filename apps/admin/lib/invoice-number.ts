import { prisma } from "@repo/database";
import { getCompanySettings } from "@/lib/company-settings";

/**
 * Invoice numbers (ruling 2026-10-03).
 *
 * A number is assigned ONCE, from `CompanySettings.invoiceSequence`, and never
 * reused or recomputed. The previous screen numbered invoices by their position
 * in the list, so deleting a row renumbered every invoice issued after it —
 * a client holding "INV-2026-007" could come back to find that number on a
 * different payment.
 *
 * The increment is a single `UPDATE … SET invoiceSequence = invoiceSequence + 1
 * RETURNING`, inside an interactive transaction with the write to the payment,
 * so two operators issuing at the same instant get consecutive numbers rather
 * than the same one. The unique constraint on `Payment.invoiceNumber` is the
 * backstop, not the mechanism. Gaps are possible (a rolled-back transaction
 * burns a number) and are acceptable: a gap is honest, a duplicate is not.
 */

const SETTINGS_ID = "default";
const SEQUENCE_WIDTH = 4;

/** "INV-0042" — the prefix the company chose, a dash, the sequence zero-padded. */
export function formatInvoiceNumber(prefix: string, sequence: number): string {
  return `${prefix}-${String(sequence).padStart(SEQUENCE_WIDTH, "0")}`;
}

/** How the next invoice will be numbered: `PREFIX-000N`, with N = sequence + 1. */
export async function getInvoiceNumbering(): Promise<{
  invoicePrefix: string;
  invoiceSequence: number;
  next: string;
}> {
  // Seeding the row is `getCompanySettings`' job; by the time this runs the
  // settings page has already called it.
  const row = await prisma.companySettings.findUnique({
    where: { id: SETTINGS_ID },
    select: { invoicePrefix: true, invoiceSequence: true },
  });
  const invoicePrefix = row?.invoicePrefix ?? "INV";
  const invoiceSequence = row?.invoiceSequence ?? 0;
  return {
    invoicePrefix,
    invoiceSequence,
    next: formatInvoiceNumber(invoicePrefix, invoiceSequence + 1),
  };
}

export type IssueResult =
  | { ok: true; invoiceNumber: string; invoicedAt: Date; alreadyIssued: boolean }
  | { ok: false; message: string };

/**
 * Assigns the next invoice number to a payment, or returns the one it already
 * holds. Idempotent: issuing twice never changes the number, and never burns
 * a second one for the same payment unless two issues race — in which case the
 * loser's `updateMany` matches nothing and the number it drew is left unused.
 */
export async function issueInvoiceNumber(
  paymentId: string,
  now: Date = new Date(),
): Promise<IssueResult> {
  // Seeds the settings row on a fresh database so the increment below has a
  // row to increment; a no-op once it exists.
  await getCompanySettings();

  return prisma.$transaction(async (tx) => {
    const existing = await tx.payment.findUnique({
      where: { id: paymentId },
      select: { invoiceNumber: true, invoicedAt: true },
    });
    if (!existing) return { ok: false, message: "Payment not found." };
    if (existing.invoiceNumber) {
      return {
        ok: true,
        invoiceNumber: existing.invoiceNumber,
        invoicedAt: existing.invoicedAt ?? now,
        alreadyIssued: true,
      };
    }

    const settings = await tx.companySettings.update({
      where: { id: SETTINGS_ID },
      data: { invoiceSequence: { increment: 1 } },
      select: { invoicePrefix: true, invoiceSequence: true },
    });
    const invoiceNumber = formatInvoiceNumber(settings.invoicePrefix, settings.invoiceSequence);

    // The `invoiceNumber: null` guard is what makes a race safe: whichever
    // transaction commits second finds the column already filled and writes
    // nothing, instead of overwriting a number the client may already hold.
    const written = await tx.payment.updateMany({
      where: { id: paymentId, invoiceNumber: null },
      data: { invoiceNumber, invoicedAt: now },
    });
    if (written.count === 0) {
      const taken = await tx.payment.findUniqueOrThrow({
        where: { id: paymentId },
        select: { invoiceNumber: true, invoicedAt: true },
      });
      return {
        ok: true,
        invoiceNumber: taken.invoiceNumber ?? invoiceNumber,
        invoicedAt: taken.invoicedAt ?? now,
        alreadyIssued: true,
      };
    }
    return { ok: true, invoiceNumber, invoicedAt: now, alreadyIssued: false };
  });
}
