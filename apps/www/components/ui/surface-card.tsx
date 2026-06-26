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
          "transition-colors duration-300 hover:bg-background/80",
        className,
      )}
      {...props}
    />
  );
}
