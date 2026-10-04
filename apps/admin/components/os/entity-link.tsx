import Link from "next/link";
import { entityHref } from "@/lib/entity-links";
import { cn } from "@/lib/utils";

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
