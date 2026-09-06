"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Text controls, on the control rail (`--control-h`) so an Input, a Button and
 * a SelectTrigger standing in one row are the same height.
 */
export const controlSurface =
  "w-full rounded-md border border-border bg-input px-2.5 text-md text-foreground " +
  "placeholder:text-subtle-foreground transition-colors duration-[var(--dur-state)] " +
  "hover:border-border-mid focus-visible:border-ring " +
  "disabled:cursor-not-allowed disabled:opacity-50 " +
  "aria-invalid:border-danger aria-invalid:bg-danger/[0.04]";

/**
 * Field owns the label/description/error wiring so every control is announced
 * correctly. It passes the id down through context rather than cloning its
 * child: a control is often wrapped (a leading icon, a colour swatch, a suffix),
 * and an id cloned onto that wrapper leaves the label pointing at a `div`.
 */
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
        {label && (
          <label htmlFor={id} className="block text-meta font-medium text-muted-foreground">
            {label}
          </label>
        )}
        {children}
        {error ? (
          <p id={errorId} className="text-meta text-danger">
            {error}
          </p>
        ) : hint ? (
          <p id={hintId} className="text-meta text-subtle-foreground">
            {hint}
          </p>
        ) : null}
      </div>
    </FieldContext.Provider>
  );
}

/**
 * Consumes the surrounding Field once. Anything a control sets explicitly wins,
 * so a second control inside one Field can opt out by passing its own id.
 */
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

export function Input({ className, id, ...props }: React.ComponentProps<"input">) {
  const meta = useFieldMeta({ id, invalid: props["aria-invalid"] === true });
  return (
    <input
      data-slot="input"
      {...meta}
      className={cn(controlSurface, "h-[var(--control-h)]", className)}
      {...props}
    />
  );
}

export function Textarea({ className, id, ...props }: React.ComponentProps<"textarea">) {
  const meta = useFieldMeta({ id, invalid: props["aria-invalid"] === true });
  return (
    <textarea
      data-slot="textarea"
      {...meta}
      className={cn(controlSurface, "resize-y py-2 leading-relaxed", className)}
      {...props}
    />
  );
}
