import Link from "next/link";
import { ArrowRight, Construction } from "lucide-react";

import { prisma } from "@repo/database";
import { Button } from "@repo/ui";

import { PageHeader } from "@/components/os/page-header";
import { Panel } from "@/components/os/panel";
import { StatTile } from "@/components/os/stat-tile";
import { ToneBadge } from "@/components/ui/badge";
import { when } from "@/lib/format";

export const dynamic = "force-dynamic";

/**
 * What this system does on its own (§17, §18).
 *
 * The previous version of this page listed invented rules with invented run
 * counts (`runCount: 14`, `lastRunAt: three days ago`), a toggle that only set
 * React state, and a "test run" button that answered with
 * `toast.success("Executed automation")` while executing nothing. It described
 * an automation engine that does not exist.
 *
 * There is no rules engine here, and pretending otherwise is worse than saying
 * so. What Altruvex actually has is a handful of behaviours hard-wired into
 * specific code paths. This page is the honest version: each entry names the
 * real trigger, the file that implements it, and a run count taken from the
 * activity log — so a rule that has never fired says zero rather than fourteen.
 */

interface Wired {
  id: string;
  name: string;
  trigger: string;
  does: string[];
  /** Where it actually lives, so the claim is checkable. */
  source: string;
  /** Activity actions that evidence a run. Empty when nothing records one. */
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
    note: "Runs only while the webhook signature secret is configured — see System health.",
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
    trigger: "CI posts a successful production deployment to the ingest endpoint",
    does: [
      "Records the deployment, its commit and the build it came from",
      "Moves the product to LIVE and updates its production URL",
      "Marks a superseded deployment as rolled back when the deploy names one",
    ],
    source: "app/api/ingest/deployments/route.ts",
    actions: ["deployment.succeeded", "deployment.failed"],
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

/** Deferred deliberately — each names what has to exist first (§17). */
const PLANNED = [
  {
    name: "Proposal accepted → draft contract",
    blocked: "Acceptance is currently recorded by an operator, not by the client. A client-side accept action has to exist before this can trigger on anything.",
  },
  {
    name: "Renewal due → reminder to the client",
    blocked: "There is no outbound mail integration, and WhatsApp template messages need approved templates per message type.",
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
  // Real run counts. A rule with no recorded action reports "not recorded"
  // rather than borrowing a number from somewhere else.
  const tracked = WIRED.flatMap((rule) => rule.actions);
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

  const totalRuns = rules.reduce((sum, r) => sum + r.runs, 0);

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
          sub="From the activity log"
          tone={totalRuns > 0 ? "success" : "neutral"}
          href={totalRuns > 0 ? "/activity" : undefined}
        />
        <StatTile
          label="Untracked"
          value={rules.filter((r) => !r.tracked).length}
          sub="Run, but write no activity event"
          tone={rules.some((r) => !r.tracked) ? "warning" : "neutral"}
        />
        <StatTile label="Deferred" value={PLANNED.length} sub="Named, not built" />
      </div>

      <Panel
        title="Wired today"
        description="Each of these runs automatically, every time its trigger fires"
        flush
      >
        <ul className="divide-y divide-border">
          {rules.map((rule) => (
            <li key={rule.id} className="space-y-2 px-3 py-3">
              <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
                <div className="min-w-0">
                  <h3 className="text-base font-medium">{rule.name}</h3>
                  <p className="mt-0.5 text-meta text-subtle-foreground">
                    When: {rule.trigger}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
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
                    <span className="text-meta text-subtle-foreground">
                      last {when(rule.lastAt)}
                    </span>
                  )}
                </div>
              </div>

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

              {rule.note && (
                <p className="text-meta text-muted-foreground">{rule.note}</p>
              )}

              <p className="font-mono text-meta text-subtle-foreground">{rule.source}</p>
            </li>
          ))}
        </ul>
      </Panel>

      <Panel
        title="Deferred"
        description="Named so the gap is visible, with what has to exist first"
        action={
          <span className="inline-flex items-center gap-1.5 rounded-sm border border-border bg-surface px-1.5 py-0.5 text-meta text-muted-foreground">
            <Construction className="size-3" />
            Planned
          </span>
        }
        flush
      >
        <ul className="divide-y divide-border">
          {PLANNED.map((item) => (
            <li key={item.name} className="px-3 py-2.5">
              <h3 className="text-base">{item.name}</h3>
              <p className="mt-0.5 flex gap-2 text-meta text-muted-foreground">
                <span className="mt-1.5 size-1 shrink-0 rounded-full bg-warning" aria-hidden />
                <span>{item.blocked}</span>
              </p>
            </li>
          ))}
        </ul>
      </Panel>

      <Panel title="Where automatic changes show up">
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href="/activity">
              Activity feed
              <ArrowRight className="size-3.5" />
            </Link>
          </Button>
          <Button asChild variant="ghost" size="sm">
            <Link href="/audit">Audit log</Link>
          </Button>
          <Button asChild variant="ghost" size="sm">
            <Link href="/health">Integration health</Link>
          </Button>
        </div>
      </Panel>
    </div>
  );
}
