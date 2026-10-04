"use client";

import { crossfadeTheme, resolveThemeChoice } from "@repo/ui/theme-switch";
import { useTheme } from "next-themes";
import { useCallback } from "react";

export function useThemeSwitch(): (choice: string) => void {
  const { setTheme } = useTheme();
  return useCallback(
    (choice: string) => crossfadeTheme(resolveThemeChoice(choice), () => setTheme(choice)),
    [setTheme],
  );
}
