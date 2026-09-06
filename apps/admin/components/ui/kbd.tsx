import { cn } from "@/lib/utils";

export function Kbd({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <kbd
      className={cn(
        "inline-flex h-4.5 min-w-4.5 items-center justify-center rounded-xs border border-border bg-surface px-1",
        "font-mono text-micro font-medium text-subtle-foreground",
        className,
      )}
    >
      {children}
    </kbd>
  );
}
