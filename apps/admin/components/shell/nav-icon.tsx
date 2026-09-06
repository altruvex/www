import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * The one icon rendering for navigation — sidebar, mobile nav, command
 * palette. Three surfaces render the same `NavItem` set; if each picked its
 * own size and stroke the seams would show the moment you moved between them.
 *
 * The generic-Lucide-dump look is a weight problem, not a missing-decoration
 * problem: default stroke (2) reads chunky at nav sizes, and 14px glyphs are
 * underweight against a 28-32px row. A 1.75 stroke and a size a notch above
 * the rest of the OS's dense inline icons is what an operating system's own
 * navigation looks like instead of a template's. Active rows get a hair more
 * stroke (2) on top of whatever colour/background the row already carries —
 * nothing new is drawn, so this stays inside the brief's zero-decoration rule.
 */
export function NavIcon({
  icon: Icon,
  active,
  size = 16,
  className,
}: {
  icon: LucideIcon;
  active?: boolean;
  size?: number;
  className?: string;
}) {
  return (
    <Icon
      size={size}
      strokeWidth={active ? 2 : 1.75}
      className={cn("shrink-0", className)}
      aria-hidden
    />
  );
}
