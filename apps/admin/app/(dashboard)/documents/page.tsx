import { prisma } from "@repo/database";
import { FolderOpen } from "lucide-react";
import { PageHeader } from "@/components/os/page-header";
import { StatTile } from "@/components/os/stat-tile";
import { EmptyState } from "@/components/os/empty-state";
import { DocumentsTable, type DocumentRow } from "./documents-table";

export const dynamic = "force-dynamic";

/**
 * §9 — no anonymous files.
 *
 * There is no upload bucket in this system. Every document exists because a
 * record produced it, so this page is a projection over those records rather
 * than a file store. That is deliberate: a file with no business context is a
 * file nobody can act on six months later.
 */
export default async function DocumentsPage() {
  const [proposals, contracts] = await Promise.all([
    prisma.proposal.findMany({
      where: { OR: [{ fileUrl: { not: null } }, { pdfUrl: { not: null } }] },
      select: {
        id: true,
        fileUrl: true,
        pdfUrl: true,
        status: true,
        projectType: true,
        createdAt: true,
        updatedAt: true,
        createdBy: true,
        client: { select: { id: true, name: true, company: true } },
      },
    }),
    prisma.contract.findMany({
      where: { OR: [{ fileUrl: { not: null } }, { signedFileUrl: { not: null } }] },
      select: {
        id: true,
        fileUrl: true,
        signedFileUrl: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        signedAt: true,
        client: { select: { id: true, name: true, company: true } },
      },
    }),
  ]);

  const label = (c: { name: string | null; company: string | null }) =>
    c.company || c.name || "Unnamed client";

  const rows: DocumentRow[] = [
    ...proposals.flatMap((p) =>
      [
        p.fileUrl && {
          id: `${p.id}-deck`,
          name: `${p.projectType} proposal`,
          category: "Proposal deck",
          url: p.fileUrl,
          ownerName: p.createdBy,
          clientId: p.client.id,
          clientName: label(p.client),
          entityHref: `/proposals/${p.id}`,
          entityLabel: "Proposal",
          status: p.status,
          statusRegistry: "proposalStatus" as const,
          createdAt: p.createdAt.toISOString(),
          updatedAt: p.updatedAt.toISOString(),
        },
        p.pdfUrl && {
          id: `${p.id}-pdf`,
          name: `${p.projectType} proposal (PDF)`,
          category: "Proposal PDF",
          url: p.pdfUrl,
          ownerName: p.createdBy,
          clientId: p.client.id,
          clientName: label(p.client),
          entityHref: `/proposals/${p.id}`,
          entityLabel: "Proposal",
          status: p.status,
          statusRegistry: "proposalStatus" as const,
          createdAt: p.createdAt.toISOString(),
          updatedAt: p.updatedAt.toISOString(),
        },
      ].filter(Boolean),
    ),
    ...contracts.flatMap((c) =>
      [
        c.fileUrl && {
          id: `${c.id}-doc`,
          name: `Contract ${c.id.slice(0, 8).toUpperCase()}`,
          category: "Contract",
          url: c.fileUrl,
          ownerName: "Altruvex",
          clientId: c.client.id,
          clientName: label(c.client),
          entityHref: `/contracts/${c.id}`,
          entityLabel: "Contract",
          status: c.status,
          statusRegistry: "contractStatus" as const,
          createdAt: c.createdAt.toISOString(),
          updatedAt: c.updatedAt.toISOString(),
        },
        c.signedFileUrl && {
          id: `${c.id}-signed`,
          name: `Contract ${c.id.slice(0, 8).toUpperCase()} (signed)`,
          category: "Signed contract",
          url: c.signedFileUrl,
          ownerName: "Altruvex",
          clientId: c.client.id,
          clientName: label(c.client),
          entityHref: `/contracts/${c.id}`,
          entityLabel: "Contract",
          status: c.status,
          statusRegistry: "contractStatus" as const,
          createdAt: (c.signedAt ?? c.createdAt).toISOString(),
          updatedAt: c.updatedAt.toISOString(),
        },
      ].filter(Boolean),
    ),
  ] as DocumentRow[];

  const byCategory = rows.reduce<Record<string, number>>((acc, row) => {
    acc[row.category] = (acc[row.category] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      <PageHeader
        title="Documents"
        description="Every file the system generated, and the record that produced it. There is no loose upload bucket — a document without a business context is a document nobody can act on."
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Documents" value={rows.length} sub="All generated files" />
        <StatTile label="Proposal decks" value={(byCategory["Proposal deck"] ?? 0) + (byCategory["Proposal PDF"] ?? 0)} sub="PPTX and PDF" />
        <StatTile label="Contracts" value={byCategory["Contract"] ?? 0} sub="Unsigned copies" />
        <StatTile
          label="Signed copies"
          value={byCategory["Signed contract"] ?? 0}
          sub="Executed originals"
          tone={byCategory["Signed contract"] ? "success" : "neutral"}
        />
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon={FolderOpen}
          title="No documents generated yet"
          body="Documents appear here the moment a proposal or contract is built. Each one stays bound to the record that created it, carries that record's status, and is reachable from the client it belongs to."
        />
      ) : (
        <DocumentsTable rows={rows} />
      )}
    </div>
  );
}
