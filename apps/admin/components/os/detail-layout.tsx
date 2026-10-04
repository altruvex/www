import * as React from "react";
import { Hint } from "@repo/ui";
import { cn } from "@/lib/utils";

export function DetailLayout({
  children,
  aside,
  className,
}: {
  children: React.ReactNode;
  aside?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]", className)}>
      <div className="min-w-0 space-y-4">{children}</div>
      {aside && <aside className="min-w-0 space-y-4 lg:sticky lg:top-4 lg:self-start">{aside}</aside>}
    </div>
  );
}

export function MetaList({
  items,
  className,
}: {
  items: { label: string; value: React.ReactNode; hint?: string }[];
  className?: string;
}) {
  return (
    <dl className={cn("divide-y divide-border", className)}>
      {items.map((item) => (
        <div key={item.label} className="flex items-start justify-between gap-3 px-3 py-2">
          <Hint label={item.hint}>
            <dt
              tabIndex={item.hint ? 0 : undefined}
              className={cn(
                "telemetry shrink-0 pt-0.5 text-subtle-foreground",
                item.hint &&
                  "cursor-help rounded-xs underline decoration-dotted underline-offset-2 outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
              )}
            >
              {item.label}
            </dt>
          </Hint>
          <dd className="min-w-0 text-end text-base">{item.value ?? "—"}</dd>
        </div>
      ))}
    </dl>
  );
}

export function QuickActions({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5 p-3 [&>*]:w-full [&>*]:justify-start">{children}</div>
  );
}
