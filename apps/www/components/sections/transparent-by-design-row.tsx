"use client";

import { MOTION, useSectionCardGrid } from "@/lib/motion";
import type { ReactNode } from "react";

/**
 * The client island of "Transparent by design": the five stage figures settle
 * once, in reading order, when the row enters. Everything inside is rendered
 * on the server; this only owns the ref. Reduced motion takes the batch
 * hook's own reduced tier.
 */
export function TransparentByDesignRow({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  const rowRef = useSectionCardGrid<HTMLOListElement>({
    selector: "[data-stage-figure]",
    stagger: MOTION.stagger.annotate,
    distance: MOTION.distance.xs,
  });

  return (
    <ol ref={rowRef} className={className}>
      {children}
    </ol>
  );
}
