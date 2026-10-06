"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { contrast, grade, over, parseRgb } from "@/lib/color";
import { useStyleEpoch } from "./live";

type Read = "radius" | "height" | "border-contrast" | "shadow";

function readValue(el: Element, read: Read, bgEl: Element | null): string {
  const s = getComputedStyle(el);
  if (read === "radius") {
    const r = s.borderTopLeftRadius;
    return parseFloat(r) > 999 ? "full" : r;
  }
  if (read === "height") return `${Math.round(el.getBoundingClientRect().height)}px tall`;
  if (read === "shadow") return s.boxShadow === "none" ? "no shadow" : "shadow";
  const fg = parseRgb(s.borderTopColor);
  const bg = bgEl ? parseRgb(getComputedStyle(bgEl).backgroundColor) : null;
  if (!fg || !bg) return "—";
  const ratio = contrast(over(fg, bg), bg);
  return `${ratio.toFixed(2)}:1 · ${ratio >= 3 ? "UI 3:1 met" : grade(ratio) === "fail" ? "below 3:1" : grade(ratio)}`;
}

/** Shows what the browser computed for its first child: radius, height or edge contrast. */
export function Probe({
  label,
  reads,
  children,
}: {
  label: string;
  reads: Read[];
  children: React.ReactNode;
}): React.ReactElement {
  const box = useRef<HTMLDivElement>(null);
  const bg = useRef<HTMLSpanElement>(null);
  const epoch = useStyleEpoch();
  const [values, setValues] = useState<string[]>([]);

  useLayoutEffect(() => {
    const el = box.current?.firstElementChild;
    if (!el) return;
    setValues(reads.map((r) => readValue(el, r, bg.current)));
  }, [epoch, reads]);

  return (
    <figure className="flex flex-col gap-3">
      <div ref={box} className="flex min-h-24 items-center">
        {children}
      </div>
      <span ref={bg} className="hidden" style={{ background: "hsl(var(--background))" }} />
      <figcaption className="text-meta text-muted-foreground tabular-nums">
        <code className="block text-md font-medium text-foreground">{label}</code>
        {values.join(" · ")}
      </figcaption>
    </figure>
  );
}
