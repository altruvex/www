"use client";

import * as React from "react";
import { Check } from "lucide-react";
import { cn } from "../../lib/utils";

export function segmentClass({
  selected,
  disabled,
}: {
  selected: boolean;
  disabled?: boolean;
}) {
  return cn(
    "flex min-h-[var(--control-h)] items-center gap-1.5 rounded-ctl border px-2.5 py-1 text-base",
    "transition-colors duration-[var(--dur-state)]",
    "outline-none focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-1 focus-visible:ring-offset-background",
    selected
      ? "border-brand bg-brand-soft font-medium text-foreground"
      : "border-border-subtle bg-card text-muted-foreground hover:border-foreground/45 hover:text-foreground",
    disabled && "pointer-events-none opacity-40",
  );
}

/*
 * One control, two dialects (edge-system §11). `box` (the tool default) is a labelled grid of
 * bordered segments with a check on the chosen one. `pill` is the site's track: one rounded
 * strip, the label only for assistive tech, the chosen segment lifted as a card.
 */
export type SegmentedVariant = "box" | "pill";

export interface SegmentedOption<T extends string> {
  value: T;
  label: React.ReactNode;
  disabled?: boolean;
  /** Language of the label, for an option written in another language (a locale's own name). */
  lang?: string;
  icon?: React.ReactNode;
}

export interface SegmentedControlProps<T extends string> {
  label: string;
  options: readonly SegmentedOption<T>[];
  value: T | null | undefined;
  onChange: (value: T) => void;
  variant?: SegmentedVariant;
  /** Grid columns of the box dialect. */
  columns?: 2 | 3;
  disabled?: boolean;
  className?: string;
}

function pillSegmentClass(checked: boolean) {
  return cn(
    "relative inline-flex h-9 min-w-14 items-center justify-center gap-1.5 rounded-full px-3.5 text-sm font-medium text-nowrap",
    "after:absolute after:inset-x-0 after:-inset-y-1 after:content-['']",
    "transition-[background-color,color,box-shadow] duration-(--motion-instant) ease-smooth",
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
    "[&_svg]:size-4 [&_svg]:shrink-0",
    checked
      ? "bg-card text-foreground shadow-card dark:bg-foreground/15 dark:shadow-none"
      : "text-foreground/65 hover:text-foreground",
  );
}

export function SegmentedControl<T extends string>({
  label,
  options,
  value,
  onChange,
  variant = "box",
  columns = 3,
  disabled = false,
  className,
}: SegmentedControlProps<T>) {
  const refs = React.useRef<(HTMLButtonElement | null)[]>([]);

  const selectedIndex = options.findIndex((option) => option.value === value);
  const tabStop = Math.max(0, selectedIndex);

  // Roving focus (WAI-ARIA radio group): arrows move and select, wrapping at the ends; the
  // horizontal arrows follow the reading direction; Home and End jump to the ends.
  function onKeyDown(event: React.KeyboardEvent<HTMLButtonElement>, index: number) {
    const rtl = getComputedStyle(event.currentTarget).direction === "rtl";
    const last = options.length - 1;
    let next: number;
    switch (event.key) {
      case "ArrowRight":
        next = rtl ? index - 1 : index + 1;
        break;
      case "ArrowLeft":
        next = rtl ? index + 1 : index - 1;
        break;
      case "ArrowDown":
        next = index + 1;
        break;
      case "ArrowUp":
        next = index - 1;
        break;
      case "Home":
        next = 0;
        break;
      case "End":
        next = last;
        break;
      default:
        return;
    }
    event.preventDefault();
    if (next < 0) next = last;
    if (next > last) next = 0;
    const nextOption = options[next];
    if (!nextOption || nextOption.disabled) return;
    refs.current[next]?.focus();
    onChange(nextOption.value);
  }

  const segments = options.map((option, index) => {
    const selected = option.value === value;
    return (
      <button
        key={option.value}
        ref={(node) => {
          refs.current[index] = node;
        }}
        type="button"
        role="radio"
        aria-checked={selected}
        lang={option.lang}
        disabled={disabled || option.disabled}
        tabIndex={index === tabStop ? 0 : -1}
        onKeyDown={(event) => onKeyDown(event, index)}
        onClick={() => onChange(option.value)}
        className={
          variant === "pill"
            ? pillSegmentClass(selected)
            : cn(segmentClass({ selected, disabled: option.disabled }), "justify-center text-center")
        }
      >
        {variant === "box" && selected && <Check className="size-3 text-brand" aria-hidden />}
        {option.icon}
        {option.label}
      </button>
    );
  });

  if (variant === "pill") {
    return (
      <div
        role="radiogroup"
        aria-label={label}
        aria-disabled={disabled || undefined}
        className={cn(
          "inline-flex h-11 items-center gap-0.5 rounded-full bg-foreground/[0.06] p-1",
          disabled && "opacity-60",
          className,
        )}
      >
        {segments}
      </div>
    );
  }

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
        {segments}
      </div>
    </fieldset>
  );
}
