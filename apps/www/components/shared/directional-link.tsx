"use client";

import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils/utils";
import type { ReactNode } from "react";

const ARROW_BASE = "h-4 w-4 shrink-0 transition-all duration-(--motion-hover) ease-default";

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
  external: "M4 20 20 4M9 4h11v11",
} as const;

type ArrowDirection = keyof typeof ARROW_PATH;

export function ArrowIcon({
  className,
  direction = "forward",
  motion = "nudge",
  strokeWidth = 2,
}: {
  className?: string;
  direction?: ArrowDirection;
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
