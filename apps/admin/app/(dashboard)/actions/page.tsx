import { getActionCentre } from "@/lib/action-center";
import { PageHeader } from "@/components/os/page-header";
import { Panel } from "@/components/os/panel";
import { StatTile } from "@/components/os/stat-tile";
import { ActionCenter } from "@/components/os/action-center";

export const dynamic = "force-dynamic";

const KIND_LABEL: Record<string, string> = {
  lead: "Leads",
  proposal: "Proposals",
  contract: "Contracts",
  payment: "Payments",
  message: "Messages",
  meeting: "Meetings",
  project: "Projects",
};

export default async function ActionsPage() {
  const items = await getActionCentre();
  const late = items.filter((i) => i.tone === "danger");
  const soon = items.filter((i) => i.tone === "warning");

  const byKind = Object.entries(
    items.reduce<Record<string, number>>((acc, item) => {
      acc[item.kind] = (acc[item.kind] ?? 0) + 1;
      return acc;
    }, {}),
  ).sort((a, b) => b[1] - a[1]);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Everything waiting on a person"
        crumbs={[{ label: "Dashboard", href: "/" }, { label: "Action centre" }]}
        description="One ranked list across every module. Ordering is by urgency, not by entity type — an overdue payment and an unanswered message compete for the same hour of your day."
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <StatTile label="Already late" value={late.length} sub="Past the point of being fine" tone={late.length ? "danger" : "success"} />
        <StatTile label="Needs attention" value={soon.length} sub="Will be late if ignored" tone={soon.length ? "warning" : "neutral"} />
        <StatTile label="Total open" value={items.length} sub="Across every module" />
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_240px]">
        <Panel title="Ranked by urgency" flush>
          <ActionCenter items={items} limit={200} />
        </Panel>

        <Panel title="By area" description="Where the work is piling up">
          {byKind.length === 0 ? (
            <p className="text-base text-muted-foreground">Nothing outstanding anywhere.</p>
          ) : (
            <ul className="space-y-2">
              {byKind.map(([kind, count]) => (
                <li key={kind} className="flex items-center gap-2">
                  <span className="min-w-0 flex-1 truncate text-base text-muted-foreground">
                    {KIND_LABEL[kind] ?? kind}
                  </span>
                  <span className="h-1 w-10 overflow-hidden rounded-full bg-surface-2">
                    <span
                      className="block h-full rounded-full bg-brand"
                      style={{ width: `${(count / byKind[0][1]) * 100}%` }}
                    />
                  </span>
                  <span className="w-6 shrink-0 text-end font-mono text-micro tabular-nums">
                    {count}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}
