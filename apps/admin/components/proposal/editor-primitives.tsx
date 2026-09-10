"use client";

import { cn } from "@/lib/utils";
import {
  DndContext,
  DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Button, Field,
  Input,
  Textarea,
  controlSurface,
  useFieldMeta
} from "@repo/ui";
import { GripVertical, ListPlus, Plus, Trash2 } from "lucide-react";
import * as React from "react";

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
        onChange={(e) =>
          onChange(e.target.value === "" ? NaN : Number(e.target.value))
        }
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
          "h-(--control-h) text-end font-mono tabular-nums",
          suffix && "pe-7",
          "[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        )}
      />
      {suffix && (
        <span className="pointer-events-none absolute inset-y-0 inset-e-2 flex items-center font-mono text-micro text-subtle-foreground">
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
      className={cn(controlSurface, "h-(--control-h)")}
    />
  );
}

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
            <p className="mt-0.5 text-meta text-muted-foreground">
              {description}
            </p>
          )}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      <div className="space-y-3 p-3">{children}</div>
    </section>
  );
}

function SortableItem<T>({
  id,
  index,
  item,
  renderItem,
  update,
  onRemove,
  canRemove,
  minItems,
}: {
  id: string;
  index: number;
  item: T;
  renderItem: (
    item: T,
    index: number,
    update: (patch: Partial<T>) => void
  ) => React.ReactNode;
  update: (patch: Partial<T>) => void;
  onRemove: () => void;
  canRemove: boolean;
  minItems: number;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 0,
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={cn(
        "group/row flex items-start gap-2 rounded-md border p-2",
        isDragging
          ? "relative border-primary bg-surface shadow-md"
          : "border-border bg-surface/50"
      )}
    >
      <div className="flex w-6 shrink-0 flex-col items-center gap-0.5 pt-1">
        <span className="font-mono text-micro tabular-nums text-subtle-foreground">
          {String(index + 1).padStart(2, "0")}
        </span>
        <button
          type="button"
          {...attributes}
          {...listeners}
          className={cn(
            "mt-1 cursor-grab touch-none rounded-xs p-0.5 text-subtle-foreground",
            "opacity-45 transition-[opacity,color] duration-(--dur-state)",
            "hover:text-foreground hover:opacity-100 group-hover/row:opacity-80",
            "focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
            "active:cursor-grabbing",
            isDragging && "opacity-100 text-foreground"
          )}
          aria-label={`Reorder item ${index + 1} — press space, then use the arrow keys`}
          title="Drag to reorder"
        >
          <GripVertical className="size-3" aria-hidden />
        </button>
      </div>
      <div className="min-w-0 flex-1 space-y-2">
        {renderItem(item, index, update)}
      </div>
      <button
        type="button"
        onClick={onRemove}
        disabled={!canRemove}
        aria-label={`Remove item ${index + 1}`}
        title={!canRemove ? `At least ${minItems} required` : "Remove"}
        className="shrink-0 rounded-sm p-1.5 text-subtle-foreground transition-colors duration-(--dur-state) hover:bg-danger/10 hover:text-danger disabled:opacity-25 disabled:hover:bg-transparent disabled:hover:text-subtle-foreground"
      >
        <Trash2 className="size-3.5" />
      </button>
    </li>
  );
}

export function ListEditor<T>({
  items,
  onChange,
  makeItem,
  renderItem,
  addLabel = "Add item",
  emptyHint,
  emptyBody,
  minItems = 1,
}: {
  items: T[];
  onChange: (items: T[]) => void;
  makeItem: () => T;
  renderItem: (
    item: T,
    index: number,
    update: (patch: Partial<T>) => void
  ) => React.ReactNode;
  addLabel?: string;
  emptyHint?: string;
  emptyBody?: string;
  minItems?: number;
}) {
  const baseId = React.useId();
  const nextId = React.useRef(items.length);

  const [ids, setIds] = React.useState<string[]>(() =>
    items.map((_, i) => `${baseId}-${i}`)
  );

  React.useEffect(() => {
    setIds((prev) => {
      if (prev.length === items.length) return prev;
      if (prev.length < items.length) {
        const added = Array.from(
          { length: items.length - prev.length },
          () => `${baseId}-${nextId.current++}`
        );
        return [...prev, ...added];
      }
      return prev.slice(0, items.length);
    });
  }, [items.length, baseId]);

  const displayIds = items.map(
    (_, index) => ids[index] ?? `${baseId}-fallback-${index}`
  );

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = displayIds.indexOf(active.id as string);
      const newIndex = displayIds.indexOf(over.id as string);

      setIds((prev) => arrayMove(prev, oldIndex, newIndex));
      onChange(arrayMove(items, oldIndex, newIndex));
    }
  };

  const update = (index: number) => (patch: Partial<T>) => {
    onChange(
      items.map((item, i) => (i === index ? { ...item, ...patch } : item))
    );
  };

  const remove = (index: number) => {
    setIds((prev) => prev.filter((_, i) => i !== index));
    onChange(items.filter((_, i) => i !== index));
  };

  const add = () => {
    setIds((prev) => [...prev, `${baseId}-${nextId.current++}`]);
    onChange([...items, makeItem()]);
  };

  if (items.length === 0) {
    const invalid = Boolean(emptyHint);
    return (
      <div
        className={cn(
          "flex flex-col items-start gap-3 rounded-md border border-dashed px-4 py-5",
          invalid
            ? "border-danger/35 bg-danger/4"
            : "border-border bg-surface/40"
        )}
      >
        <div className="flex items-start gap-2.5">
          <span
            className={cn(
              "mt-px flex size-6 shrink-0 items-center justify-center rounded-md border",
              invalid
                ? "border-danger/25 text-danger"
                : "border-border bg-surface text-subtle-foreground"
            )}
          >
            <ListPlus className="size-3.5" aria-hidden />
          </span>
          <p
            className={cn(
              "max-w-prose text-base",
              invalid ? "text-danger" : "text-muted-foreground"
            )}
          >
            {emptyHint ??
              emptyBody ??
              "Nothing here yet. This block is left out of the deck until it has at least one row."}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={add}>
          <Plus className="size-3.5" />
          {addLabel}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={displayIds}
          strategy={verticalListSortingStrategy}
        >
          <ul className="space-y-1.5">
            {items.map((item, index) => (
              <SortableItem
                key={displayIds[index]}
                id={displayIds[index]}
                index={index}
                item={item}
                renderItem={renderItem}
                update={update(index)}
                onRemove={() => remove(index)}
                canRemove={items.length > minItems}
                minItems={minItems}
              />
            ))}
          </ul>
        </SortableContext>
      </DndContext>
      <Button variant="outline" size="sm" onClick={add}>
        <Plus className="size-3.5" />
        {addLabel}
      </Button>
    </div>
  );
}

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
      title={title}
      className={cn(
        "inline-flex h-8 items-center justify-end font-mono text-meta tabular-nums text-subtle-foreground",
        className
      )}
    >
      {children}
    </span>
  );
}

export function SplitMeter({
  segments,
  target = 100,
  className,
}: {
  segments: { label: string; value: number }[];
  target?: number;
  className?: string;
}) {
  const total = segments.reduce(
    (sum, s) => sum + (Number.isFinite(s.value) ? s.value : 0),
    0
  );
  const ok = Math.abs(total - target) < 0.001;
  const over = total > target + 0.001;
  const scale = Math.max(total, target) || 1;

  return (
    <div className={cn("space-y-1.5", className)}>
      <div
        className="relative flex h-2 w-full gap-px overflow-hidden rounded-full border border-border bg-surface"
        role="img"
        aria-label={`Payment split: ${segments
          .map((s) => `${s.label || "unnamed"} ${s.value}%`)
          .join(", ")} — ${total}% of ${target}%`}
      >
        {segments.map((segment, i) => {
          const value = Number.isFinite(segment.value) ? segment.value : 0;
          if (value <= 0) return null;
          return (
            <span
              key={i}
              style={{ width: `${(value / scale) * 100}%` }}
              className={cn(
                "h-full transition-[width,background-color] duration-(--dur-state)",
                ok
                  ? "bg-brand"
                  : over
                    ? "bg-danger/75"
                    : "bg-brand/55",
                i % 2 === 1 && "brightness-125"
              )}
            />
          );
        })}
        {over && (
          <span
            aria-hidden
            style={{ insetInlineStart: `${(target / scale) * 100}%` }}
            className="absolute inset-y-0 w-px bg-foreground/70"
          />
        )}
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-0.5">
        {segments.map((segment, i) => (
          <span
            key={i}
            className="inline-flex items-baseline gap-1 text-meta text-subtle-foreground"
          >
            <span className="truncate">{segment.label || `Payment ${i + 1}`}</span>
            <span className="font-mono text-micro tabular-nums text-muted-foreground">
              {Number.isFinite(segment.value) ? segment.value : 0}%
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}