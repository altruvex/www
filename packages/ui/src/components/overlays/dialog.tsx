"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import * as React from "react";
import { cn } from "../../lib/utils";

// The one modal surface for both apps. Radix does the focus trap, scroll lock, Escape,
// outside dismissal and the aria wiring; a redesign of the scrim or the card is an edit here.
export const Dialog = DialogPrimitive.Root;
export const DialogClose = DialogPrimitive.Close;
export const DialogTitle = DialogPrimitive.Title;
export const DialogDescription = DialogPrimitive.Description;

// "panel" is the tool dialect: a solid popover card on a neutral scrim, with the same fade +
// zoom as AlertDialog and Sheet. "glass" is the site dialect: clear glass on a page-tone scrim.
// The glass card brings no motion of its own, because www animates its entrances and exits
// with lib/motion; its scrim fades in on --motion-drawer, the lib/motion token in CSS.
const dialogSurface = {
  panel: {
    overlay:
      "bg-n-8/25 data-[state=open]:animate-in data-[state=open]:fade-in-0 " +
      "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 duration-[var(--dur-panel)]",
    content:
      "rounded-overlay border border-border-subtle bg-popover text-popover-foreground shadow-[var(--elev-2)] " +
      "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 " +
      "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 duration-[var(--dur-panel)]",
  },
  glass: {
    overlay: "bg-background/70 data-[state=open]:animate-in data-[state=open]:fade-in-0 duration-(--motion-drawer)",
    content: "rounded-overlay liquid-glass-clear",
  },
} as const;

// Where the card sits. "top" anchors it near the top edge (a command palette; the caller sets
// the offset). "sheet" docks it to the bottom on phones and centres it from sm.
const dialogPlacement = {
  center: "items-center p-4",
  top: "items-start px-4",
  sheet: "items-end p-4 sm:items-center",
} as const;

export function DialogContent({
  className,
  surface = "panel",
  placement = "center",
  overlayRef,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & {
  surface?: keyof typeof dialogSurface;
  placement?: keyof typeof dialogPlacement;
  /** For a caller that animates the scrim itself (www's exit tweens). */
  overlayRef?: React.Ref<HTMLDivElement>;
}) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay
        ref={overlayRef}
        data-slot="dialog-overlay"
        className={cn("fixed inset-0 z-50", dialogSurface[surface].overlay)}
      />
      {/* The frame only positions; clicks on it fall through to the overlay, which dismisses. */}
      <div
        className={cn(
          "pointer-events-none fixed inset-0 z-50 flex justify-center",
          dialogPlacement[placement],
        )}
      >
        <DialogPrimitive.Content
          data-slot="dialog-content"
          data-surface={surface}
          className={cn(
            "pointer-events-auto relative w-full overflow-hidden focus:outline-none",
            dialogSurface[surface].content,
            className,
          )}
          {...props}
        />
      </div>
    </DialogPrimitive.Portal>
  );
}
