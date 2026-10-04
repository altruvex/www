"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@repo/database";

import { updateCompanyProfile } from "@/app/(dashboard)/_actions/records";
import { getOperator } from "@/lib/authorize";
import { recordChange, userActor } from "@/lib/activity-log";
import { looksLikeAnAddress } from "@/lib/email";
import { can } from "@/lib/rbac";
import { INVOICE_PREFIX_PATTERN } from "@/lib/team-rules";

export type ActionResult = { ok: true; message?: string } | { ok: false; message: string };

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

export interface CompanyProfileInput {
  phone: string;
  email: string;
  website: string;
  brandColor: string;
  brandColorDark: string;
}

const PROFILE_LABELS: Record<keyof CompanyProfileInput, string> = {
  phone: "phone",
  email: "email",
  website: "website",
  brandColor: "light accent",
  brandColorDark: "dark accent",
};

const HEX_PATTERN = /^[0-9a-f]{6}$/i;

export async function saveCompanyProfile(input: CompanyProfileInput): Promise<ActionResult> {
  const operator = await getOperator();
  if (!operator || !can(operator.role, "edit", "settings")) {
    return { ok: false, message: "Only an owner or admin can change the company profile." };
  }

  const data: CompanyProfileInput = {
    phone: input.phone.trim(),
    email: input.email.trim(),
    website: input.website.trim(),
    brandColor: input.brandColor.replace(/^#/, "").trim(),
    brandColorDark: input.brandColorDark.replace(/^#/, "").trim(),
  };
  if (!data.phone || !data.email || !data.website) {
    return { ok: false, message: "Phone, email and website are all printed on documents — none can be blank." };
  }
  if (!looksLikeAnAddress(data.email)) {
    return { ok: false, message: `"${data.email}" does not look like an email address.` };
  }
  if (!/^https?:\/\/\S+$/i.test(data.website)) {
    return { ok: false, message: "The website needs to start with http:// or https://." };
  }
  for (const key of ["brandColor", "brandColorDark"] as const) {
    if (data[key] && !HEX_PATTERN.test(data[key])) {
      return { ok: false, message: `The ${PROFILE_LABELS[key]} must be six hex digits, like 1D4ED8.` };
    }
  }

  const before = await prisma.companySettings.findUnique({
    where: { id: "default" },
    select: { phone: true, email: true, website: true, brandColor: true, brandColorDark: true },
  });
  const changed = (Object.keys(PROFILE_LABELS) as (keyof CompanyProfileInput)[]).filter(
    (key) => (before?.[key] ?? "") !== (data[key] || before?.[key] || ""),
  );
  if (before && changed.length === 0) return { ok: true, message: "Nothing changed." };

  try {
    await updateCompanyProfile(data);
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error && error.message ? error.message : "The profile could not be saved.",
    };
  }

  return {
    ok: true,
    message: before
      ? `Company profile saved — changed ${changed.map((key) => PROFILE_LABELS[key]).join(", ")}.`
      : "Company profile created.",
  };
}
