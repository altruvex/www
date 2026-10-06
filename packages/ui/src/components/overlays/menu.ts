export const menuSurface =
  "z-50 min-w-44 overflow-hidden rounded-menu border border-border-subtle bg-popover p-1 text-popover-foreground shadow-[var(--elev-2)] " +
  "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 " +
  "data-[state=closed]:animate-out data-[state=closed]:fade-out-0";

export const menuItem =
  "relative flex cursor-default select-none items-center gap-2 rounded-ctl-sm px-2 py-1.5 text-base outline-none " +
  "transition-colors duration-[var(--dur-state)] " +
  "focus:bg-surface-2 focus:text-foreground data-[highlighted]:bg-surface-2 data-[highlighted]:text-foreground " +
  // cmdk marks its active item data-selected; Radix marks its own data-highlighted.
  "data-[selected=true]:bg-surface-2 data-[selected=true]:text-foreground " +
  "data-[disabled]:pointer-events-none data-[disabled]:opacity-40 " +
  "[&_svg]:size-3.5 [&_svg]:shrink-0 [&_svg:not([class*='text-'])]:text-subtle-foreground";

export const menuItemDestructive =
  "text-danger focus:bg-danger/10 focus:text-danger data-[highlighted]:bg-danger/10 data-[highlighted]:text-danger data-[selected=true]:bg-danger/10 data-[selected=true]:text-danger [&_svg]:text-danger";

export const menuItemIndented = "ps-7";

export const menuIndicator =
  "pointer-events-none absolute start-2 flex size-3.5 items-center justify-center";

export const menuLabel = "telemetry px-2 py-1.5 text-subtle-foreground";

export const menuSeparator = "-mx-1 my-1 h-px bg-border-subtle";

// The search field and the empty state of a cmdk list that sits inside a menuSurface.
export const menuSearch =
  "mb-1 h-9 w-full border-b border-border-subtle bg-transparent px-2 text-base outline-none placeholder:text-muted-foreground";

export const menuEmpty = "px-2 py-6 text-center text-base text-muted-foreground";
