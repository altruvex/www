"use client";

import * as AvatarPrimitive from "@radix-ui/react-avatar";
import { cn } from "../../lib/utils";

function initials(name?: string | null) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return (parts[0]?.[0] ?? "?").concat(parts[1]?.[0] ?? "").toUpperCase();
}

/**
 * No photo pipeline exists, so this is a deterministic monogram: the same name
 * always gets the same tint. Avoids the "everyone is grey" problem in a list of
 * twenty rows without introducing decorative colour.
 */
const TINTS = [
  "bg-info/12 text-info",
  "bg-success/12 text-success",
  "bg-warning/14 text-warning",
  "bg-progress/12 text-progress",
  "bg-danger/12 text-danger",
  "bg-neutral/14 text-neutral",
];

function tintFor(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  return TINTS[Math.abs(hash) % TINTS.length];
}

export function Avatar({
  name,
  src,
  className,
  size = "md",
}: {
  name?: string | null;
  src?: string | null;
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  const sizes = { sm: "size-5 text-micro", md: "size-6 text-meta", lg: "size-9 text-md" };
  return (
    <AvatarPrimitive.Root
      className={cn(
        "inline-flex shrink-0 items-center justify-center overflow-hidden rounded-md font-medium",
        tintFor(name ?? "?"),
        sizes[size],
        className,
      )}
    >
      {src && <AvatarPrimitive.Image src={src} alt={name ?? ""} className="size-full object-cover" />}
      <AvatarPrimitive.Fallback className="leading-none">
        {initials(name)}
      </AvatarPrimitive.Fallback>
    </AvatarPrimitive.Root>
  );
}
