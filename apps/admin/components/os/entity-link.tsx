import Link from "next/link";
import { entityHref } from "@/lib/entity-links";
import { cn } from "@/lib/utils";

/**
 * A record named anywhere in the OS is a link to that record. Tables, asides,
 * audit rows and feeds all render related records through this, so "the client
 * is plain text" cannot happen one table at a time.
 *
 * Falls back to plain text when the type has no page or the id is missing — a
 * dead link is worse than none.
 */
export function EntityLink({
  type,
  id,
  children,
  className,
  muted = false,
}: {
  type: string;
  id: string | null | undefined;
  children: React.ReactNode;
  className?: string;
  /** Secondary reference (a client under a project name): quieter at rest. */
  muted?: boolean;
}) {
  const href = entityHref(type, id);
  if (!href) return <span className={className}>{children}</span>;
  return (
    <Link
      href={href}
      className={cn(
        "rounded-xs underline-offset-2 transition-colors duration-[var(--dur-state)] hover:underline",
        muted ? "text-muted-foreground hover:text-foreground" : "text-foreground",
        className,
      )}
    >
      {children}
    </Link>
  );
}
