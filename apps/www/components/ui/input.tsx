import * as React from "react";
import { cn } from "@/lib/utils/utils";

const normalizeNumbers = (str: string) => {
  const arabicNumbers = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];
  const persianNumbers = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];

  if (!str || typeof str !== "string") return str;

  return str
    .replace(/[٠-٩]/g, (w) => arabicNumbers.indexOf(w).toString())
    .replace(/[۰-۹]/g, (w) => persianNumbers.indexOf(w).toString());
};

export const formControlClasses = cn(
  "w-full min-w-0 min-h-11 rounded-none bg-transparent px-0 py-2.5 text-base md:text-sm text-foreground",
  "placeholder:text-muted-foreground selection:bg-accent selection:text-accent-foreground",
  "border-b border-border",
  "transition-[color,border-color,outline-color]",
  "focus-visible:border-ring focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
  "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
  "aria-invalid:border-destructive aria-invalid:focus-visible:border-destructive aria-invalid:focus-visible:outline-destructive",
);

const formControlStyles = {
  transitionDuration: "var(--duration-instant)",
  transitionTimingFunction: "var(--ease-default)",
} as const;

type InputProps = React.ComponentProps<"input"> & {
  normalize?: boolean;
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
      type={type === "number" ? "text" : type}
      inputMode={inputMode || (type === "number" ? "numeric" : undefined)}
      data-slot="input"
      onChange={handleChange}
      style={formControlStyles}
      className={cn(
        formControlClasses,
        "file:text-foreground file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium",
        className,
      )}
      {...props}
    />
  );
}

type TextareaProps = React.ComponentProps<"textarea">;

function Textarea({ className, ...props }: TextareaProps) {
  return (
    <textarea
      data-slot="textarea"
      style={formControlStyles}
      className={cn(formControlClasses, "resize-none", className)}
      {...props}
    />
  );
}

type SelectFieldProps = React.ComponentProps<"select">;

function SelectField({ className, ...props }: SelectFieldProps) {
  return (
    <select
      data-slot="select-field"
      style={formControlStyles}
      className={cn(formControlClasses, className)}
      {...props}
    />
  );
}

export { Input, SelectField, Textarea };
