"use client";

import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

const ARROW_CLASS =
  "h-4 w-4 shrink-0 transition-transform duration-300 ltr:group-hover:translate-x-1 rtl:group-hover:-translate-x-1 rtl:-rotate-180";

export function ArrowIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden
      className={cn(ARROW_CLASS, className)}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M17 8l4 4m0 0l-4 4m4-4H3"
      />
    </svg>
  );
}

export function ArrowLabel({
  children,
  className,
  iconClassName,
}: {
  children: ReactNode;
  className?: string;
  iconClassName?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <span>{children}</span>
      <ArrowIcon className={iconClassName} />
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
