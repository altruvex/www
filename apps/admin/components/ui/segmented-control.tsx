"use client";

import * as React from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * One-of-N, always visible.
 *
 * A `Select` hides the options behind a click, which is right for twelve
 * choices and wrong for three — the proposal builder's scope questions are
 * answered faster when every answer is on screen. This is that control, and it
 * is NOT a `Button`: a segment carries a selected state (`border-brand
 * bg-brand-soft`) that no button variant has.
 *
 * Segments sit on the same control rail as everything else (`--control-h`), so
 * a row of them lines up with the inputs above it.
 */
export function segmentClass({
  selected,
  disabled,
}: {
  selected: boolean;
  disabled?: boolean;
}) {
  return cn(
    // min-h, not h: on a narrow screen a two-word label wraps, and a hard 32px
    // box lets the second line spill outside its own border.
    "flex min-h-[var(--control-h)] items-center gap-1.5 rounded-md border px-2.5 py-1 text-base",
    "transition-colors duration-[var(--dur-state)]",
    "outline-none focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-1 focus-visible:ring-offset-background",
    selected
      ? "border-brand bg-brand-soft font-medium text-foreground"
      : "border-border bg-card text-muted-foreground hover:border-border-mid hover:text-foreground",
    disabled && "pointer-events-none opacity-40",
  );
}

export function SegmentedControl<T extends string>({
  label,
  options,
  value,
  onChange,
  columns = 3,
  className,
}: {
  label: string;
  options: { value: T; label: string; disabled?: boolean }[];
  value: T | null;
  onChange: (value: T) => void;
  columns?: 2 | 3;
  className?: string;
}) {
  const refs = React.useRef<(HTMLButtonElement | null)[]>([]);

  /**
   * Radio semantics, so it announces as "1 of 3" and not as three unrelated
   * toggles — which also means arrow keys have to move the selection, and only
   * one segment may be in the tab order.
   */
  function onKeyDown(event: React.KeyboardEvent, index: number) {
    const keys = ["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp"];
    if (!keys.includes(event.key)) return;
    event.preventDefault();
    const forward =
      event.key === "ArrowDown" ||
      (event.key === "ArrowRight") !== (document.dir === "rtl");
    const step = forward ? 1 : -1;
    const next = (index + step + options.length) % options.length;
    onChange(options[next].value);
    refs.current[next]?.focus();
  }

  const activeIndex = Math.max(
    0,
    options.findIndex((option) => option.value === value),
  );

  return (
    <fieldset className={className}>
      <legend className="mb-1.5 text-meta font-medium text-muted-foreground">{label}</legend>
      <div
        role="radiogroup"
        aria-label={label}
        className={cn(
          "grid gap-1.5",
          columns === 2 ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-3",
        )}
      >
        {options.map((option, index) => {
          const selected = value === option.value;
          return (
            <button
              key={option.value}
              ref={(node) => {
                refs.current[index] = node;
              }}
              type="button"
              role="radio"
              aria-checked={selected}
              disabled={option.disabled}
              tabIndex={index === activeIndex ? 0 : -1}
              onKeyDown={(event) => onKeyDown(event, index)}
              onClick={() => onChange(option.value)}
              className={cn(segmentClass({ selected, disabled: option.disabled }), "justify-center text-center")}
            >
              {selected && <Check className="size-3 text-brand" aria-hidden />}
              {option.label}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
