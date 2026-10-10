import { notFound } from "next/navigation";
import { prisma } from "@repo/database";
import { gateRoute } from "@/lib/page-gate";
import { contactLabel } from "@/lib/format";
import { PageHeader } from "@/components/os/page-header";
import { Panel } from "@/components/os/panel";
import { EditClientForm } from "./edit-client-form";

export const dynamic = "force-dynamic";

export default async function EditClientPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const denied = await gateRoute("/clients/[id]/edit", "this client");
  if (denied) return denied;

  const { id } = await params;

  const client = await prisma.client.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      phone: true,
      email: true,
      company: true,
      industry: true,
      website: true,
      country: true,
      address: true,
      billingEmail: true,
      taxId: true,
    },
  });

  if (!client) notFound();

  const displayName = contactLabel(client);

  return (
    <div className="space-y-4">
      <PageHeader
        crumbs={[
          { label: "Clients", href: "/clients" },
          { label: displayName, href: `/clients/${client.id}` },
          { label: "Edit" },
        ]}
        title="Edit client"
        description="Changes are recorded in the audit trail."
      />
      <div className="max-w-lg">
        <Panel title="Details">
          <EditClientForm
            clientId={client.id}
            initial={{
              name: client.name ?? "",
              phone: client.phone ?? "",
              email: client.email ?? "",
              company: client.company ?? "",
              industry: client.industry ?? "",
              website: client.website ?? "",
              country: client.country ?? "",
              address: client.address ?? "",
              billingEmail: client.billingEmail ?? "",
              taxId: client.taxId ?? "",
            }}
          />
        </Panel>
      </div>
    </div>
  );
}
