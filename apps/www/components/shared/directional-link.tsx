"use client";

import { Link } from "@/i18n/navigation";
import { ArrowIcon, type ArrowDirection } from "@repo/ui";
import { cn } from "@/lib/utils/utils";
import type { ReactNode } from "react";

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
