"use client";

import { useEffect } from "react";

export function ThemeScript() {
  useEffect(() => {
    const applyTheme = () => {
      try {
        const theme = localStorage.getItem("theme-preference");
        const prefersDark = window.matchMedia(
          "(prefers-color-scheme: dark)",
        ).matches;
        const shouldBeDark = theme === "dark" || (!theme && prefersDark);

        document.documentElement.classList.toggle("dark", shouldBeDark);
      } catch {}
    };

    applyTheme();
  }, []);

  return null;
}
