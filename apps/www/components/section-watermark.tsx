import type { ReactNode } from "react";

export function SectionWatermark({ children }: { children: ReactNode }) {
  const text = typeof children === "string" ? children : undefined;
  return (
    <span
      aria-hidden
      data-watermark={text}
      className="pointer-events-none absolute inset-e-0 bottom-0 z-0 select-none font-sans text-[clamp(160px,24vw,400px)] font-extrabold leading-[0.75] tracking-[-0.06em] text-foreground/[0.035]"
    />
  );
}
