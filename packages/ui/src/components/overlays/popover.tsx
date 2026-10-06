"use client";

import * as PopoverPrimitive from "@radix-ui/react-popover";
import * as React from "react";
import { cn } from "../../lib/utils";
import { menuSurface } from "./menu";

function Popover({
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Root>) {
  return <PopoverPrimitive.Root data-slot="popover" {...props} />;
}

function PopoverTrigger({
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Trigger>) {
  return <PopoverPrimitive.Trigger data-slot="popover-trigger" {...props} />;
}

const popoverMotion =
  "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 origin-(--radix-popover-content-transform-origin) outline-hidden";

// "panel" is the glass overlay for free content. "menu" is for a list of choices (a cmdk
// picker): it takes the one menu surface, so it matches DropdownMenu and Select exactly.
// The glass is left off there, because its `background` shorthand would fight bg-popover.
const popoverSurface = {
  panel: "liquid-glass text-popover-foreground w-72 rounded-overlay p-4",
  menu: menuSurface,
} as const;

function PopoverContent({
  className,
  align = "center",
  sideOffset = 4,
  surface = "panel",
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Content> & {
  surface?: keyof typeof popoverSurface;
}) {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        data-slot="popover-content"
        data-surface={surface}
        align={align}
        sideOffset={sideOffset}
        className={cn(popoverSurface[surface], popoverMotion, className)}
        {...props}
      />
    </PopoverPrimitive.Portal>
  );
}

export { Popover, PopoverContent, PopoverTrigger };