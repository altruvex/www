import * as React from "react";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import type { ActionItem } from "@/lib/action-center";
import { List, ListRow } from "@/components/os/list-row";

export function ActionCenter({
  items,
  limit = 8,
  moreHref = "/actions",
  empty,
}: {
  items: ActionItem[];
  limit?: number;
  moreHref?: string | null;
  empty?: React.ReactNode;
}) {
  if (items.length === 0) {
    return (
      empty ?? (
        <div className="flex flex-col items-center px-6 py-10 text-center">
          <CheckCircle2 className="mb-2 size-5 text-success" aria-hidden />
          <p className="text-md font-medium">Nothing needs you right now</p>
          <p className="mt-1 max-w-sm text-base text-muted-foreground">
            Every lead has been contacted, no proposal is waiting on a chase, and
            nothing you can act on is overdue. This list fills itself as work arrives.
          </p>
        </div>
      )
    );
  }

  const shown = items.slice(0, limit);

  return (
    <div>
      <List label="Needs you, most urgent first">
        {shown.map((item) => {
          const Icon = item.icon;
          return (
            <ListRow
              key={item.id}
              href={item.href}
              icon={<Icon />}
              tone={item.tone}
              title={item.title}
              meta={<span className="truncate">{item.detail}</span>}
              trailing={
                <span className="hidden text-subtle-foreground transition-colors duration-[var(--dur-state)] group-hover:text-foreground sm:inline">
                  {item.cta}
                </span>
              }
            />
          );
        })}
      </List>
      {moreHref && items.length > limit && (
        <div className="border-t border-border-subtle px-3 py-2">
          <Link
            href={moreHref}
            className="rounded-xs text-meta text-muted-foreground transition-colors duration-[var(--dur-state)] hover:text-foreground"
          >
            {items.length - limit} more waiting →
          </Link>
        </div>
      )}
    </div>
  );
}
