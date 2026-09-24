/**
 * Pure math for scroll-owned motion that React renders from state (the
 * /services index fold and chapter curtain), so every such sequence eases the
 * same way. No DOM, no GSAP — safe to call during render.
 */

/** Hermite ease 0 → 1 with a flat start and end; input is clamped. */
export function smoothstep(t: number): number {
  const x = Math.min(1, Math.max(0, t));
  return x * x * (3 - 2 * x);
}

/** Where `value` sits inside the window [start, start + length], clamped 0–1. */
export function progressIn(value: number, start: number, length: number): number {
  return length <= 0 ? (value >= start ? 1 : 0) : Math.min(1, Math.max(0, (value - start) / length));
}

/**
 * A panel that rises into place, holds, and leaves upward, as a translateY
 * percentage for progress `c` through its window — or `null` outside it, so
 * the caller can hide the panel. `rise` and `leave` are fractions of the
 * window; the rest is the hold.
 */
export function riseHoldLeave(
  c: number,
  { rise = 0.25, leave = 0.25 }: { rise?: number; leave?: number } = {},
): number | null {
  if (c <= 0 || c >= 1) return null;
  if (c < rise) return (1 - smoothstep(c / rise)) * 100;
  if (c < 1 - leave) return 0;
  return -smoothstep((c - (1 - leave)) / leave) * 100;
}
