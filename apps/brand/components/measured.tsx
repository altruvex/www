"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { useStyleEpoch } from "./live";

interface Reading {
  size: number;
  lineHeight: string;
  weight: string;
  tracking: string;
  family: string;
}

function px(value: string): string {
  const n = parseFloat(value);
  return Number.isNaN(n) ? value : `${Math.round(n * 10) / 10}px`;
}

/** Renders a specimen and the values the browser computed for it — never the declared ones. */
export function Measured({ label, children }: { label: string; children: React.ReactNode }): React.ReactElement {
  const box = useRef<HTMLDivElement>(null);
  const epoch = useStyleEpoch();
  const [reading, setReading] = useState<Reading | null>(null);

  useLayoutEffect(() => {
    const el = box.current?.firstElementChild;
    if (!el) return;
    const s = getComputedStyle(el);
    const size = parseFloat(s.fontSize);
    const lh = parseFloat(s.lineHeight);
    const ls = parseFloat(s.letterSpacing);
    setReading({
      size,
      lineHeight: Number.isNaN(lh) ? s.lineHeight : `${px(s.lineHeight)} (${(lh / size).toFixed(2)})`,
      weight: s.fontWeight,
      tracking: Number.isNaN(ls) ? "normal" : `${(ls / size).toFixed(3)}em`,
      family: s.fontFamily.split(",")[0]?.replaceAll('"', "").trim() ?? "",
    });
  }, [epoch]);

  return (
    <div className="grid gap-3 border-b border-border-subtle py-8 lg:grid-cols-[12rem_minmax(0,1fr)] lg:gap-10">
      <dl className="grid grid-cols-[auto_1fr] content-start gap-x-3 gap-y-1 text-meta text-muted-foreground tabular-nums">
        <dt className="col-span-2 mb-1 text-md font-medium text-foreground">{label}</dt>
        {reading && (
          <>
            <dt>Size</dt>
            <dd>{px(String(reading.size))}</dd>
            <dt>Leading</dt>
            <dd>{reading.lineHeight}</dd>
            <dt>Weight</dt>
            <dd>{reading.weight}</dd>
            <dt>Tracking</dt>
            <dd>{reading.tracking}</dd>
            <dt>Face</dt>
            <dd className="truncate">{reading.family}</dd>
          </>
        )}
      </dl>
      <div ref={box} className="min-w-0">
        {children}
      </div>
    </div>
  );
}
