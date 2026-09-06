import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";

import { cn } from "../../lib/utils";

const buttonVariants = cva(
  [
    "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap font-medium",
    "rounded-md transition-[color,background-color,border-color,box-shadow,transform,filter,backdrop-filter]",
    "duration-[var(--duration-state)] ease-[var(--ease-standard)]",
    "outline-none focus-visible:ring-2 focus-visible:ring-ring/55 focus-visible:ring-offset-1 focus-visible:ring-offset-background",
    "disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]",
    "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  ].join(" "),
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        brand: "bg-brand text-brand-foreground hover:bg-brand-hover focus-visible:ring-brand/50",
        glass:
          "liquid-glass-flat text-foreground hover:border-border-mid hover:bg-card/70 focus-visible:ring-brand/45",
        destructive:
          "bg-destructive text-white hover:bg-destructive/90 focus-visible:ring-destructive/45",
        outline:
          "border border-border bg-card text-foreground hover:border-border-mid hover:bg-surface",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "text-muted-foreground hover:bg-surface hover:text-foreground",
        link: "text-brand underline-offset-4 hover:underline active:text-brand-hover",
      },
      size: {
        sm: "h-[var(--control-h-sm)] gap-1.5 px-3 text-sm has-[>svg]:px-2.5",
        default: "h-[var(--control-h)] px-4 text-sm has-[>svg]:px-3",
        lg: "h-[var(--control-h-lg)] px-5 text-sm has-[>svg]:px-4",
        xl: "h-12 px-8 text-base has-[>svg]:px-6",
        "icon-sm": "size-[var(--control-h-sm)]",
        icon: "size-[var(--control-h)]",
        "icon-lg": "size-[var(--control-h-lg)]",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  loading = false,
  disabled,
  children,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
    loading?: boolean;
  }) {
  const Comp = asChild ? Slot : "button";
  const showSpinner = loading && !asChild;

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      disabled={disabled || showSpinner}
      aria-busy={loading || undefined}
      {...props}
    >
      {asChild ? (
        children
      ) : (
        <>
          {showSpinner ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
          {children}
        </>
      )}
    </Comp>
  );
}

export { Button, buttonVariants };
