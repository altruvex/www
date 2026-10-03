import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { prisma, type Prisma } from "@repo/database";
import { Button, Field, Input, SelectField } from "@repo/ui";

import { PageHeader } from "@/components/os/page-header";
import { Panel } from "@/components/os/panel";
import { StatTile } from "@/components/os/stat-tile";
import { EmptyInline } from "@/components/os/empty-state";
import { FilterChip } from "@/components/os/data-table";
import { EntityLink } from "@/components/os/entity-link";
import { ToneBadge } from "@/components/ui/badge";
import { SPELLINGS } from "@/components/os/entity-audit";
import { dateTime, when } from "@/lib/format";
import { entityHref, normalizeEntityType } from "@/lib/entity-links";
import { titleCase, type Tone } from "@/lib/status";

export const dynamic = "force-dynamic";

/** Rows per page. Older history is a page, not a scroll. */
const PAGE = 50;

const ACTOR_KINDS = ["USER", "CLIENT", "INTEGRATION", "SYSTEM"] as const;

/**
 * The audit log (§12).
 *
 * This page used to be a *projection*: it read `updatedAt` off contracts,
 * proposals, payments and sessions and inferred that something had happened.
 * That can show a row changed and roughly when — it can never show who changed
 * it, or what the value had been, which is the only reason an audit log exists.
 *
 * It now reads `ActivityEvent`, written at each mutation site with the actor and
 * the changed fields. Events before this shipped do not exist, and the page says
 * so rather than back-filling plausible history.
 *
 * Filters are URL search params and are applied in the query, not in the
 * browser: the log is the system's memory, and a filter that only searched the
 * latest few hundred rows would answer "nothing happened" about anything older.
 * Every detail page's audit panel links here with `?entity=<type>&id=<id>`.
 */
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

/** Every spelling writers have used for the kind this filter names. */
function entityTypesFor(entity: string): string[] {
  const kind = normalizeEntityType(entity);
  return (kind && SPELLINGS[kind]) || [entity];
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
  if (f.action) and.push({ action: { startsWith: f.action.toLowerCase() } });
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

/**
 * Tone is taken from the VERB of the action, not from a per-action table.
 * Actions are open-ended — every new mutation site adds one — so a lookup table
 * would silently render each new action as "unknown".
 */
function toneFor(action: string): Tone {
  const verb = action.split(".")[1] ?? "";
  if (/deleted|failed|revoked|cancelled|suspended|rejected|disabled/.test(verb)) return "danger";
  if (/created|opened|signed|succeeded|resolved|renewed|paid|enabled/.test(verb)) return "success";
  if (/updated|changed|rotated|moved|regenerated/.test(verb)) return "progress";
  if (/due|overdue|expiring|past/.test(verb)) return "warning";
  return "info";
}

function actionLabel(action: string): string {
  const [entity, verb] = action.split(".");
  return verb ? `${titleCase(entity)} ${verb.replace(/_/g, " ")}` : titleCase(action);
}

function fieldList(value: unknown): string[] {
  return value && typeof value === "object" && !Array.isArray(value) ? Object.keys(value) : [];
}

function show(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "string") return value.length > 120 ? `${value.slice(0, 120)}…` : value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  const json = JSON.stringify(value);
  return json.length > 120 ? `${json.slice(0, 120)}…` : json;
}

export default async function AuditPage({ searchParams }: { searchParams: Promise<Params> }) {
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

  // Cursor pagination on (createdAt, id): `before` walks older than a row,
  // `after` walks newer. Offsets would drift as events keep arriving.
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
  const events = direction === "newer" ? [...slice].reverse() : slice;
  const first = events[0];
  const last = events[events.length - 1];
  // Walking older: there is a newer page whenever a cursor got us here. Walking
  // newer: there is an older page whenever a cursor got us here.
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
          <Field label="Action starts with" hint="e.g. contract. or payment.paid">
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
            <Input type="date" name="from" defaultValue={filters.from} className="h-8" />
          </Field>
          <Field label="To">
            <Input type="date" name="to" defaultValue={filters.to} className="h-8" />
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
          <div className="flex flex-wrap items-center gap-1.5 border-t border-border px-3 py-2">
            {active.map((key) => (
              <FilterChip
                key={key}
                label={titleCase(key === "q" ? "text" : key === "id" ? "record" : key)}
                value={key === "id" ? <span className="font-mono">{filters.id}</span> : filters[key]}
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
          <ol className="divide-y divide-border">
            {events.map((event) => {
              const before = (event.before ?? {}) as Record<string, unknown>;
              const after = (event.after ?? {}) as Record<string, unknown>;
              const fields = Array.from(new Set([...fieldList(event.before), ...fieldList(event.after)]));
              const metadata = event.metadata as Record<string, unknown> | null;
              const hasMeta = metadata !== null && Object.keys(metadata).length > 0;
              const linked = entityHref(event.entityType, event.entityId) !== null;
              const role = event.actor?.opsRole ?? event.actor?.role ?? null;
              return (
                <li key={event.id} className="px-3 py-2.5">
                  <div className="flex flex-wrap items-start gap-x-3 gap-y-1">
                    <ToneBadge tone={toneFor(event.action)} className="shrink-0">
                      {actionLabel(event.action)}
                    </ToneBadge>
                    <div className="min-w-0 flex-1">
                      <p className="text-base">
                        <span className="font-medium">{event.actorLabel}</span>{" "}
                        <span className="text-muted-foreground">{event.summary}</span>
                      </p>
                      <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-meta text-subtle-foreground">
                        <span>{role ? titleCase(String(role)) : titleCase(event.actorKind)}</span>
                        <span aria-hidden>·</span>
                        <EntityLink type={event.entityType} id={event.entityId} muted={!linked}>
                          {event.entityLabel ?? titleCase(event.entityType)}
                        </EntityLink>
                        {!linked && (
                          <span className="font-mono text-micro">{event.entityType}</span>
                        )}
                        <Link
                          href={hrefFor({ ...filters, entity: event.entityType, id: event.entityId })}
                          className="hover:text-foreground"
                        >
                          this record only
                        </Link>
                      </p>
                    </div>
                    <time
                      className="shrink-0 font-mono text-micro tabular-nums text-subtle-foreground"
                      dateTime={event.createdAt.toISOString()}
                      title={dateTime(event.createdAt)}
                    >
                      {when(event.createdAt)}
                    </time>
                  </div>
                  {(fields.length > 0 || hasMeta) && (
                    <details className="group mt-1">
                      <summary className="cursor-pointer list-none text-meta text-subtle-foreground hover:text-foreground">
                        {fields.length > 0
                          ? `${fields.length} field${fields.length === 1 ? "" : "s"} changed · `
                          : "Details · "}
                        <span className="font-mono">
                          {fields.slice(0, 4).join(", ")}
                          {fields.length > 4 ? "…" : ""}
                        </span>
                      </summary>
                      {fields.length > 0 && (
                        <dl className="mt-1.5 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 rounded-sm border border-border bg-surface/50 p-2 text-meta">
                          {fields.map((field) => (
                            <div key={field} className="contents">
                              <dt className="font-mono text-subtle-foreground">{field}</dt>
                              <dd className="min-w-0 break-words">
                                <span className="text-muted-foreground line-through decoration-border-mid">
                                  {show(before[field])}
                                </span>
                                {" → "}
                                <span>{show(after[field])}</span>
                              </dd>
                            </div>
                          ))}
                        </dl>
                      )}
                      {hasMeta && (
                        <pre className="mt-1.5 max-h-48 overflow-auto rounded-sm border border-border bg-surface p-2 font-mono text-meta">
                          {JSON.stringify(metadata, null, 2)}
                        </pre>
                      )}
                    </details>
                  )}
                </li>
              );
            })}
          </ol>
        )}
        {(olderHref || newerHref) && (
          <div className="flex items-center justify-between gap-2 border-t border-border px-3 py-2">
            {newerHref ? (
              <Button asChild variant="ghost" size="sm">
                <Link href={newerHref}>
                  <ChevronLeft className="size-3.5" />
                  Newer
                </Link>
              </Button>
            ) : (
              <span />
            )}
            {olderHref ? (
              <Button asChild variant="ghost" size="sm">
                <Link href={olderHref}>
                  Older
                  <ChevronRight className="size-3.5" />
                </Link>
              </Button>
            ) : (
              <span />
            )}
          </div>
        )}
      </Panel>
    </div>
  );
}
