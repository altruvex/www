import { prisma } from "@repo/database";
import Link from "next/link";
import { Panel, PanelLink } from "@/components/os/panel";
import { when, dateTime } from "@/lib/format";
import { normalizeEntityType } from "@/lib/entity-links";

/**
 * The audit trail of one record, read from `ActivityEvent` — the persisted
 * who / what / when / before / after, not a projection of other tables.
 *
 * Every detail page renders this, so "what happened to this record and who did
 * it" has one answer everywhere. Writers spell entity types differently, so the
 * query matches every spelling that folds onto the same kind.
 */
export const SPELLINGS: Record<string, string[]> = {
  client: ["client", "Client"],
  submission: ["submission", "contact", "ContactSubmission"],
  proposal: ["proposal", "Proposal"],
  contract: ["contract", "Contract"],
  project: ["project", "Project"],
  product: ["product", "Product"],
  payment: ["payment", "Payment"],
  subscription: ["subscription", "maintenance_subscription", "MaintenanceSubscription"],
  incident: ["incident", "Incident"],
  deployment: ["deployment", "Deployment"],
  build: ["build", "Build"],
  task: ["task", "ProjectTask"],
  meeting: ["meeting", "Meeting"],
  client_service: ["client_service", "ClientService", "clientService"],
  change_request: ["changeRequest", "change_request", "ChangeRequest"],
  user: ["user", "User"],
};

function fieldList(value: unknown): string[] {
  return value && typeof value === "object" && !Array.isArray(value) ? Object.keys(value) : [];
}

function show(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "string") return value.length > 80 ? `${value.slice(0, 80)}…` : value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  const json = JSON.stringify(value);
  return json.length > 80 ? `${json.slice(0, 80)}…` : json;
}

export async function EntityAudit({
  type,
  id,
  title = "Audit trail",
  take = 25,
}: {
  type: string;
  id: string;
  title?: string;
  take?: number;
}) {
  const kind = normalizeEntityType(type);
  const types = (kind && SPELLINGS[kind]) || [type];
  const events = await prisma.activityEvent.findMany({
    where: { entityType: { in: types }, entityId: id },
    orderBy: { createdAt: "desc" },
    take: take + 1,
  });
  const more = events.length > take;
  const rows = more ? events.slice(0, take) : events;

  return (
    <Panel
      title={title}
      description="Who changed what, and when — from the persisted audit log"
      action={<PanelLink href={`/audit?entity=${encodeURIComponent(types[0]!)}&id=${id}`}>All</PanelLink>}
      flush
    >
      {rows.length === 0 ? (
        <p className="px-3 py-6 text-center text-meta text-muted-foreground">
          No recorded changes yet. Every edit made from here on is logged.
        </p>
      ) : (
        <ol className="divide-y divide-border">
          {rows.map((event) => {
            const before = (event.before ?? {}) as Record<string, unknown>;
            const after = (event.after ?? {}) as Record<string, unknown>;
            const fields = Array.from(new Set([...fieldList(event.before), ...fieldList(event.after)]));
            return (
              <li key={event.id} className="px-3 py-2">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="min-w-0 text-base">
                    <span className="font-medium">{event.actorLabel}</span>{" "}
                    <span className="text-muted-foreground">{event.summary}</span>
                  </p>
                  <time
                    className="shrink-0 font-mono text-micro tabular-nums text-subtle-foreground"
                    dateTime={event.createdAt.toISOString()}
                    title={dateTime(event.createdAt)}
                  >
                    {when(event.createdAt)}
                  </time>
                </div>
                {fields.length > 0 && (
                  <details className="mt-1 group">
                    <summary className="cursor-pointer list-none text-meta text-subtle-foreground hover:text-foreground">
                      {fields.length} field{fields.length === 1 ? "" : "s"} changed ·{" "}
                      <span className="font-mono">{fields.slice(0, 4).join(", ")}{fields.length > 4 ? "…" : ""}</span>
                    </summary>
                    <dl className="mt-1.5 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 rounded-sm border border-border bg-surface/50 p-2 text-meta">
                      {fields.map((field) => (
                        <div key={field} className="contents">
                          <dt className="font-mono text-subtle-foreground">{field}</dt>
                          <dd className="min-w-0 break-words">
                            <span className="text-muted-foreground line-through decoration-border-mid">{show(before[field])}</span>
                            {" → "}
                            <span>{show(after[field])}</span>
                          </dd>
                        </div>
                      ))}
                    </dl>
                  </details>
                )}
              </li>
            );
          })}
          {more && (
            <li className="px-3 py-2 text-meta">
              <Link className="text-muted-foreground hover:text-foreground" href={`/audit?entity=${encodeURIComponent(types[0]!)}&id=${id}`}>
                Older events in the audit log →
              </Link>
            </li>
          )}
        </ol>
      )}
    </Panel>
  );
}
