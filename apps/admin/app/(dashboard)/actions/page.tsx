import Link from "next/link";
import { getActionCentre, type ActionItem } from "@/lib/action-center";
import { getOperator } from "@/lib/authorize";
import { gateRoute } from "@/lib/page-gate";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/os/page-header";
import { Panel } from "@/components/os/panel";
import { StatTile } from "@/components/os/stat-tile";
import { ActionCenter } from "@/components/os/action-center";
import { ActiveFilters, FilterBar, FilterChip } from "@/components/os/filter-bar";
import { EmptyInline } from "@/components/os/empty-state";
import { SoonButton } from "@/components/os/soon";
import { Button } from "@repo/ui";

export const dynamic = "force-dynamic";

const KIND_LABEL: Record<ActionItem["kind"], string> = {
  lead: "Leads",
  proposal: "Proposals",
  contract: "Contracts",
  payment: "Payments",
  message: "Messages",
  meeting: "Meetings",
  project: "Projects",
  incident: "Incidents",
  deployment: "Deployments",
  renewal: "Retainer renewals",
  service: "Services",
};

const LEVEL_LABEL = { late: "Already late", attention: "Needs attention" } as const;
type Level = keyof typeof LEVEL_LABEL;

function isKind(value: string | undefined): value is ActionItem["kind"] {
  return value != null && value in KIND_LABEL;
}

function matchesLevel(item: ActionItem, level: Level | undefined) {
  if (level === "late") return item.tone === "danger";
  if (level === "attention") return item.tone === "warning";
  return true;
}

export default async function ActionsPage({
  searchParams,
}: {
  searchParams: Promise<{ kind?: string; level?: string }>;
}) {
  const denied = await gateRoute("/actions");
  if (denied) return denied;

  const [operator, params] = await Promise.all([getOperator(), searchParams]);
  const items = await getActionCentre(operator?.role);

  const kind = isKind(params.kind) ? params.kind : undefined;
  const level = params.level === "late" || params.level === "attention" ? params.level : undefined;

  const late = items.filter((i) => i.tone === "danger").length;
  const attention = items.filter((i) => i.tone === "warning").length;
  const kindCounts = items
    .filter((i) => matchesLevel(i, level))
    .reduce<Partial<Record<ActionItem["kind"], number>>>((acc, item) => {
      acc[item.kind] = (acc[item.kind] ?? 0) + 1;
      return acc;
    }, {});
  const byKind = (Object.entries(kindCounts) as [ActionItem["kind"], number][]).sort(
    (a, b) => b[1] - a[1],
  );
  const shown = items.filter((i) => (!kind || i.kind === kind) && matchesLevel(i, level));
  const filtered = Boolean(kind || level);

  const hrefWith = (changes: { kind?: string | null; level?: string | null }) => {
    const next = new URLSearchParams();
    const k = changes.kind === undefined ? kind : changes.kind;
    const l = changes.level === undefined ? level : changes.level;
    if (k) next.set("kind", k);
    if (l) next.set("level", l);
    const query = next.toString();
    return query ? `/actions?${query}` : "/actions";
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Everything waiting on a person"
        crumbs={[{ label: "Today", href: "/" }, { label: "Action centre" }]}
        description="One ranked list across every area you can act on. Ordered by urgency, not by type — an overdue payment and an unanswered message compete for the same hour."
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <StatTile
          label="Already late"
          value={late}
          sub="Past the point of being fine"
          tone={late ? "danger" : "success"}
          href={hrefWith({ level: "late", kind: null })}
        />
        <StatTile
          label="Needs attention"
          value={attention}
          sub="Will be late if ignored"
          tone={attention ? "warning" : "neutral"}
          href={hrefWith({ level: "attention", kind: null })}
        />
        <StatTile label="Total open" value={items.length} sub="Across every area" href="/actions" />
      </div>

      <FilterBar label="Filter the queue">
        <FilterChip param="level" label="Any urgency" />
        <FilterChip param="level" value="late" label="Late" count={late} />
        <FilterChip param="level" value="attention" label="Attention" count={attention} />
        <span className="mx-1 h-4 w-px shrink-0 bg-border" aria-hidden />
        <FilterChip param="kind" label="All areas" />
        {byKind.map(([k, count]) => (
          <FilterChip key={k} param="kind" value={k} label={KIND_LABEL[k]} count={count} />
        ))}
      </FilterBar>
      <ActiveFilters
        labels={{ kind: "Area", level: "Urgency" }}
        valueLabels={{ kind: KIND_LABEL, level: LEVEL_LABEL }}
      />

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_240px]">
        <Panel
          title={filtered ? `${shown.length} of ${items.length}` : "Ranked by urgency"}
          description="Each row opens the record where the decision is made"
          action={
            <SoonButton reason="Snooze and dismiss need a store of dismissed or snoozed action items; today every row stays until its record changes.">
              Snooze
            </SoonButton>
          }
          flush
        >
          <ActionCenter
            items={shown}
            limit={200}
            moreHref={null}
            empty={
              filtered && items.length > 0 ? (
                <EmptyInline
                  action={
                    <Button asChild variant="outline" size="sm">
                      <Link href="/actions">Show the whole queue</Link>
                    </Button>
                  }
                >
                  Nothing matches this filter. The queue still holds {items.length} item
                  {items.length === 1 ? "" : "s"} in other areas or at another urgency.
                </EmptyInline>
              ) : undefined
            }
          />
        </Panel>

        <Panel title="By area" description="Where the work is piling up">
          {byKind.length === 0 ? (
            <p className="text-base text-muted-foreground">Nothing outstanding anywhere.</p>
          ) : (
            <ul className="-mx-1 space-y-0.5">
              {byKind.map(([k, count]) => (
                <li key={k}>
                  <Link
                    href={hrefWith({ kind: k === kind ? null : k })}
                    aria-current={k === kind ? "true" : undefined}
                    className={cn(
                      "flex min-h-8 items-center gap-2 rounded-ctl px-1 no-underline transition-colors duration-[var(--dur-state)] hover:bg-surface",
                      "outline-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand pointer-coarse:min-h-11",
                      k === kind ? "text-foreground" : "text-muted-foreground",
                    )}
                  >
                    <span className="min-w-0 flex-1 truncate text-base">{KIND_LABEL[k]}</span>
                    <span className="h-1 w-10 overflow-hidden rounded-full bg-surface-2" aria-hidden>
                      <span
                        className="block h-full rounded-full bg-brand"
                        style={{ width: `${(count / byKind[0][1]) * 100}%` }}
                      />
                    </span>
                    <span className="w-6 shrink-0 text-end font-mono text-micro tabular-nums">{count}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}
