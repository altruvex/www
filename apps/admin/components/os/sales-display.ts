import type { Tone } from "@/lib/status";

/**
 * Words and tones for the engine's outputs on /leads, /pipeline, home and the
 * client page. lib/status.ts has no registry for engine priority or health
 * (they are derived, never stored), so they live here; every chip pairs the
 * word with the colour.
 */

export const PRIORITY_DISPLAY: Record<string, { label: string; tone: Tone; rank: number }> = {
  HIGH: { label: "High", tone: "danger", rank: 0 },
  MEDIUM: { label: "Medium", tone: "warning", rank: 1 },
  LOW: { label: "Low", tone: "neutral", rank: 2 },
};

export const HEALTH_DISPLAY: Record<string, { label: string; tone: Tone }> = {
  HEALTHY: { label: "Healthy", tone: "success" },
  NEEDS_ATTENTION: { label: "Needs attention", tone: "warning" },
  AT_RISK: { label: "At risk", tone: "danger" },
  STALLED: { label: "Stalled", tone: "danger" },
  CLOSED: { label: "Closed", tone: "neutral" },
};

/** Only the states that ask something of the operator are shown. */
export const SLA_DISPLAY: Record<string, { label: string; tone: Tone }> = {
  WITHIN: { label: "Reply due", tone: "info" },
  APPROACHING: { label: "Reply soon", tone: "warning" },
  OVERDUE: { label: "Reply overdue", tone: "danger" },
};

/** Why lists show three reasons; the rest sit behind "more". */
export const WHY_VISIBLE = 3;
