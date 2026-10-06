"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { useStyleEpoch } from "./live";

const STEPS = [
  { label: "h1", el: <h1>Aa</h1> },
  { label: "h2", el: <h2>Aa</h2> },
  { label: ".section-title", el: <p className="section-title">Aa</p> },
  { label: "h3", el: <h3>Aa</h3> },
  { label: "h4", el: <h4>Aa</h4> },
  { label: "body", el: <p>Aa</p> },
  { label: ".eyebrow", el: <p className="eyebrow">Aa</p> },
  { label: "text-md", el: <p className="text-md">Aa</p> },
  { label: "text-meta", el: <p className="text-meta">Aa</p> },
  { label: "text-micro", el: <p className="text-micro">Aa</p> },
] as const;

/**
 * The computed size of every step at this width, and its ratio to the step below.
 * A ratio near 1.0 means two steps no longer read as different levels.
 */
export function SizeLadder(): React.ReactElement {
  const probe = useRef<HTMLDivElement>(null);
  const epoch = useStyleEpoch();
  const [sizes, setSizes] = useState<number[]>([]);

  useLayoutEffect(() => {
    const kids = probe.current?.children;
    if (!kids) return;
    setSizes([...kids].map((k) => parseFloat(getComputedStyle(k.firstElementChild ?? k).fontSize)));
  }, [epoch]);

  const max = Math.max(...sizes, 1);
  const body = sizes[5] ?? 16;

  return (
    <>
      <div ref={probe} aria-hidden className="pointer-events-none invisible absolute h-0 overflow-hidden">
        {STEPS.map((s) => (
          <div key={s.label}>{s.el}</div>
        ))}
      </div>
      <ol className="border-t border-border-subtle">
        {STEPS.map((s, i) => {
          const size = sizes[i];
          const next = sizes[i + 1];
          const ratio = size && next ? size / next : null;
          const flat = ratio !== null && ratio < 1.08;
          return (
            <li
              key={s.label}
              className="grid grid-cols-[8rem_minmax(0,1fr)_5rem_5rem] items-center gap-4 border-b border-border-subtle py-3 text-md tabular-nums"
            >
              <code className="truncate">{s.label}</code>
              <span className="h-2 rounded-full bg-foreground/15">
                <span className="block h-full rounded-full bg-foreground" style={{ width: size ? `${(size / max) * 100}%` : 0 }} />
              </span>
              <span className="text-end">{size ? `${Math.round(size * 10) / 10}px` : "—"}</span>
              <span className={flat ? "text-end text-warning" : "text-end text-muted-foreground"}>
                {ratio ? `×${ratio.toFixed(2)}` : size ? `${(size / body).toFixed(2)} body` : ""}
              </span>
            </li>
          );
        })}
      </ol>
    </>
  );
}
