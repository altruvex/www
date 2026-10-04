"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@repo/ui";
import { cn } from "@/lib/utils";

const WIDE_QUERY = "(min-width: 768px)";

function subscribeWide(onChange: () => void) {
  const query = window.matchMedia(WIDE_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

export function useSheetSide(): { side: "end" | "bottom"; className?: string } {
  const wide = React.useSyncExternalStore(
    subscribeWide,
    () => window.matchMedia(WIDE_QUERY).matches,
    () => true,
  );
  return wide
    ? { side: "end" }
    : { side: "bottom", className: cn("pb-[env(safe-area-inset-bottom)]") };
}

export function SheetShell({
  title,
  description,
  closeHref,
  children,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  closeHref: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { side, className } = useSheetSide();
  return (
    <Sheet open onOpenChange={(next) => !next && router.push(closeHref, { scroll: false })}>
      <SheetContent side={side} width="md" className={className}>
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
          <SheetDescription>{description ?? "Meeting details"}</SheetDescription>
        </SheetHeader>
        <SheetBody className="space-y-4 overflow-y-auto">{children}</SheetBody>
      </SheetContent>
    </Sheet>
  );
}
