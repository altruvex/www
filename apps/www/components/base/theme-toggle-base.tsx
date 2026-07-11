"use client";

import { motion, usePress } from "@/lib/motion";
import { cn } from "@/lib/utils/utils";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";

export function ThemeToggle() {
  const { setTheme, resolvedTheme } = useTheme();
  const mounted = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false,
  );

  // Tactile press: the toggle is a physical switch — the press confirms the
  // input registered before the theme visibly flips. Single button element
  // (no placeholder swap) so the hook's listeners survive the mounted flip.
  const pressRef = usePress<HTMLButtonElement>(motion.pressIcon());

  const ready = mounted && !!resolvedTheme;
  const isLight = resolvedTheme === "light";

  const toggleTheme = () => {
    setTheme(isLight ? "dark" : "light");
  };

  return (
    <button
      ref={pressRef}
      type="button"
      onClick={ready ? toggleTheme : undefined}
      disabled={!ready}
      className={cn(
        "group flex h-11 w-11 items-center justify-center rounded-lg text-foreground transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        ready && "transition-all hover:text-foreground/80",
      )}
      aria-label={
        ready
          ? `Switch to ${isLight ? "dark" : "light"} mode`
          : "Toggle theme"
      }
    >
      {ready && isLight ? (
        <Moon className="h-5 w-5" />
      ) : (
        <Sun className="h-5 w-5" />
      )}
      <span className="sr-only">Toggle theme</span>
    </button>
  );
}
