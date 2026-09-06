import { cn } from "@/lib/utils/utils";
import type { ComponentPropsWithoutRef, Ref } from "react";

type EyebrowTone = "muted" | "accent" | "foreground";

const toneClasses: Record<EyebrowTone, string> = {
  muted: "text-muted-foreground",
  accent: "text-local-accent-text",
  foreground: "text-foreground",
};

type EyebrowProps = ComponentPropsWithoutRef<"p"> & {
  tone?: EyebrowTone;
  ref?: Ref<HTMLParagraphElement>;
};


export function Eyebrow({ className, tone = "muted", ref, ...props }: EyebrowProps) {
  return (
    <p ref={ref} className={cn("eyebrow", toneClasses[tone], className)} {...props} />
  );
}
