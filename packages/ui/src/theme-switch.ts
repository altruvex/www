export type ResolvedTheme = "light" | "dark";

export interface CrossfadeTiming {
  duration: number;
  easing: string;
}

export const THEME_CROSSFADE: CrossfadeTiming = {
  duration: 0.4,
  easing: "cubic-bezier(0.42, 0, 0.58, 1)",
};

const isDark = (root: HTMLElement) => root.classList.contains("dark");

export function resolveThemeChoice(choice: string): ResolvedTheme {
  if (choice === "light" || choice === "dark") return choice;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

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
