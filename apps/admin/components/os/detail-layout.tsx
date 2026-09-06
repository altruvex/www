import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * §30 — the fixed anatomy of every detail page:
 *   header (identity · status · primary actions)   — passed in above this
 *   main   (overview, related entities, timeline)
 *   aside  (metadata, owner, dates, tags, quick actions)
 *
 * The aside is BELOW main on mobile, not hidden: metadata is often the reason
 * you opened the record on your phone.
 */
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

/** Definition list used in the aside. Labels are mono, values are readable. */
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
          <dt className="telemetry shrink-0 pt-0.5 text-subtle-foreground" title={item.hint}>
            {item.label}
          </dt>
          <dd className="min-w-0 text-end text-base">{item.value ?? "—"}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Vertical stack of quick actions in the aside. */
export function QuickActions({ children }: { children: React.ReactNode }) {
  // A stacked list of full-width actions reads as a menu, so the label starts at
  // the inline edge — Button centres its content by default, which is right for a
  // toolbar and wrong for a stack.
  return (
    <div className="flex flex-col gap-1.5 p-3 [&>*]:w-full [&>*]:justify-start">{children}</div>
  );
}
