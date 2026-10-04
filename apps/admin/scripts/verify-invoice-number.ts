import { prisma } from "@repo/database";
import { formatInvoiceNumber, issueInvoiceNumber } from "../lib/invoice-number";

if (!process.env.DATABASE_URL) {
  console.log("verify:invoice-number — skipped, DATABASE_URL not set");
  process.exit(0);
}

let failures = 0;
function check(ok: boolean, what: string) {
  console.log(`${ok ? "ok  " : "FAIL"} ${what}`);
  if (!ok) failures += 1;
}

async function main() {
  const tag = `verify-invoice-number ${Date.now()}`;
  const ids: string[] = [];

  try {
    const [a, b] = await Promise.all([
      prisma.payment.create({
        data: {
          milestone: "OTHER",
          amount: 1,
          status: "PENDING",
          reference: tag,
        },
      }),
      prisma.payment.create({
        data: {
          milestone: "OTHER",
          amount: 1,
          status: "PENDING",
          reference: tag,
        },
      }),
    ]);
    ids.push(a.id, b.id);

    const settingsBefore = await prisma.companySettings.findUnique({
      where: { id: "default" },
    });
    const seqBefore = settingsBefore?.invoiceSequence ?? 0;
    const prefix = settingsBefore?.invoicePrefix ?? "INV";

    check(
      formatInvoiceNumber("INV", 7) === "INV-0007",
      "format pads the sequence to four digits",
    );
    check(
      formatInvoiceNumber("INV", 12345) === "INV-12345",
      "format does not truncate a five-digit sequence",
    );

    const [first, second] = await Promise.all([
      issueInvoiceNumber(a.id),
      issueInvoiceNumber(b.id),
    ]);
    check(first.ok && second.ok, "both concurrent issues succeed");
    if (first.ok && second.ok) {
      check(
        first.invoiceNumber !== second.invoiceNumber,
        "concurrent issues get distinct numbers",
      );
      check(
        !first.alreadyIssued && !second.alreadyIssued,
        "first issue is reported as new",
      );
      const expected = new Set([
        formatInvoiceNumber(prefix, seqBefore + 1),
        formatInvoiceNumber(prefix, seqBefore + 2),
      ]);
      check(
        expected.has(first.invoiceNumber) && expected.has(second.invoiceNumber),
        "numbers are the next two in the company sequence",
      );
      check(
        first.invoicedAt instanceof Date && second.invoicedAt instanceof Date,
        "invoicedAt is stamped",
      );
    }

    const again = await issueInvoiceNumber(a.id);
    check(
      again.ok && first.ok && again.invoiceNumber === first.invoiceNumber,
      "re-issuing returns the same number",
    );
    check(again.ok && again.alreadyIssued, "re-issuing reports alreadyIssued");
    const settingsAfter = await prisma.companySettings.findUnique({
      where: { id: "default" },
    });
    check(
      (settingsAfter?.invoiceSequence ?? 0) === seqBefore + 2,
      "sequence advanced by exactly two",
    );

    const stored = await prisma.payment.findUnique({
      where: { id: a.id },
      select: { invoiceNumber: true, invoicedAt: true },
    });
    check(
      first.ok && stored?.invoiceNumber === first.invoiceNumber,
      "number is persisted on the payment",
    );
    check(stored?.invoicedAt != null, "invoicedAt is persisted on the payment");

    const missing = await issueInvoiceNumber("does-not-exist");
    check(!missing.ok, "an unknown payment is refused with a message");
  } finally {
    await prisma.payment.deleteMany({ where: { id: { in: ids } } });
    await prisma.$disconnect();
  }

  if (failures) {
    console.error(`verify:invoice-number — ${failures} failed`);
    process.exit(1);
  }
  console.log("verify:invoice-number — all passed");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
