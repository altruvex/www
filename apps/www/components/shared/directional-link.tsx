"use client";

import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils/utils";
import type { ReactNode } from "react";

/**
 * The site's one arrow. Every affordance arrow on the marketing site draws
 * from here — nine pages had hand-copied this same 24-viewBox path with four
 * different durations, which is how a hover nudge ends up feeling different
 * on /process than on /contact.
 *
 * `direction` carries the RTL logic so a call site never mirrors by hand:
 * forward flips in Arabic, back points the other way and flips back, external
 * mirrors instead of rotating (an up-right arrow rotated is a down-right one).
 *
 * `motion="none"` is for arrows that are not a hover nudge — a reveal that
 * slides in from nothing, or a static list glyph. It drops the translate so a
 * call site's own transform is not fighting this one.
 */
const ARROW_BASE = "h-4 w-4 shrink-0 transition-all duration-150 ease-out";

const ARROW_ROTATE = {
  forward: "rtl:-rotate-180",
  back: "rotate-180 rtl:rotate-0",
  external: "rtl:-scale-x-100",
} as const;

const ARROW_NUDGE = {
  forward: "ltr:group-hover:translate-x-1 rtl:group-hover:-translate-x-1",
  back: "ltr:group-hover:-translate-x-1 rtl:group-hover:translate-x-1",
  external: "group-hover:translate-x-0.5 group-hover:-translate-y-0.5",
} as const;

const ARROW_PATH = {
  forward: "M17 8l4 4m0 0l-4 4m4-4H3",
  back: "M17 8l4 4m0 0l-4 4m4-4H3",
  external: "M7 17 17 7M7 7h10v10",
} as const;

export type ArrowDirection = keyof typeof ARROW_PATH;

export function ArrowIcon({
  className,
  direction = "forward",
  motion = "nudge",
  strokeWidth = 2,
}: {
  className?: string;
  direction?: ArrowDirection;
  /** "none" when the call site owns the transform. */
  motion?: "nudge" | "none";
  strokeWidth?: number;
}) {
  return (
    <svg
      aria-hidden
      className={cn(
        ARROW_BASE,
        ARROW_ROTATE[direction],
        motion === "nudge" && ARROW_NUDGE[direction],
        className,
      )}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={strokeWidth}
        d={ARROW_PATH[direction]}
      />
    </svg>
  );
}

export function ArrowLabel({
  children,
  className,
  iconClassName,
  direction = "forward",
}: {
  children: ReactNode;
  className?: string;
  iconClassName?: string;
  direction?: ArrowDirection;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <span>{children}</span>
      <ArrowIcon className={iconClassName} direction={direction} />
    </span>
  );
}

export function DirectionalLink({
  href,
  children,
  className,
  ariaLabel,
}: {
  href: string;
  children: ReactNode;
  className?: string;
  ariaLabel?: string;
}) {
  return (
    <Link
      href={href}
      aria-label={ariaLabel}
      className={cn("group inline-flex items-center gap-2", className)}
    >
      <span>{children}</span>
      <ArrowIcon />
    </Link>
  );
}

export function ExternalDirectionalLink({
  href,
  children,
  className,
}: {
  href: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className={cn("group inline-flex items-center gap-2", className)}
    >
      <span>{children}</span>
      <ArrowIcon />
    </a>
  );
}
