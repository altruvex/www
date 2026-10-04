"use client";

import { MOTION, useSectionCardGrid } from "@/lib/motion";
import type { ReactNode } from "react";

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
