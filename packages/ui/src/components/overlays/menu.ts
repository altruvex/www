/**
 * The one menu vocabulary.
 *
 * Every floating list in the OS — dropdown menus, select popovers, sub-menus —
 * renders from these strings. Previously the dropdown was on the admin token
 * layer while Select still carried stock shadcn classes, so two menus opened
 * from two toolbars in the same row looked like two different products
 * (different radius, shadow, item height, focus tint, and physical-direction
 * padding that broke under RTL). Anything menu-shaped imports from here.
 */

/** The floating plane itself. Same radius, border, elevation and padding everywhere. */
export const menuSurface =
  "z-50 min-w-44 overflow-hidden rounded-lg border border-border bg-popover p-1 text-popover-foreground shadow-[var(--elev-2)] " +
  "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 " +
  "data-[state=closed]:animate-out data-[state=closed]:fade-out-0";

/** One row. 13px body text, 3.5 icons, surface-2 focus tint, logical padding. */
export const menuItem =
  "relative flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-base outline-none " +
  "transition-colors duration-[var(--dur-state)] " +
  "focus:bg-surface-2 focus:text-foreground data-[highlighted]:bg-surface-2 data-[highlighted]:text-foreground " +
  "data-[disabled]:pointer-events-none data-[disabled]:opacity-40 " +
  "[&_svg]:size-3.5 [&_svg]:shrink-0 [&_svg:not([class*='text-'])]:text-subtle-foreground";

/** Destructive row modifier — only ever added on top of `menuItem`. */
export const menuItemDestructive =
  "text-danger focus:bg-danger/10 focus:text-danger data-[highlighted]:bg-danger/10 data-[highlighted]:text-danger [&_svg]:text-danger";

/** A row carrying a check/radio indicator in the inline-start gutter. */
export const menuItemIndented = "ps-7";

/** The indicator gutter itself. Logical `start`, so RTL mirrors for free. */
export const menuIndicator =
  "pointer-events-none absolute start-2 flex size-3.5 items-center justify-center";

/** Section label: mono micro-caps, per the OS telemetry idiom. */
export const menuLabel = "telemetry px-2 py-1.5 text-subtle-foreground";

/** Hairline divider, bled to the surface edge. */
export const menuSeparator = "-mx-1 my-1 h-px bg-border";
