export type AccentPalette = "orange" | "green" | "blue";

/**
 * Returns the CSS class that scopes the color-world variables for a section.
 * The class is defined in globals.css with light/dark overrides so that
 * --local-accent passes WCAG AA both as text on the page background and as a
 * fill with --local-accent-fg text on top.
 */
export function accentWorldClass(palette: AccentPalette): string {
  return `accent-world-${palette}`;
}
