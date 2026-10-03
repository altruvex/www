"use client";

import { useRouter } from "next/navigation";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@repo/ui";

/**
 * The calendar's side panel. Open state lives in the URL (?meeting= / ?new=),
 * so the shell is mounted only while a param is present and closing is a
 * navigation back to `closeHref` — which keeps the month the operator was on.
 * Children are server-rendered (the audit trail is an async server component).
 */
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
  return (
    <Sheet open onOpenChange={(next) => !next && router.push(closeHref, { scroll: false })}>
      <SheetContent side="end" width="md">
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
          <SheetDescription>{description ?? "Meeting details"}</SheetDescription>
        </SheetHeader>
        <SheetBody className="space-y-4">{children}</SheetBody>
      </SheetContent>
    </Sheet>
  );
}
