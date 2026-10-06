import "server-only";
import { prisma } from "@repo/database";

import type { PickOption } from "@/components/os/pick-to-open";

/** The clients an operator most likely means, for a PickToOpen that lands on one client's section. */
export async function clientPickOptions(section?: string): Promise<PickOption[]> {
  const clients = await prisma.client.findMany({
    orderBy: { updatedAt: "desc" },
    take: 50,
    select: { id: true, name: true, company: true, phone: true, email: true },
  });
  return clients.map((c) => ({
    href: `/clients/${c.id}${section ? `#${section}` : ""}`,
    label: c.company || c.name || c.phone || c.email || "Unnamed client",
    hint: [c.company ? c.name : null, c.phone || c.email].filter(Boolean).join(" · ") || undefined,
  }));
}
