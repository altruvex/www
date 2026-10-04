"use client";

import { Calendar } from "./calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../overlays/popover";
import { controlSurface } from "./input";
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
}: DatePickerProps) {
  const arabic = locale.startsWith("ar");
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
          disabled={disabled}
          className={cn(
            controlSurface,
            "inline-flex items-center justify-start text-start font-normal h-[var(--control-h)] cursor-pointer",
            !date && "text-muted-foreground",
            className,
          )}
        >
          <CalendarIcon className="me-2 h-4 w-4 shrink-0 text-muted-foreground" />
          {label ?? <span>{placeholder}</span>}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
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
