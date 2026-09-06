import * as React from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * A Panel is a flat plane with a hairline header. It is NOT a card: no shadow,
 * no lift on hover, no rounded-3xl. Twenty of these tile without becoming soup.
 */
export function Panel({
  title,
  description,
  action,
  children,
  className,
  bodyClassName,
  flush = false,
}: {
  title?: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  /** Body sits flush to the plane edge — for tables and row lists. */
  flush?: boolean;
}) {
  return (
    <section className={cn("plane flex min-w-0 flex-col overflow-hidden", className)}>
      {(title || action) && (
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border px-3 py-2">
          <div className="min-w-0">
            {title && <h2 className="truncate text-md font-semibold">{title}</h2>}
            {description && (
              <p className="mt-0.5 truncate text-meta text-muted-foreground">{description}</p>
            )}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}
      <div className={cn(flush ? "" : "p-3", "min-w-0 flex-1", bodyClassName)}>{children}</div>
    </section>
  );
}

export function PanelLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1 rounded-xs text-meta text-muted-foreground transition-colors duration-[var(--dur-state)] hover:text-foreground"
    >
      {children}
      <ArrowRight className="size-3" />
    </Link>
  );
}
