"use client";

import * as React from "react";

import { cn, normalizeEasternArabicNumerals } from "../../lib/utils";

export const controlSurface =
  "w-full min-w-0 rounded-md border border-border bg-input px-3 text-sm text-foreground " +
  "placeholder:text-muted-foreground selection:bg-accent selection:text-accent-foreground " +
  "transition-[color,border-color,background-color,box-shadow] duration-[var(--duration-state)] ease-[var(--ease-standard)] " +
  "hover:border-border-mid focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/25 " +
  "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 " +
  "aria-invalid:border-destructive aria-invalid:bg-destructive/[0.04] aria-invalid:focus-visible:ring-destructive/20";

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

type InputProps = React.ComponentProps<"input"> & {
  normalize?: boolean;
};

function Input({
  className,
  id,
  type = "text",
  onChange,
  normalize = false,
  inputMode,
  ...props
}: InputProps) {
  const meta = useFieldMeta({ id, invalid: props["aria-invalid"] === true });
  const handleChange = React.useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      if (!onChange) return;

      const normalizedValue = normalize
        ? normalizeEasternArabicNumerals(event.target.value)
        : event.target.value;

      onChange({
        ...event,
        target: {
          ...event.target,
          value: normalizedValue,
        },
      } as React.ChangeEvent<HTMLInputElement>);
    },
    [normalize, onChange],
  );

  return (
    <input
      type={type === "number" ? "text" : type}
      inputMode={inputMode || (type === "number" ? "numeric" : undefined)}
      data-slot="input"
      {...meta}
      onChange={handleChange}
      className={cn(
        controlSurface,
        "h-[var(--control-h)] file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground",
        className,
      )}
      {...props}
    />
  );
}

function Textarea({ className, id, ...props }: React.ComponentProps<"textarea">) {
  const meta = useFieldMeta({ id, invalid: props["aria-invalid"] === true });

  return (
    <textarea
      data-slot="textarea"
      {...meta}
      className={cn(controlSurface, "min-h-24 resize-y py-2 leading-relaxed", className)}
      {...props}
    />
  );
}

function SelectField({ className, id, ...props }: React.ComponentProps<"select">) {
  const meta = useFieldMeta({ id, invalid: props["aria-invalid"] === true });

  return (
    <select
      data-slot="select-field"
      {...meta}
      className={cn(controlSurface, "h-[var(--control-h)]", className)}
      {...props}
    />
  );
}

export { Input, SelectField, Textarea };
