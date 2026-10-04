import Link from "next/link";
import { prisma, type Prisma } from "@repo/database";
import { Bell } from "lucide-react";
import { PageHeader } from "@/components/os/page-header";
import { Panel } from "@/components/os/panel";
import { EmptyInline, EmptyState } from "@/components/os/empty-state";
import { ActiveFilters, FilterBar, FilterChip } from "@/components/os/filter-bar";
import { Pager } from "@/components/os/pager";
import { when, dateTime } from "@/lib/format";
import { entityHref } from "@/lib/entity-links";
import { getOperator } from "@/lib/authorize";
import { gateRoute } from "@/lib/page-gate";
import { roleCanOpen } from "@/lib/action-center";
import { notificationType, statusOf } from "@/lib/status";
import { MarkAllRead } from "./mark-all-read";
import { NotificationList, type NotificationRowData } from "./notification-list";
import { Button } from "@repo/ui";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;
const TYPES = Object.keys(notificationType);
const TYPE_LABELS = Object.fromEntries(TYPES.map((t) => [t, statusOf("notificationType", t).label]));

export default async function NotificationsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string; type?: string; page?: string }>;
}) {
  const denied = await gateRoute("/notifications");
  if (denied) return denied;

  const [operator, params] = await Promise.all([getOperator(), searchParams]);
  if (!operator) return null;
  const userId = operator.session.user.id;
  const role = operator.role;

  const unreadOnly = params.filter === "unread";
  const type = params.type && TYPES.includes(params.type) ? params.type : undefined;
  const requestedPage = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);

  const mine: Prisma.NotificationWhereInput = { userId };
  const where: Prisma.NotificationWhereInput = {
    ...mine,
    ...(unreadOnly ? { read: false } : {}),
    ...(type ? { type: type as Prisma.NotificationWhereInput["type"] } : {}),
  };

  const matching = await prisma.notification.count({ where });
  const page = Math.min(requestedPage, Math.max(1, Math.ceil(matching / PAGE_SIZE)));

  const [total, unread, byType, notifications] = await Promise.all([
    prisma.notification.count({ where: mine }),
    prisma.notification.count({ where: { ...mine, read: false } }),
    prisma.notification.groupBy({
      by: ["type"],
      where: { ...mine, ...(unreadOnly ? { read: false } : {}) },
      _count: { _all: true },
    }),
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
  ]);
  const typeCount = new Map(byType.map((row) => [row.type as string, row._count._all]));

  const rows: NotificationRowData[] = notifications.map((n) => {
    const href = entityHref(n.entityType, n.entityId);
    return {
      id: n.id,
      type: n.type,
      title: n.title,
      message: n.message,
      read: n.read,
      href: href && roleCanOpen(role, href) ? href : null,
      createdAt: n.createdAt.toISOString(),
      when: when(n.createdAt),
      at: dateTime(n.createdAt),
    };
  });

  const hrefFor = (p: number) => {
    const next = new URLSearchParams();
    if (unreadOnly) next.set("filter", "unread");
    if (type) next.set("type", type);
    if (p > 1) next.set("page", String(p));
    const query = next.toString();
    return query ? `/notifications?${query}` : "/notifications";
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Notifications"
        crumbs={[{ label: "Notifications" }]}
        description="What the system wanted to tell you. Anything that needs a decision is also in the action centre — this is the record, that is the queue."
        meta={<span>{unread} unread of {total}</span>}
        actions={unread > 0 ? <MarkAllRead unread={unread} /> : undefined}
      />

      {total === 0 ? (
        <EmptyState
          icon={Bell}
          title="No notifications"
          body="The system writes here when a lead arrives, a meeting is requested, a renewal comes due or something is assigned to you. Nothing has happened yet — anything waiting on a decision is in the action centre."
          action={
            <Button asChild variant="outline">
              <Link href="/actions">Open the action centre</Link>
            </Button>
          }
        />
      ) : (
        <>
          <FilterBar label="Filter notifications">
            <FilterChip param="filter" label="All" count={total} />
            <FilterChip param="filter" value="unread" label="Unread" count={unread} />
            <span className="mx-1 h-4 w-px shrink-0 bg-border" aria-hidden />
            <FilterChip param="type" label="Any type" />
            {TYPES.filter((t) => typeCount.has(t)).map((t) => (
              <FilterChip key={t} param="type" value={t} label={TYPE_LABELS[t]} count={typeCount.get(t)} />
            ))}
          </FilterBar>
          <ActiveFilters
            labels={{ filter: "Show", type: "Type" }}
            valueLabels={{ filter: { unread: "Unread" }, type: TYPE_LABELS }}
          />

          <Panel flush>
            {rows.length === 0 ? (
              <EmptyInline
                action={
                  <Button asChild variant="outline" size="sm">
                    <Link href="/notifications">Show all notifications</Link>
                  </Button>
                }
              >
                {unreadOnly && unread === 0
                  ? "Everything is read. New notifications show here unread until you open them."
                  : "No notification matches this filter."}
              </EmptyInline>
            ) : (
              <NotificationList rows={rows} />
            )}
          </Panel>

          <Pager page={page} pageSize={PAGE_SIZE} total={matching} hrefFor={hrefFor} noun="notifications" />
        </>
      )}
    </div>
  );
}
