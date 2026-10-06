import Link from "next/link";
import { ArrowRight, Construction, Workflow } from "lucide-react";

import { prisma } from "@repo/database";
import { Button } from "@repo/ui";

import { List, ListRow } from "@/components/os/list-row";
import { PageHeader } from "@/components/os/page-header";
import { Panel } from "@/components/os/panel";
import { StatTile } from "@/components/os/stat-tile";
import { ToneBadge } from "@/components/ui/badge";
import { roleCanOpen } from "@/lib/action-center";
import { currentRole } from "@/lib/authorize";
import { when } from "@/lib/format";
import { CRON_JOBS } from "@/lib/cron-jobs";
import { gateRoute } from "@/lib/page-gate";

export const dynamic = "force-dynamic";

interface Wired {
  id: string;
  name: string;
  trigger: string;
  does: string[];
  source: string;
  actions: string[];
  note?: string;
}

const WIRED: Wired[] = [
  {
    id: "contract-signed",
    name: "Contract signed → project, payment schedule, onboarding",
    trigger: "A client signs through the public signing link",
    does: [
      "Marks the contract SIGNED with the signer, time, IP and method",
      "Creates the delivery Project in DISCOVERY",
      "Creates the 50 / 30 / 20 payment milestones from the proposal's split",
      "Sends the onboarding WhatsApp message with the client portal link",
    ],
    source: "lib/contract-signing.ts",
    actions: ["contract.signed", "project.created"],
    note: "The project and its payments are written in one transaction — a signature cannot produce a project nobody can invoice.",
  },
  {
    id: "whatsapp-inbound",
    name: "Inbound WhatsApp → client record",
    trigger: "A message arrives on the WhatsApp Business webhook",
    does: [
      "Matches the sender's phone against existing clients",
      "Creates the client when the number is new, or links the message to the existing one",
      "Stores the message against that client's thread",
    ],
    source: "app/api/whatsapp/webhook/route.ts",
    actions: [],
    note: "Runs only while the webhook signature secret is configured; without it every payload is refused — see Integrations.",
  },
  {
    id: "whatsapp-status",
    name: "WhatsApp delivery receipts → proposal state",
    trigger: "A delivery or read callback arrives for a sent message",
    does: [
      "Stamps delivered/read times on the message",
      "Moves the linked proposal to DELIVERED or READ",
    ],
    source: "app/api/whatsapp/webhook/route.ts",
    actions: [],
  },
  {
    id: "deploy-live",
    name: "Production deploy succeeded → product state",
    trigger: "A production deployment reaches the ingest writers — posted by CI or translated from a GitHub deployment_status webhook",
    does: [
      "Records the deployment, its commit and the build it came from",
      "Moves the product to LIVE and updates its production URL",
      "Marks a superseded deployment as rolled back when the deploy names one",
    ],
    source: "app/api/ingest/deployments/route.ts",
    actions: ["deployment.succeeded", "deployment.failed"],
    note: "Every recorded deployment counts here once, whichever route delivered it.",
  },
  {
    id: "github-ingest",
    name: "GitHub workflow run → build record",
    trigger: "GitHub delivers a workflow_run webhook for a linked repository",
    does: [
      "Verifies the delivery signature and attributes it to the product that owns the repository",
      "Writes the build through the same ingest writers CI uses",
      "Hands a deployment_status event to the deploy rule above",
    ],
    source: "app/api/ingest/github/route.ts",
    actions: ["build.succeeded", "build.failed"],
    note: "Builds posted directly by a pipeline through /api/ingest/builds record the same actions, so this count covers both routes.",
  },
  {
    id: "renewal-sweep",
    name: "Scheduled sweep → renewal notifications",
    trigger: `${CRON_JOBS[0]!.scheduleText} (${CRON_JOBS[0]!.schedule}), called by the platform cron with CRON_SECRET`,
    does: [
      "Finds client services entering a renewal window",
      "Writes one notification per admin per fact, keyed so a re-run never duplicates it",
      "Posts the due list to Slack when a webhook is configured",
    ],
    source: CRON_JOBS[0]!.source,
    actions: [],
    note: "The sweep writes no activity event of its own; the Integrations screen infers its last run from the newest renewal notification. Reminding the client is still a person's decision, sent from the service's page.",
  },
  {
    id: "pricing-revalidate",
    name: "Price changed → public site cache dropped",
    trigger: "A price override is saved on the pricing screen",
    does: [
      "Writes the override and its change-log entry",
      "Calls the public site's revalidation endpoint so the new price is live immediately rather than on the 5-minute timer",
    ],
    source: "lib/revalidate-pricing.ts",
    actions: [],
    note: "Degrades safely: without PRICING_REVALIDATE_SECRET the price still saves and still reaches the site, just on its cache timer.",
  },
];

const PLANNED = [
  {
    name: "Proposal accepted → draft contract",
    blocked: "Acceptance is currently recorded by an operator, not by the client. A client-side accept action has to exist before this can trigger on anything.",
  },
  {
    name: "Renewal due → reminder sent to the client automatically",
    blocked: "Mail transport exists and a reminder can be sent from the service's page, but sending one unasked needs an agreed cadence per client and an approved WhatsApp template per message type. Until then a person decides, and the send is recorded.",
  },
  {
    name: "Payment overdue → escalation",
    blocked: "Payments are marked paid by hand. Without a payment provider webhook, 'overdue' means 'nobody has ticked it', which is not safe to act on automatically.",
  },
  {
    name: "Build failed → incident opened",
    blocked: "Deciding that a failure is an incident is a judgement call. Opening one automatically on every red build would make the incident list useless.",
  },
];

export default async function AutomationsPage() {
  const denied = await gateRoute("/automations", "automations");
  if (denied) return denied;

  const role = await currentRole();
  const seesAudit = roleCanOpen(role, "/audit");
  const seesIntegrations = roleCanOpen(role, "/integrations");

  const tracked = [...new Set(WIRED.flatMap((rule) => rule.actions))];
  const [counts, latest] = await Promise.all([
    tracked.length
      ? prisma.activityEvent.groupBy({
          by: ["action"],
          where: { action: { in: tracked } },
          _count: { _all: true },
        })
      : Promise.resolve([]),
    tracked.length
      ? prisma.activityEvent.findMany({
          where: { action: { in: tracked } },
          orderBy: { createdAt: "desc" },
          distinct: ["action"],
          select: { action: true, createdAt: true },
        })
      : Promise.resolve([]),
  ]);

  const countByAction = new Map(counts.map((c) => [c.action, c._count._all]));
  const lastByAction = new Map(latest.map((l) => [l.action, l.createdAt]));

  const rules = WIRED.map((rule) => {
    const runs = rule.actions.reduce((sum, a) => sum + (countByAction.get(a) ?? 0), 0);
    const lastAt = rule.actions
      .map((a) => lastByAction.get(a))
      .filter((d): d is Date => d != null)
      .sort((a, b) => b.getTime() - a.getTime())[0];
    return { ...rule, runs, lastAt: lastAt ?? null, tracked: rule.actions.length > 0 };
  });

  const totalRuns = tracked.reduce((sum, a) => sum + (countByAction.get(a) ?? 0), 0);
  const untracked = rules.filter((r) => !r.tracked).length;
  const auditHref = `/audit?action=${encodeURIComponent(tracked.join(","))}`;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Automations"
        description="What this system does without being asked. There is no rules engine here — these are behaviours wired into specific code paths, each named with the file that implements it so the claim can be checked."
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Wired behaviours" value={rules.length} sub="Running in code today" />
        <StatTile
          label="Recorded runs"
          value={totalRuns}
          sub={totalRuns > 0 ? "Distinct events in the activity log" : "Nothing recorded yet"}
          tone={totalRuns > 0 ? "success" : "neutral"}
          href={seesAudit && totalRuns > 0 ? auditHref : undefined}
        />
        <StatTile
          label="Untracked"
          value={untracked}
          sub="Run, but write no activity event"
          tone={untracked > 0 ? "warning" : "neutral"}
        />
        <StatTile label="Deferred" value={PLANNED.length} sub="Named, not built" />
      </div>

      <Panel
        title="Wired today"
        description="Each runs every time its trigger fires. Open a row for what it does and where it lives."
        flush
      >
        <List label="Wired behaviours">
          {rules.map((rule) => (
            <ListRow
              key={rule.id}
              icon={<Workflow />}
              tone={rule.tracked && rule.runs > 0 ? "success" : "neutral"}
              title={rule.name}
              meta={<span className="min-w-0">When: {rule.trigger}</span>}
              trailing={
                <>
                  {rule.tracked ? (
                    <ToneBadge tone={rule.runs > 0 ? "success" : "neutral"}>
                      {rule.runs} run{rule.runs === 1 ? "" : "s"}
                    </ToneBadge>
                  ) : (
                    <ToneBadge tone="neutral" className="text-subtle-foreground">
                      Runs not recorded
                    </ToneBadge>
                  )}
                  {rule.lastAt && (
                    <span className="hidden text-meta text-subtle-foreground sm:inline">
                      last {when(rule.lastAt)}
                    </span>
                  )}
                </>
              }
              expandable={
                <div className="space-y-2">
                  <ul className="space-y-1">
                    {rule.does.map((line) => (
                      <li key={line} className="flex gap-2 text-base text-muted-foreground">
                        <span
                          className="mt-1.5 size-1 shrink-0 rounded-full bg-border-strong"
                          aria-hidden
                        />
                        <span>{line}</span>
                      </li>
                    ))}
                  </ul>
                  {rule.note && <p className="text-meta text-muted-foreground">{rule.note}</p>}
                  <p className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-meta text-subtle-foreground">
                    <span>{rule.source}</span>
                    {rule.lastAt && <span className="sm:hidden">last {when(rule.lastAt)}</span>}
                    {seesAudit && rule.tracked && rule.runs > 0 && (
                      <Link
                        href={`/audit?action=${encodeURIComponent(rule.actions.join(","))}`}
                        className="font-sans text-muted-foreground underline underline-offset-2 hover:text-foreground"
                      >
                        See the {rule.runs} event{rule.runs === 1 ? "" : "s"}
                      </Link>
                    )}
                  </p>
                </div>
              }
            />
          ))}
        </List>
      </Panel>

      <Panel
        title="Deferred"
        description="Named so the gap is visible, with what has to exist first"
        action={
          <span className="inline-flex items-center gap-1.5 rounded-ctl-xs border border-border-subtle bg-surface px-1.5 py-0.5 text-meta text-muted-foreground">
            <Construction className="size-3" />
            Planned
          </span>
        }
        flush
      >
        <List label="Deferred automations">
          {PLANNED.map((item) => (
            <ListRow
              key={item.name}
              title={item.name}
              meta={<span className="min-w-0 whitespace-normal">{item.blocked}</span>}
            />
          ))}
        </List>
      </Panel>

      {(seesAudit || seesIntegrations) && (
        <Panel title="Where automatic changes show up">
          <div className="flex flex-wrap gap-2">
            {seesAudit && (
              <Button asChild variant="outline" size="sm">
                <Link href="/audit">
                  Audit log
                  <ArrowRight className="size-3.5" />
                </Link>
              </Button>
            )}
            {seesIntegrations && (
              <Button asChild variant="ghost" size="sm">
                <Link href="/integrations">Integrations and health</Link>
              </Button>
            )}
          </div>
        </Panel>
      )}
    </div>
  );
}
