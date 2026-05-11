import * as React from "react";
import { cn } from "@/lib/utils";

const normalizeNumbers = (str: string) => {
  const arabicNumbers = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];
  const persianNumbers = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];

  if (!str || typeof str !== "string") return str;

  return str
    .replace(/[٠-٩]/g, (w) => arabicNumbers.indexOf(w).toString())
    .replace(/[۰-۹]/g, (w) => persianNumbers.indexOf(w).toString());
};

type InputProps = React.ComponentProps<"input"> & {
  normalize?: boolean; // optional behavior
};

function Input({
  className,
  type = "text",
  onChange,
  normalize = false,
  inputMode,
  ...props
}: InputProps) {
  const handleChange = React.useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;

      const normalizedValue = normalize ? normalizeNumbers(value) : value;

      if (onChange) {
        const clonedEvent = {
          ...e,
          target: {
            ...e.target,
            value: normalizedValue,
          },
        } as React.ChangeEvent<HTMLInputElement>;

        onChange(clonedEvent);
      }
    },
    [onChange, normalize],
  );

  return (
    <input
      type={type === "number" ? "text" : type} // نمنع number
      inputMode={inputMode || (type === "number" ? "numeric" : undefined)}
      data-slot="input"
      onChange={handleChange}
      className={cn(
        "file:text-foreground placeholder:text-muted-foreground selection:bg-accent selection:text-accent-foreground",
        "h-9 w-full min-w-0 bg-transparent px-0 py-2.5 text-base outline-none transition-[border-color] md:text-sm",
        "file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium",
        "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        "border-b border-border focus:border-accent",
        "focus-visible:outline-none",
        "aria-invalid:border-destructive",
        className,
      )}
      style={{
        borderRadius: 0,
        transitionDuration: "var(--duration-instant)",
        transitionTimingFunction: "var(--ease-default)",
      }}
      {...props}
    />
  );
}

export { Input };
