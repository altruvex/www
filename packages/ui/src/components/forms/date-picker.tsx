"use client";

import { Calendar } from "./calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../overlays/popover";
import { controlClasses, type ControlVariant } from "./input";
import { cn } from "../../lib/utils";
import { arEG, enUS } from "react-day-picker/locale";
import { Calendar as CalendarIcon } from "lucide-react";
import * as React from "react";

interface DatePickerProps {
  date?: Date;
  onDateChange?: (date: Date | undefined) => void;
  disabled?: boolean;
  placeholder: string;
  locale: string;
  className?: string;
  minDate?: Date;
  maxDate?: Date;
  /** `box` in the tool, `line` on the site (the `@repo/ui/www` default). */
  variant?: ControlVariant;
}

export function DatePicker({
  date,
  onDateChange,
  disabled = false,
  placeholder,
  locale,
  className,
  minDate,
  maxDate,
  variant = "box",
}: DatePickerProps) {
  const arabic = locale.startsWith("ar");
  // The popover is portalled out of the page's own `dir`, so it is set here from the locale.
  const dir = arabic ? "rtl" : "ltr";
  const weekday = new Intl.DateTimeFormat(arabic ? "ar-EG-u-nu-latn" : "en-US", {
    weekday: arabic ? "narrow" : "short",
  });
  const thisYear = new Date().getFullYear();
  const startMonth = minDate ?? new Date(thisYear - 30, 0);
  const endMonth = maxDate ?? new Date(thisYear + 10, 11);
  const label = date
    ? new Intl.DateTimeFormat(arabic ? "ar-EG-u-nu-latn" : "en-US", {
        dateStyle: "long",
      }).format(date)
    : null;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          data-variant={variant}
          disabled={disabled}
          className={cn(
            controlClasses(variant),
            "inline-flex cursor-pointer items-center justify-start text-start font-normal",
            variant === "box" && "h-[var(--control-h)]",
            !date && "text-muted-foreground",
            className,
          )}
        >
          <CalendarIcon className="me-2 h-4 w-4 shrink-0 text-muted-foreground" />
          {label ?? <span>{placeholder}</span>}
        </button>
      </PopoverTrigger>
      <PopoverContent dir={dir} className="w-auto p-0" align="start">
        <Calendar
          dir={dir}
          mode="single"
          captionLayout="dropdown"
          startMonth={startMonth}
          endMonth={endMonth}
          defaultMonth={date}
          selected={date}
          onSelect={onDateChange}
          locale={arabic ? arEG : enUS}
          disabled={(d) => {
            if (minDate && d < minDate) return true;
            if (maxDate && d > maxDate) return true;
            return false;
          }}
          formatters={{
            formatWeekdayName: (d) => weekday.format(d),
          }}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}
