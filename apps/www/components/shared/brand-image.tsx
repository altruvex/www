"use client";

import { cn } from "@/lib/utils/utils";
import Image from "next/image";
import { useState } from "react";

/**
 * Brand imagery slots. Drop the matching file into /public/brand and it appears;
 * until then BrandImage renders nothing (see onError below), so the layout is
 * never broken by a missing asset. All imagery is abstract/technical, so it is
 * decorative by default (empty alt + aria-hidden) and carries no semantic weight.
 */
export type BrandSlot =
  | "hero"
  | "about"
  | "process"
  | "proof"
  | "aisa"
  | "loadingMark"
  | "notFound";

const SLOTS: Record<BrandSlot, { src: string; width: number; height: number }> =
  {
    hero: { src: "/brand/hero-abstract.png", width: 2560, height: 1440 },
    about: { src: "/brand/about-identity.png", width: 1600, height: 2000 },
    process: { src: "/brand/process-diagram.png", width: 1800, height: 1200 },
    proof: { src: "/brand/proof-abstract.png", width: 2560, height: 1440 },
    aisa: { src: "/brand/aisa-concept.png", width: 1600, height: 1600 },
    loadingMark: { src: "/brand/loading-mark.png", width: 256, height: 256 },
    notFound: { src: "/brand/404-abstract.png", width: 2560, height: 1440 },
  };

type BrandImageProps = {
  slot: BrandSlot;
  /** Fill the positioned parent instead of using intrinsic dimensions. */
  fill?: boolean;
  /** Set true ONLY on the element that is genuinely the LCP. Default false. */
  priority?: boolean;
  /** Slow Ken-Burns scale (1 → 1.04). Reserve for full-bleed hero art only. */
  kenBurns?: boolean;
  sizes?: string;
  className?: string;
};

export function BrandImage({
  slot,
  fill = false,
  priority = false,
  kenBurns = false,
  sizes,
  className,
}: BrandImageProps) {
  const [failed, setFailed] = useState(false);
  if (failed) return null;

  const { src, width, height } = SLOTS[slot];

  return (
    <Image
      src={src}
      alt=""
      aria-hidden
      draggable={false}
      priority={priority}
      onError={() => setFailed(true)}
      {...(fill ? { fill: true } : { width, height })}
      sizes={sizes ?? (fill ? "100vw" : undefined)}
      className={cn(
        "select-none object-cover",
        kenBurns && "motion-safe:animate-brand-kenburns",
        className,
      )}
    />
  );
}
