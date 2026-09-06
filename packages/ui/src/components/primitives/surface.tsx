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
  glass?: boolean;
};

function SurfaceCard({
  className,
  interactive = false,
  glass = false,
  ...props
}: SurfaceCardProps) {
  return (
    <Surface
      variant={glass ? "glass" : "subtle"}
      className={cn(
        interactive &&
          "transition-all duration-[var(--duration-panel)] ease-[var(--ease-standard)] hover:border-border-mid hover:bg-card/80 hover:shadow-card-lg motion-safe:hover:-translate-y-1",
        className,
      )}
      {...props}
    />
  );
}

export { Surface, SurfaceCard, surfaceVariants };
