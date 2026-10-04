"use client";

import * as React from "react";
import { Pencil } from "lucide-react";
import {
  Button,
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@repo/ui";
import { cn } from "@/lib/utils";
import { EditClientForm } from "./edit/edit-client-form";

const WIDE_QUERY = "(min-width: 768px)";

function subscribeWide(onChange: () => void) {
  const query = window.matchMedia(WIDE_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

function useWide() {
  return React.useSyncExternalStore(
    subscribeWide,
    () => window.matchMedia(WIDE_QUERY).matches,
    () => true,
  );
}

export type EditClientInitial = React.ComponentProps<
  typeof EditClientForm
>["initial"];

export function EditClientSheet({
  clientId,
  clientLabel,
  initial,
}: {
  clientId: string;
  clientLabel: string;
  initial: EditClientInitial;
}) {
  const [open, setOpen] = React.useState(false);
  const wide = useWide();

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <Button
        variant="outline"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
      >
        <Pencil className="size-3.5" aria-hidden />
        Edit
      </Button>
      <SheetContent
        side={wide ? "end" : "bottom"}
        width="md"
        className={cn(!wide && "pb-[env(safe-area-inset-bottom)]")}
      >
        <SheetHeader>
          <SheetTitle className="truncate">Edit {clientLabel}</SheetTitle>
          <SheetDescription>
            Changes are recorded in the audit trail.
          </SheetDescription>
        </SheetHeader>
        <SheetBody className="min-h-0">
          {open && (
            <EditClientForm
              clientId={clientId}
              initial={initial}
              onDone={() => setOpen(false)}
            />
          )}
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}
