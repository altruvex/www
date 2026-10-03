export type ResolvedTheme = "light" | "dark";

export interface CrossfadeTiming {
  /** Seconds — the same unit as every MOTION duration. */
  duration: number;
  /** CSS easing string. */
  easing: string;
}

/**
 * The one definition of the theme crossfade, for both apps: admin uses it as
 * is, www exposes it as MOTION.theme. Core Animation's easeInEaseOut —
 * symmetric and soft, so neither theme snaps in or lingers.
 */
export const THEME_CROSSFADE: CrossfadeTiming = {
  duration: 0.4,
  easing: "cubic-bezier(0.42, 0, 0.58, 1)",
};

const isDark = (root: HTMLElement) => root.classList.contains("dark");

/** The theme a choice lands on — `system` resolves through the OS setting. */
export function resolveThemeChoice(choice: string): ResolvedTheme {
  if (choice === "light" || choice === "dark") return choice;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

/**
 * Theme switch as one compositor crossfade, shared by www and admin.
 *
 * The browser photographs the page, `apply` flips the theme underneath in a
 * single frame, and the new page fades in over the photograph on the GPU.
 * Nothing transitions per element, so every surface, gradient, image and
 * glyph changes on the same curve at the same moment — no element early, no
 * gradient snapping, no main-thread paint storm.
 *
 * The new snapshot fades in over an opaque old one (the `::view-transition`
 * rule in tokens.css turns off the browser's plus-lighter blend), so the page
 * never dips in brightness halfway through.
 *
 * Reduced motion, no View Transitions support, or a choice that lands on the
 * theme already showing: `apply` runs directly and the swap is instant.
 */
export function crossfadeTheme(
  target: ResolvedTheme,
  apply: () => void,
  timing: CrossfadeTiming = THEME_CROSSFADE,
): void {
  const root = document.documentElement;
  const current: ResolvedTheme = isDark(root) ? "dark" : "light";
  if (
    target === current ||
    window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
    typeof document.startViewTransition !== "function"
  ) {
    apply();
    return;
  }

  const transition = document.startViewTransition(
    () =>
      // next-themes writes the class in an effect, not inside setTheme, so
      // the update is done when <html> carries the target — not on return.
      new Promise<void>((resolve) => {
        const landed = () => isDark(root) === (target === "dark");
        const finish = () => {
          observer.disconnect();
          window.clearTimeout(timer);
          resolve();
        };
        const observer = new MutationObserver(() => {
          if (landed()) finish();
        });
        observer.observe(root, { attributes: true, attributeFilter: ["class"] });
        // Safety net only: never hold the frozen frame longer than the fade.
        const timer = window.setTimeout(finish, timing.duration * 1000);
        apply();
        if (landed()) finish();
      }),
  );

  transition.ready
    .then(() => {
      root.animate(
        { opacity: [0, 1] },
        {
          duration: timing.duration * 1000,
          easing: timing.easing,
          pseudoElement: "::view-transition-new(root)",
        },
      );
    })
    .catch(() => undefined);
}
