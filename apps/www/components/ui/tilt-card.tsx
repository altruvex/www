"use client";

import { motion, useTilt } from "@/lib/motion";
import { cn } from "@/lib/utils/utils";
import type { ComponentPropsWithoutRef } from "react";

type TiltCardProps = ComponentPropsWithoutRef<"div"> & {
  /** Barely-there tilt with no lift — for smaller featured tiles (tiltSubtle preset). */
  subtle?: boolean;
};

/**
 * Featured-card 3D tilt. Communicated state: "this surface has depth / is worth
 * a second look." Reserve for hero-adjacent, genuinely featured cards — max two
 * per page (brand rule). The useTilt hook self-disables on touch, low-power, and
 * reduced-motion, and manages perspective + preserve-3d, so this wrapper only
 * supplies the ref. Put the visible SurfaceCard inside as the child.
 */
export function TiltCard({
  className,
  children,
  subtle = false,
  ...props
}: TiltCardProps) {
  const ref = useTilt<HTMLDivElement>(subtle ? motion.tiltSubtle() : motion.tiltCard());

  return (
    <div ref={ref} className={cn("will-change-transform", className)} {...props}>
      {children}
    </div>
  );
}
