"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { markNotificationRead } from "@/app/(dashboard)/_actions/records";
import { cn } from "@/lib/utils";

/**
 * One notification row's hit area. Opening a notification is reading it, so a
 * click marks it read first and then goes to the record; a row with no record
 * behind it is still clickable, and only marks itself read.
 *
 * The read is awaited before navigating: firing it alongside a navigation lets
 * the router drop the revalidation, and the bell count would stay stale.
 * Modifier clicks (new tab) keep the browser's behaviour and mark read in the
 * background.
 */
export function NotificationLink({
  id,
  href,
  read,
  className,
  children,
}: {
  id: string;
  href: string | null;
  read: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [busy, startTransition] = React.useTransition();

  const markThen = (after?: () => void) =>
    startTransition(async () => {
      try {
        if (!read) await markNotificationRead(id);
        if (after) after();
        else router.refresh();
      } catch {
        toast.error("Could not mark the notification read");
        after?.();
      }
    });

  if (!href) {
    return (
      <button
        type="button"
        disabled={read || busy}
        onClick={() => markThen()}
        className={cn("text-start", !read && "cursor-pointer", className)}
      >
        {children}
      </button>
    );
  }

  return (
    <Link
      href={href}
      aria-busy={busy || undefined}
      onClick={(event) => {
        if (read) return;
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) {
          markThen();
          return;
        }
        event.preventDefault();
        markThen(() => router.push(href));
      }}
      className={className}
    >
      {children}
    </Link>
  );
}
