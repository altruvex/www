import { forwardRef, type CSSProperties, type ComponentPropsWithoutRef } from "react";
import { cn } from "../lib/utils";

/*
 * Shimmer loop length in seconds, per speed. This is the one source: www's motion tokens
 * (apps/www/lib/motion/tokens.ts, accent.shimmer) read it from here.
 */
export const ACCENT_SHIMMER = { slow: 9, base: 6, fast: 3.5 };

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

type AccentSpeed = keyof typeof ACCENT_SHIMMER;

type AccentStyle = CSSProperties & { "--text-gradient-duration"?: string };

interface AccentProps extends ComponentPropsWithoutRef<"span"> {
  gradient?: AccentGradient | typeof WORLD_ACCENT | (string & {});
  direction?: GradientDirection;
  animate?: boolean | AccentAnimation;
  speed?: AccentSpeed;
  glow?: boolean;
  solid?: boolean;
}

const HIGHLIGHT_TONES = {
  muted: "text-muted-foreground",
  soft: "text-foreground/45 rtl:text-muted-foreground",
  surface: "text-s-mid",
  contrast: "text-foreground",
  iris:
    "accent-iris bg-clip-text text-transparent from-(--grad-from) via-(--grad-via) to-(--grad-to) bg-linear-to-r rtl:bg-linear-to-l [box-decoration-break:clone] [-webkit-box-decoration-break:clone] pe-[0.08em]",
  world:
    "accent-world bg-clip-text text-transparent from-(--grad-from) via-(--grad-via) to-(--grad-to) bg-linear-to-r rtl:bg-linear-to-l [box-decoration-break:clone] [-webkit-box-decoration-break:clone] pe-[0.08em]",
} as const;

type HighlightTone = keyof typeof HIGHLIGHT_TONES;

interface HighlightProps extends ComponentPropsWithoutRef<"em"> {
  tone?: HighlightTone;
}

export const Highlight = forwardRef<HTMLElement, HighlightProps>(
  ({ tone = "muted", className, ...props }, ref) => {
    return (
      <em
        ref={ref}
        {...(tone === "world" || tone === "iris" ? { "data-accent-grad": "", "data-accent-italic": "" } : {})}
        className={cn(
          "italic font-light",
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
        ? { "--text-gradient-duration": `${ACCENT_SHIMMER[speed]}s` }
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
                "pt-[0.36em] pb-[0.13em] pe-[0.02em] -mt-[0.36em] -mb-[0.13em] -me-[0.02em]",
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
