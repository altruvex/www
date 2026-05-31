import { cn } from "@/lib/utils";
import type { ComponentPropsWithoutRef } from "react";

type SurfaceCardProps = ComponentPropsWithoutRef<"div"> & {
  interactive?: boolean;
};

export function SurfaceCard({
  className,
  interactive = false,
  ...props
}: SurfaceCardProps) {
  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-surface",
        interactive &&
          "transition-colors duration-300 hover:bg-background/80",
        className,
      )}
      {...props}
    />
  );
}
