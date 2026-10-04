"use client";

import { useTheme } from "next-themes";
import { useCallback } from "react";
import { crossfadeTheme, resolveThemeChoice } from "../utils/theme-switch";

export function useThemeSwitch(): (choice: string) => void {
  const { setTheme } = useTheme();
  return useCallback(
    (choice: string) => crossfadeTheme(resolveThemeChoice(choice), () => setTheme(choice)),
    [setTheme],
  );
}
