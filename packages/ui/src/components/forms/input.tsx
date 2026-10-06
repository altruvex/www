"use client";

import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn, normalizeEasternArabicNumerals } from "../../lib/utils";

/** The tool dialect: a boxed field (pill for one line, ctl-xl for a textarea). */
export const controlSurface =
  "w-full min-w-0 rounded-full border border-border-subtle bg-input px-3 text-sm text-foreground " +
  "placeholder:text-muted-foreground selection:bg-accent selection:text-accent-foreground " +
  "transition-[color,border-color,background-color,box-shadow] duration-[var(--duration-state)] ease-(--ease-standard) " +
  "hover:border-foreground/45 focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/25 " +
  "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 " +
  "aria-invalid:border-destructive aria-invalid:bg-destructive/[0.04] aria-invalid:focus-visible:ring-destructive/20";

/** The site dialect: an underline on the page itself, no box and no fill. */
export const lineSurface = cn(
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

/**
 * One field, two dialects. `box` is the tool's (admin, the brand app); `line` is the public
 * site's, which `@repo/ui/www` sets as its default. One form never mixes the two.
 */
export type ControlVariant = "box" | "line";

export function controlClasses(variant: ControlVariant = "box"): string {
  return variant === "line" ? lineSurface : controlSurface;
}

interface FieldMeta {
  id: string;
  describedBy?: string;
  invalid?: boolean;
}

const FieldContext = React.createContext<FieldMeta | null>(null);

export function Field({
  label,
  hint,
  error,
  children,
  className,
}: {
  label?: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
  className?: string;
}) {
  const id = React.useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy = error ? errorId : hint ? hintId : undefined;

  return (
    <FieldContext.Provider value={{ id, describedBy, invalid: Boolean(error) }}>
      <div className={cn("space-y-1.5", className)}>
        {label ? (
          <label htmlFor={id} className="block text-sm font-medium text-muted-foreground">
            {label}
          </label>
        ) : null}
        {children}
        {error ? (
          <p id={errorId} className="text-sm text-destructive">
            {error}
          </p>
        ) : hint ? (
          <p id={hintId} className="text-sm text-muted-foreground">
            {hint}
          </p>
        ) : null}
      </div>
    </FieldContext.Provider>
  );
}

export function useFieldMeta(own: {
  id?: string;
  invalid?: boolean;
  describedBy?: string;
}) {
  const field = React.useContext(FieldContext);
  return {
    id: own.id ?? field?.id,
    "aria-describedby": own.describedBy ?? field?.describedBy,
    "aria-invalid": own.invalid || field?.invalid || undefined,
  };
}

const LTR_TYPES = new Set(["tel", "email", "url"]);

type InputProps = React.ComponentProps<"input"> & {
  normalize?: boolean;
  variant?: ControlVariant;
};

function Input({
  className,
  id,
  type = "text",
  onChange,
  normalize = false,
  inputMode,
  dir,
  variant = "box",
  ...props
}: InputProps) {
  const meta = useFieldMeta({ id, invalid: props["aria-invalid"] === true });
  // Folds Eastern Arabic digits into Latin in place and keeps the caret where it was, so the
  // event the caller receives is the real one (name, form and selection intact).
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
    [normalize, onChange],
  );

  const writtenLtr = dir === undefined && LTR_TYPES.has(type);

  return (
    <input
      type={type === "number" ? "text" : type}
      inputMode={inputMode || (type === "number" ? "numeric" : undefined)}
      dir={writtenLtr ? "ltr" : dir}
      data-slot="input"
      data-variant={variant}
      {...meta}
      onChange={handleChange}
      className={cn(
        controlClasses(variant),
        variant === "box" && "h-[var(--control-h)]",
        "file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground",
        writtenLtr && "rtl:text-right",
        className,
      )}
      {...props}
    />
  );
}

function Textarea({
  className,
  id,
  variant = "box",
  ...props
}: React.ComponentProps<"textarea"> & { variant?: ControlVariant }) {
  const meta = useFieldMeta({ id, invalid: props["aria-invalid"] === true });

  return (
    <textarea
      data-slot="textarea"
      data-variant={variant}
      {...meta}
      className={cn(
        controlClasses(variant),
        variant === "box"
          ? "rounded-ctl-xl min-h-24 resize-y py-2.5 leading-relaxed"
          : "resize-none py-3 leading-relaxed",
        className,
      )}
      {...props}
    />
  );
}

function SelectField({
  className,
  wrapperClassName,
  chevronClassName,
  id,
  variant = "box",
  children,
  ...props
}: React.ComponentProps<"select"> & {
  wrapperClassName?: string;
  chevronClassName?: string;
  variant?: ControlVariant;
}) {
  const meta = useFieldMeta({ id, invalid: props["aria-invalid"] === true });

  return (
    <span data-slot="select-field-wrapper" className={cn("relative block w-full", wrapperClassName)}>
      <select
        data-slot="select-field"
        data-variant={variant}
        {...meta}
        className={cn(
          controlClasses(variant),
          variant === "box" && "h-[var(--control-h)]",
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
          "pointer-events-none absolute top-1/2 size-4 -translate-y-1/2 text-muted-foreground",
          variant === "box" ? "end-3" : "end-0",
          chevronClassName,
        )}
      />
    </span>
  );
}

export { Input, SelectField, Textarea };
