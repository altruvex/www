import { cn } from "../../lib/utils";

export function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-ctl-xs bg-surface-2",
        "bg-fixed bg-[length:300%_100%] bg-[linear-gradient(90deg,transparent_35%,hsl(var(--foreground)/0.07)_50%,transparent_65%)] animate-shimmer",
        className,
      )}
      {...props}
    />
  );
}

export function TableSkeleton({ rows = 8, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="plane overflow-hidden">
      <div className="flex h-9 items-center gap-4 border-b border-border-subtle bg-surface px-3">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} className="h-2.5 flex-1" />
        ))}
      </div>
      <div className="rows">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="flex items-center gap-4 px-3" style={{ height: "var(--row-h)" }}>
            {Array.from({ length: cols }).map((_, c) => (
              <Skeleton
                key={c}
                className="h-2.5 flex-1"
                style={{ opacity: 1 - r * 0.07, maxWidth: c === 0 ? "none" : "70%" }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function TilesSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="plane space-y-3 p-4">
          <Skeleton className="h-2.5 w-24" />
          <Skeleton className="h-7 w-20" />
          <Skeleton className="h-2.5 w-32" />
        </div>
      ))}
    </div>
  );
}
