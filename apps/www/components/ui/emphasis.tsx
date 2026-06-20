import { cn } from "@/lib/utils";
import { forwardRef, type ComponentPropsWithoutRef } from "react";

export const ACCENT_GRADIENTS = [
  "brand",
  "iris",
  "ocean",
  "ember",
  "sunset",
  "forest",
  "mint",
  "aurora",
  "lavender",
  "neon",
  "candy",
] as const;

export type AccentGradient = (typeof ACCENT_GRADIENTS)[number];

const DIRECTION_CLASSES = {
  r: "bg-linear-to-r rtl:bg-linear-to-l",
  l: "bg-linear-to-l rtl:bg-linear-to-r",
  t: "bg-linear-to-t",
  b: "bg-linear-to-b",
  tr: "bg-linear-to-tr rtl:bg-linear-to-bl",
  br: "bg-linear-to-br rtl:bg-linear-to-tl",
  tl: "bg-linear-to-tl rtl:bg-linear-to-br",
  bl: "bg-linear-to-bl rtl:bg-linear-to-tr",
} as const;

export type GradientDirection = keyof typeof DIRECTION_CLASSES;

export interface AccentProps extends ComponentPropsWithoutRef<"span"> {
  gradient?: AccentGradient | (string & {});
  direction?: GradientDirection;
  animate?: boolean;
  glow?: boolean;
  solid?: boolean;
}

export const Highlight = forwardRef<HTMLElement, ComponentPropsWithoutRef<"em">>(
  ({ className, ...props }, ref) => {
    return (
      <em
        ref={ref}
        className={cn(
          "font-serif italic font-light text-muted-foreground/60",
          "rtl:font-sans rtl:not-italic rtl:font-bold",
          className,
        )}
        {...props}
      />
    );
  },
);
Highlight.displayName = "Highlight";

export const Accent = forwardRef<HTMLSpanElement, AccentProps>(
  (
    {
      gradient = "brand",
      direction = "r",
      animate = false,
      glow = false,
      solid = false,
      className,
      ...props
    },
    ref,
  ) => {
    const isPredefined = (ACCENT_GRADIENTS as readonly string[]).includes(gradient);
    const accentClass = isPredefined ? `accent-${gradient}` : undefined;
    const customGradientClasses = isPredefined ? undefined : gradient;

    return (
      <span
        ref={ref}
        {...(solid ? {} : { "data-accent-grad": "" })}
        className={cn(
          "inline-block",
          solid
            ? "text-local-accent"
            : cn(
                "bg-clip-text text-transparent",
                DIRECTION_CLASSES[direction],
                accentClass,
                accentClass && "from-(--grad-from) via-(--grad-via) to-(--grad-to)",
                customGradientClasses,
                animate && "bg-size-[200%_auto] animate-text-gradient",
                glow && "accent-glow",
              ),
          className,
        )}
        {...props}
      />
    );
  },
);
Accent.displayName = "Accent";

export const Strong = forwardRef<HTMLElement, ComponentPropsWithoutRef<"strong">>(
  ({ className, ...props }, ref) => {
    return (
      <strong
        ref={ref}
        className={cn("font-semibold text-foreground", className)}
        {...props}
      />
    );
  },
);
Strong.displayName = "Strong";

export const Dim = forwardRef<HTMLSpanElement, ComponentPropsWithoutRef<"span">>(
  ({ className, ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={cn("text-foreground/60", className)}
        {...props}
      />
    );
  },
);
Dim.displayName = "Dim";