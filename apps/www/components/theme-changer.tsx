"use client";

import { ThemeToggle } from "./base/theme-toggle-base";

interface ThemeChangerProps {
  isInverted?: boolean;
  isDark?: boolean;
}

export function ThemeChanger({ isInverted = false, isDark = false }: ThemeChangerProps) {
  return <ThemeToggle isInverted={isInverted} isDark={isDark} />;
}
