import { cn } from "@/lib/utils/utils";
import type { ComponentPropsWithoutRef } from "react";

type SurfaceCardProps = ComponentPropsWithoutRef<"div"> & {
  interactive?: boolean;
  /** Render the card as a frosted liquid-glass panel instead of a flat surface. */
  glass?: boolean;
};

export function SurfaceCard({
  className,
  interactive = false,
  glass = false,
  ...props
}: SurfaceCardProps) {
  return (
    <div
      className={cn(
        "rounded-lg",
        glass ? "liquid-glass-panel" : "border border-border bg-surface",
        interactive &&
          "transition-all duration-300 ease-out hover:bg-background/80 hover:border-border-mid motion-safe:hover:-translate-y-1 motion-safe:hover:shadow-card-lg",
        className,
      )}
      {...props}
    />
  );
}
