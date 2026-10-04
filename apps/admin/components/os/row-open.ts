"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { INSPECT_PARAM } from "@/components/os/inspect-sheet";

const IGNORE =
  "a, button, input, select, textarea, label, [role=checkbox], [role=menuitem], [role=menu], [data-row-ignore]";

export function keepsScroll(href: string): boolean {
  const query = href.split("#")[0]!.split("?")[1];
  return query ? new URLSearchParams(query).has(INSPECT_PARAM) : false;
}

export function useRowOpen(): (href: string | undefined) => React.MouseEventHandler | undefined {
  const router = useRouter();
  return React.useCallback(
    (href) =>
      href
        ? (event) => {
            if ((event.target as Element).closest(IGNORE)) return;
            if (window.getSelection()?.toString()) return;
            if (event.metaKey || event.ctrlKey) {
              window.open(href, "_blank", "noopener");
              return;
            }
            router.push(href, { scroll: !keepsScroll(href) });
          }
        : undefined,
    [router],
  );
}
