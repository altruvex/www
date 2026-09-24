import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { LoadingIcon } from "../feedback/loading-icon";
import { cn } from "../../lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-medium transition-[color,background-color,border-color,text-decoration-color,fill,stroke,opacity,box-shadow,transform,filter,backdrop-filter] duration-200 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive active:scale-[0.98]",
  {
    variants: {
      variant: {
        default:
          "transition-all bg-primary text-primary-foreground hover:bg-primary/90 active:bg-primary/80",
        brand:
          "transition-all bg-brand text-brand-foreground hover:bg-brand-hover active:bg-brand-hover/90 focus-visible:ring-brand/50",
        glass:
          "liquid-glass-flat text-foreground hover:border-border-mid hover:bg-card/70 focus-visible:ring-brand/45",
        // The solid red button is the commit of a destructive flow — the final
        // action inside a confirmation dialog. It is never the trigger on a page.
        destructive:
          "transition-all bg-destructive text-destructive-foreground hover:bg-destructive/90 active:bg-destructive/80 focus-visible:ring-destructive/30",
        // The trigger of a destructive flow (Delete, Revoke, Unlink, Discard):
        // quiet until hovered, and red in every state — never the neutral hover.
        "destructive-ghost":
          "transition-all text-destructive hover:bg-destructive/10 hover:text-destructive active:bg-destructive/15 focus-visible:ring-destructive/30",
        // Neutral hovers tint the surface. `accent` is the brand blue in both
        // apps, so hovering an outline or ghost button used to fill it solid
        // blue — a red "Delete" turned into a blue one under the pointer.
        outline:
          "transition-all border bg-background shadow-xs hover:bg-muted hover:text-foreground active:bg-muted/80 dark:bg-input/30 dark:border-input dark:hover:bg-input/50 dark:active:bg-input/70",
        secondary:
          "transition-all bg-secondary text-secondary-foreground hover:bg-secondary/80 active:bg-secondary/70",
        ghost:
          "transition-all hover:bg-muted hover:text-foreground active:bg-muted/80",
        link: "transition-all text-primary underline-offset-4 hover:underline active:text-primary/80",
      },
      size: {
        // pointer-coarse: touch targets grow to the 44px minimum (principles
        // CI1); fine-pointer sizes keep the compact visual spec. Heights key
        // off the shared --control-h-* tokens so each app's own globals.css
        // governs its own scale (www: 32/40/44/48, admin: 28/32/36/48) from
        // one shared component. Every size is a pill — the radius is
        // rounded-full in the base, never set per size.
        default:
          "h-[var(--control-h)] px-4 py-2 has-[>svg]:px-3 pointer-coarse:min-h-11",
        sm: "h-[var(--control-h-sm)] gap-1.5 px-3 has-[>svg]:px-2.5 pointer-coarse:min-h-11",
        lg: "h-[var(--control-h-lg)] px-6 has-[>svg]:px-4",
        xl: "h-[var(--control-h-xl)] px-8 text-base has-[>svg]:px-6",
        icon: "size-[var(--control-h-icon)] pointer-coarse:size-11",
        "icon-sm": "size-[var(--control-h-icon-sm)] pointer-coarse:size-11",
        "icon-lg": "size-[var(--control-h-icon-lg)] pointer-coarse:size-11",
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
    /** Shows a spinner and disables the button. Ignored when asChild. */
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
      {/* Slot (asChild) requires a single element child — never emit the
          spinner sibling in that mode. */}
      {asChild ? (
        children
      ) : (
        <>
          {showSpinner ? (
            <LoadingIcon size={size === "sm" || size === "icon-sm" ? "sm" : "md"} />
          ) : null}
          {children}
        </>
      )}
    </Comp>
  );
}

export { Button, buttonVariants };
