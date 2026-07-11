"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { COMMAND_PALETTE_EVENT } from "./command-palette-event";

const CommandPaletteLazy = dynamic(
  () =>
    import("./command-palette").then((m) => ({ default: m.CommandPalette })),
  { ssr: false },
);

/**
 * Always-mounted, nearly-free host: one keydown listener + one custom-event
 * listener. The palette bundle itself only loads the first time it is opened
 * (⌘K / Ctrl+K, or the nav trigger dispatching COMMAND_PALETTE_EVENT).
 */
export function CommandPaletteHost() {
  const [open, setOpen] = useState(false);
  const [everOpened, setEverOpened] = useState(false);

  useEffect(() => {
    const openPalette = () => {
      setEverOpened(true);
      setOpen(true);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === "k" || e.key === "K")) {
        e.preventDefault();
        setEverOpened(true);
        setOpen((prev) => !prev);
      }
    };
    const onEvent = () => openPalette();
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener(COMMAND_PALETTE_EVENT, onEvent);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener(COMMAND_PALETTE_EVENT, onEvent);
    };
  }, []);

  if (!everOpened) return null;

  return <CommandPaletteLazy open={open} onClose={() => setOpen(false)} />;
}
