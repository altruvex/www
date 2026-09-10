"use client";

import { motion, useTilt } from "@/lib/motion";
import { cn } from "@/lib/utils/utils";
import type { ComponentPropsWithoutRef } from "react";

type TiltCardProps = ComponentPropsWithoutRef<"div"> & {
  subtle?: boolean;
};

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
