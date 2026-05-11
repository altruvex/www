"use client";

import { useSyncExternalStore } from "react";

export function useMediaQuery(query: string, fallback = false) {
  return useSyncExternalStore(
    (onChange) => {
      if (typeof window === "undefined") {
        return () => undefined;
      }

      const mediaQuery = window.matchMedia(query);
      mediaQuery.addEventListener("change", onChange);
      return () => mediaQuery.removeEventListener("change", onChange);
    },
    () =>
      typeof window === "undefined"
        ? fallback
        : window.matchMedia(query).matches,
    () => fallback,
  );
}
