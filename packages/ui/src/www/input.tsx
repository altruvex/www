import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn, normalizeEasternArabicNumerals } from "../lib/utils";

export const formControlClasses = cn(
  "w-full min-w-0 min-h-11 rounded-none bg-transparent px-0 py-2.5 text-base text-foreground",
  "placeholder:text-muted-foreground selection:bg-local-accent-soft selection:text-foreground",
  "border-b border-foreground/55 outline-none",
  "transition-[color,border-color,box-shadow] duration-(--duration-instant) ease-(--ease-default)",
  "enabled:hover:border-foreground/80",
  "focus-visible:border-ring focus-visible:shadow-[inset_0_-1px_0_0_var(--color-ring)]",
  "aria-invalid:border-destructive aria-invalid:focus-visible:border-destructive aria-invalid:focus-visible:shadow-[inset_0_-1px_0_0_var(--color-destructive)]",
  "disabled:cursor-not-allowed disabled:border-dashed disabled:border-foreground/30 disabled:text-muted-foreground",
  "[&:-webkit-autofill]:shadow-[inset_0_0_0_100vmax_var(--color-background)] [&:-webkit-autofill]:[-webkit-text-fill-color:var(--color-foreground)]",
  "[&:-webkit-autofill:focus-visible]:shadow-[inset_0_-1px_0_0_var(--color-ring),inset_0_0_0_100vmax_var(--color-background)]",
);

const LTR_TYPES = new Set(["tel", "email", "url"]);

type InputProps = React.ComponentProps<"input"> & {
  normalize?: boolean;
};

function Input({
  className,
  type = "text",
  onChange,
  normalize = false,
  inputMode,
  dir,
  ...props
}: InputProps) {
  const handleChange = React.useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      if (normalize) {
        const input = event.currentTarget;
        const normalized = normalizeEasternArabicNumerals(input.value);
        if (normalized !== input.value) {
          const { selectionStart, selectionEnd } = input;
          input.value = normalized;
          input.setSelectionRange(selectionStart, selectionEnd);
        }
      }
      onChange?.(event);
    },
    [onChange, normalize],
  );

  const writtenLtr = dir === undefined && LTR_TYPES.has(type);

  return (
    <input
      type={type === "number" ? "text" : type}
      inputMode={inputMode || (type === "number" ? "numeric" : undefined)}
      dir={writtenLtr ? "ltr" : dir}
      data-slot="input"
      onChange={handleChange}
      className={cn(
        formControlClasses,
        writtenLtr && "rtl:text-right",
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
      className={cn(formControlClasses, "resize-none py-3 leading-relaxed", className)}
      {...props}
    />
  );
}

type SelectFieldProps = React.ComponentProps<"select"> & {
  wrapperClassName?: string;
  chevronClassName?: string;
};

function SelectField({
  className,
  wrapperClassName,
  chevronClassName,
  children,
  ...props
}: SelectFieldProps) {
  return (
    <span
      data-slot="select-field-wrapper"
      className={cn("relative block w-full", wrapperClassName)}
    >
      <select
        data-slot="select-field"
        className={cn(
          formControlClasses,
          "cursor-pointer appearance-none pe-8 disabled:cursor-not-allowed",
          "[&>option]:bg-background [&>option]:text-foreground",
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        aria-hidden
        className={cn(
          "pointer-events-none absolute end-0 top-1/2 size-4 -translate-y-1/2 text-muted-foreground",
          chevronClassName,
        )}
      />
    </span>
  );
}

export { Input, SelectField, Textarea };
