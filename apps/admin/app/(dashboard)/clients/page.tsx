import { prisma } from "@repo/database";
import { ClientsClient, type ClientRow } from "./clients-client";

export const dynamic = "force-dynamic";

export default async function ClientsPage() {
  const pageSize = 20;

  const [clientsRaw, total] = await Promise.all([
    prisma.client.findMany({
      include: {
        contactSubmission: {
          select: { id: true, message: true, serviceInterest: true },
        },
        transparencyLead: {
          select: {
            projectType: true,
            complexity: true,
            timeline: true,
            priceMin: true,
            priceMax: true,
            weeksMin: true,
            weeksMax: true,
          },
        },
        proposals: { select: { status: true }, orderBy: { createdAt: "desc" }, take: 1 },
        contracts: { select: { status: true }, orderBy: { createdAt: "desc" }, take: 1 },
      },
      orderBy: { createdAt: "desc" },
      take: pageSize,
    }),
    prisma.client.count(),
  ]);

  const clients = clientsRaw as unknown as ClientRow[];

  return (
    <ClientsClient
      initialClients={clients}
      initialTotalPages={Math.ceil(total / pageSize)}
    />
  );
}
