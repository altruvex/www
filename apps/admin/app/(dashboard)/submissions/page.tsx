import Link from "next/link";
import { prisma } from "@repo/database";
import { Button } from "@repo/ui";
import { Globe } from "lucide-react";
import { MetaList } from "@/components/os/detail-layout";
import { EntityLink } from "@/components/os/entity-link";
import { InspectSheet } from "@/components/os/inspect-sheet";
import { PageHeader } from "@/components/os/page-header";
import { StatusPill } from "@/components/ui/badge";
import { currentRole } from "@/lib/authorize";
import { dateTime, phone as fmtPhone } from "@/lib/format";
import { gateRoute } from "@/lib/page-gate";
import { can } from "@/lib/rbac";
import { statusOf } from "@/lib/status";
import { StatTile } from "@/components/os/stat-tile";
import { EmptyState } from "@/components/os/empty-state";
import { NextSteps } from "@/components/os/next-steps";
import { IntakeTabs } from "../leads/intake-tabs";
import { ConvertButton } from "./[id]/convert-button";
import { ViewedMarker } from "./[id]/viewed-marker";
import { leadStepPermissions } from "./lead-permissions";
import { convertedLeadSteps } from "./lead-steps";
import { MarkSpamButton } from "./mark-spam-button";
import { SubmissionsTable, type SubmissionRow } from "./submissions-table";

export const dynamic = "force-dynamic";

export default async function SubmissionsPage({
  searchParams,
}: {
  searchParams: Promise<{ inspect?: string }>;
}) {
  const denied = await gateRoute("/submissions", "form submissions");
  if (denied) return denied;
  const role = await currentRole();
  const canConvert = can(role, "create", "client");
  const canTriage = can(role, "edit", "lead");
  const canDelete = can(role, "delete", "lead");
  const allowed = leadStepPermissions(role);
  const { inspect } = await searchParams;

  const submissions = await prisma.contactSubmission.findMany({
    select: {
      id: true,
      name: true,
      phone: true,
      message: true,
      serviceInterest: true,
      projectTimeline: true,
      budget: true,
      status: true,
      priority: true,
      locale: true,
      utmSource: true,
      utmMedium: true,
      utmCampaign: true,
      referrer: true,
      submittedAt: true,
      firstViewedAt: true,
      client: { select: { id: true, name: true, company: true } },
    },
    orderBy: { submittedAt: "desc" },
  });

  const rows: SubmissionRow[] = submissions.map((s) => ({
    id: s.id,
    name: s.name,
    phone: s.phone,
    message: s.message,
    serviceInterest: s.serviceInterest,
    projectTimeline: s.projectTimeline,
    budget: s.budget,
    status: s.status,
    priority: s.priority,
    locale: s.locale,
    utmSource: s.utmSource,
    utmMedium: s.utmMedium,
    utmCampaign: s.utmCampaign,
    referrer: s.referrer,
    submittedAt: s.submittedAt.toISOString(),
    viewed: Boolean(s.firstViewedAt),
    clientId: s.client?.id ?? null,
    clientName: s.client
      ? s.client.company || s.client.name || "Unnamed client"
      : null,
  }));

  const inspected = inspect
    ? (rows.find((r) => r.id === inspect) ?? null)
    : null;

  const unread = rows.filter((r) => !r.viewed).length;
  const unconverted = rows.filter(
    (r) => !r.clientId && r.status !== "SPAM",
  ).length;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Form submissions"
        tabs={<IntakeTabs active="submissions" />}
        description="The raw record of what the website received: exact words, UTM parameters, referrer, locale. Converting one into a lead never edits or deletes it."
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Total received" value={rows.length} sub="All time" />
        <StatTile
          label="Unopened"
          value={unread}
          sub={unread ? "Nobody has read these" : "All read"}
          tone={unread ? "warning" : "success"}
        />
        <StatTile
          label="Not converted"
          value={unconverted}
          sub={unconverted ? "No client record yet" : "All converted"}
          tone={unconverted ? "danger" : "success"}
        />
        <StatTile
          label="Marked spam"
          value={rows.filter((r) => r.status === "SPAM").length}
          sub="Kept, not deleted"
        />
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon={Globe}
          title="No submissions received"
          body="Every contact, service-inquiry and project-request form on the public site posts here. The payload is stored exactly as it arrived — attribution and all — before anything is done with it. Until one arrives, the public estimator is the other way people reach you."
          action={
            <Button asChild variant="outline">
              <Link href="/transparency">Review estimator leads</Link>
            </Button>
          }
        />
      ) : (
        <SubmissionsTable
          rows={rows}
          canConvert={canConvert}
          canDelete={canDelete}
          canOpenClient={allowed.openClient}
          canPropose={allowed.propose}
          canSchedule={allowed.schedule}
        />
      )}

      {inspected && (
        <SubmissionInspector
          row={inspected}
          canConvert={canConvert}
          canTriage={canTriage}
          allowed={allowed}
        />
      )}
    </div>
  );
}

function SubmissionInspector({
  row,
  canConvert,
  canTriage,
  allowed,
}: {
  row: SubmissionRow;
  canConvert: boolean;
  canTriage: boolean;
  allowed: { propose: boolean; schedule: boolean };
}) {
  const attribution = [row.utmSource, row.utmMedium, row.utmCampaign]
    .filter(Boolean)
    .join(" / ");
  return (
    <InspectSheet
      open
      title={row.name}
      subtitle={fmtPhone(row.phone)}
      status={
        <StatusPill
          registry="submissionStatus"
          value={row.status}
          variant="dot"
        />
      }
      fullHref={`/submissions/${row.id}`}
      footer={
        row.clientId ||
        (canConvert && row.status !== "SPAM") ||
        (canTriage && row.status !== "SPAM") ? (
          <>
            {canTriage && row.status !== "SPAM" && !row.clientId && (
              <MarkSpamButton submissionId={row.id} name={row.name} />
            )}
            {row.clientId ? (
              <Button asChild variant="outline">
                <Link href={`/clients/${row.clientId}`}>Open client</Link>
              </Button>
            ) : canConvert && row.status !== "SPAM" ? (
              <ConvertButton submissionId={row.id} />
            ) : null}
          </>
        ) : undefined
      }
    >
      {!row.viewed && canTriage && <ViewedMarker submissionId={row.id} />}

      <section aria-label="Message" className="space-y-1.5">
        <p className="telemetry text-subtle-foreground">Their message</p>
        <p className="whitespace-pre-wrap text-base">{row.message}</p>
      </section>

      <MetaList
        className="rounded-md border border-border"
        items={[
          {
            label: "Interest",
            value: row.serviceInterest
              ? statusOf("serviceType", row.serviceInterest).label
              : null,
          },
          {
            label: "Budget",
            value: row.budget
              ? statusOf("budgetRange", row.budget).label
              : null,
          },
          {
            label: "Timeline",
            value: row.projectTimeline
              ? statusOf("projectTimeline", row.projectTimeline).label
              : null,
          },
          {
            label: "Priority",
            value: (
              <StatusPill
                registry="priority"
                value={row.priority}
                variant="dot"
              />
            ),
          },
          { label: "Locale", value: row.locale.toUpperCase() },
          {
            label: "Attribution",
            value: attribution ? (
              <span className="font-mono text-meta">{attribution}</span>
            ) : (
              "direct"
            ),
          },
          {
            label: "Referrer",
            value: row.referrer ? (
              <span className="break-all font-mono text-meta">
                {row.referrer}
              </span>
            ) : null,
          },
          { label: "Received", value: dateTime(row.submittedAt) },
          {
            label: "Client",
            value: row.clientId ? (
              <EntityLink type="client" id={row.clientId}>
                {row.clientName ?? "Client"}
              </EntityLink>
            ) : (
              "Not converted"
            ),
          },
        ]}
      />

      {row.clientId && (
        <NextSteps steps={convertedLeadSteps(row.clientId, allowed)} />
      )}
    </InspectSheet>
  );
}
