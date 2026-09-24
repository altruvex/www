import { notFound } from "next/navigation";
import { prisma } from "@repo/database";
import { PageHeader } from "@/components/os/page-header";
import { Panel } from "@/components/os/panel";
import { EditClientForm } from "./edit-client-form";

export const dynamic = "force-dynamic";

export default async function EditClientPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const client = await prisma.client.findUnique({
    where: { id },
    select: { id: true, name: true, phone: true, email: true, company: true, industry: true },
  });

  if (!client) notFound();

  const displayName = client.company || client.name || client.phone;

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
              phone: client.phone,
              email: client.email ?? "",
              company: client.company ?? "",
              industry: client.industry ?? "",
            }}
          />
        </Panel>
      </div>
    </div>
  );
}
