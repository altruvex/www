import { cn } from "../../lib/utils";

const ARROW_BASE = "h-4 w-4 shrink-0 transition-all duration-(--motion-hover) ease-default";

const ARROW_ROTATE = {
  forward: "rtl:-rotate-180",
  back: "rotate-180 rtl:rotate-0",
  external: "rtl:-scale-x-100",
} as const;

// The nudge runs on hover of the nearest `group` ancestor (a link row or a button).
const ARROW_NUDGE = {
  forward: "ltr:group-hover:translate-x-1 rtl:group-hover:-translate-x-1",
  back: "ltr:group-hover:-translate-x-1 rtl:group-hover:translate-x-1",
  external: "group-hover:translate-x-0.5 group-hover:-translate-y-0.5",
} as const;

const ARROW_PATH = {
  forward: "M17 8l4 4m0 0l-4 4m4-4H3",
  back: "M17 8l4 4m0 0l-4 4m4-4H3",
  external: "M4 20 20 4M9 4h11v11",
} as const;

export type ArrowDirection = keyof typeof ARROW_PATH;

/** The site's link arrow, the one drawn shape for www, admin and the brand app. */
export function ArrowIcon({
  className,
  direction = "forward",
  motion = "nudge",
  strokeWidth = 2,
}: {
  className?: string;
  direction?: ArrowDirection;
  motion?: "nudge" | "none";
  strokeWidth?: number;
}) {
  return (
    <svg
      aria-hidden
      className={cn(
        ARROW_BASE,
        ARROW_ROTATE[direction],
        motion === "nudge" && ARROW_NUDGE[direction],
        className,
      )}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={strokeWidth}
        d={ARROW_PATH[direction]}
      />
    </svg>
  );
}
