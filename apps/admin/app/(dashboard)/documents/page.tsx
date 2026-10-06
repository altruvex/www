import Link from "next/link";
import { prisma } from "@repo/database";
import { Download, ExternalLink, FolderOpen } from "lucide-react";
import { Button } from "@repo/ui";
import { PageHeader } from "@/components/os/page-header";
import { StatTile } from "@/components/os/stat-tile";
import { EmptyState } from "@/components/os/empty-state";
import { NewProposalButton } from "@/components/os/new-proposal-button";
import { ActiveFilters, FilterBar, FilterChip } from "@/components/os/filter-bar";
import { InspectSheet } from "@/components/os/inspect-sheet";
import { MetaList } from "@/components/os/detail-layout";
import { EntityLink } from "@/components/os/entity-link";
import { StatusPill } from "@/components/ui/badge";
import { gateRoute } from "@/lib/page-gate";
import { currentRole } from "@/lib/authorize";
import { can } from "@/lib/rbac";
import { dateTime } from "@/lib/format";
import { documentUrl } from "@/lib/storage";
import { DocumentsTable, type DocumentRow } from "./documents-table";

const TYPE_FILTERS = [
  { value: "proposal", label: "Proposals", categories: ["Proposal deck", "Proposal PDF"] },
  { value: "contract", label: "Contracts", categories: ["Contract"] },
  { value: "signed", label: "Signed copies", categories: ["Signed contract"] },
] as const;

function documentsHref(scope: { client?: string | null; type?: string | null }) {
  const params = new URLSearchParams();
  if (scope.client) params.set("client", scope.client);
  if (scope.type) params.set("type", scope.type);
  const query = params.toString();
  return query ? `/documents?${query}` : "/documents";
}

export const dynamic = "force-dynamic";

export default async function DocumentsPage({
  searchParams,
}: {
  searchParams: Promise<{ client?: string; type?: string; inspect?: string }>;
}) {
  const denied = await gateRoute("/documents");
  if (denied) return denied;

  const params = await searchParams;
  const clientId = params.client?.trim() || null;
  const typeFilter = TYPE_FILTERS.find((f) => f.value === params.type) ?? null;
  const inspectId = params.inspect?.trim() || null;
  const role = await currentRole();
  const canSeeProposals = can(role, "view", "proposal");
  const scope = clientId ? { clientId } : {};

  const [scopeClient, proposals, contracts] = await Promise.all([
    clientId
      ? prisma.client.findUnique({
          where: { id: clientId },
          select: { id: true, name: true, company: true },
        })
      : null,
    canSeeProposals
      ? prisma.proposal.findMany({
      where: { ...scope, OR: [{ fileUrl: { not: null } }, { pdfUrl: { not: null } }] },
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
    })
      : Promise.resolve([]),
    prisma.contract.findMany({
      where: { ...scope, OR: [{ fileUrl: { not: null } }, { signedFileUrl: { not: null } }] },
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

  const authorIds = [...new Set(proposals.map((p) => p.createdBy))];
  const authors = authorIds.length
    ? await prisma.user.findMany({
        where: { id: { in: authorIds } },
        select: { id: true, name: true, email: true },
      })
    : [];
  const authorName = new Map(authors.map((u) => [u.id, u.name || u.email]));
  const ownerOf = (id: string) => authorName.get(id) ?? "Account removed";

  const label = (c: { name: string | null; company: string | null }) =>
    c.company || c.name || "Unnamed client";
  const scopeName = scopeClient ? label(scopeClient) : "Unknown client";

  const storedRows: DocumentRow[] = [
    ...proposals.flatMap((p) =>
      [
        p.fileUrl && {
          id: `${p.id}-deck`,
          name: `${p.projectType} proposal`,
          category: "Proposal deck",
          url: p.fileUrl,
          ownerName: ownerOf(p.createdBy),
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
          ownerName: ownerOf(p.createdBy),
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
          ownerName: "Generated from the proposal",
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
          ownerName: "Generated from the proposal",
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

  const rows = await Promise.all(
    storedRows.map(async (row) => ({ ...row, url: (await documentUrl(row.url)) ?? row.url })),
  );

  const countOf = (categories: readonly string[]) =>
    rows.filter((row) => categories.includes(row.category)).length;
  const visible = typeFilter
    ? rows.filter((row) => (typeFilter.categories as readonly string[]).includes(row.category))
    : rows;
  const inspected = inspectId ? (rows.find((row) => row.id === inspectId) ?? null) : null;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Documents"
        description="Every file the system generated, and the record that produced it. There is no loose upload bucket — a document without a business context is a document nobody can act on."
      />

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatTile
          label="Documents"
          value={rows.length}
          sub="All generated files"
          href={documentsHref({ client: clientId })}
        />
        {canSeeProposals && (
          <StatTile
            label="Proposal files"
            value={countOf(TYPE_FILTERS[0].categories)}
            sub="Decks and PDFs"
            href={documentsHref({ client: clientId, type: "proposal" })}
          />
        )}
        <StatTile
          label="Contracts"
          value={countOf(TYPE_FILTERS[1].categories)}
          sub="Generated for signature"
          href={documentsHref({ client: clientId, type: "contract" })}
        />
        <StatTile
          label="Signed copies"
          value={countOf(TYPE_FILTERS[2].categories)}
          sub="Executed originals"
          tone={countOf(TYPE_FILTERS[2].categories) ? "success" : "neutral"}
          href={documentsHref({ client: clientId, type: "signed" })}
        />
      </div>

      {rows.length > 0 && (
        <div className="space-y-2">
          <FilterBar label="Filter documents">
            <FilterChip param="type" label="All" count={rows.length} />
            {TYPE_FILTERS.filter((f) => canSeeProposals || f.value !== "proposal").map((f) => (
              <FilterChip
                key={f.value}
                param="type"
                value={f.value}
                label={f.label}
                count={countOf(f.categories)}
              />
            ))}
          </FilterBar>
          <ActiveFilters
            labels={{ client: "Client" }}
            valueLabels={clientId ? { client: { [clientId]: scopeName } } : undefined}
          />
        </div>
      )}

      {rows.length === 0 && clientId ? (
        <EmptyState
          icon={FolderOpen}
          title={scopeClient ? `No documents for ${scopeName} yet` : "This client no longer exists"}
          body={
            scopeClient
              ? "A document appears here once a proposal or contract is built for this client."
              : "The link points at a client record that was deleted or never existed. Clear the filter to see every document."
          }
          action={
            scopeClient && can(role, "create", "proposal") ? (
              <Button asChild variant="outline">
                <Link href={`/clients/${scopeClient.id}/new-proposal`}>New proposal</Link>
              </Button>
            ) : (
              <Button asChild variant="outline">
                <Link href="/documents">All documents</Link>
              </Button>
            )
          }
        />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={FolderOpen}
          title="No documents generated yet"
          body="Documents appear here the moment a proposal or contract is built. Each one stays bound to the record that created it, carries that record's status, and is reachable from the client it belongs to."
          action={
            can(role, "create", "proposal") ? (
              <NewProposalButton variant="outline">Pick a client to quote</NewProposalButton>
            ) : (
              <Button asChild variant="outline">
                <Link href="/proposals">Open proposals</Link>
              </Button>
            )
          }
        />
      ) : (
        <DocumentsTable
          rows={visible}
          filtered={typeFilter?.label ?? null}
          canDeleteProposals={can(role, "delete", "proposal")}
          canDeleteContracts={can(role, "delete", "contract")}
          canCreateProposal={can(role, "create", "proposal")}
        />
      )}

      {inspectId &&
        (inspected ? (
          <InspectSheet
            open
            title={inspected.name}
            subtitle={`${inspected.category} · ${inspected.clientName}`}
            status={
              <StatusPill registry={inspected.statusRegistry} value={inspected.status} />
            }
            fullHref={inspected.entityHref}
            footer={
              <>
                <Button asChild variant="outline" size="sm">
                  <Link href={inspected.entityHref}>
                    <ExternalLink className="size-3.5" aria-hidden />
                    Open {inspected.entityLabel.toLowerCase()}
                  </Link>
                </Button>
                <Button asChild variant="brand" size="sm">
                  <a href={inspected.url} target="_blank" rel="noreferrer">
                    <Download className="size-3.5" aria-hidden />
                    Open file
                  </a>
                </Button>
              </>
            }
          >
            <MetaList
              className="-mx-3"
              items={[
                { label: "Category", value: inspected.category },
                {
                  label: "Client",
                  value: (
                    <EntityLink type="client" id={inspected.clientId}>
                      {inspected.clientName}
                    </EntityLink>
                  ),
                },
                {
                  label: "Belongs to",
                  value: <Link href={inspected.entityHref} className="hover:text-brand">{inspected.entityLabel}</Link>,
                },
                { label: "Owner", value: inspected.ownerName },
                { label: "Created", value: dateTime(inspected.createdAt) },
                { label: "Record updated", value: dateTime(inspected.updatedAt) },
              ]}
            />
            <p className="mt-4 text-meta text-subtle-foreground">
              A file link may be signed and expire; reopen it from here or from the record rather
              than saving the address.
            </p>
          </InspectSheet>
        ) : (
          <InspectSheet open title="Document not found">
            <p className="text-base text-muted-foreground">
              This file no longer exists, or the link is wrong. Close this panel to go back to the
              list.
            </p>
          </InspectSheet>
        ))}
    </div>
  );
}
