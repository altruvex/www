"use client";

import { Button } from "../components/primitives/button";
import { Calendar } from "./calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../components/overlays/popover";
import { cn } from "../lib/utils";
import { arEG, enUS } from "react-day-picker/locale";
import { Calendar as CalendarIcon } from "lucide-react";

interface DatePickerProps {
  date?: Date;
  onDateChange?: (date: Date | undefined) => void;
  disabled?: boolean;
  /** Required, with the locale, so no caller can ship English into another language. */
  placeholder: string;
  /** The page's locale ("en", "ar", ...): picks the date wording, digits and direction. */
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
  // Egyptian Arabic writes the date in Arabic-Indic digits, as the rest of
  // the Arabic site does; Intl does it without a formatting table of our own.
  // Arabic weekday names do not fit a 32px cell ("خميسجمعة"); the narrow
  // form is the one Arabic calendars print.
  const weekday = new Intl.DateTimeFormat(arabic ? "ar-EG" : "en-US", { weekday: arabic ? "narrow" : "short" });
  const label = date
    ? new Intl.DateTimeFormat(arabic ? "ar-EG" : "en-US", { dateStyle: "long" }).format(date)
    : null;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant={"outline"}
          className={cn(
            "transition-all w-full justify-start text-start font-normal rounded-md border-b border-foreground/30 bg-transparent hover:bg-transparent px-0 py-2 text-sm text-primary placeholder:text-primary/60 focus:outline-none sm:text-base md:py-2.5",
            !date && "text-muted-foreground",
            className,
          )}
          disabled={disabled}
        >
          <CalendarIcon className="me-2 h-4 w-4" />
          {label ?? <span>{placeholder}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-auto p-0 liquid-glass"
        align="start"
      >
        <Calendar
          mode="single"
          selected={date}
          onSelect={onDateChange}
          // In react-day-picker v9, fromDate/toDate only bound navigation - a
          // past day stayed clickable and the form rejected it after the fact.
          disabled={
            disabled || [
              ...(minDate ? [{ before: minDate }] : []),
              ...(maxDate ? [{ after: maxDate }] : []),
            ]
          }
          initialFocus
          startMonth={minDate}
          endMonth={maxDate}
          formatters={{ formatWeekdayName: (day) => weekday.format(day) }}
          locale={arabic ? arEG : enUS}
          dir={arabic ? "rtl" : "ltr"}
          numerals={arabic ? "arab" : "latn"}
        />
      </PopoverContent>
    </Popover>
  );
}
