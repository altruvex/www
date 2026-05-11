import { prisma } from "@repo/database";
import { ContactsClient, ContactSubmission } from "./contacts-client";

export const dynamic = "force-dynamic";

export default async function ContactsPage() {
  const pageSize = 20;

  const [contactsRaw, total] = await Promise.all([
    prisma.contactSubmission.findMany({
      include: {
        assignedTo: { select: { id: true, name: true, email: true } },
        _count: { select: { notes: true, meetings: true } },
      },
      orderBy: { submittedAt: "desc" },
      take: pageSize,
    }),
    prisma.contactSubmission.count(),
  ]);

  const contacts = contactsRaw as unknown as ContactSubmission[];

  return (
    <ContactsClient
      initialContacts={contacts}
      initialTotalPages={Math.ceil(total / pageSize)}
    />
  );
}
