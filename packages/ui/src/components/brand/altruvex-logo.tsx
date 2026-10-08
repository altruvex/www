import type { ComponentPropsWithoutRef } from "react";
import { cn } from "../../lib/utils";

/*
 * The one Altruvex mark, shared by www and admin (moved from apps/www, 2026-10-05).
 * No vector logo exists yet, so the mark is the name set in the brand face, in capitals at
 * semibold, as the app icons set it. The tile is the ink "A" admin has always shown: it is
 * legible at 24px in both themes, where a glass tile needs a backdrop to read.
 */

type LogoSize = "xs" | "sm" | "md" | "lg";

interface AltruvexLogoProps {
  className?: string;
  size?: LogoSize;
  /** full = the wordmark, icon = the tile alone, lockup = tile then wordmark. */
  variant?: "full" | "icon" | "lockup";
}

const WORDMARK: Record<LogoSize, string> = {
  xs: "text-md",
  sm: "text-base",
  md: "text-lg",
  lg: "text-xl md:text-2xl",
};

/* A mark keeps one shape in both apps, so every tile takes ctl-xs, the one radius that does not
   derive from an app's --radius. ctl-sm and up would round the 36px tile into a circle on www. */
const TILE: Record<LogoSize, string> = {
  xs: "size-6 rounded-ctl-xs text-meta",
  sm: "size-7 rounded-ctl-xs text-xs",
  md: "size-9 rounded-ctl-xs text-sm",
  lg: "size-11 rounded-ctl-xs text-base",
};

export function AltruvexLogo({ className, size = "md", variant = "full" }: AltruvexLogoProps) {
  const tile = (
    <span
      // Not cn(): twMerge reads the custom text-meta/text-md sizes as colours and drops text-background.
      className={`grid shrink-0 place-items-center bg-foreground font-sans font-semibold text-background ${TILE[size]}`}
      {...(variant === "icon" ? { role: "img", "aria-label": "Altruvex" } : { "aria-hidden": true })}
    >
      A
    </span>
  );

  return (
    <span
      className={cn(
        "flex items-center gap-2 text-foreground transition-opacity duration-(--dur-state) ease-default group-hover:opacity-80",
        className,
      )}
    >
      {variant !== "full" && tile}
      {variant !== "icon" && (
        <span data-logo-wordmark className={cn("font-sans font-semibold uppercase tracking-(--track-24-600)", WORDMARK[size])}>Altruvex</span>
      )}
    </span>
  );
}

/*
 * The fitted wordmark: the name at display size, mixed case, bold, tight. www's footer sets it
 * across the full width; the brand app shows the same element. It is always set left to right,
 * because negative tracking on an RTL run spaces the letters from the wrong side. Size, colour
 * and motion come from the caller.
 */
export function AltruvexWordmark({ className, ...props }: ComponentPropsWithoutRef<"span">) {
  return (
    <span dir="ltr" className={cn("font-bold tracking-[-0.025em] whitespace-nowrap", className)} {...props}>
      Altruvex
    </span>
  );
}
