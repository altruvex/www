import { prisma } from "@repo/database";
import { CONTACT } from "./proposal-content";
import type { CompanyDetails } from "./proposal-schema";

const SINGLETON_ID = "default";

export async function getCompanySettings(): Promise<CompanyDetails> {
  const existing = await prisma.companySettings.findUnique({
    where: { id: SINGLETON_ID },
  });
  if (existing) {
    return {
      phone: existing.phone,
      email: existing.email,
      website: existing.website,
      brandColor: existing.brandColor,
      brandColorDark: existing.brandColorDark,
    };
  }

  const created = await prisma.companySettings.create({
    data: {
      id: SINGLETON_ID,
      phone: CONTACT.phone,
      email: CONTACT.email,
      website: CONTACT.website,
    },
  });
  return {
    phone: created.phone,
    email: created.email,
    website: created.website,
    brandColor: created.brandColor,
    brandColorDark: created.brandColorDark,
  };
}
