"use client";

import * as React from "react";

export type Direction = "ltr" | "rtl";

const DirectionContext = React.createContext<Direction | undefined>(undefined);

/**
 * The reading direction for every Radix root in this package (Select, Accordion,
 * DropdownMenu). Radix's own DirectionProvider cannot do this job here: its primitives pin
 * different copies of `@radix-ui/react-direction`, and a context only reaches the copy that
 * created it. An app sets this once from its locale, so a portalled menu reads the page's
 * direction instead of falling back to LTR.
 */
export function DirectionProvider({
  dir,
  children,
}: {
  dir: Direction;
  children: React.ReactNode;
}): React.ReactElement {
  return <DirectionContext.Provider value={dir}>{children}</DirectionContext.Provider>;
}

/** An explicit `dir` prop wins; otherwise the app's direction; otherwise Radix decides. */
export function useDirection(dir?: Direction): Direction | undefined {
  const context = React.useContext(DirectionContext);
  return dir ?? context;
}
