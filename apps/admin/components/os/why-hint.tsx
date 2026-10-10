"use client";

import * as React from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@repo/ui";

/**
 * A chip that explains itself: the engine's reasons behind a priority, health
 * or SLA badge. The chip is a button, so the reasons open by click, tap,
 * Enter or Space, and also on mouse hover; Escape or a click outside closes
 * them. Every reason is listed — nothing hides behind "more".
 */
export function WhyHint({
  title,
  why,
  children,
}: {
  /** What the chip says, e.g. "High priority"; also the popover's name. */
  title: string;
  why: string[];
  children: React.ReactNode;
}) {
  const [hovered, setHovered] = React.useState(false);
  const [pinned, setPinned] = React.useState(false);
  if (why.length === 0) return <>{children}</>;

  return (
    <Popover
      open={hovered || pinned}
      onOpenChange={(open) => {
        // Radix asks to close on Escape and outside clicks; opening comes from the handlers below.
        if (!open) {
          setHovered(false);
          setPinned(false);
        }
      }}
    >
      <PopoverTrigger
        type="button"
        aria-label={`${title}: show why`}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setPinned((p) => !p);
          setHovered(false);
        }}
        onPointerEnter={(event) => {
          if (event.pointerType === "mouse") setHovered(true);
        }}
        onPointerLeave={(event) => {
          if (event.pointerType === "mouse") setHovered(false);
        }}
        className="inline-flex cursor-help rounded-sm outline-none focus-visible:outline-2 focus-visible:outline-ring"
      >
        {children}
      </PopoverTrigger>
      <PopoverContent
        side="top"
        aria-label={title}
        // A hover preview must not steal focus from the row the pointer is crossing.
        onOpenAutoFocus={(event) => {
          if (!pinned) event.preventDefault();
        }}
        className="w-auto max-w-64 p-3 text-meta"
      >
        <p className="font-medium">{title}</p>
        <ul className="mt-1 space-y-0.5 text-muted-foreground">
          {why.map((reason) => (
            <li key={reason}>{reason}</li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
