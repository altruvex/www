"use client";

import { cn } from "@/lib/utils/utils";
import { type KeyboardEvent, type ReactNode, useRef } from "react";

interface SegmentedOption<T extends string> {
  value: T;
  label: ReactNode;
  lang?: string;
  icon?: ReactNode;
}

interface SegmentedControlProps<T extends string> {
  options: readonly SegmentedOption<T>[];
  value: T | undefined;
  onChange: (value: T) => void;
  label: string;
  disabled?: boolean;
  className?: string;
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  label,
  disabled = false,
  className,
}: SegmentedControlProps<T>) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const selectedIndex = options.findIndex((option) => option.value === value);
  const tabStop = selectedIndex === -1 ? 0 : selectedIndex;

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const rtl = getComputedStyle(event.currentTarget).direction === "rtl";
    const current = refs.current.findIndex(
      (el) => el === document.activeElement,
    );
    if (current === -1) return;

    const last = options.length - 1;
    let next: number;
    switch (event.key) {
      case "ArrowRight":
        next = rtl ? current - 1 : current + 1;
        break;
      case "ArrowLeft":
        next = rtl ? current + 1 : current - 1;
        break;
      case "ArrowDown":
        next = current + 1;
        break;
      case "ArrowUp":
        next = current - 1;
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
    refs.current[next]?.focus();
    onChange(options[next].value);
  };

  return (
    <div
      role="radiogroup"
      aria-label={label}
      aria-disabled={disabled || undefined}
      onKeyDown={disabled ? undefined : onKeyDown}
      className={cn(
        "inline-flex h-11 items-center gap-0.5 rounded-full bg-foreground/[0.06] p-1",
        disabled && "opacity-60",
        className,
      )}
    >
      {options.map((option, index) => {
        const checked = option.value === value;
        return (
          <button
            key={option.value}
            ref={(el) => {
              refs.current[index] = el;
            }}
            type="button"
            role="radio"
            aria-checked={checked}
            lang={option.lang}
            tabIndex={index === tabStop ? 0 : -1}
            disabled={disabled}
            onClick={() => onChange(option.value)}
            className={cn(
              "relative inline-flex h-9 min-w-14 items-center justify-center gap-1.5 rounded-full px-3.5 text-sm font-medium text-nowrap",
              "after:absolute after:inset-x-0 after:-inset-y-1 after:content-['']",
              "transition-[background-color,color,box-shadow] duration-(--motion-instant) ease-smooth",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
              "[&_svg]:size-4 [&_svg]:shrink-0",
              checked
                ?
                  "bg-card text-foreground shadow-card dark:bg-foreground/15 dark:shadow-none"
                : "text-foreground/65 hover:text-foreground",
            )}
          >
            {option.icon}
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
