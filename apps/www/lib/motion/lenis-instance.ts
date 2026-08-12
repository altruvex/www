import type Lenis from "lenis";

/**
 * Module-level handle on the live Lenis instance.
 *
 * Lenis drives the page from its own rAF loop, so `body { overflow: hidden }`
 * does NOT stop it — anything that locks scroll (drawer, command palette) has
 * to tell Lenis to stand down too. This registry exists as its own tiny module
 * so `use-lock-body-scroll` can reach the instance without statically importing
 * `smooth-scroll.tsx` and undoing its `next/dynamic` code split.
 */
let instance: Lenis | null = null;

export function setLenis(next: Lenis | null): void {
  instance = next;
}

export function getLenis(): Lenis | null {
  return instance;
}
