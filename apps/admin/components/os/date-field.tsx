"use client";

import * as React from "react";

import { DatePicker } from "@repo/ui";

function parseDay(day: string | undefined): Date | undefined {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(day ?? "");
  if (!match) return undefined;
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

function formatDay(date: Date): string {
  const y = String(date.getFullYear()).padStart(4, "0");
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function DateField({
  name,
  value,
  defaultValue = "",
  onChange,
  min,
  max,
  disabled,
  placeholder = "Pick a date",
  className,
  ariaLabel,
}: {
  name?: string;
  value?: string;
  defaultValue?: string;
  onChange?: (day: string) => void;
  min?: string;
  max?: string;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  ariaLabel?: string;
}) {
  const [inner, setInner] = React.useState(defaultValue);
  const current = value ?? inner;

  return (
    <>
      {name && <input type="hidden" name={name} value={current} />}
      <div role={ariaLabel ? "group" : undefined} aria-label={ariaLabel}>
      <DatePicker
        locale="en"
        placeholder={placeholder}
        date={parseDay(current)}
        onDateChange={(date) => {
          const day = date ? formatDay(date) : "";
          setInner(day);
          onChange?.(day);
        }}
        minDate={parseDay(min)}
        maxDate={parseDay(max)}
        disabled={disabled}
        className={className}
      />
      </div>
    </>
  );
}
