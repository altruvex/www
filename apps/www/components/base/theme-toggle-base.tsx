"use client";

import { motion, usePress } from "@/lib/motion";
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
   * `icon` — flips between light and dark (the header bar).
   * `segmented` — light, dark or follow the system (the drawer).
   */
  variant?: "icon" | "segmented";
  className?: string;
}

export function ThemeToggle({ variant = "icon", className }: ThemeToggleProps) {
  const t = useTranslations("nav");
  const { theme, setTheme, resolvedTheme } = useTheme();
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
        onChange={setTheme}
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
  const label = isDark ? t("switchToLight") : t("switchToDark");

  // Both glyphs stay mounted and cross over — the icon shows where a press
  // goes, so the swap itself is the confirmation that it went there.
  const glyph =
    "absolute size-4.5 transition-[opacity,transform] duration-(--motion-drawer) ease-smooth";

  return (
    <button
      ref={pressRef}
      type="button"
      onClick={ready ? () => setTheme(isDark ? "light" : "dark") : undefined}
      disabled={!ready}
      aria-label={ready ? label : t("theme")}
      title={ready ? label : undefined}
      className={cn(
        "relative flex size-11 items-center justify-center rounded-ctl-lg text-foreground/70 transition-colors duration-(--motion-instant) ease-smooth hover:text-foreground",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        className,
      )}
    >
      <Moon
        aria-hidden
        className={cn(
          glyph,
          ready && !isDark
            ? "rotate-0 scale-100 opacity-100"
            : "-rotate-90 scale-75 opacity-0",
        )}
      />
      <Sun
        aria-hidden
        className={cn(
          glyph,
          ready && isDark
            ? "rotate-0 scale-100 opacity-100"
            : "rotate-90 scale-75 opacity-0",
        )}
      />
    </button>
  );
}
