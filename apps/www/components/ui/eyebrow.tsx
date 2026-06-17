import { cn } from "@/lib/utils";
import type { ComponentPropsWithoutRef, Ref } from "react";

type EyebrowTone = "muted" | "accent" | "foreground";

const toneClasses: Record<EyebrowTone, string> = {
  muted: "text-muted-foreground",
  // Follows the section-scoped --local-accent (color world), e.g. accentWorldClass().
  accent: "text-local-accent",
  foreground: "text-foreground",
};

type EyebrowProps = ComponentPropsWithoutRef<"p"> & {
  /** Color treatment. Defaults to the muted section-label tone. */
  tone?: EyebrowTone;
  /** Forwarded to the underlying <p> — used by useSectionEyebrow() for GSAP reveals. */
  ref?: Ref<HTMLParagraphElement>;
};

/**
 * Section eyebrow / kicker label.
 * Replaces the ~170 copy-pasted `font-mono ... uppercase ...` strings with a
 * single primitive backed by the `.eyebrow` utility (see globals.css).
 */
export function Eyebrow({ className, tone = "muted", ref, ...props }: EyebrowProps) {
  return (
    <p ref={ref} className={cn("eyebrow", toneClasses[tone], className)} {...props} />
  );
}
