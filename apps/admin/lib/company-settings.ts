import { prisma } from "@repo/database";
import { CONTACT } from "./proposal-content";
import type { CompanyDetails } from "./proposal-schema";

// One shared record, id "default". Company-wide on purpose: the deck's
// visual system and contact block are the same for every client, and only
// the proposal's content varies.
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

  // Seed on first use from the values the deck already shipped with, so a
  // fresh environment generates the same document as the current one.
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
