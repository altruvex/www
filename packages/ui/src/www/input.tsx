import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn, normalizeEasternArabicNumerals } from "../lib/utils";

/*
 * The marketing site's form control is a written line, not a box: one rule
 * under the text, the way a field on a printed brief is a line to write on.
 * Every state is carried by that rule, so nothing else has to change shape.
 *
 *   rest      1px ink at 55%  — the control's only boundary, so it has to
 *                               clear WCAG 1.4.11 on its own (4.2:1 light,
 *                               5.6:1 dark; the old `border-border` was ~1.2:1)
 *   hover     ink at 80%
 *   focus     2px ring — the second pixel is an inset shadow, so the line
 *             thickens without moving the text
 *   invalid   the same line in destructive
 *   disabled  dashed and muted — the site's "not in effect" idiom, instead of
 *             halving the opacity of text someone may still need to read
 */
export const formControlClasses = cn(
  "w-full min-w-0 min-h-11 rounded-none bg-transparent px-0 py-2.5 text-base text-foreground",
  "placeholder:text-muted-foreground selection:bg-local-accent-soft selection:text-foreground",
  "border-b border-foreground/55 outline-none",
  "transition-[color,border-color,box-shadow] duration-(--duration-instant) ease-(--ease-default)",
  "enabled:hover:border-foreground/80",
  "focus-visible:border-ring focus-visible:shadow-[inset_0_-1px_0_0_var(--color-ring)]",
  "aria-invalid:border-destructive aria-invalid:focus-visible:border-destructive aria-invalid:focus-visible:shadow-[inset_0_-1px_0_0_var(--color-destructive)]",
  "disabled:cursor-not-allowed disabled:border-dashed disabled:border-foreground/30 disabled:text-muted-foreground",
  // Autofill paints its own background over a transparent field; keep the page
  // showing through, and keep the focus line when both apply.
  "[&:-webkit-autofill]:shadow-[inset_0_0_0_100vmax_var(--color-background)] [&:-webkit-autofill]:[-webkit-text-fill-color:var(--color-foreground)]",
  "[&:-webkit-autofill:focus-visible]:shadow-[inset_0_-1px_0_0_var(--color-ring),inset_0_0_0_100vmax_var(--color-background)]",
);

/** Values written left to right in every locale. */
const LTR_TYPES = new Set(["tel", "email", "url"]);

type InputProps = React.ComponentProps<"input"> & {
  /** Rewrite Eastern Arabic and Persian digits to 0–9 as they are typed. */
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
          // Digit for digit, so the caret stays where it was. Writing to the
          // element itself — rather than handing onChange a copied event —
          // keeps the real event, its methods, and the target's id and name.
          const { selectionStart, selectionEnd } = input;
          input.value = normalized;
          input.setSelectionRange(selectionStart, selectionEnd);
        }
      }
      onChange?.(event);
    },
    [onChange, normalize],
  );

  // A phone number or an address typed on an Arabic page is still written
  // left to right; it sits against the start edge of the page all the same.
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

type SelectFieldProps = React.ComponentProps<"select">;

/**
 * Native select — the platform picker is the right one on a phone — with the
 * browser's arrow replaced by the site's chevron, placed on the end edge so it
 * follows the reading direction.
 */
function SelectField({ className, children, ...props }: SelectFieldProps) {
  return (
    <span data-slot="select-field-wrapper" className="relative block w-full">
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
        className="pointer-events-none absolute end-0 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
      />
    </span>
  );
}

export { Input, SelectField, Textarea };
