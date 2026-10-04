"use client";

import { MagneticButton } from "@/components/magnetic-button";
import { ArrowLabel } from "@/components/shared/directional-link";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils/utils";
import type { ReactNode } from "react";

export function PlanSummary({
  name,
  nameAs: Name = "div",
  badge,
  subtitle,
  price,
  cycle,
  meta,
  bestForLabel,
  bestFor,
  cta,
  useWorldAccent = false,
  recommended = false,
  size = "lg",
}: {
  name: ReactNode;
  nameAs?: "div" | "h2" | "h3";
  badge?: ReactNode;
  subtitle?: ReactNode;
  price: ReactNode;
  cycle?: ReactNode;
  meta?: { label: ReactNode; value: ReactNode };
  bestForLabel?: ReactNode;
  bestFor: ReactNode;
  cta: { href: string; label: ReactNode; ariaLabel?: string };
  useWorldAccent?: boolean;
  recommended?: boolean;
  size?: "lg" | "md";
}) {
  const pillClasses = useWorldAccent
    ? "rounded-full bg-local-accent px-2.5 py-0.5 text-[10px] font-medium text-local-accent-fg md:text-xs"
    : "rounded-full bg-brand px-2.5 py-0.5 text-[10px] font-medium text-brand-foreground md:text-xs";

  const pill = (
    <span className={pillClasses}>
      {badge}
    </span>
  );

  return (
    <>
      {size === "md" && badge ? (
        <div
          aria-hidden={recommended ? undefined : true}
          className={cn("mb-3 flex", !recommended && "invisible max-md:hidden")}
        >
          {pill}
        </div>
      ) : null}
      <div className="flex flex-wrap items-center gap-2">
        <Name className="text-[clamp(1.25rem,1.7vw,1.625rem)] font-medium leading-tight text-foreground">
          {name}
        </Name>
        {size === "lg" && recommended && badge ? pill : null}
      </div>
      {subtitle ? (
        <p className="mt-1 text-sm leading-snug text-muted-foreground">
          {subtitle}
        </p>
      ) : null}
      <div className="mt-4 flex flex-wrap items-baseline gap-x-1.5 gap-y-1">
        <span
          className={cn(
            "font-light leading-none tracking-[-0.03em] tabular-nums text-foreground rtl:tracking-normal",
            size === "lg"
              ? "whitespace-nowrap text-[clamp(1.625rem,2.6vw,2.5rem)]"
              : "text-[clamp(1.125rem,1.45vw,1.5rem)] leading-tight",
          )}
        >
          {price}
        </span>
        {cycle ? (
          <span className="text-xs text-muted-foreground md:text-sm">
            {cycle}
          </span>
        ) : null}
      </div>
      {meta ? (
        <p className="mt-2 flex items-baseline gap-1.5 text-xs text-muted-foreground md:text-sm">
          <span>{meta.label}</span>
          <span className="tabular-nums text-foreground/80">{meta.value}</span>
        </p>
      ) : null}
      <div className="mt-4 text-sm leading-snug text-muted-foreground">
        {bestForLabel ? (
          <span className="block text-xs text-foreground/70">
            {bestForLabel}
          </span>
        ) : null}
        <span className={cn("block", bestForLabel && "mt-1")}>{bestFor}</span>
      </div>
      <MagneticButton
        asChild
        variant={recommended ? (useWorldAccent ? "accent" : "primary") : "secondary"}
        className="group mt-5 w-full min-h-11"
      >
        <Link href={cta.href} aria-label={cta.ariaLabel}>
          <ArrowLabel className="justify-center text-center leading-tight">
            {cta.label}
          </ArrowLabel>
        </Link>
      </MagneticButton>
    </>
  );
}
