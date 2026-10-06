/*
 * The site button's look: variant, size and radius classes. MagneticButton
 * (apps/www/components/magnetic-button.tsx) adds the magnet, press and ripple on top; the brand
 * app's ButtonSpecimen renders the same classes without them. Change a look here and both follow.
 */

export type MagneticButtonVariant = "primary" | "secondary" | "ghost" | "filled" | "accent";
export type MagneticButtonSize = "sm" | "default" | "lg";

export const magneticButtonVariants: Record<MagneticButtonVariant, string> = {
  primary: "bg-brand text-brand-foreground border border-transparent hover:bg-brand-hover",
  secondary:
    "bg-transparent text-primary/85 border border-foreground/40 hover:bg-foreground/5 hover:border-foreground/60",
  ghost: "bg-transparent text-primary/75 hover:bg-foreground/5 border border-transparent",
  filled:
    "bg-transparent text-foreground border border-foreground/40 hover:bg-foreground hover:text-background hover:border-foreground",
  accent: "bg-local-accent text-local-accent-fg border border-transparent hover:opacity-90",
};

export const magneticButtonSizes: Record<MagneticButtonSize, string> = {
  sm: "min-h-10 px-5 text-sm pointer-coarse:min-h-11",
  default: "min-h-11 min-w-11 px-5 py-2 text-sm sm:min-h-12 sm:min-w-12 sm:px-6 sm:py-2.5",
  lg: "min-h-12 min-w-12 px-6 py-3 text-[15px] sm:px-7 lg:min-h-14 lg:px-8 lg:py-3.5 lg:text-base",
};

/** Every size is a pill (E6). Kept per size so the ripple layer can follow the button's radius. */
export const magneticButtonRadii: Record<MagneticButtonSize, string> = {
  sm: "rounded-full",
  default: "rounded-full",
  lg: "rounded-full",
};
