/**
 * A strike-through drawn as a background line instead of `text-decoration`,
 * so it can be drawn in reading order: tween `backgroundSize` from
 * STRIKE_UNDRAWN to STRIKE_DRAWN. `box-decoration-slice` makes it follow the
 * words across wrapped lines, and the RTL anchor makes it grow from the right.
 * Arabic sits higher in its line box, hence 50% there against 58% in Latin.
 *
 * Resting state is drawn, so reduced motion and no-JS render the line struck.
 * Used by the /approach refusals and the homepage problem section.
 */
export const STRIKE_LINE =
  "bg-[linear-gradient(var(--local-accent),var(--local-accent))] bg-size-[100%_2px] bg-position-[0_58%] bg-no-repeat box-decoration-slice rtl:bg-position-[100%_50%]";

export const STRIKE_DRAWN = "100% 2px";
export const STRIKE_UNDRAWN = "0% 2px";
