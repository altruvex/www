import { MOTION } from "@/lib/motion/config";
import { cn } from "@/lib/utils/utils";
import { forwardRef, type CSSProperties, type ComponentPropsWithoutRef } from "react";

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

export const WORLD_ACCENT = "world" as const;

export const HEADING_ACCENTS = {
  blue: { primary: "brand", alt: "ocean", hero: "iris" },
  orange: { primary: "ember", alt: "sunset" },
  green: { primary: "forest", alt: "mint" },
} as const;

export type HeadingAccent =
  | typeof WORLD_ACCENT
  | "brand"
  | "ocean"
  | "iris"
  | "ember"
  | "sunset"
  | "forest"
  | "mint";

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

export type AccentAnimation = "shimmer" | "sweep";

export type AccentSpeed = keyof typeof MOTION.accent.shimmer;

type AccentStyle = CSSProperties & { "--text-gradient-duration"?: string };

export interface AccentProps extends ComponentPropsWithoutRef<"span"> {
  gradient?: AccentGradient | typeof WORLD_ACCENT | (string & {});
  direction?: GradientDirection;
  animate?: boolean | AccentAnimation;
  speed?: AccentSpeed;
  glow?: boolean;
  solid?: boolean;
}

const HIGHLIGHT_TONES = {
  muted: "text-muted-foreground",
  soft: "text-foreground/45",
  surface: "text-s-mid",
  contrast: "text-foreground",
} as const;

export type HighlightTone = keyof typeof HIGHLIGHT_TONES;

export interface HighlightProps extends ComponentPropsWithoutRef<"em"> {
  tone?: HighlightTone;
}

export const Highlight = forwardRef<HTMLElement, HighlightProps>(
  ({ tone = "muted", className, ...props }, ref) => {
    return (
      <em
        ref={ref}
        className={cn(
          "font-serif italic font-light",
          HIGHLIGHT_TONES[tone],
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
      speed = "base",
      glow = false,
      solid = false,
      className,
      style,
      ...props
    },
    ref,
  ) => {
    const isPredefined =
      gradient === WORLD_ACCENT ||
      (ACCENT_GRADIENTS as readonly string[]).includes(gradient);
    const accentClass = isPredefined ? `accent-${gradient}` : undefined;
    const customGradientClasses = isPredefined ? undefined : gradient;

    const animation: AccentAnimation | false =
      animate === true ? "shimmer" : animate;
    const shimmerStyle: AccentStyle | undefined =
      animation === "shimmer" && speed !== "base"
        ? { "--text-gradient-duration": `${MOTION.accent.shimmer[speed]}s` }
        : undefined;

    return (
      <span
        ref={ref}
        {...(solid ? {} : { "data-accent-grad": "" })}
        {...(animation === "sweep" && !solid ? { "data-accent-anim": "sweep" } : {})}
        style={shimmerStyle ? { ...shimmerStyle, ...style } : style}
        className={cn(
          "inline-block",
          solid
            ? "text-local-accent-text"
            : cn(
                "bg-clip-text text-transparent",
                DIRECTION_CLASSES[direction],
                accentClass,
                accentClass && "from-(--grad-from) via-(--grad-via) to-(--grad-to)",
                customGradientClasses,
                animation === "shimmer" && "bg-size-[200%_auto] animate-text-gradient",
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
