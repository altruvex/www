import { prisma } from "@repo/database";
import { getCompanySettings } from "@/lib/company-settings";

const SETTINGS_ID = "default";
const SEQUENCE_WIDTH = 4;

export function formatInvoiceNumber(prefix: string, sequence: number): string {
  return `${prefix}-${String(sequence).padStart(SEQUENCE_WIDTH, "0")}`;
}

export async function getInvoiceNumbering(): Promise<{
  invoicePrefix: string;
  invoiceSequence: number;
  next: string;
}> {
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

export async function issueInvoiceNumber(
  paymentId: string,
  now: Date = new Date(),
): Promise<IssueResult> {
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
