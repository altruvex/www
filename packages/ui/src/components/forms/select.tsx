"use client";

import * as SelectPrimitive from "@radix-ui/react-select";
import { Check, ChevronDown, ChevronUp } from "lucide-react";
import * as React from "react";
import { useDirection } from "../../lib/direction";
import { cn } from "../../lib/utils";
import {
  menuIndicator,
  menuItem,
  menuItemIndented,
  menuLabel,
  menuSeparator,
  menuSurface,
} from "../overlays/menu";
import type { ControlVariant } from "./input";

export function Select({ dir, ...props }: React.ComponentProps<typeof SelectPrimitive.Root>) {
  return <SelectPrimitive.Root dir={useDirection(dir)} {...props} />;
}
export const SelectGroup = SelectPrimitive.Group;
export function SelectValue(props: React.ComponentProps<typeof SelectPrimitive.Value>) {
  return <SelectPrimitive.Value data-slot="select-value" {...props} />;
}

const triggerVariants: Record<ControlVariant, string> = {
  box: cn(
    // A pill, as the box Input it sits beside in every tool form.
    "rounded-full border border-border-subtle bg-input px-3 text-md",
    "data-[placeholder]:text-subtle-foreground",
    "transition-colors duration-[var(--dur-state)]",
    "hover:border-foreground/45 focus-visible:border-ring",
    "disabled:opacity-50 aria-invalid:border-danger",
    "h-[var(--control-h)] data-[size=sm]:h-[var(--control-h-sm)] data-[size=sm]:text-base",
  ),
  // The site's underline, as on Input's line variant. A fixed height, not a minimum, so an
  // inline trigger inside a sentence can still set its own.
  line: cn(
    "h-11 rounded-none border-b border-foreground/55 bg-transparent px-0 text-base",
    "data-[placeholder]:text-muted-foreground",
    "transition-[color,border-color,box-shadow] duration-(--duration-instant) ease-(--ease-default)",
    "enabled:hover:border-foreground/80 focus-visible:border-ring focus-visible:shadow-[inset_0_-1px_0_0_var(--color-ring)]",
    "aria-invalid:border-destructive",
    "disabled:border-dashed disabled:border-foreground/30 disabled:text-muted-foreground",
  ),
};

export function SelectTrigger({
  className,
  size = "default",
  variant = "box",
  children,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Trigger> & {
  size?: "sm" | "default";
  variant?: ControlVariant;
}) {
  return (
    <SelectPrimitive.Trigger
      data-slot="select-trigger"
      data-size={size}
      data-variant={variant}
      className={cn(
        "flex w-fit items-center justify-between gap-2 text-foreground whitespace-nowrap outline-none",
        "disabled:cursor-not-allowed",
        triggerVariants[variant],
        "*:data-[slot=select-value]:line-clamp-1 *:data-[slot=select-value]:min-w-0 *:data-[slot=select-value]:flex *:data-[slot=select-value]:items-center *:data-[slot=select-value]:gap-2",
        "[&_svg]:pointer-events-none [&_svg]:shrink-0",
        className,
      )}
      {...props}
    >
      {children}
      <SelectPrimitive.Icon asChild>
        <ChevronDown className={cn("text-subtle-foreground", variant === "box" ? "size-3.5" : "size-4")} />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  );
}

export function SelectContent({
  className,
  children,
  position = "popper",
  sideOffset = 4,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Content>) {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content
        data-slot="select-content"
        position={position}
        sideOffset={sideOffset}
        className={cn(
          menuSurface,
          "relative max-h-(--radix-select-content-available-height) overflow-y-auto origin-(--radix-select-content-transform-origin)",
          position === "popper" && "min-w-[var(--radix-select-trigger-width)]",
          className,
        )}
        {...props}
      >
        <SelectScrollUpButton />
        <SelectPrimitive.Viewport className="scroll-my-1">{children}</SelectPrimitive.Viewport>
        <SelectScrollDownButton />
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  );
}

export function SelectItem({
  className,
  children,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Item>) {
  return (
    <SelectPrimitive.Item
      data-slot="select-item"
      className={cn(menuItem, menuItemIndented, "w-full", className)}
      {...props}
    >
      <span className={menuIndicator}>
        <SelectPrimitive.ItemIndicator>
          <Check className="size-3.5" />
        </SelectPrimitive.ItemIndicator>
      </span>
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
    </SelectPrimitive.Item>
  );
}

export function SelectLabel({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Label>) {
  return <SelectPrimitive.Label data-slot="select-label" className={cn(menuLabel, className)} {...props} />;
}

export function SelectSeparator({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Separator>) {
  return (
    <SelectPrimitive.Separator
      data-slot="select-separator"
      className={cn(menuSeparator, "pointer-events-none", className)}
      {...props}
    />
  );
}

export function SelectScrollUpButton({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.ScrollUpButton>) {
  return (
    <SelectPrimitive.ScrollUpButton
      className={cn("flex cursor-default items-center justify-center py-1 text-subtle-foreground", className)}
      {...props}
    >
      <ChevronUp className="size-3.5" />
    </SelectPrimitive.ScrollUpButton>
  );
}

export function SelectScrollDownButton({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.ScrollDownButton>) {
  return (
    <SelectPrimitive.ScrollDownButton
      className={cn("flex cursor-default items-center justify-center py-1 text-subtle-foreground", className)}
      {...props}
    >
      <ChevronDown className="size-3.5" />
    </SelectPrimitive.ScrollDownButton>
  );
}