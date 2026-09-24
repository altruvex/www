"use client";

import { useEffect } from "react";

/**
 * Cross-fades every color when the theme flips, instead of snapping.
 *
 * next-themes toggles `.dark` on <html>. The observer adds `.theme-fade` in
 * the same task, before the browser recalculates style, so the color change
 * and the transition rule land in one frame and every surface, border and
 * glyph fades together over --duration-theme (tokens.css). The class comes
 * off once the fade has run, so no ordinary interaction inherits the slow
 * timing. Reduced motion is honored in the CSS, not here.
 *
 * Keep next-themes' `disableTransitionOnChange` off: it injects a
 * `transition: none !important` sheet that would cancel this fade.
 */
export function ThemeTransition() {
  useEffect(() => {
    const root = document.documentElement;
    let wasDark = root.classList.contains("dark");
    let timer: number | undefined;
    // The minifier may serialize 400ms as ".4s", so read the unit.
    const raw = getComputedStyle(root).getPropertyValue("--duration-theme").trim();
    const duration = (Number.parseFloat(raw) || 0.4) * (raw.endsWith("ms") ? 1 : 1000);

    const observer = new MutationObserver(() => {
      const isDark = root.classList.contains("dark");
      if (isDark === wasDark) return;
      wasDark = isDark;
      root.classList.add("theme-fade");
      window.clearTimeout(timer);
      timer = window.setTimeout(() => root.classList.remove("theme-fade"), duration + 50);
    });

    observer.observe(root, { attributes: true, attributeFilter: ["class"] });
    return () => {
      observer.disconnect();
      window.clearTimeout(timer);
      root.classList.remove("theme-fade");
    };
  }, []);

  return null;
}
