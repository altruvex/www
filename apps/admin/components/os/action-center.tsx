import * as React from "react";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toneIcon } from "@/lib/status";
import type { ActionItem } from "@/lib/action-center";

/**
 * The Action Centre. The first thing on the dashboard, above every metric,
 * because a number tells you how the business is doing and this tells you what
 * to do about it.
 *
 * Rows are ordered by urgency across ALL entity types — deliberately mixed, not
 * grouped, because grouping by type is how an overdue payment ends up below a
 * meeting request nobody cares about.
 */
export function ActionCenter({
  items,
  limit = 8,
}: {
  items: ActionItem[];
  limit?: number;
}) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center px-6 py-10 text-center">
        <CheckCircle2 className="mb-2 size-5 text-success" />
        <p className="text-md font-medium">Nothing needs you right now</p>
        <p className="mt-1 max-w-sm text-base text-muted-foreground">
          Every lead has been contacted, no proposal is waiting on a chase, and
          nothing is overdue. This list fills itself as work arrives.
        </p>
      </div>
    );
  }

  const shown = items.slice(0, limit);

  return (
    <div>
      <ul className="rows">
        {shown.map((item) => {
          const Icon = item.icon;
          return (
            <li key={item.id}>
              <Link
                href={item.href}
                className={cn(
                  "group flex items-center gap-3 px-3",
                  "transition-colors duration-[var(--dur-state)] hover:bg-surface/70",
                )}
                style={{ minHeight: "var(--row-h)" }}
              >
                <Icon className={cn("size-3.5 shrink-0", toneIcon[item.tone])} aria-hidden />
                <div className="min-w-0 flex-1 py-2">
                  <p className="truncate text-base font-medium">{item.title}</p>
                  <p className="truncate text-meta text-muted-foreground">{item.detail}</p>
                </div>
                <span
                  className={cn(
                    "hidden shrink-0 text-meta text-subtle-foreground sm:inline",
                    "transition-colors duration-[var(--dur-state)] group-hover:text-brand",
                  )}
                >
                  {item.cta} →
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
      {items.length > limit && (
        <div className="border-t border-border px-3 py-2">
          <Link
            href="/actions"
            className="text-meta text-muted-foreground hover:text-foreground"
          >
            {items.length - limit} more waiting →
          </Link>
        </div>
      )}
    </div>
  );
}
