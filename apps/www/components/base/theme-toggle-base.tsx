"use client";

import { cn } from "@/lib/utils";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";

interface ThemeToggleProps {
  isInverted?: boolean;
  isDark?: boolean;
}

export function ThemeToggle({ isInverted = false, isDark = false }: ThemeToggleProps) {
  const { setTheme, resolvedTheme } = useTheme();
  const mounted = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false,
  );

  const toggleTheme = () => {
    if (resolvedTheme === "light") {
      setTheme("dark");
    } else {
      setTheme("light");
    }
  };

  const iconColor = isInverted && isDark ? "text-gray-900" : "text-foreground";
  const buttonHoverColor = isInverted && isDark ? "hover:text-gray-900/80" : "hover:text-foreground/80";

  if (!mounted || !resolvedTheme) {
    return (
      <button
        type="button"
        className={cn("group flex h-11 w-11 items-center justify-center rounded-lg transition-all duration-200", iconColor)}
        disabled
        aria-label="Toggle theme"
      >
        <Sun className="h-5 w-5" />
        <span className="sr-only">Toggle theme</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={cn("group flex h-11 w-11 items-center justify-center transition-all duration-200", iconColor, buttonHoverColor)}
      aria-label={`Switch to ${resolvedTheme === "light" ? "dark" : "light"} mode`}
    >
      {resolvedTheme === "light" ? (
        <Moon className="h-5 w-5" />
      ) : (
        <Sun className="h-5 w-5" />
      )}
      <span className="sr-only">Toggle theme</span>
    </button>
  );
}
