import Link from "next/link";
import { prisma, type Prisma } from "@repo/database";
import { Button, Field, Input, SelectField } from "@repo/ui";

import { PageHeader } from "@/components/os/page-header";
import { DateField } from "@/components/os/date-field";
import { CursorPager } from "@/components/os/pager";
import { Panel } from "@/components/os/panel";
import { StatTile } from "@/components/os/stat-tile";
import { EmptyInline } from "@/components/os/empty-state";
import { FilterChip } from "@/components/os/data-table";
import { EventList } from "@/components/os/event-row";
import { SPELLINGS } from "@/lib/entity-spellings";
import { normalizeEntityType } from "@/lib/entity-links";
import { gateRoute } from "@/lib/page-gate";
import { resolveRole } from "@/lib/rbac";
import { titleCase } from "@/lib/status";

export const dynamic = "force-dynamic";

const PAGE = 50;

const ACTOR_KINDS = ["USER", "CLIENT", "INTEGRATION", "SYSTEM"] as const;

interface Filters {
  actor: string;
  action: string;
  entity: string;
  id: string;
  from: string;
  to: string;
  q: string;
}

type Params = Partial<Filters> & { before?: string; after?: string };

const DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function dayStart(value: string): Date | null {
  if (!DAY_PATTERN.test(value)) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function entityTypesFor(entity: string): string[] {
  const kind = normalizeEntityType(entity);
  return (kind && SPELLINGS[kind]) || [entity];
}

function actionPrefixes(action: string): string[] {
  return action
    .split(",")
    .map((part) => part.trim().toLowerCase())
    .filter(Boolean);
}

function whereFor(f: Filters): Prisma.ActivityEventWhereInput {
  const and: Prisma.ActivityEventWhereInput[] = [];
  if (f.actor) {
    const upper = f.actor.toUpperCase();
    and.push(
      (ACTOR_KINDS as readonly string[]).includes(upper)
        ? { actorKind: upper as Prisma.ActivityEventWhereInput["actorKind"] }
        : { actorLabel: { contains: f.actor, mode: "insensitive" } },
    );
  }
  const prefixes = actionPrefixes(f.action);
  if (prefixes.length) and.push({ OR: prefixes.map((prefix) => ({ action: { startsWith: prefix } })) });
  if (f.entity) and.push({ entityType: { in: entityTypesFor(f.entity) } });
  if (f.id) and.push({ entityId: f.id });
  const from = f.from ? dayStart(f.from) : null;
  const to = f.to ? dayStart(f.to) : null;
  if (from) and.push({ createdAt: { gte: from } });
  if (to) and.push({ createdAt: { lt: new Date(to.getTime() + 86_400_000) } });
  if (f.q) {
    and.push({
      OR: [
        { summary: { contains: f.q, mode: "insensitive" } },
        { entityLabel: { contains: f.q, mode: "insensitive" } },
      ],
    });
  }
  return and.length ? { AND: and } : {};
}

function hrefFor(params: Params): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) search.set(key, value);
  }
  const query = search.toString();
  return query ? `/audit?${query}` : "/audit";
}

export default async function AuditPage({ searchParams }: { searchParams: Promise<Params> }) {
  const denied = await gateRoute("/audit", "the audit log");
  if (denied) return denied;

  const params = await searchParams;
  const filters: Filters = {
    actor: (params.actor ?? "").trim(),
    action: (params.action ?? "").trim(),
    entity: (params.entity ?? "").trim(),
    id: (params.id ?? "").trim(),
    from: (params.from ?? "").trim(),
    to: (params.to ?? "").trim(),
    q: (params.q ?? "").trim(),
  };
  const where = whereFor(filters);

  const before = params.before?.trim() || null;
  const after = params.after?.trim() || null;
  const direction: "older" | "newer" = after ? "newer" : "older";
  const cursorId = after ?? before;

  const now = new Date();
  const dayAgo = new Date(now.getTime() - 86_400_000);

  const [page, matching, total, actors, todayCount, peopleCount] = await Promise.all([
    prisma.activityEvent.findMany({
      where,
      orderBy:
        direction === "newer"
          ? [{ createdAt: "asc" }, { id: "asc" }]
          : [{ createdAt: "desc" }, { id: "desc" }],
      take: PAGE + 1,
      ...(cursorId ? { cursor: { id: cursorId }, skip: 1 } : {}),
      include: { actor: { select: { role: true, opsRole: true } } },
    }),
    prisma.activityEvent.count({ where }),
    prisma.activityEvent.count(),
    prisma.activityEvent.groupBy({
      by: ["actorLabel"],
      _count: { _all: true },
      orderBy: { _count: { actorLabel: "desc" } },
      take: 1,
    }),
    prisma.activityEvent.count({ where: { createdAt: { gte: dayAgo } } }),
    prisma.activityEvent.count({ where: { actorKind: "USER" } }),
  ]);

  const more = page.length > PAGE;
  const slice = more ? page.slice(0, PAGE) : page;
  const events = (direction === "newer" ? [...slice].reverse() : slice).map((event) => ({
    ...event,
    actorRole: event.actor ? (resolveRole(event.actor) ?? null) : null,
  }));
  const first = events[0];
  const last = events[events.length - 1];
  const olderHref =
    last && (direction === "older" ? more : true) ? hrefFor({ ...filters, before: last.id }) : null;
  const newerHref =
    first && (direction === "newer" ? more : cursorId !== null)
      ? hrefFor({ ...filters, after: first.id })
      : null;

  const automatic = total - peopleCount;
  const active = (Object.keys(filters) as (keyof Filters)[]).filter((key) => filters[key]);
  const entityOptions = Object.keys(SPELLINGS).sort();
  const entityValue = normalizeEntityType(filters.entity) ?? filters.entity;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Audit log"
        description="Who changed what, from which value to which value. Every entry is written at the moment of the change — nothing here is inferred from a timestamp, and secrets are redacted before they are stored."
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Recorded" value={total} sub="Every event, all time" />
        <StatTile label="Last 24 hours" value={todayCount} sub="Across the whole log" />
        <StatTile label="By a person" value={peopleCount} sub={`${automatic} automatic or by a client`} />
        <StatTile
          label="Busiest actor"
          value={actors[0]?.actorLabel ?? "—"}
          sub={actors[0] ? `${actors[0]._count._all} events` : "Nothing recorded yet"}
        />
      </div>

      <Panel title="Find" description="Filters run against the whole log, not the page" flush>
        <form method="get" action="/audit" className="grid gap-3 p-3 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Actor" hint="A name, or USER / CLIENT / SYSTEM / INTEGRATION">
            <Input name="actor" defaultValue={filters.actor} placeholder="Anyone" className="h-8" />
          </Field>
          <Field label="Action starts with" hint="e.g. contract. or payment.paid — commas for any of several">
            <Input name="action" defaultValue={filters.action} placeholder="Any action" className="h-8 font-mono" />
          </Field>
          <Field label="Entity">
            <SelectField name="entity" defaultValue={entityOptions.includes(entityValue) ? entityValue : ""}>
              <option value="">Any entity</option>
              {entityOptions.map((kind) => (
                <option key={kind} value={kind}>
                  {titleCase(kind)}
                </option>
              ))}
            </SelectField>
          </Field>
          <Field label="Entity id" hint="Set by the audit panel on a record's page">
            <Input name="id" defaultValue={filters.id} placeholder="Any record" className="h-8 font-mono" />
          </Field>
          <Field label="From">
            <DateField name="from" defaultValue={filters.from} className="h-8" />
          </Field>
          <Field label="To">
            <DateField name="to" defaultValue={filters.to} className="h-8" />
          </Field>
          <Field label="Text" hint="Matches the summary and the record's name">
            <Input name="q" defaultValue={filters.q} placeholder="Anything" className="h-8" />
          </Field>
          <div className="flex items-end gap-2">
            <Button type="submit" variant="secondary" size="sm">
              Apply
            </Button>
            {active.length > 0 && (
              <Button asChild variant="ghost" size="sm">
                <Link href="/audit">Clear</Link>
              </Button>
            )}
          </div>
        </form>
        {active.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 border-t border-border-subtle px-3 py-2">
            {active.map((key) => (
              <FilterChip
                key={key}
                label={titleCase(key === "q" ? "text" : key === "id" ? "record" : key)}
                value={
                  key === "id" ? (
                    <span className="font-mono">{filters.id}</span>
                  ) : key === "action" ? (
                    <span className="font-mono">{actionPrefixes(filters.action).join(" or ")}</span>
                  ) : (
                    filters[key]
                  )
                }
                clearHref={hrefFor({ ...filters, [key]: "" })}
              />
            ))}
            <span className="ms-auto text-meta text-subtle-foreground">
              {matching} match{matching === 1 ? "" : "es"}
            </span>
          </div>
        )}
      </Panel>

      <Panel
        title={active.length > 0 ? "Matching events" : "Latest events"}
        description={
          matching > PAGE ? `${PAGE} per page, newest first` : `${matching} event${matching === 1 ? "" : "s"}`
        }
        flush
      >
        {events.length === 0 ? (
          <div className="p-3">
            <EmptyInline>
              {total === 0
                ? "Nothing has been recorded yet. Events are written from the moment of the change onward — history from before this log existed was not back-filled, because inventing it would defeat the point of an audit trail."
                : "No event matches those filters."}
            </EmptyInline>
          </div>
        ) : (
          <EventList
            events={events}
            groupByDate
            renderAside={(event) =>
              filters.id === event.entityId ? null : (
                <Link
                  href={hrefFor({ ...filters, entity: event.entityType, id: event.entityId })}
                  className="hover:text-foreground"
                >
                  this record only
                </Link>
              )
            }
          />
        )}
        <CursorPager
          prevHref={newerHref}
          nextHref={olderHref}
          summary={`${events.length} event${events.length === 1 ? "" : "s"}, newest first`}
          className="border-t border-border-subtle px-3 py-2"
        />
      </Panel>
    </div>
  );
}
