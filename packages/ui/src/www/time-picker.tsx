"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./select";
import { cn } from "../lib/utils";
import { Clock } from "lucide-react";
import * as React from "react";

interface TimePickerProps {
  value?: string;
  onChange?: (time: string) => void;
  disabled?: boolean;
  className?: string;
  /** Trigger placeholders — required, so no caller can ship English into another language. */
  hourPlaceholder: string;
  minutePlaceholder: string;
  /** The page's locale ("en", "ar", ...): the digits are shown in its numbering system. */
  locale: string;
}

export function TimePicker({
  value,
  onChange,
  disabled = false,
  className,
  hourPlaceholder,
  minutePlaceholder,
  locale,
}: TimePickerProps) {
  // The value stays "HH:MM" in Latin digits for the form; only the label
  // is localized, so Arabic reads ٠٩ where English reads 09.
  const digits = new Intl.NumberFormat(locale.startsWith("ar") ? "ar-EG" : "en-US", {
    minimumIntegerDigits: 2,
    useGrouping: false,
  });
  const [hour, setHour] = React.useState<string>(
    value ? (value.split(":")[0] ?? "") : "",
  );
  const [minute, setMinute] = React.useState<string>(
    value ? (value.split(":")[1] ?? "") : "",
  );

  React.useEffect(() => {
    if (value) {
      const [h = "", m = ""] = value.split(":");
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setHour(h);
      setMinute(m);
    }
  }, [value]);

  const handleHourChange = (newHour: string) => {
    setHour(newHour);
    if (minute && onChange) {
      onChange(`${newHour}:${minute}`);
    }
  };

  const handleMinuteChange = (newMinute: string) => {
    setMinute(newMinute);
    if (hour && onChange) {
      onChange(`${hour}:${newMinute}`);
    }
  };

  const hours = Array.from({ length: 10 }, (_, i) => i + 9);
  const minutes = ["00", "15", "30", "45"];

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Clock className="h-4 w-4 text-muted-foreground" />
      <Select value={hour} onValueChange={handleHourChange} disabled={disabled}>
        <SelectTrigger className="w-[100px]">
          <SelectValue placeholder={hourPlaceholder} />
        </SelectTrigger>
        <SelectContent>
          {hours.map((h) => (
            <SelectItem key={h} value={h.toString().padStart(2, "0")}>
              {digits.format(h)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <span className="text-muted-foreground">:</span>
      <Select
        value={minute}
        onValueChange={handleMinuteChange}
        disabled={disabled}
      >
        <SelectTrigger className="w-[100px]">
          <SelectValue placeholder={minutePlaceholder} />
        </SelectTrigger>
        <SelectContent>
          {minutes.map((m) => (
            <SelectItem key={m} value={m}>
              {digits.format(Number(m))}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
