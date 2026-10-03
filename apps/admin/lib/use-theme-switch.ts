"use client";

import { crossfadeTheme, resolveThemeChoice } from "@repo/ui/theme-switch";
import { useTheme } from "next-themes";
import { useCallback } from "react";

/**
 * `setTheme` with the shared crossfade (`@repo/ui/theme-switch`, timing
 * THEME_CROSSFADE). Every admin control that changes the theme goes through
 * this.
 */
export function useThemeSwitch(): (choice: string) => void {
  const { setTheme } = useTheme();
  return useCallback(
    (choice: string) => crossfadeTheme(resolveThemeChoice(choice), () => setTheme(choice)),
    [setTheme],
  );
}
