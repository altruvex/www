import { cn } from "../../lib/utils";

/**
 * The one loading indicator in the system: bars fading around a circle.
 *
 * Sizes are named rather than numeric so a call site declares its context
 * instead of a magic number — that is what keeps two screens from drifting:
 *
 *   xs (12) — dense meta rows, inline with `text-micro`
 *   sm (14) — admin controls; matches a `size-3.5` lucide sibling
 *   md (16) — default button/toast scale; matches `size-4`
 *   lg (24) — a route or panel that is loading as a whole
 *   xl (32) — full-page, nothing else on screen
 *
 * Only the box changes between them. Bar count, proportions and timing are
 * fixed, so every size is the same mark — the 16px one, scaled.
 *
 * The ring is drawn at 97% of the box, so a 16px LoadingIcon reads at the same
 * size as a 16px lucide glyph beside it and the two line up when they
 * alternate in the same slot.
 */
const SIZES = { xs: 12, sm: 14, md: 16, lg: 24, xl: 32 } as const;

export type LoadingIconSize = keyof typeof SIZES;

// Eight, at every size. A count that changes with the box makes a different
// mark at 24px than at 14px — denser, read as a wreath rather than the same
// spinner scaled up. One count is what makes it a system mark. `bars` is still
// there for the rare box that needs another, but nothing in the apps passes it.
const BARS = 8;

// Fractions of the box. A bar runs from INNER to OUTER, so its length is the
// difference — and that length is the whole balance here. Too short and the
// bars read as faint ticks at 14px; too long and INNER closes the hole, so the
// mark turns into an asterisk. 0.265 of the box is the longest that keeps the
// hole open. THICKNESS is tied to it so the bar holds its 2.3:1 proportion at
// every size rather than going spindly as it grows.
const OUTER = 0.485;
const INNER = 0.22;
const THICKNESS = 0.115;
const CYCLE = 1.2;

export const LoadingIcon = ({
  size = "md",
  bars,
  color = "currentColor",
  className,
  label,
}: {
  /** A named step, or an exact pixel box when a layout demands one. */
  size?: LoadingIconSize | number;
  /** Overrides the system count of 8. */
  bars?: number;
  color?: string;
  className?: string;
  /** Announced to assistive tech. Omit when adjacent text already says it. */
  label?: string;
}) => {
  const px = typeof size === "number" ? size : SIZES[size];
  const count = Math.max(3, Math.round(bars ?? BARS));
  const angleStep = 360 / count;

  return (
    <span
      // `align-middle` matters: an inline-flex box with no text baseline sits
      // on the text baseline by default, which drops the ring below the line
      // it is supposed to sit on.
      className={cn(
        "relative inline-flex shrink-0 align-middle",
        className,
      )}
      style={{ width: `${px}px`, height: `${px}px` }}
      role={label ? "status" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      {Array.from({ length: count }, (_, i) => (
        <span
          key={i}
          // Base opacity is a class, not an inline style: while the pulse runs
          // its keyframes own opacity anyway, so this value only shows once
          // motion is reduced — where 0.2 left an all-but-invisible ring.
          className="absolute rounded-full opacity-20 animate-pulse motion-reduce:animate-none motion-reduce:opacity-60"
          style={{
            width: `${px * THICKNESS}px`,
            height: `${px * (OUTER - INNER)}px`,
            backgroundColor: color,
            // Anchored bottom-centre on the exact centre of the box, so the
            // rotation has no drift and the ring is concentric with the box.
            top: "50%",
            left: "50%",
            margin: `-${px * (OUTER - INNER)}px 0 0 -${(px * THICKNESS) / 2}px`,
            transformOrigin: "center bottom",
            transform: `rotate(${i * angleStep}deg) translateY(-${px * INNER}px)`,
            animationDelay: `${((i * CYCLE) / count).toFixed(3)}s`,
            animationDuration: `${CYCLE}s`,
          }}
        />
      ))}
    </span>
  );
};
