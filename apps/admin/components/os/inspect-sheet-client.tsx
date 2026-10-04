"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArrowUpRight } from "lucide-react";
import {
  Button,
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@repo/ui";
import { cn } from "@/lib/utils";

const INSPECT_PARAM = "inspect";
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

export interface InspectSheetProps {
  open: boolean;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  status?: React.ReactNode;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  fullHref?: string;
  width?: "sm" | "md" | "lg";
}

export function InspectSheet({
  open,
  title,
  subtitle,
  status,
  children,
  footer,
  fullHref,
  width = "md",
}: InspectSheetProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const wide = useWide();

  const inspectId = searchParams.get(INSPECT_PARAM);
  const [dismissed, setDismissed] = React.useState(false);
  const [lastId, setLastId] = React.useState(inspectId);
  if (inspectId !== lastId) {
    setLastId(inspectId);
    setDismissed(false);
  }
  const isOpen = open && !dismissed;

  const close = React.useCallback(() => {
    setDismissed(true);
    const next = new URLSearchParams(searchParams.toString());
    next.delete(INSPECT_PARAM);
    const query = next.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }, [pathname, router, searchParams]);

  return (
    <Sheet open={isOpen} onOpenChange={(next) => !next && close()}>
      <SheetContent
        side={wide ? "end" : "bottom"}
        width={width}
        className={cn(!wide && "pb-[env(safe-area-inset-bottom)]")}
      >
        <SheetHeader className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <SheetTitle className="min-w-0 truncate">{title}</SheetTitle>
              {status}
            </div>
            {subtitle ? (
              <SheetDescription className="truncate">{subtitle}</SheetDescription>
            ) : (
              <SheetDescription className="sr-only">Record details</SheetDescription>
            )}
          </div>
          {fullHref && (
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="-my-0.5 shrink-0 text-muted-foreground"
            >
              <Link href={fullHref}>
                Open full page
                <ArrowUpRight className="size-3.5" aria-hidden />
              </Link>
            </Button>
          )}
        </SheetHeader>
        <SheetBody className="min-h-0 space-y-4">{children}</SheetBody>
        {footer && <SheetFooter className="flex-wrap">{footer}</SheetFooter>}
      </SheetContent>
    </Sheet>
  );
}
