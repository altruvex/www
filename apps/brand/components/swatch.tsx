"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { contrast, grade, over, parseRgb, toHex } from "@/lib/color";
import { cn } from "@/lib/cn";
import { useStyleEpoch } from "./live";

export interface DeclView {
  context: string;
  value: string;
  where: string;
  href: string;
}

interface Reading {
  hex: string;
  ratio: number | null;
  alpha: number;
}

export function Swatch({
  name,
  kind,
  decls,
}: {
  name: string;
  kind: "channels" | "color";
  decls: DeclView[];
}): React.ReactElement {
  const chip = useRef<HTMLSpanElement>(null);
  const probe = useRef<HTMLSpanElement>(null);
  const epoch = useStyleEpoch();
  const [reading, setReading] = useState<Reading | null>(null);
  const css = kind === "channels" ? `hsl(var(${name}))` : `var(${name})`;

  useLayoutEffect(() => {
    if (!chip.current || !probe.current) return;
    const style = getComputedStyle(chip.current);
    if (style.backgroundImage !== "none") {
      setReading({ hex: "gradient", alpha: 1, ratio: null });
      return;
    }
    const fg = parseRgb(style.backgroundColor);
    const bg = parseRgb(getComputedStyle(probe.current).backgroundColor);
    if (!fg) {
      setReading(null);
      return;
    }
    const flat = bg ? over(fg, bg) : fg;
    setReading({ hex: toHex(fg), alpha: fg.a, ratio: bg ? contrast(flat, bg) : null });
  }, [epoch, css]);

  const unresolved = reading === null || (reading.alpha === 0 && !/transparent/.test(decls[0]?.value ?? ""));

  return (
    <li className="grid grid-cols-[3rem_minmax(0,1fr)] gap-x-4 gap-y-1 border-b border-border-subtle py-3 sm:grid-cols-[3rem_minmax(0,14rem)_minmax(0,9rem)_minmax(0,1fr)] sm:items-center">
      <span className="relative row-span-2 size-12 overflow-hidden rounded-ctl border border-border-subtle bg-[conic-gradient(hsl(var(--n-3))_25%,transparent_0_50%,hsl(var(--n-3))_0_75%,transparent_0)] bg-size-[10px_10px] sm:row-span-1">
        <span ref={chip} className="absolute inset-0" style={{ background: css }} />
        <span ref={probe} className="hidden" style={{ background: "hsl(var(--background))" }} />
      </span>
      <code className="truncate text-md font-medium text-foreground">{name}</code>
      <span className="text-meta tabular-nums text-muted-foreground">
        {!reading || unresolved ? (
          <span className="text-danger">does not resolve here</span>
        ) : (
          <>
            {reading.hex}
            {reading.ratio !== null && (
              <span className={cn("ms-2", reading.ratio < 3 && "text-muted-foreground/70")}>
                {reading.ratio.toFixed(2)}:1 <span className="sr-only">contrast on background,</span>
                <span aria-hidden> · </span>
                {grade(reading.ratio)}
              </span>
            )}
          </>
        )}
      </span>
      <details className="col-start-2 text-meta text-muted-foreground sm:col-start-auto">
        <summary className="cursor-pointer list-none truncate hover:text-foreground">
          {decls.length} declaration{decls.length === 1 ? "" : "s"} · {decls[0]?.value}
        </summary>
        <ul className="mt-2 space-y-1">
          {decls.map((d) => (
            <li key={d.where} className="grid grid-cols-[minmax(0,1fr)_auto] gap-3">
              <span className="truncate">
                <span className="text-foreground/70">{d.context}</span> → {d.value}
              </span>
              <a href={d.href} className="underline decoration-border-mid underline-offset-2 hover:text-foreground">
                {d.where}
              </a>
            </li>
          ))}
        </ul>
      </details>
    </li>
  );
}
