import type { ComponentPropsWithoutRef } from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "../../lib/utils";

const surfaceVariants = cva("min-w-0 border text-card-foreground", {
  variants: {
    variant: {
      default: "border-border bg-card",
      subtle: "border-border-subtle bg-surface-subtle",
      elevated: "border-border bg-card shadow-card",
      glass: "liquid-glass-panel",
      "glass-flat": "liquid-glass-flat",
      toolbar: "liquid-glass-toolbar",
    },
    radius: {
      sm: "rounded-sm",
      md: "rounded-md",
      lg: "rounded-lg",
      xl: "rounded-xl",
      "2xl": "rounded-2xl",
    },
    padding: {
      none: "",
      sm: "p-3",
      md: "p-4",
      lg: "p-6",
    },
  },
  defaultVariants: {
    variant: "default",
    radius: "lg",
    padding: "none",
  },
});

type SurfaceProps = ComponentPropsWithoutRef<"div"> & VariantProps<typeof surfaceVariants>;

function Surface({ className, variant, radius, padding, ...props }: SurfaceProps) {
  return (
    <div
      data-slot="surface"
      data-variant={variant ?? "default"}
      className={cn(surfaceVariants({ variant, radius, padding, className }))}
      {...props}
    />
  );
}

type SurfaceCardProps = ComponentPropsWithoutRef<"div"> & {
  interactive?: boolean;
  /** Render the card as a frosted liquid-glass panel instead of a flat surface. */
  glass?: boolean;
};

function SurfaceCard({
  className,
  interactive = false,
  glass = false,
  ...props
}: SurfaceCardProps) {
  return (
    <div
      data-slot="surface-card"
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

export { Surface, SurfaceCard, surfaceVariants };
