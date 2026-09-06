import type { ComponentPropsWithoutRef } from "react";

import { cn } from "../../lib/utils";

export function Kbd({ className, ...props }: ComponentPropsWithoutRef<"kbd">) {
  return (
    <kbd
      className={cn(
        "inline-flex h-5 min-w-5 items-center justify-center rounded-sm border border-border bg-surface px-1.5 font-mono text-[0.6875rem] font-medium text-muted-foreground shadow-sm",
        className,
      )}
      {...props}
    />
  );
}
