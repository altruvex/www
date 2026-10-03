"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@repo/database";

import { getOperator } from "@/lib/authorize";
import { recordChange, userActor } from "@/lib/activity-log";
import { can } from "@/lib/rbac";
import { INVOICE_PREFIX_PATTERN } from "@/lib/team-rules";

export type ActionResult = { ok: true; message?: string } | { ok: false; message: string };

/**
 * The invoice prefix is the only numbering input an operator sets; the
 * sequence itself is incremented atomically when a payment is invoiced and is
 * read-only here, because a hand-set counter is how two invoices end up with
 * one number.
 */
export async function updateInvoicePrefix(raw: string): Promise<ActionResult> {
  const operator = await getOperator();
  if (!operator || !can(operator.role, "edit", "settings")) {
    return { ok: false, message: "Only an owner or admin can change invoice numbering." };
  }

  const prefix = raw.trim().toUpperCase();
  if (!INVOICE_PREFIX_PATTERN.test(prefix)) {
    return {
      ok: false,
      message: "Use 1–8 characters: upper-case letters, digits and hyphens only.",
    };
  }

  const before = await prisma.companySettings.findUnique({
    where: { id: "default" },
    select: { invoicePrefix: true },
  });
  if (!before) return { ok: false, message: "Company settings have not been created yet. Open Settings once first." };
  if (before.invoicePrefix === prefix) return { ok: true, message: "That is already the prefix." };

  await prisma.companySettings.update({ where: { id: "default" }, data: { invoicePrefix: prefix } });
  await recordChange({
    action: "settings.invoice_prefix_updated",
    actor: userActor(operator.session),
    entityType: "settings",
    entityId: "default",
    entityLabel: "Invoice numbering",
    summary: `Changed the invoice prefix to ${prefix}`,
    before: { invoicePrefix: before.invoicePrefix },
    after: { invoicePrefix: prefix },
  });
  revalidatePath("/settings");
  return { ok: true, message: `Invoices will now be numbered ${prefix}-…` };
}
