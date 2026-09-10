import Link from "next/link";
import { prisma } from "@repo/database";
import { Bell } from "lucide-react";
import { PageHeader } from "@/components/os/page-header";
import { Panel } from "@/components/os/panel";
import { EmptyState } from "@/components/os/empty-state";
import { when, dateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { DeleteRecordButton } from "@/components/os/delete-record";
import { MarkAllRead } from "./mark-all-read";
import { Button } from "@repo/ui";

export const dynamic = "force-dynamic";

const ENTITY_HREF: Record<string, (id: string) => string> = {
  ContactSubmission: (id) => `/submissions/${id}`,
  Client: (id) => `/clients/${id}`,
  Proposal: (id) => `/proposals/${id}`,
  Contract: (id) => `/contracts/${id}`,
  Project: (id) => `/projects/${id}`,
  Meeting: () => `/calendar`,
};

const TYPE_TONE: Record<string, string> = {
  NEW_CONTACT: "bg-info",
  NEW_MEETING: "bg-progress",
  STATUS_CHANGE: "bg-neutral",
  ASSIGNMENT: "bg-warning",
};

export default async function NotificationsPage() {
  const notifications = await prisma.notification.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  const unread = notifications.filter((n) => !n.read);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Notifications"
        crumbs={[{ label: "Notifications" }]}
        description="What the system wanted to tell you. Anything that needs a decision also appears in the action centre — this is the record, that is the queue."
        meta={<span>{unread.length} unread of {notifications.length}</span>}
        actions={unread.length > 0 ? <MarkAllRead /> : undefined}
      />

      {notifications.length === 0 ? (
        <EmptyState
          icon={Bell}
          title="No notifications"
          body="The system writes here when a lead arrives, a meeting is requested, a status changes or something is assigned to you. Nothing has happened yet."
          action={
            <Button asChild variant="outline">
              <Link href="/settings">
                Notification preferences
              </Link>
            </Button>
          }
        />
      ) : (
        <Panel flush>
          <ul className="rows">
            {notifications.map((notification) => {
              const href = ENTITY_HREF[notification.entityType]?.(notification.entityId);
              const body = (
                <>
                  <span
                    className={cn(
                      "mt-1.5 size-1.5 shrink-0 rounded-full",
                      TYPE_TONE[notification.type] ?? "bg-neutral",
                      notification.read && "opacity-30",
                    )}
                    aria-hidden
                  />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline justify-between gap-3">
                      <span
                        className={cn(
                          "min-w-0 truncate text-base",
                          notification.read ? "text-muted-foreground" : "font-medium",
                        )}
                      >
                        {notification.title}
                      </span>
                      <time
                        dateTime={notification.createdAt.toISOString()}
                        title={dateTime(notification.createdAt)}
                        className="shrink-0 font-mono text-micro tabular-nums text-subtle-foreground"
                      >
                        {when(notification.createdAt)}
                      </time>
                    </span>
                    <span className="mt-0.5 block truncate text-meta text-muted-foreground">
                      {notification.message}
                    </span>
                  </span>
                </>
              );
              return (
                <li key={notification.id} className="flex items-start gap-1 pe-2">
                  {href ? (
                    <Link
                      href={href}
                      className="flex min-w-0 flex-1 gap-2.5 px-3 py-2.5 hover:bg-surface/70"
                    >
                      {body}
                    </Link>
                  ) : (
                    <div className="flex min-w-0 flex-1 gap-2.5 px-3 py-2.5">{body}</div>
                  )}
                  {/* A notification is a message about a record, not the record
                      itself — deleting one destroys nothing but the message. */}
                  <span className="pt-2">
                    <DeleteRecordButton
                      entity="notification"
                      id={notification.id}
                      label={notification.title}
                      variant="ghost"
                      size="icon-sm"
                    >
                      {null}
                    </DeleteRecordButton>
                  </span>
                </li>
              );
            })}
          </ul>
        </Panel>
      )}
    </div>
  );
}
