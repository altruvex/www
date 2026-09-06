import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/**
 * Buttons sit on the OS control rail (--control-h-sm / --control-h /
 * --control-h-lg = 28 / 32 / 36) — the same rail as Input, SelectTrigger, the
 * sidebar rows and the topbar chips. An icon button is that height square, so a
 * `+` never ends up taller than the search field beside it.
 *
 * Sizes are labelled by ROLE, not by pixels:
 *   sm       toolbars, table filters, the topbar rail, inline row actions
 *   default  form actions and page actions — pairs 1:1 with Input
 *   lg       the single prominent action on a page (rare)
 *
 * Colours come from the admin token layer only: no stock shadcn `accent`
 * shadows or `dark:bg-input/30` — those belong to a different design system.
 */
const buttonVariants = cva(
  [
    "inline-flex shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-md font-medium",
    "transition-colors duration-[var(--dur-state)]",
    "outline-none focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-1 focus-visible:ring-offset-background",
    "disabled:pointer-events-none disabled:opacity-50",
    "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-3.5",
    "aria-invalid:border-danger",
  ].join(" "),
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        brand: "bg-brand text-brand-foreground hover:bg-brand-hover focus-visible:ring-brand/50",
        destructive: "bg-danger text-white hover:bg-danger/90 focus-visible:ring-danger/50",
        outline:
          "border border-border bg-card text-foreground hover:border-border-mid hover:bg-surface",
        secondary: "bg-surface-2 text-foreground hover:bg-surface-2/70",
        ghost: "text-muted-foreground hover:bg-surface hover:text-foreground",
        link: "text-brand underline-offset-4 hover:underline",
      },
      size: {
        sm: "h-[var(--control-h-sm)] gap-1.5 px-2.5 text-base has-[>svg]:px-2",
        default: "h-[var(--control-h)] px-3 text-base has-[>svg]:px-2.5",
        lg: "h-[var(--control-h-lg)] px-4 text-md has-[>svg]:px-3.5",
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
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
