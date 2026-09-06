"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "../../lib/utils";

/**
 * The side panel. This app's default for contextual editing.
 *
 * Design law: a modal dialog steals the whole screen to ask one question and
 * hides the record you are editing. A side panel keeps the list visible behind
 * it, so an operator can see the row change. Modals here are reserved for
 * genuinely destructive confirmation (see alert-dialog).
 */
export const Sheet = DialogPrimitive.Root;
export const SheetTrigger = DialogPrimitive.Trigger;
export const SheetClose = DialogPrimitive.Close;

export function SheetContent({
  className,
  children,
  side = "end",
  width = "md",
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & {
  side?: "end" | "bottom";
  width?: "sm" | "md" | "lg";
}) {
  const widths = { sm: "sm:max-w-sm", md: "sm:max-w-md", lg: "sm:max-w-2xl" };
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay
        className={cn(
          "fixed inset-0 z-50 bg-n-8/25 backdrop-blur-[1px]",
          "data-[state=open]:animate-in data-[state=open]:fade-in-0",
          "data-[state=closed]:animate-out data-[state=closed]:fade-out-0",
        )}
      />
      <DialogPrimitive.Content
        className={cn(
          "fixed z-50 flex flex-col bg-card shadow-[var(--elev-2)]",
          "focus:outline-none",
          side === "end"
            ? [
                "inset-y-0 end-0 w-full border-s border-border",
                widths[width],
                "data-[state=open]:animate-in data-[state=open]:slide-in-from-right",
                "data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right",
              ]
            : [
                "inset-x-0 bottom-0 max-h-[85dvh] rounded-t-xl border-t border-border",
                "data-[state=open]:animate-in data-[state=open]:slide-in-from-bottom",
                "data-[state=closed]:animate-out data-[state=closed]:slide-out-to-bottom",
              ],
          "duration-[var(--dur-panel)]",
          className,
        )}
        {...props}
      >
        {children}
        <DialogPrimitive.Close
          className={cn(
            "absolute end-3 top-3 rounded-sm p-1 text-subtle-foreground",
            "transition-colors duration-[var(--dur-state)] hover:bg-surface-2 hover:text-foreground",
          )}
        >
          <X className="size-3.5" />
          <span className="sr-only">Close</span>
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

export function SheetHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("shrink-0 border-b border-border px-4 py-3 pe-10", className)}
      {...props}
    />
  );
}

export function SheetTitle({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return <DialogPrimitive.Title className={cn("text-md font-semibold", className)} {...props} />;
}

export function SheetDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      className={cn("mt-0.5 text-meta text-muted-foreground", className)}
      {...props}
    />
  );
}

export function SheetBody({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("flex-1 overflow-y-auto p-4", className)} {...props} />;
}

export function SheetFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-end gap-2 border-t border-border bg-surface px-4 py-3",
        className,
      )}
      {...props}
    />
  );
}
