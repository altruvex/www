/**
 * Invoice numbering — the properties the ledger depends on.
 *
 *   1. A payment is numbered once: issuing again returns the same number and
 *      reports `alreadyIssued`, and the company sequence does not move.
 *   2. Two payments issued at the same moment get two different numbers.
 *   3. Numbers are `${invoicePrefix}-${sequence padded to four}`.
 *   4. A waived payment can still be looked up but the action layer refuses
 *      it — that rule lives in `_actions/billing.ts`, not here.
 *
 * Needs DATABASE_URL; point it at a scratch database. Fixtures are bare
 * payments (no project, no retainer) suffixed with the run's timestamp and
 * removed in `finally`. The sequence counter is left where the run moved it:
 * numbers are never reused, so winding it back would be a lie.
 *
 *   DATABASE_URL=postgresql://…/altruvex_scratch bunx tsx scripts/verify-invoice-number.ts
 */
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

    // Concurrent issue: two payments at once must get two different numbers.
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

    // Idempotence: issuing again returns the same number and moves nothing.
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
