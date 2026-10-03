"use client";

import { useTheme } from "next-themes";
import { useCallback } from "react";
import { crossfadeTheme, resolveThemeChoice } from "../utils/theme-switch";

/**
 * `setTheme` with the house crossfade. Every control that changes the theme
 * (header toggle, drawer segmented control, command palette) goes through
 * this, so a theme change looks the same wherever it starts.
 */
export function useThemeSwitch(): (choice: string) => void {
  const { setTheme } = useTheme();
  return useCallback(
    (choice: string) => crossfadeTheme(resolveThemeChoice(choice), () => setTheme(choice)),
    [setTheme],
  );
}
