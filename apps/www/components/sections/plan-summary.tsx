"use client";

import { MagneticButton } from "@/components/magnetic-button";
import { ArrowLabel } from "@/components/shared/directional-link";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils/utils";
import type { ReactNode } from "react";

/**
 * The head of a priced plan: name, recommendation, figure, fit, and the one
 * action. /pricing renders it inside a card and the maintenance page inside a
 * comparison column — one anatomy, so a buyer who has read one price on this
 * site already knows how to read the next.
 *
 * The recommendation and its action are always the brand colour, never the
 * section's world accent: a price is where a buyer decides, and the colour
 * that marks the decision must not change from page to page. The world accent
 * stays with the heading around it.
 */
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
  recommended = false,
  size = "lg",
}: {
  name: ReactNode;
  /** A heading inside a card; a plain element inside a table header cell. */
  nameAs?: "div" | "h2" | "h3";
  badge?: ReactNode;
  subtitle?: ReactNode;
  price: ReactNode;
  cycle?: ReactNode;
  /** A second fact priced with the figure, e.g. the delivery window. */
  meta?: { label: ReactNode; value: ReactNode };
  bestForLabel?: ReactNode;
  bestFor: ReactNode;
  cta: { href: string; label: ReactNode; ariaLabel?: string };
  recommended?: boolean;
  /** `md` fits a price range into a four-column card grid. */
  size?: "lg" | "md";
}) {
  const pill = (
    <span className="rounded-full bg-brand px-2.5 py-0.5 text-[10px] font-medium text-brand-foreground md:text-xs">
      {badge}
    </span>
  );

  return (
    <>
      {/* Side by side in a table column, a narrow card wraps the badge under
          the name and drops that one price below its neighbours'. Cards give
          it a line of its own, held open in every card so the figures align. */}
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
        variant={recommended ? "primary" : "secondary"}
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
