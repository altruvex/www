"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CalendarClock, Check, Inbox, RefreshCw, UserCheck, Workflow } from "lucide-react";
import { markNotificationRead } from "@/app/(dashboard)/_actions/records";
import { List, ListRow } from "@/components/os/list-row";
import { DeleteRecordButton } from "@/components/os/delete-record";
import { statusOf } from "@/lib/status";
import { cn } from "@/lib/utils";
import { Button, Hint } from "@repo/ui";

export interface NotificationRowData {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  href: string | null;
  createdAt: string;
  when: string;
  at: string;
}

const TYPE_ICON: Record<string, React.ReactNode> = {
  NEW_CONTACT: <Inbox />,
  NEW_MEETING: <CalendarClock />,
  STATUS_CHANGE: <Workflow />,
  ASSIGNMENT: <UserCheck />,
  RENEWAL_DUE: <RefreshCw />,
};

function errorMessage(error: unknown) {
  return error instanceof Error && error.message ? error.message : "The server refused the change.";
}

export function NotificationList({ rows }: { rows: NotificationRowData[] }) {
  const router = useRouter();
  const [pendingId, setPendingId] = React.useState<string | null>(null);
  const [, startTransition] = React.useTransition();

  const unreadByHref = React.useMemo(() => {
    const map = new Map<string, string[]>();
    for (const row of rows) {
      if (row.read || !row.href) continue;
      map.set(row.href, [...(map.get(row.href) ?? []), row.id]);
    }
    return map;
  }, [rows]);

  const markRead = React.useCallback(
    (ids: string[], after?: () => void) => {
      setPendingId(ids[0] ?? null);
      startTransition(async () => {
        try {
          const results = [];
          for (const id of ids) results.push(await markNotificationRead(id));
          if (after) after();
          else {
            const refused = results.find((result) => !result.ok);
            const changed = results.filter((result) => result.changed);
            if (refused) toast.error("Could not mark it read", { description: refused.message });
            else if (changed.length === 0) toast.info(results[0]?.message ?? "Nothing changed");
            else toast.success(changed.length === 1 ? changed[0].message : `${changed.length} marked read`);
            router.refresh();
          }
        } catch (error) {
          toast.error("Could not mark it read", { description: errorMessage(error) });
          after?.();
        } finally {
          setPendingId(null);
        }
      });
    },
    [router],
  );

  function onClick(event: React.MouseEvent<HTMLDivElement>) {
    const anchor = (event.target as HTMLElement).closest("a");
    const href = anchor?.getAttribute("href");
    const ids = href ? unreadByHref.get(href) : undefined;
    if (!href || !ids?.length) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) {
      markRead(ids, () => router.refresh());
      return;
    }
    event.preventDefault();
    markRead(ids, () => router.push(href));
  }

  return (
    <div onClick={onClick}>
      <List label="Notifications, newest first">
        {rows.map((row) => {
          const type = statusOf("notificationType", row.type);
          return (
            <ListRow
              key={row.id}
              href={row.href ?? undefined}
              icon={TYPE_ICON[row.type] ?? <Inbox />}
              tone={row.read ? "neutral" : type.tone}
              title={
                <span className={cn(row.read && "font-normal text-muted-foreground")}>
                  {!row.read && <span className="sr-only">Unread: </span>}
                  {row.title}
                </span>
              }
              meta={
                <>
                  <span className="truncate">{row.message}</span>
                  <span aria-hidden>·</span>
                  <span className="shrink-0">{type.label}</span>
                </>
              }
              trailing={
                <time dateTime={row.createdAt} title={row.at} className="font-mono text-micro tabular-nums">
                  {row.when}
                </time>
              }
              actions={
                <>
                  {!row.read && (
                    <Hint label="Mark read">
                      <Button
                        type="button"
                        size="icon-sm"
                        variant="ghost"
                        aria-label={`Mark “${row.title}” read`}
                        disabled={pendingId === row.id}
                        onClick={() => markRead([row.id])}
                      >
                        <Check />
                      </Button>
                    </Hint>
                  )}
                  <DeleteRecordButton
                    entity="notification"
                    id={row.id}
                    label={row.title}
                    size="icon-sm"
                    aria-label={`Delete notification “${row.title}”`}
                  >
                    {null}
                  </DeleteRecordButton>
                </>
              }
            />
          );
        })}
      </List>
    </div>
  );
}
