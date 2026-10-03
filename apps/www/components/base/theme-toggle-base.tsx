"use client";

import { motion, usePress, useThemeSwitch } from "@/lib/motion";
import { cn } from "@/lib/utils/utils";
import { Monitor, Moon, Sun } from "lucide-react";
import { useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";
import { SegmentedControl } from "./segmented-control";

type ThemeChoice = "light" | "dark" | "system";

function isThemeChoice(value: string | undefined): value is ThemeChoice {
  return value === "light" || value === "dark" || value === "system";
}

interface ThemeToggleProps {
  /**
   * `switch` — a pill switch whose thumb carries the sun or moon (the header bar).
   * `segmented` — light, dark or follow the system (the index panel, the drawer).
   */
  variant?: "switch" | "segmented";
  className?: string;
}

export function ThemeToggle({ variant = "switch", className }: ThemeToggleProps) {
  const t = useTranslations("nav");
  const { theme, resolvedTheme } = useTheme();
  const switchTheme = useThemeSwitch();
  // The theme is only known on the client; until then nothing may claim a
  // value, or the server HTML and the first client render disagree.
  const mounted = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false,
  );
  const pressRef = usePress<HTMLButtonElement>(motion.pressIcon());

  if (variant === "segmented") {
    return (
      <SegmentedControl
        label={t("theme")}
        value={mounted && isThemeChoice(theme) ? theme : undefined}
        onChange={switchTheme}
        disabled={!mounted}
        className={className}
        options={[
          { value: "light", label: t("themeLight"), icon: <Sun aria-hidden /> },
          { value: "dark", label: t("themeDark"), icon: <Moon aria-hidden /> },
          {
            value: "system",
            label: t("themeSystem"),
            icon: <Monitor aria-hidden />,
          },
        ]}
      />
    );
  }

  const ready = mounted && !!resolvedTheme;
  const isDark = resolvedTheme === "dark";

  // Both glyphs stay mounted inside the thumb and cross over as it travels —
  // the thumb's side and its glyph say the same thing twice, on purpose.
  const glyph =
    "absolute size-3.5 transition-[opacity,transform] duration-(--motion-drawer) ease-smooth";

  return (
    <button
      ref={pressRef}
      type="button"
      role="switch"
      aria-checked={ready ? isDark : undefined}
      onClick={ready ? () => switchTheme(isDark ? "light" : "dark") : undefined}
      disabled={!ready}
      aria-label={t("darkMode")}
      title={ready ? (isDark ? t("switchToLight") : t("switchToDark")) : undefined}
      className={cn(
        "group/switch flex h-11 items-center justify-center px-1 rounded-ctl-lg",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        className,
      )}
    >
      <span
        aria-hidden
        className="relative flex h-7 w-13 items-center rounded-full border border-foreground/45 bg-foreground/[0.06] transition-colors duration-(--motion-instant) ease-smooth group-hover/switch:border-foreground/70"
      >
        <span
          className={cn(
            "absolute start-0.5 flex size-5.5 items-center justify-center rounded-full bg-card text-foreground shadow-card transition-transform duration-(--motion-drawer) ease-smooth dark:bg-foreground/15 dark:shadow-none",
            ready && isDark ? "translate-x-6 rtl:-translate-x-6" : "translate-x-0",
          )}
        >
          <Sun
            className={cn(
              glyph,
              ready && !isDark
                ? "rotate-0 scale-100 opacity-100"
                : "-rotate-90 scale-75 opacity-0",
            )}
          />
          <Moon
            className={cn(
              glyph,
              ready && isDark
                ? "rotate-0 scale-100 opacity-100"
                : "rotate-90 scale-75 opacity-0",
            )}
          />
        </span>
      </span>
    </button>
  );
}
