"use client";

import * as React from "react";
import { ChevronDown, ChevronUp, GripVertical, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Field,
  Input,
  Textarea,
  controlSurface,
  useFieldMeta,
} from "@/components/ui/input";
import { cn } from "@/lib/utils";

/**
 * Form primitives for the proposal builder, on the OS token set.
 *
 * These used to be their own little design language — 14px labels, muted-fill
 * inputs, rounded-xl boxes — inherited from the marketing site. They now match
 * every other control in the application, so the builder reads as part of the
 * OS rather than a form someone bolted on.
 *
 * NOTHING here changes what the generated deck contains. These components edit
 * exactly the same fields, in the same shape, with the same validation.
 */

export { Field };

export function TextInput({
  value,
  onChange,
  placeholder,
  invalid,
  className,
  ariaLabel,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  invalid?: boolean;
  className?: string;
  ariaLabel?: string;
}) {
  return (
    <Input
      type="text"
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      aria-label={ariaLabel}
      aria-invalid={invalid || undefined}
      className={className}
    />
  );
}

export function TextArea({
  value,
  onChange,
  rows = 3,
  placeholder,
  invalid,
  ariaLabel,
}: {
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  placeholder?: string;
  invalid?: boolean;
  ariaLabel?: string;
}) {
  return (
    <Textarea
      value={value}
      rows={rows}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      aria-label={ariaLabel}
      aria-invalid={invalid || undefined}
    />
  );
}

export function NumberInput({
  value,
  onChange,
  onCommit,
  min,
  max,
  suffix,
  invalid,
  className,
  ariaLabel,
}: {
  value: number;
  onChange: (value: number) => void;
  /**
   * Fired on blur and on Enter, for a field whose value drives an expensive or
   * destructive recalculation. Without it, a control that rewrites other rows
   * would do so on every keystroke — retyping "120000" would rescale the table
   * six times, once for each digit.
   */
  onCommit?: (value: number) => void;
  min?: number;
  max?: number;
  suffix?: string;
  invalid?: boolean;
  className?: string;
  ariaLabel?: string;
}) {
  const meta = useFieldMeta({ invalid });
  return (
    <div className={cn("relative", className)}>
      <input
        type="number"
        value={Number.isFinite(value) ? value : ""}
        min={min}
        max={max}
        onChange={(e) => onChange(e.target.value === "" ? NaN : Number(e.target.value))}
        onBlur={(e) =>
          onCommit?.(e.target.value === "" ? NaN : Number(e.target.value))
        }
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            e.currentTarget.blur();
          }
        }}
        aria-label={ariaLabel}
        {...meta}
        className={cn(
          controlSurface,
          "h-[var(--control-h)] text-end font-mono tabular-nums",
          suffix && "pe-7",
          // The spinner arrows steal 20px from a 96px field and are never used.
          "[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none",
        )}
      />
      {suffix && (
        <span className="pointer-events-none absolute inset-y-0 end-2 flex items-center font-mono text-micro text-subtle-foreground">
          {suffix}
        </span>
      )}
    </div>
  );
}

export function DateInput({
  value,
  onChange,
  invalid,
}: {
  value: string;
  onChange: (value: string) => void;
  invalid?: boolean;
}) {
  const meta = useFieldMeta({ invalid });
  return (
    <input
      type="date"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      {...meta}
      className={cn(controlSurface, "h-[var(--control-h)]")}
    />
  );
}

/**
 * A block inside a slide's editor. Uses the same flat plane as the rest of the
 * OS — a hairline header and a flush body, never a floating card.
 */
export function Section({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="plane overflow-hidden">
      <div className="flex items-start justify-between gap-4 border-b border-border px-3 py-2">
        <div className="min-w-0">
          <h3 className="text-md font-semibold">{title}</h3>
          {description && (
            <p className="mt-0.5 text-meta text-muted-foreground">{description}</p>
          )}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      <div className="space-y-3 p-3">{children}</div>
    </section>
  );
}

/**
 * Repeatable list with add / remove / reorder. Every list field in a proposal
 * uses this — none of them is a fixed-length set of inputs.
 *
 * Reordering is buttons, not drag: these rows contain text inputs, and a drag
 * handle competes with selecting text in them. The grip is an affordance only.
 */
export function ListEditor<T>({
  items,
  onChange,
  makeItem,
  renderItem,
  addLabel = "Add item",
  emptyHint,
  minItems = 1,
}: {
  items: T[];
  onChange: (items: T[]) => void;
  makeItem: () => T;
  renderItem: (item: T, index: number, update: (patch: Partial<T>) => void) => React.ReactNode;
  addLabel?: string;
  emptyHint?: string;
  minItems?: number;
}) {
  const move = (from: number, to: number) => {
    if (to < 0 || to >= items.length) return;
    const next = [...items];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    onChange(next);
  };

  const update = (index: number) => (patch: Partial<T>) => {
    onChange(items.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  };

  return (
    <div className="space-y-2">
      {items.length === 0 && emptyHint && (
        <p className="rounded-md border border-danger/25 bg-danger/[0.06] px-2.5 py-2 text-base text-danger">
          {emptyHint}
        </p>
      )}

      <ul className="space-y-1.5">
        {items.map((item, index) => (
          <li
            key={index}
            className="group/row flex items-start gap-2 rounded-md border border-border bg-surface/50 p-2"
          >
            <div className="flex w-6 shrink-0 flex-col items-center gap-0.5 pt-1">
              <span className="font-mono text-micro tabular-nums text-subtle-foreground">
                {String(index + 1).padStart(2, "0")}
              </span>
              <GripVertical
                className="size-3 text-subtle-foreground opacity-0 group-hover/row:opacity-60"
                aria-hidden
              />
              <button
                type="button"
                onClick={() => move(index, index - 1)}
                disabled={index === 0}
                aria-label={`Move item ${index + 1} up`}
                className="rounded-xs p-0.5 text-subtle-foreground transition-colors duration-[var(--dur-state)] hover:text-foreground disabled:opacity-25 disabled:hover:text-subtle-foreground"
              >
                <ChevronUp className="size-3" />
              </button>
              <button
                type="button"
                onClick={() => move(index, index + 1)}
                disabled={index === items.length - 1}
                aria-label={`Move item ${index + 1} down`}
                className="rounded-xs p-0.5 text-subtle-foreground transition-colors duration-[var(--dur-state)] hover:text-foreground disabled:opacity-25 disabled:hover:text-subtle-foreground"
              >
                <ChevronDown className="size-3" />
              </button>
            </div>

            <div className="min-w-0 flex-1 space-y-2">{renderItem(item, index, update(index))}</div>

            <button
              type="button"
              onClick={() => onChange(items.filter((_, i) => i !== index))}
              disabled={items.length <= minItems}
              aria-label={`Remove item ${index + 1}`}
              title={items.length <= minItems ? `At least ${minItems} required` : "Remove"}
              className="shrink-0 rounded-sm p-1.5 text-subtle-foreground transition-colors duration-[var(--dur-state)] hover:bg-danger/10 hover:text-danger disabled:opacity-25 disabled:hover:bg-transparent disabled:hover:text-subtle-foreground"
            >
              <Trash2 className="size-3.5" />
            </button>
          </li>
        ))}
      </ul>

      <Button variant="outline" size="sm" onClick={() => onChange([...items, makeItem()])}>
        <Plus className="size-3.5" />
        {addLabel}
      </Button>
    </div>
  );
}

/** A derived number the operator cannot edit, shown next to the field it comes from. */
export function Derived({
  children,
  className,
  title,
}: {
  children: React.ReactNode;
  className?: string;
  title?: string;
}) {
  return (
    <span
      title={title ?? "Computed from the line items — never stored"}
      className={cn(
        "inline-flex h-8 items-center justify-end font-mono text-meta tabular-nums text-subtle-foreground",
        className,
      )}
    >
      {children}
    </span>
  );
}
